# Mercosur Trade MCP

Mercosur, Pacific Alliance, PROSUR, and bilateral LATAM trade agreements via the Model Context Protocol. Cross-border data transfers, mutual recognition, digital trade obligations.

[![License: Apache-2.0](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](LICENSE)
[![npm](https://img.shields.io/npm/v/@anthropic-ai/mercosur-trade-mcp)](https://www.npmjs.com/package/@anthropic-ai/mercosur-trade-mcp)

## Quick Start

### Remote (Vercel)

Add to your MCP client config:

```json
{
  "mcpServers": {
    "mercosur-trade": {
      "url": "https://mercosur-trade-mcp.vercel.app/mcp"
    }
  }
}
```

### Local (npx)

```json
{
  "mcpServers": {
    "mercosur-trade": {
      "command": "npx",
      "args": ["-y", "@anthropic-ai/mercosur-trade-mcp"]
    }
  }
}
```

### Claude Desktop

Add to `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "mercosur-trade": {
      "command": "npx",
      "args": ["-y", "@anthropic-ai/mercosur-trade-mcp"]
    }
  }
}
```

### VS Code / Cursor

Add to `.vscode/mcp.json`:

```json
{
  "servers": {
    "mercosur-trade": {
      "command": "npx",
      "args": ["-y", "@anthropic-ai/mercosur-trade-mcp"]
    }
  }
}
```

## What's Included

| Source | Coverage | Status |
|--------|----------|--------|
| Mercosur Secretariat | Treaties, protocols, CMC decisions, digital agenda | Pending ingestion |
| Pacific Alliance | Framework Agreement, Additional Protocol, digital trade | Pending ingestion |
| PROSUR | Santiago Declaration, cooperation frameworks | Pending ingestion |
| Bilateral | ACE agreements, data transfer arrangements, MRAs | Pending ingestion |

**Bloc membership:**
- **Mercosur** (full): Brazil, Argentina, Uruguay, Paraguay
- **Mercosur** (associate): Chile, Colombia, Ecuador, Peru, Guyana, Suriname
- **Pacific Alliance**: Chile, Colombia, Mexico, Peru
- **PROSUR**: Argentina, Brazil, Chile, Colombia, Ecuador, Guyana, Peru, Paraguay, Suriname, Uruguay

## What's NOT Included

| Gap | Reason |
|-----|--------|
| Domestic implementing legislation | Covered by national Law MCPs |
| Full ALADI/LAIA archive | Planned for v0.3 |
| CAFTA-DR, USMCA | Outside LATAM trade bloc scope |
| Historical superseded protocols | Planned for v0.4 |

## Available Tools

| Tool | Description |
|------|-------------|
| `search_agreements` | FTS across trade agreement provisions |
| `get_provision` | Single provision by agreement + article |
| `get_data_transfer_rules` | Bilateral transfer frameworks between two countries |
| `get_mutual_recognition` | What is mutually recognized (by domain) |
| `get_trade_bloc_rules` | Mercosur, Pacific Alliance, PROSUR rules and membership |
| `check_digital_trade_obligations` | Digital trade requirements for a set of countries |
| `list_sources` | Data sources and record counts |
| `about` | Server metadata |
| `check_data_freshness` | Per-source data age and staleness |

See [TOOLS.md](TOOLS.md) for full parameter documentation.

## Data Sources & Freshness

| Source | Authority | Refresh | Languages |
|--------|-----------|---------|-----------|
| [mercosur.int](https://www.mercosur.int) | Mercosur Secretariat | Quarterly | ES, PT |
| [alianzapacifico.net](https://alianzapacifico.net) | Pacific Alliance | Quarterly | ES |
| [prosuramerica.org](https://prosuramerica.org) | PROSUR Presidency | Quarterly | ES, PT |
| [sice.oas.org](https://www.sice.oas.org) | OAS/SICE | Quarterly | ES, PT, EN |

Call `check_data_freshness` to verify data currency before relying on results.

## Security

6-layer scanning on every push:

| Layer | Tool | Purpose |
|-------|------|---------|
| 1 | CodeQL | Static analysis |
| 2 | Semgrep | Pattern-based scanning |
| 3 | Trivy | Dependency vulnerabilities |
| 4 | Gitleaks | Secret detection |
| 5 | OSSF Scorecard | Open source security metrics |
| 6 | npm audit | Known vulnerabilities |

See [SECURITY.md](SECURITY.md) for vulnerability reporting.

## Disclaimer

**NOT LEGAL OR TRADE ADVICE.** This tool provides structured access to trade agreement data for informational and research purposes only. Verify against official treaty texts. Consult qualified trade counsel for decisions affecting cross-border operations.

See [DISCLAIMER.md](DISCLAIMER.md) for full terms.

## Ansvar MCP Network

This server is part of the [Ansvar MCP Network](https://ansvar.ai/mcp), providing structured access to:

| Category | Coverage |
|----------|----------|
| National legislation | 75 jurisdictions, 488K+ laws, 6.4M+ provisions |
| EU regulations | 49 regulations, 2,693 articles |
| US regulations | 18 federal + state regulations |
| Security frameworks | 261 frameworks, 1,451 controls |
| Threat intelligence | 200K+ CVEs, 400K+ sanctions |
| Domain intelligence | Energy, healthcare, financial, defense, maritime, trade |

## Development

### Branch Strategy

```
feature-branch -> PR to dev -> verify on dev -> PR to main -> deploy
```

### Setup

```bash
npm install
npm run build:db    # Build SQLite database
npm run build       # Compile TypeScript
npm test            # Run tests
npm run dev         # Run locally (stdio)
```

### Ingestion

```bash
npm run ingest          # Run ingestion pipeline
npm run check-updates   # Check for upstream changes
```

## License

Apache-2.0. See [LICENSE](LICENSE).

### Data Licenses

- Mercosur treaty texts: Public domain
- Pacific Alliance documents: Public domain
- PROSUR declarations: Public domain
- Bilateral agreements (via SICE/OAS): Public domain

Built by [Ansvar Systems](https://ansvar.eu) -- part of the Ansvar MCP Network.
