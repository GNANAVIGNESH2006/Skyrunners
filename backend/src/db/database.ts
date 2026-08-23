/**
 * Database layer — sql.js (WebAssembly SQLite) implementation.
 *
 * This project previously used `better-sqlite3`, which requires a native
 * C++ addon compiled via node-gyp. That build step needs the Visual Studio
 * C++ Build Tools on Windows and fails outright on newer Node.js versions
 * (e.g. Node 24) that don't yet have prebuilt binaries published.
 *
 * `sql.js` compiles SQLite to WebAssembly, so it runs identically on every
 * platform with zero native compilation. It is normally an in-memory
 * database, so this module adds a thin persistence layer that writes the
 * database to disk after every mutation and reloads it on startup, giving
 * the same "data survives a restart" behavior the app had with
 * better-sqlite3 + a file on disk.
 *
 * The public surface below (`getDb().prepare(...).run/get/all(...)`,
 * `.exec()`, `.pragma()`, `.transaction()`) intentionally mirrors the
 * better-sqlite3 API so no other file in the project (controllers,
 * services, seed script) had to change.
 */
import initSqlJs, { type Database as SqlJsDatabase, type SqlJsStatic } from 'sql.js';
import path from 'path';
import fs from 'fs';

const DB_DIR = path.join(__dirname, '../../data');
const DB_PATH = path.join(DB_DIR, 'knowbase.db');

let sqlDb: SqlJsDatabase | undefined;

// While a `transaction()` is running we skip the (relatively expensive)
// full-database export + disk write after every individual statement, and
// persist once when the transaction commits instead.
let inTransaction = false;

function persist(): void {
  if (inTransaction || !sqlDb) return;
  const data = sqlDb.export();
  fs.writeFileSync(DB_PATH, Buffer.from(data));
}

/** Converts `undefined` params to `null`, since sql.js rejects `undefined`. */
function normalizeParams(params: unknown[]): unknown[] {
  return params.map((p) => (p === undefined ? null : p));
}

/** better-sqlite3-style prepared statement, backed by a fresh sql.js statement per call. */
class Statement {
  constructor(private readonly sql: string) {}

  run(...params: unknown[]): { changes: number; lastInsertRowid: number } {
    const db = requireDb();
    const stmt = db.prepare(this.sql);
    try {
      stmt.bind(normalizeParams(params) as any);
      stmt.step();
    } finally {
      stmt.free();
    }
    const changes = db.getRowsModified();
    persist();
    return { changes, lastInsertRowid: 0 };
  }

  get(...params: unknown[]): any {
    const db = requireDb();
    const stmt = db.prepare(this.sql);
    try {
      stmt.bind(normalizeParams(params) as any);
      if (stmt.step()) {
        return stmt.getAsObject();
      }
      return undefined;
    } finally {
      stmt.free();
    }
  }

  all(...params: unknown[]): any[] {
    const db = requireDb();
    const stmt = db.prepare(this.sql);
    const rows: any[] = [];
    try {
      stmt.bind(normalizeParams(params) as any);
      while (stmt.step()) {
        rows.push(stmt.getAsObject());
      }
    } finally {
      stmt.free();
    }
    return rows;
  }
}

export interface DbHandle {
  prepare(sql: string): Statement;
  exec(sql: string): void;
  pragma(pragmaStr: string): void;
  transaction<T extends (...args: any[]) => any>(fn: T): T;
}

const dbHandle: DbHandle = {
  prepare(sql: string): Statement {
    return new Statement(sql);
  },

  exec(sql: string): void {
    requireDb().exec(sql);
    persist();
  },

  pragma(pragmaStr: string): void {
    // sql.js supports most PRAGMAs (e.g. foreign_keys) via plain SQL, but
    // has no on-disk journal, so file-journaling pragmas like WAL are
    // meaningless here and are safely ignored.
    try {
      requireDb().exec(`PRAGMA ${pragmaStr}`);
    } catch {
      /* unsupported/no-op pragma for sql.js — safe to ignore */
    }
  },

  transaction<T extends (...args: any[]) => any>(fn: T): T {
    return ((...args: any[]) => {
      const db = requireDb();
      db.exec('BEGIN TRANSACTION');
      inTransaction = true;
      try {
        const result = fn(...args);
        db.exec('COMMIT');
        inTransaction = false;
        persist();
        return result;
      } catch (err) {
        inTransaction = false;
        try {
          db.exec('ROLLBACK');
        } catch {
          /* nothing to roll back */
        }
        throw err;
      }
    }) as T;
  },
};

