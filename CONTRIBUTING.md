# Contributing

Contributions are welcome. This document explains how to contribute to the
Mercosur Trade MCP.

## Getting Started

1. Fork the repository
2. Clone your fork
3. Create a feature branch from `dev` (not `main`)
4. Make your changes
5. Run tests: `npm test`
6. Run lint: `npm run lint`
7. Submit a pull request targeting `dev`

## Branch Strategy

```
feature-branch -> PR to dev -> verify on dev -> PR to main -> deploy
```

- All PRs target `dev`, never `main` directly
- `main` is production -- only receives merges from `dev` after verification

## Development Setup

```bash
npm install
npm run build:db    # Build the SQLite database
npm run build       # Compile TypeScript
npm test            # Run tests
npm run dev         # Run locally (stdio)
```

## Code Standards

- TypeScript strict mode
- Parameterized SQL queries (no string interpolation in SQL)
- All tool responses include `_meta` with disclaimer and data_age
- Follow ADR-009 anti-slop standard for all human-readable text

## Adding a New Tool

1. Create `src/tools/{tool-name}.ts` with typed input interface and function
2. Add tool definition to the `TOOLS` array in `src/index.ts`
3. Add the tool to the switch statement in `handleToolCall`
4. Update `TOOLS.md` with full documentation
5. Update `data/coverage.json` tools array
6. Add tests

## Adding Data Sources

1. Add source to `sources.yml`
2. Implement fetching in `scripts/ingest.ts`
3. Update `COVERAGE.md` and `data/coverage.json`
4. Update `list_sources` tool if needed
5. Add ingestion tests

## Pull Request Checklist

- [ ] Branch created from `dev`
- [ ] Tests pass (`npm test`)
- [ ] Lint passes (`npm run lint`)
- [ ] TOOLS.md updated (if tools changed)
- [ ] COVERAGE.md updated (if data changed)
- [ ] No banned words per ADR-009
