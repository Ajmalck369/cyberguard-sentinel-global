# CyberGuard Sentinel Global — proposed production architecture

## Scope
New synthetic-data hackathon application focused on financial and real-estate scam messages; no real cases, agencies, financial action, enforcement, or legal assessment. All model outputs are proposals.

## Components
- Intake and consent gate: user must affirm inputs are synthetic in the demo.
- Muse Spark agent: bounded prompts and JSON schema; tool calls introduced in later milestones.
- Deterministic risk indicators: auditable regex examples, not comprehensive detection.
- Independent policy verifier: recompute risk from local indicators; validate model structure, action codes and observed evidence references before guidance lookups.
- Human gate: a local, one-time synthetic report decision can be approved or declined within 15 minutes; approval prepares a local referral preview with no external destination.
- Intelligence export: strict metadata allowlist, separate manual CLI, synthetic and approved flags.
- Audit: current demo returns a single SHA-256 record; persistent append-only audit is future work.

## Future architecture
Node.js/Fastify API + PostgreSQL with row-level security; isolated job workers; object storage with quarantine; verified GitHub App webhook events; multilingual locale catalogs; approved country-specific public support directories; immutable/versioned evaluation fixtures; human-approved knowledge promotion.

## Learning terminology
Git PR proposals -> provenance/license verification -> synthetic-only sanitizer -> reviewer approval -> regression evaluation -> prompt/knowledge version -> approval to promote -> rollback available. The model weights DO NOT change during inference. Any training/fine-tuning would require a supported backend and independent approval.

## Critical exclusions
Do not auto-visit suspicious URLs, ingest untrusted public Git content as instructions, scrape live users, share real case content to GitHub, create alleged offender accusations, perform live account freezes, impersonate authorities, or push automatic model self-updates.
