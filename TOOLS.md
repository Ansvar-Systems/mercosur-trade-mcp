# Tools -- Mercosur Trade MCP

9 tools for querying Mercosur, Pacific Alliance, PROSUR, and bilateral LATAM trade agreements.

## search_agreements

Full-text search across all trade agreements in the database.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `query` | string | Yes | Search query (e.g., "data localization", "digital services", "customs union") |
| `countries` | string[] | No | Filter by party countries using ISO 3166-1 alpha-2 codes (e.g., ["BR", "AR"]) |
| `topic` | string | No | Filter by topic (e.g., "data_transfer", "digital_trade", "customs", "investment", "services") |
| `limit` | number | No | Max results (default 10, max 50) |

**Returns:** Matching provisions with relevance ranking, agreement metadata, and highlight snippets.

## get_provision

Retrieve a single provision (article) from a trade agreement.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `agreement_id` | string | Yes | Agreement identifier (e.g., "treaty-of-asuncion", "pa-framework-agreement") |
| `article` | string | Yes | Article reference (e.g., "1", "12.3", "Annex I") |

**Returns:** Full provision text, agreement title, date, and parties.

## get_data_transfer_rules

Retrieve bilateral data transfer framework between two countries.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `source_country` | string | Yes | Source country ISO 3166-1 alpha-2 code (e.g., "BR") |
| `dest_country` | string | Yes | Destination country ISO 3166-1 alpha-2 code (e.g., "AR") |

**Returns:** Adequacy status, transfer mechanisms, restrictions, and applicable agreements.

## get_mutual_recognition

Retrieve mutual recognition agreements between two countries.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `country_a` | string | Yes | First country ISO 3166-1 alpha-2 code (e.g., "BR") |
| `country_b` | string | Yes | Second country ISO 3166-1 alpha-2 code (e.g., "CL") |
| `domain` | string | No | Domain filter (e.g., "conformity_assessment", "professional_qualifications", "data_protection", "standards") |

**Returns:** Mutual recognition agreements, domains covered, and status.

## get_trade_bloc_rules

Retrieve rules, membership, and structure of a trade bloc.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `bloc` | string | Yes | Trade bloc: `mercosur`, `pacific_alliance`, or `prosur` |

**Returns:** Bloc membership (full and associate members), founding instruments, institutional structure, and key rules.

## check_digital_trade_obligations

Check digital trade chapter requirements applicable to a set of countries.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `countries` | string[] | Yes | Array of ISO 3166-1 alpha-2 country codes (e.g., ["BR", "AR", "CL"]) |

**Returns:** Obligations from e-commerce chapters, digital trade frameworks, and data flow provisions applicable to the specified countries.

## list_sources

List all data sources with record counts, last fetch dates, and authority information.

No parameters.

**Returns:** Array of data sources with name, authority, URL, record count, and last fetch date.

## about

Return server metadata.

No parameters.

**Returns:** Server name, version, tool count, total records, data sources summary, and disclaimer.

## check_data_freshness

Report per-source data age and flag stale sources.

No parameters.

**Returns:** Per-source freshness report with last fetch date, age in days, and staleness flag.
