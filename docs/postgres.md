# Optional PostgreSQL storage for the synthetic demo

The default local app still works without a database. With PostgreSQL configured, the app stores only projected synthetic assessment metadata, sanitized report metadata, approval state and a hash-chained audit sequence. The original message and raw approval token are not stored. The database path is tested against an ephemeral PostgreSQL service in CI.

## Local setup

Use a private PostgreSQL database you control. Keep its connection string outside the repository.

```powershell
$env:DATABASE_URL='postgres://user:password@127.0.0.1:5432/cyberguard'
npm ci
npm run db:migrate
npm start
```

The migration is idempotent and creates `assessments`, `audit_events` and `schema_migrations`. On startup, the storage layer checks the existing audit hash chain and refuses a corrupted chain. Approval decisions use row locks and a single database transaction, so a token cannot be used twice. Expired proposals remain in the database as expired metadata.

When `DATABASE_URL` is absent, the existing in-memory approval store is used. `AUDIT_FILE` can optionally add a local file audit in that mode; it is ignored when PostgreSQL is selected.

## Limits before deployment

The HTTP server still listens only on `127.0.0.1` and has no user authentication or multi-user authorization. This database path is for the private synthetic demo; do not expose it as a public intake or store real victim material. Before hosting, choose a provider, require TLS for the database connection, create separate migration and least-privilege application roles, add user authentication and authorization, back up the database, and test restore and retention policies. The hash chain helps detect changes but does not replace an external immutable audit service.
