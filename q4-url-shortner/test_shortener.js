/**
 * test_shortener.js — public unit tests for URLShortener
 * Run: node test_shortener.js
 */

import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

import { resetConnectionsForTests } from './db.js';
import {
  CodeGenerationError,
  ConflictError,
  ExpiredLinkError,
  NotFoundError,
  PermissionDeniedError,
  URLShortener,
  ValidationError,
} from './shortener.js';

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

describe('URLShortener Service', () => {
  let tmpDbPath;
  let svc;

  beforeEach(() => {
    resetConnectionsForTests();
    tmpDbPath = path.join(os.tmpdir(), `test_shortener_${Date.now()}_${Math.random().toString(36).slice(2)}.db`);
    svc = new URLShortener(tmpDbPath);
  });

  afterEach(() => {
    resetConnectionsForTests();
    if (tmpDbPath && fs.existsSync(tmpDbPath)) {
      try {
        fs.unlinkSync(tmpDbPath);
      } catch {
        // ignore
      }
    }
  });

  describe('Create', () => {
    it('test_create_returns_required_fields', () => {
      const link = svc.create('https://example.com/path');
      const data = link.to_dict();

      assert.match(data.short_code, /^[A-Za-z0-9]{6,10}$/);
      assert.equal(data.long_url, 'https://example.com/path');
      assert.ok('created_at' in data);
      assert.equal(data.expires_at, null);
      assert.equal(data.hit_count, 0);
      assert.equal(data.is_expired, false);
      assert.equal('owner_token' in data, false);
      assert.ok(link.owner_token.startsWith('tok_'));
    });

    it('test_custom_code', () => {
      const link = svc.create('https://example.com', 'docs_2026');

      assert.equal(link.short_code, 'docs_2026');
      assert.equal(svc.get('docs_2026').long_url, 'https://example.com');
    });

    it('test_duplicate_custom_code_raises_conflict', () => {
      svc.create('https://a.example', 'same-code');

      assert.throws(
        () => svc.create('https://b.example', 'same-code'),
        (err) => err instanceof ConflictError
      );
    });

    it('test_validation', () => {
      const badUrls = [
        null,
        '',
        '   ',
        'example.com',
        'www.example.com',
        'ftp://example.com',
        'https://',
        'http://',
      ];

      for (const url of badUrls) {
        assert.throws(
          () => svc.create(url),
          (err) => err instanceof ValidationError,
          `Expected ValidationError for url: ${url}`
        );
      }

      const badCodes = [
        '',
        'ab',
        'has space',
        'bad/code',
        'bad.code',
        'bad@code',
        'x'.repeat(33),
        123,
        true,
      ];

      for (const code of badCodes) {
        assert.throws(
          () => svc.create('https://example.com', code),
          (err) => err instanceof ValidationError,
          `Expected ValidationError for code: ${code}`
        );
      }

      const badTtls = [
        0,
        -1,
        -0.5,
        '10',
        '',
        true,
        false,
      ];

      for (const ttl of badTtls) {
        assert.throws(
          () => svc.create('https://example.com', null, ttl),
          (err) => err instanceof ValidationError,
          `Expected ValidationError for ttl: ${ttl}`
        );
      }
    });

    it('test_valid_custom_code_boundaries', () => {
      const a = svc.create('https://a.example', 'abc');
      const b = svc.create('https://b.example', 'x'.repeat(32));
      const c = svc.create('https://c.example', 'Ab9_-Z');

      assert.equal(a.short_code, 'abc');
      assert.equal(b.short_code, 'x'.repeat(32));
      assert.equal(c.short_code, 'Ab9_-Z');
    });

    it('test_ttl_expiry', async () => {
      const link = svc.create('https://example.com', null, 0.25);

      assert.equal(svc.get(link.short_code).is_expired, false);

      await sleep(350);

      assert.equal(svc.get(link.short_code).is_expired, true);
    });
  });

  describe('Redirect and Hits', () => {
    it('test_resolve_redirect_counts_one_hit', () => {
      const link = svc.create('https://example.com/target');

      assert.equal(
        svc.resolve_redirect(link.short_code),
        'https://example.com/target'
      );
      assert.equal(svc.get(link.short_code).hit_count, 1);
    });

    it('test_missing_redirect_raises_not_found', () => {
      assert.throws(
        () => svc.resolve_redirect('missing'),
        (err) => err instanceof NotFoundError
      );
    });

    it('test_increment_missing_code_raises_not_found', () => {
      assert.throws(
        () => svc.increment_hits('missing'),
        (err) => err instanceof NotFoundError
      );
    });

    it('test_increment_hits_counts_one_hit', () => {
      const link = svc.create('https://example.com');

      svc.increment_hits(link.short_code);

      assert.equal(svc.get(link.short_code).hit_count, 1);
    });

    it('test_expired_redirect_does_not_count_hit', async () => {
      const link = svc.create('https://example.com', null, 0.2);

      await sleep(300);

      assert.throws(
        () => svc.resolve_redirect(link.short_code),
        (err) => err instanceof ExpiredLinkError
      );

      assert.equal(svc.get(link.short_code).hit_count, 0);
    });

    it('test_concurrent_redirects_count_exactly', async () => {
      const link = svc.create('https://example.com');

      const tasks = Array.from({ length: 100 }, () =>
        Promise.resolve().then(() => svc.resolve_redirect(link.short_code))
      );
      await Promise.all(tasks);

      assert.equal(svc.get(link.short_code).hit_count, 100);
    });

    it('test_concurrent_increment_hits_count_exactly', async () => {
      const link = svc.create('https://example.com');

      const tasks = Array.from({ length: 100 }, () =>
        Promise.resolve().then(() => svc.increment_hits(link.short_code))
      );
      await Promise.all(tasks);

      assert.equal(svc.get(link.short_code).hit_count, 100);
    });
  });

  describe('Delete and Stats', () => {
    it('test_delete_requires_matching_owner_token', () => {
      const link = svc.create('https://example.com');

      assert.throws(
        () => svc.delete(link.short_code, ''),
        (err) => err instanceof ValidationError
      );

      assert.throws(
        () => svc.delete(link.short_code, 'wrong'),
        (err) => err instanceof PermissionDeniedError
      );

      assert.notEqual(svc.get(link.short_code), null);
      assert.equal(svc.delete(link.short_code, link.owner_token), true);
      assert.equal(svc.get(link.short_code), null);
      assert.equal(svc.delete(link.short_code, link.owner_token), false);
    });

    it('test_stats', () => {
      const codes = [];

      for (let i = 0; i < 6; i++) {
        const link = svc.create(`https://example.com/${i}`, `code${i}`);
        codes.push(link.short_code);

        for (let j = 0; j < i; j++) {
          svc.resolve_redirect(link.short_code);
        }
      }

      const stats = svc.get_stats();

      assert.equal(stats.total_links, 6);
      assert.equal(stats.total_hits, 15);
      assert.equal(stats.top_5_links.length, 5);
      assert.deepEqual(
        stats.top_5_links.map((row) => row.short_code),
        codes.slice(1).reverse()
      );
    });

    it('test_deleted_link_removed_from_stats', () => {
      const link = svc.create('https://example.com', 'gone1');
      svc.resolve_redirect('gone1');

      assert.equal(svc.delete('gone1', link.owner_token), true);

      const stats = svc.get_stats();

      assert.equal(stats.total_links, 0);
      assert.equal(stats.total_hits, 0);
      assert.deepEqual(stats.top_5_links, []);
    });
  });

  describe('Code Generation Failure', () => {
    it('test_collision_retry_limit', () => {
      svc.create('https://taken.example', 'ABCDEF');
      svc._generateCode = (longUrl) => 'ABCDEF';

      assert.throws(
        () => svc.create('https://new.example'),
        (err) => err instanceof CodeGenerationError
      );
    });

    it('test_generated_code_invalid_format', () => {
      svc._generateCode = (longUrl) => 'bad/code';

      assert.throws(
        () => svc.create('https://new.example'),
        (err) => err instanceof CodeGenerationError
      );
    });
  });
});
