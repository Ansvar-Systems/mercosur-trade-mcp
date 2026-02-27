# Coverage -- Mercosur Trade MCP

> Last verified: 2026-02-27 | Database version: 0.1.0

## What's Included

| Source | Items | Version/Date | Completeness | Refresh |
|--------|-------|-------------|-------------|---------|
| Mercosur Secretariat | 0 agreements | 2026-02-27 | Pending | Quarterly |
| Pacific Alliance Portal | 0 agreements | 2026-02-27 | Pending | Quarterly |
| PROSUR Portal | 0 agreements | 2026-02-27 | Pending | Quarterly |
| Bilateral Agreements | 0 agreements | 2026-02-27 | Pending | Quarterly |

**Total:** 9 tools, 0 agreements (pending ingestion), schema only

## Planned Ingestion Targets

### Mercosur

| Agreement | Year | Type | Status |
|-----------|------|------|--------|
| Treaty of Asuncion | 1991 | Founding treaty | Pending |
| Protocol of Ouro Preto | 1994 | Institutional structure | Pending |
| Protocol of Olivos | 2002 | Dispute settlement | Pending |
| Protocol of Ushuaia | 1998 | Democratic commitment | Pending |
| Mercosur Digital Agenda | 2017 | Digital policy | Pending |
| CMC Decisions on e-commerce | Various | Digital trade | Pending |
| CMC Dec. 37/03 (data protection) | 2003 | Data flows | Pending |
| Mercosur services protocol | 2005 | Services trade | Pending |

### Pacific Alliance

| Agreement | Year | Type | Status |
|-----------|------|------|--------|
| Framework Agreement | 2012 | Founding | Pending |
| Additional Protocol | 2014 | Trade liberalization | Pending |
| Digital trade chapter | 2014 | E-commerce | Pending |
| Chapter 13 (E-commerce) | 2014 | Digital provisions | Pending |
| First Additional Protocol amendment | 2022 | Updates | Pending |

### PROSUR

| Agreement | Year | Type | Status |
|-----------|------|------|--------|
| Santiago Declaration | 2019 | Founding declaration | Pending |
| Cooperation frameworks | 2019+ | Institutional | Pending |

### Bilateral

| Agreement | Parties | Type | Status |
|-----------|---------|------|--------|
| ACE 18 (Mercosur core) | BR-AR-UY-PY | Trade preferences | Pending |
| ACE 35 (Mercosur-Chile) | Mercosur-CL | FTA | Pending |
| ACE 36 (Mercosur-Bolivia) | Mercosur-BO | FTA | Pending |
| ACE 58 (Mercosur-Peru) | Mercosur-PE | FTA | Pending |
| ACE 59 (Mercosur-CAN) | Mercosur-CO-EC-VE | FTA | Pending |
| BR-CL digital trade | BR-CL | Digital trade | Pending |
| AR-CL data transfer | AR-CL | Data flows | Pending |

## What's NOT Included

| Gap | Reason | Planned? |
|-----|--------|----------|
| Domestic implementing legislation | Out of scope (covered by national Law MCPs) | No |
| ALADI/LAIA full treaty archive | Scope limited to Mercosur/PA/PROSUR + bilateral | v0.3 |
| CAFTA-DR, USMCA | Central/North American agreements outside LATAM trade blocs | No |
| Historical superseded protocols | Focus on current in-force instruments | v0.4 |
| Sub-national regulations | Municipal/state trade rules not covered | No |

## Limitations

- Data is a snapshot of treaty texts, not a real-time feed
- Treaty interpretation requires analysis of domestic implementing laws (see national Law MCPs)
- Provisions are extracted at article level; sub-paragraph references may not resolve
- Spanish/Portuguese original texts are authoritative; translations are for reference only
- Digital trade provisions are evolving rapidly; check dates carefully

## Data Freshness

| Source | Refresh Schedule | Last Refresh | Next Expected |
|--------|-----------------|-------------|---------------|
| Mercosur Secretariat | Quarterly | 2026-02-27 | 2026-05-27 |
| Pacific Alliance Portal | Quarterly | 2026-02-27 | 2026-05-27 |
| PROSUR Portal | Quarterly | 2026-02-27 | 2026-05-27 |
| Bilateral Agreements | Quarterly | 2026-02-27 | 2026-05-27 |

To check freshness programmatically, call the `check_data_freshness` tool.
