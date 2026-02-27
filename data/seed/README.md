# Seed Data

This directory contains seed data files for the Mercosur Trade MCP database.

## Expected Format

Seed data should be placed as JSON files in this directory:

```
data/seed/
  trade-blocs.json       # Trade bloc definitions (pre-populated in build-db.ts)
  agreements.json        # Treaty and agreement records
  provisions.json        # Article-level provisions
  transfer-rules.json    # Bilateral data transfer frameworks
  mutual-recognition.json # Mutual recognition agreements
  digital-obligations.json # Digital trade chapter obligations
```

## JSON Schema

### agreements.json

```json
[
  {
    "id": "treaty-of-asuncion",
    "bloc_id": "mercosur",
    "title": "Treaty of Asuncion",
    "official_name": "Tratado de Asuncion",
    "year": 1991,
    "agreement_type": "founding_treaty",
    "parties": "BR,AR,UY,PY",
    "status": "in_force",
    "source_url": "https://www.mercosur.int/..."
  }
]
```

### provisions.json

```json
[
  {
    "agreement_id": "treaty-of-asuncion",
    "article_ref": "1",
    "title": "Common Market Establishment",
    "content": "The States Parties hereby decide to constitute a Common Market...",
    "chapter": "Chapter I",
    "topic": "customs"
  }
]
```

## Ingestion Pipeline

Once the ingestion pipeline is implemented (`scripts/ingest.ts`), this directory
will be populated automatically from upstream sources. Until then, seed data
can be added manually following the schemas above.

The `build-db.ts` script will read from this directory if JSON files are present.
