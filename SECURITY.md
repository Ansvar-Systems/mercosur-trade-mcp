# Security Policy

## Reporting a Vulnerability

If you discover a security vulnerability in this project, please report it
responsibly:

**Email:** security@ansvar.eu

**Do NOT** open a public GitHub issue for security vulnerabilities.

## Response Timeline

- **Acknowledgment:** Within 48 hours
- **Critical vulnerabilities:** Fix within 7 days
- **High/Medium:** Fix within 30 days
- **Low:** Next scheduled release

## Scope

This policy covers:
- The `@anthropic-ai/mercosur-trade-mcp` npm package
- The hosted Vercel endpoint
- The GitHub repository

## Security Measures

This project employs 6-layer security scanning:

| Layer | Tool | Purpose |
|-------|------|---------|
| 1 | CodeQL | Static analysis for code vulnerabilities |
| 2 | Semgrep | Pattern-based security scanning |
| 3 | Trivy | Dependency vulnerability scanning |
| 4 | Gitleaks | Secret detection in commits |
| 5 | OSSF Scorecard | Open source security metrics |
| 6 | npm audit | Known vulnerability checking |

## Data Security

- The database contains only publicly available trade agreement data
- No authentication credentials are stored or transmitted
- No user data is collected or retained
- Read-only SQLite database -- no write operations in production
- All SQL queries use parameterized statements
- FTS5 search inputs are sanitized to prevent injection
