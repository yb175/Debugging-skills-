/**
 * shortener.js — candidate implementation file
 *
 * Complete the URLShortener service used by app.js.
 * You may add helper classes, methods, and constants, but preserve the public
 * method names used by app.js and the tests.
 */

import { getDb } from "./db.js";

export const AUTO_CODE_PATTERN = /^[A-Za-z0-9]{6,10}$/;
export const CUSTOM_CODE_PATTERN = /^[A-Za-z0-9_-]{3,32}$/;
export const MAX_GENERATION_ATTEMPTS = 5;

export class ShortenerError extends Error {
  constructor(message) {
    super(message);
    this.name = this.constructor.name;
  }
}

export class ValidationError extends ShortenerError {}
export class NotFoundError extends ShortenerError {}
export class ConflictError extends ShortenerError {}
export class ExpiredLinkError extends ShortenerError {}
export class PermissionDeniedError extends ShortenerError {}
export class CodeGenerationError extends ShortenerError {}

export class Link {
  constructor({
    short_code,
    long_url,
    created_at,
    expires_at = null,
    hit_count = 0,
    owner_token,
  }) {
    this.short_code = short_code;
    this.long_url = long_url;
    this.created_at = created_at;
    this.expires_at = expires_at;
    this.hit_count = hit_count;
    this.owner_token = owner_token;
  }

  get is_expired() {
    throw new Error("Not implemented");
  }

  to_dict() {
    throw new Error("Not implemented");
  }
}

export class URLShortener {
  /**
   * SQLite-backed short link service.
   *
   * Required public methods:
   *   create(long_url, custom_code=null, ttl_seconds=null) -> Link
   *   get(short_code) -> Link | null
   *   resolve_redirect(short_code) -> string
   *   increment_hits(short_code) -> void
   *   delete(short_code, owner_token) -> boolean
   *   get_stats() -> object
   */
  db;
  constructor(dbPath = null) {
    this._dbPath = dbPath;
    this._initDb();
    this.db = this._getConn();
  }

  _initDb() {
    /** Create the database schema needed by the service. */
    const db = this._getConn();
    db.exec(`
        CREATE TABLE IF NOT EXISTS links (
          short_code TEXT PRIMARY KEY , 
          long_url TEXT NOT NULL, 
          created_at REAL NOT NULL , 
          expires_at REAL,
          hit_count INTEGER NOT NULL DEFAULT 0 ,
          owner_token TEXT NOT NULL 
        );
    `);
  }

  _generateCode(longUrl) {
    const chars =
      "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

    const length = Math.floor(Math.random() * 5) + 6; // 6–10

    let code = "";

    for (let i = 0; i < length; i++) {
      code += chars[Math.floor(Math.random() * chars.length)];
    }

    return code;
  }

  _generateOwnerToken() {
    let token = "";
    let options =
      "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz123456789-^&#$^!~";
    let n = options.length;
    for (let i = 0; i < 9; i++) {
      token += options[Math.floor(Math.random() * n)];
    }
    return token;
  }

  __addToDb(short_code, long_url, created_at, expires_at,owner_token) {
    const db = this._getConn();
    try {
      const stmt =
        db.prepare(`                                                                                                                                  
         INSERT INTO links (short_code, long_url, created_at, expires_at,hit_count,owner_token)                                                                 
         VALUES (?, ?, ?, ?,?,?)                                                                                                                                
       `);
      stmt.run(short_code, long_url, created_at, expires_at, 0, owner_token);
    } catch (error) {
      if (error.message && error.message.includes("UNIQUE constraint failed")) {
        // Handle collision (e.g. throw ConflictError or return false for retry)
        throw new ConflictError(`Short code '${short_code}' already exists`);
      }
      throw error; // Re-throw any unexpected errors
    }
  }
  _codeExists(shortCode) {
    const db = this._getConn();
    const stmt = db.prepare(`SELECT 1 FROM links WHERE short_code = ? LIMIT 1`);
    const row = stmt.get(shortCode);
    return row !== undefined; // returns true if exists, false if not
  }
  create(longUrl, customCode = null, ttlSeconds = null) {
    /**
     * Create a short link.
     *
     * Throw ValidationError for invalid input.
     * Throw ConflictError if a custom code already exists.
     * Throw CodeGenerationError if automatic code generation repeatedly collides.
     */
    const regex = /^[A-Za-z0-9_-]{3,32}$/;
    // Validations
    if (!longUrl.startsWith("http://") && !longUrl.startsWith("https://")) {
      throw new ValidationError(
        "The link must starts with http:// or https://",
      );
    }
    if (ttlSeconds && ttlSeconds <= 0) {
      throw new Error("The ttl must be greater than 0");
    }

    if (customCode !== null && !regex.test(customCode)) {
      throw new ValidationError(
        "custom_code must be 3-32 characters and contain only letters, numbers, _ or -",
      );
    }

    const isCustom = customCode != null;

    if (isCustom && this._codeExists(customCode)) {
      throw new ConflictError("code existed");
    }
    for (let i = 0; i < 5; i++) {
      const code = isCustom ? customCode : this._generateCode(longUrl);

      if (this._codeExists(code)) {
        continue;
      }
      const created_at = Date.now();
      const expires_at =
      ttlSeconds == null ? null : created_at + ttlSeconds * 1000;
      const owner_token = this._generateOwnerToken();
      this.__addToDb(code, longUrl, created_at, expires_at,owner_token);
      return new Link({
        short_code : code,
        long_url : longUrl,
        created_at,
        expires_at,
        hit_count: 0 ,
        owner_token : owner_token
      })
    }

    throw new CodeGenerationError("Unable to generate a unique short code");
  }

  get(shortCode) {
    /** Return the link for shortCode, or null when it does not exist. */
    throw new Error("Not implemented");
  }

  resolve_redirect(shortCode) {
    /**
     * Return the long URL for a redirect and atomically count the hit.
     *
     * Throw NotFoundError if the code does not exist.
     * Throw ExpiredLinkError if the link is expired.
     */
    throw new Error("Not implemented");
  }

  increment_hits(shortCode) {
    /**
     * Atomically increment hit_count for an existing short code.
     *
     * Throw NotFoundError if the code does not exist.
     */
    throw new Error("Not implemented");
  }

  delete(shortCode, ownerToken) {
    /**
     * Delete a link if ownerToken matches.
     *
     * Return true when deleted, false when the code does not exist.
     * Throw ValidationError when ownerToken is missing or empty.
     * Throw PermissionDeniedError when the token is wrong.
     */
    throw new Error("Not implemented");
  }

  get_stats() {
    /** Return total_links, total_hits, and the top five links by hit count. */
    throw new Error("Not implemented");
  }

  _getConn() {
    return getDb(this._dbPath);
  }
}
