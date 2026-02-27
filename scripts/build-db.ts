#!/usr/bin/env tsx
/**
 * Build the Mercosur Trade MCP SQLite database.
 *
 * Usage: tsx scripts/build-db.ts
 *
 * Creates data/database.db with the full schema, populates from seed data
 * (when available), rebuilds FTS indexes, and sets journal mode to DELETE
 * for WASM compatibility on Vercel.
 */

import Database from 'better-sqlite3';
import { existsSync, mkdirSync, unlinkSync, statSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DB_PATH = join(__dirname, '..', 'data', 'database.db');

// ── Ensure data directory exists ─────────────────────────────────────────

const dataDir = dirname(DB_PATH);
if (!existsSync(dataDir)) {
  mkdirSync(dataDir, { recursive: true });
}

// ── Remove existing database ─────────────────────────────────────────────

if (existsSync(DB_PATH)) {
  unlinkSync(DB_PATH);
}

console.log('Building Mercosur Trade MCP database...\n');

const db = new Database(DB_PATH);

// ── Schema ───────────────────────────────────────────────────────────────

db.exec(`
  -- Metadata
  CREATE TABLE IF NOT EXISTS db_metadata (
    key   TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );

  -- Trade blocs
  CREATE TABLE trade_blocs (
    id                  TEXT PRIMARY KEY,
    name                TEXT NOT NULL,
    full_name           TEXT,
    founded_year        INTEGER,
    website             TEXT,
    member_countries    TEXT NOT NULL,
    associate_countries TEXT
  );

  -- Agreements (treaties, protocols, decisions)
  CREATE TABLE agreements (
    id              TEXT PRIMARY KEY,
    bloc_id         TEXT REFERENCES trade_blocs(id),
    title           TEXT NOT NULL,
    official_name   TEXT,
    year            INTEGER,
    agreement_type  TEXT,
    parties         TEXT NOT NULL,
    status          TEXT DEFAULT 'in_force',
    source_url      TEXT,
    last_updated    TEXT
  );

  -- Provisions (article-level content)
  CREATE TABLE provisions (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    agreement_id  TEXT NOT NULL REFERENCES agreements(id),
    article_ref   TEXT NOT NULL,
    title         TEXT,
    content       TEXT NOT NULL,
    chapter       TEXT,
    topic         TEXT,
    UNIQUE(agreement_id, article_ref)
  );

  -- Full-text search on provisions
  CREATE VIRTUAL TABLE provisions_fts USING fts5(
    content, title, article_ref,
    content='provisions', content_rowid='id'
  );

  -- FTS triggers for auto-sync
  CREATE TRIGGER provisions_ai AFTER INSERT ON provisions BEGIN
    INSERT INTO provisions_fts(rowid, content, title, article_ref)
    VALUES (new.id, new.content, new.title, new.article_ref);
  END;

  CREATE TRIGGER provisions_ad AFTER DELETE ON provisions BEGIN
    INSERT INTO provisions_fts(provisions_fts, rowid, content, title, article_ref)
    VALUES ('delete', old.id, old.content, old.title, old.article_ref);
  END;

  CREATE TRIGGER provisions_au AFTER UPDATE ON provisions BEGIN
    INSERT INTO provisions_fts(provisions_fts, rowid, content, title, article_ref)
    VALUES ('delete', old.id, old.content, old.title, old.article_ref);
    INSERT INTO provisions_fts(rowid, content, title, article_ref)
    VALUES (new.id, new.content, new.title, new.article_ref);
  END;

  -- Data transfer rules (bilateral)
  CREATE TABLE data_transfer_rules (
    id                  INTEGER PRIMARY KEY AUTOINCREMENT,
    source_country      TEXT NOT NULL,
    dest_country        TEXT NOT NULL,
    framework           TEXT,
    adequacy_status     TEXT,
    transfer_mechanisms TEXT,
    restrictions        TEXT,
    legal_basis         TEXT,
    UNIQUE(source_country, dest_country)
  );

  -- Mutual recognition agreements
  CREATE TABLE mutual_recognition (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    country_a     TEXT NOT NULL,
    country_b     TEXT NOT NULL,
    domain        TEXT NOT NULL,
    agreement_id  TEXT REFERENCES agreements(id),
    description   TEXT,
    status        TEXT DEFAULT 'active'
  );

  -- Digital trade obligations
  CREATE TABLE digital_trade_obligations (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    agreement_id  TEXT REFERENCES agreements(id),
    countries     TEXT NOT NULL,
    obligation    TEXT NOT NULL,
    chapter       TEXT,
    description   TEXT,
    legal_basis   TEXT
  );

  -- Data sources
  CREATE TABLE sources (
    id            TEXT PRIMARY KEY,
    full_name     TEXT NOT NULL,
    authority     TEXT,
    jurisdiction  TEXT,
    source_url    TEXT,
    last_fetched  TEXT,
    last_updated  TEXT,
    item_count    INTEGER DEFAULT 0
  );

  -- Indexes
  CREATE INDEX idx_agreements_bloc ON agreements(bloc_id);
  CREATE INDEX idx_provisions_agreement ON provisions(agreement_id);
  CREATE INDEX idx_provisions_topic ON provisions(topic);
  CREATE INDEX idx_transfer_rules_pair ON data_transfer_rules(source_country, dest_country);
  CREATE INDEX idx_mutual_rec_pair ON mutual_recognition(country_a, country_b);
  CREATE INDEX idx_digital_obligations_agreement ON digital_trade_obligations(agreement_id);
`);

console.log('Schema created.');

// ── Seed: trade blocs ────────────────────────────────────────────────────

const insertBloc = db.prepare(`
  INSERT INTO trade_blocs (id, name, full_name, founded_year, website, member_countries, associate_countries)
  VALUES (?, ?, ?, ?, ?, ?, ?)
`);

insertBloc.run(
  'mercosur',
  'Mercosur',
  'Mercado Comun del Sur (Southern Common Market)',
  1991,
  'https://www.mercosur.int',
  'BR,AR,UY,PY',
  'CL,CO,EC,PE,GY,SR',
);

insertBloc.run(
  'pacific_alliance',
  'Pacific Alliance',
  'Alianza del Pacifico',
  2012,
  'https://alianzapacifico.net',
  'CL,CO,MX,PE',
  null,
);

insertBloc.run(
  'prosur',
  'PROSUR',
  'Forum for the Progress and Development of South America',
  2019,
  'https://prosuramerica.org',
  'AR,BR,CL,CO,EC,GY,PE,PY,SR,UY',
  null,
);

console.log('Trade blocs seeded.');

// ── Seed: data sources ───────────────────────────────────────────────────

const insertSource = db.prepare(`
  INSERT INTO sources (id, full_name, authority, jurisdiction, source_url, last_fetched, last_updated, item_count)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?)
`);

const today = new Date().toISOString().slice(0, 10);

insertSource.run(
  'mercosur-secretariat',
  'Mercosur Secretariat',
  'Mercosur Administrative Secretariat',
  'Mercosur',
  'https://www.mercosur.int',
  today,
  today,
  0,
);

insertSource.run(
  'pacific-alliance-portal',
  'Pacific Alliance Official Portal',
  'Pacific Alliance Secretariat',
  'Pacific Alliance',
  'https://alianzapacifico.net',
  today,
  today,
  0,
);

insertSource.run(
  'prosur-portal',
  'PROSUR Official Portal',
  'PROSUR Presidency',
  'PROSUR',
  'https://prosuramerica.org',
  today,
  today,
  0,
);

insertSource.run(
  'bilateral-agreements',
  'Bilateral Trade Agreements',
  'Various national trade ministries',
  'LATAM',
  null,
  today,
  today,
  0,
);

console.log('Sources seeded.');

// ── Insert metadata ──────────────────────────────────────────────────────

const insertMeta = db.prepare('INSERT OR REPLACE INTO db_metadata (key, value) VALUES (?, ?)');
insertMeta.run('schema_version', '1.0');
insertMeta.run('mcp_name', 'mercosur-trade-mcp');
insertMeta.run('category', 'domain_intelligence');
insertMeta.run('build_date', today);

// ── Rebuild FTS ──────────────────────────────────────────────────────────

console.log('Rebuilding FTS indexes...');
db.exec("INSERT INTO provisions_fts(provisions_fts) VALUES('rebuild')");
console.log('FTS indexes rebuilt.');

// ── Finalize ─────────────────────────────────────────────────────────────

// Set journal mode to DELETE (required for WASM compatibility on Vercel)
db.pragma('journal_mode = DELETE');
db.exec('VACUUM');
db.close();

// ── Report ───────────────────────────────────────────────────────────────

const dbSize = statSync(DB_PATH).size;
const dbSizeMB = (dbSize / 1024 / 1024).toFixed(2);

console.log('\n=== Build Complete ===');
console.log(`Trade Blocs:     3`);
console.log(`Sources:         4`);
console.log(`Agreements:      0 (pending ingestion)`);
console.log(`Provisions:      0 (pending ingestion)`);
console.log(`Database Size:   ${dbSizeMB} MB`);
console.log(`Strategy:        A (Vercel Bundled)`);
console.log(`Journal Mode:    DELETE`);
