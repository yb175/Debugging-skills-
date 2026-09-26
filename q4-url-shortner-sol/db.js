/**
 * db.js — SQLite connection helper (read-only, do not modify)
 *
 * The URLShortener service uses this module to obtain SQLite connections.
 * The default database file is shortener.db. Tests may pass an explicit dbPath
 * or set URL_SHORTENER_DB_PATH before importing the app.
 */

import { DatabaseSync } from 'node:sqlite';

const DEFAULT_DB_PATH = 'shortener.db';
const connections = new Map();

export function getDb(dbPath = null) {
  const path = dbPath || process.env.URL_SHORTENER_DB_PATH || DEFAULT_DB_PATH;
  let conn = connections.get(path);
  if (!conn) {
    conn = new DatabaseSync(path);
    conn.exec('PRAGMA foreign_keys = ON;');
    conn.exec('PRAGMA busy_timeout = 5000;');
    if (path !== ':memory:') {
      conn.exec('PRAGMA journal_mode = WAL;');
      conn.exec('PRAGMA synchronous = NORMAL;');
    }
    connections.set(path, conn);
  }
  return conn;
}

export function resetConnectionsForTests() {
  for (const conn of connections.values()) {
    try {
      conn.close();
    } catch {
      // ignore if already closed
    }
  }
  connections.clear();
}
