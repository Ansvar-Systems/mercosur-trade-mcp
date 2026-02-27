# CLAUDE.md — Mercosur Trade MCP

## What This Is

MCP server providing structured access to Mercosur, Pacific Alliance, PROSUR, and bilateral LATAM trade agreements. Covers cross-border data transfers, mutual recognition agreements, and digital trade obligations.

## Architecture

- **Language:** TypeScript (strict mode)
- **Database:** SQLite via `@ansvar/mcp-sqlite` (WASM-compatible)
- **Transport:** stdio (npm) + Streamable HTTP (Vercel)
- **MCP SDK:** `@modelcontextprotocol/sdk` ^1.12.1

## Key Commands

```bash
npm run build          # Compile TypeScript
npm run build:db       # Build SQLite database from schema + seed data
npm run dev            # Run locally via tsx (stdio)
npm run start          # Run compiled (stdio)
npm test               # Run tests (vitest)
npm run lint           # Type check (tsc --noEmit)
npm run validate       # Lint + test
npm run ingest         # Run ingestion pipeline (placeholder)
npm run check-updates  # Check for upstream changes (placeholder)
```

## Database

Schema in `scripts/build-db.ts`. Tables: `trade_blocs`, `agreements`, `provisions`, `provisions_fts`, `data_transfer_rules`, `mutual_recognition`, `digital_trade_obligations`, `sources`, `db_metadata`.

Journal mode MUST be DELETE (not WAL) for Vercel WASM compatibility.

## Tools (9)

| Tool | Purpose |
|------|---------|
| `search_agreements` | FTS across trade agreements |
| `get_provision` | Single provision by agreement + article |
| `get_data_transfer_rules` | Bilateral transfer frameworks |
| `get_mutual_recognition` | What is mutually recognized between two countries |
| `get_trade_bloc_rules` | Mercosur, Pacific Alliance, PROSUR rules and membership |
| `check_digital_trade_obligations` | Digital trade chapter requirements for a set of countries |
| `list_sources` | Data sources and record counts |
| `about` | Server metadata |
| `check_data_freshness` | Per-source data age and staleness |

## Branching Strategy

```
feature-branch -> PR to dev -> verify on dev -> PR to main -> deploy
```

Never push directly to `main`. All changes go through `dev` first.

## Anti-Slop

All text output follows ADR-009. No banned words, no filler preambles, no marketing language.