function requireDb(): SqlJsDatabase {
  if (!sqlDb) {
    throw new Error('Database not initialized. Call initDatabase() first.');
  }
  return sqlDb;
}

export function getDb(): DbHandle {
  requireDb();
  return dbHandle;
}

export async function initDatabase(): Promise<void> {
  if (!fs.existsSync(DB_DIR)) {
    fs.mkdirSync(DB_DIR, { recursive: true });
  }

  const wasmPath = require.resolve('sql.js/dist/sql-wasm.wasm');
  const SQL: SqlJsStatic = await initSqlJs({ locateFile: () => wasmPath });

  if (fs.existsSync(DB_PATH)) {
    const fileBuffer = fs.readFileSync(DB_PATH);
    sqlDb = new SQL.Database(fileBuffer);
  } else {
    sqlDb = new SQL.Database();
  }

  dbHandle.pragma('foreign_keys = ON');

  createTables();
  persist();

  // Make sure the latest state is flushed to disk even on unclean exits.
  process.once('SIGINT', () => {
    persist();
    process.exit(0);
  });
  process.once('SIGTERM', () => {
    persist();
    process.exit(0);
  });

  console.log('✓ Database initialized at', DB_PATH, '(sql.js / WASM SQLite — no native build required)');
}

function createTables(): void {
  dbHandle.exec(`
    -- Knowledge Bases
    CREATE TABLE IF NOT EXISTS knowledge_bases (
      id          TEXT PRIMARY KEY,
      name        TEXT NOT NULL,
      description TEXT DEFAULT '',
      created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at  DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- Documents
    CREATE TABLE IF NOT EXISTS documents (
      id            TEXT PRIMARY KEY,
      kb_id         TEXT NOT NULL REFERENCES knowledge_bases(id) ON DELETE CASCADE,
      file_name     TEXT NOT NULL,
      file_type     TEXT NOT NULL,
      file_size     INTEGER DEFAULT 0,
      file_path     TEXT DEFAULT '',
      status        TEXT DEFAULT 'uploaded'
                    CHECK(status IN ('uploaded','processing','ready','failed')),
      error_message TEXT DEFAULT '',
      page_count    INTEGER DEFAULT 0,
      chunk_count   INTEGER DEFAULT 0,
      created_at    DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at    DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- Document Chunks
    CREATE TABLE IF NOT EXISTS document_chunks (
      id           TEXT PRIMARY KEY,
      doc_id       TEXT NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
      chunk_index  INTEGER NOT NULL,
      content      TEXT NOT NULL,
      page_number  INTEGER DEFAULT 1,
      token_count  INTEGER DEFAULT 0,
      embedding    TEXT DEFAULT NULL,   -- JSON array of floats
      created_at   DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- Conversations
    CREATE TABLE IF NOT EXISTS conversations (
      id         TEXT PRIMARY KEY,
      kb_id      TEXT NOT NULL REFERENCES knowledge_bases(id) ON DELETE CASCADE,
      title      TEXT DEFAULT 'New Conversation',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- Messages
    CREATE TABLE IF NOT EXISTS messages (
      id         TEXT PRIMARY KEY,
      conv_id    TEXT NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
      role       TEXT NOT NULL CHECK(role IN ('user','assistant')),
      content    TEXT NOT NULL,
      answered   INTEGER DEFAULT 1,   -- 0 = not answered (info not found)
      avg_score  REAL    DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- Source References
    CREATE TABLE IF NOT EXISTS source_references (
      id               TEXT PRIMARY KEY,
      message_id       TEXT NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
      doc_id           TEXT NOT NULL,
      chunk_id         TEXT NOT NULL,
      similarity_score REAL NOT NULL,
      created_at       DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- Indexes
    CREATE INDEX IF NOT EXISTS idx_docs_kb    ON documents(kb_id);
    CREATE INDEX IF NOT EXISTS idx_chunks_doc ON document_chunks(doc_id);
    CREATE INDEX IF NOT EXISTS idx_msgs_conv  ON messages(conv_id);
    CREATE INDEX IF NOT EXISTS idx_sources_msg ON source_references(message_id);
    CREATE INDEX IF NOT EXISTS idx_convs_kb   ON conversations(kb_id);
  `);
}
