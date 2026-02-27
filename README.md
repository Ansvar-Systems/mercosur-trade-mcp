# Mercosur Trade MCP

[![CI](https://github.com/Ansvar-Systems/mercosur-trade-mcp/actions/workflows/ci.yml/badge.svg)](https://github.com/Ansvar-Systems/mercosur-trade-mcp/actions/workflows/ci.yml)
[![npm](https://img.shields.io/npm/v/@anthropic-ai/mercosur-trade-mcp)](https://www.npmjs.com/package/@anthropic-ai/mercosur-trade-mcp)
[![License](https://img.shields.io/badge/license-Apache--2.0-blue.svg)](LICENSE)
[![OpenSSF Scorecard](https://api.scorecard.dev/projects/github.com/Ansvar-Systems/mercosur-trade-mcp/badge)](https://scorecard.dev/viewer/?uri=github.com/Ansvar-Systems/mercosur-trade-mcp)

MCP server for Mercosur, Pacific Alliance, and LATAM trade agreements covering cross-border data transfers, mutual recognition, and digital trade obligations. Part of the [Ansvar MCP Network](https://github.com/Ansvar-Systems).

## Coverage

| Source | Coverage | Status |
|--------|----------|--------|
| Mercosur Secretariat | Treaty of Asuncion, protocols, decisions | Pending |
| Pacific Alliance | Framework Agreement, digital trade chapters | Pending |
| PROSUR | Cooperation frameworks | Pending |
| Bilateral agreements | Data transfer MoUs, MLATs | Pending |

### Country Coverage

**Mercosur full members:** Brazil, Argentina, Uruguay, Paraguay

**Mercosur associates:** Chile, Colombia, Ecuador, Peru, Guyana, Suriname

**Pacific Alliance:** Chile, Colombia, Mexico, Peru

See [COVERAGE.md](COVERAGE.md) for full details and known gaps.

## Quick Start

### stdio (local)

```bash
npx @anthropic-ai/mercosur-trade-mcp
```

### Claude Desktop

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

## Tools

| Tool | Description |
|------|-------------|
| `search_agreements` | Full-text search across trade agreements |
| `get_provision` | Retrieve a single article by agreement and reference |
| `get_data_transfer_rules` | Bilateral data transfer frameworks |
| `get_mutual_recognition` | What is mutually recognized between countries |
| `get_trade_bloc_rules` | Rules per trade bloc |
| `check_digital_trade_obligations` | Digital trade chapter requirements |
| `list_sources` | Available data sources |
| `about` | Server metadata and statistics |
| `check_data_freshness` | Source freshness evaluation |

See [TOOLS.md](TOOLS.md) for full parameter and return documentation.

## Data Sources

All treaty texts sourced from official secretariat publications. See [sources.yml](sources.yml) for provenance details.

## Disclaimer

This tool is for research and reference purposes only. It does NOT constitute legal or trade advice. Always verify against official treaty publications. See [DISCLAIMER.md](DISCLAIMER.md).

## License

Apache-2.0. See [LICENSE](LICENSE).
