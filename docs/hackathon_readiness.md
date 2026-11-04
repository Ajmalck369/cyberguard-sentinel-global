# Hackathon readiness and evidence ledger

Last reviewed: 2026-11-05 (UAE). This is an implementation inventory, not a claim that submission is complete.

## Existing repository features (reported / source inspected)
- Node.js browser demo, local loopback server, live Meta Muse Spark structured assessment, optional capped model-native tool calling.
- Deterministic independent verifier and local approved guidance lookups; unsafe proposals execute no tools.
- Synthetic-only pending approval and referral previews, no live agency/bank interaction.
- Optional PostgreSQL persistence, synthetic audit metadata, reviewed GitHub webhook staging.
- A 60-case authored offline evaluation corpus; README reports 56/60 baseline matches. These are **not** measured real-world detection or real victim outcomes.
- Experimental multilingual examples, accessibility controls, fictional property context and optional WebXR preview.

## This branch
- Added `src/knowledge_gate.js`: deterministic evaluator checks candidate sanitary projection, explicit reviewer, comparable synthetic evaluations, no degraded accuracy, false-alarm or high-risk recall scores, and no additional tool-verifier rejections.
- Added `test/knowledge_gate.test.js`: positive and negative review-gate cases.
- **Not wired into public intake or automated live model training.** This code only reports eligibility for a subsequent human-controlled knowledge promotion decision.

## Must complete outside the code before submitting
1. Re-run `npm ci && npm test && npm run evaluate`, including workflow checks, and review actual output.
2. Make the GitHub repository public **only after** scanning all commits for secrets and obtaining owner approval.
3. Record and upload a real 3-minute demo; verify it plays for unauthenticated judges. No video URL is available in source.
4. Submit the Indie Developer / Build for Your World project through Cerebral Valley's authenticated portal; obtain confirmation.
5. Check the event's time cutoff shown on the participant page (Nov 4, 2026 21:00 US Eastern, equivalent to Nov 5 06:00 UAE).
6. Do not claim multi-tenant authentication, real agency integration, production legal clearance, true model-weight fine-tuning, fully verified multilingual capability or a public live intake; these are not present.
7. Verify all new event-period contributions in Git history and make attribution unambiguous.

## Future engineering after hackathon
- Authenticated durable, role-bound review and promotion workflow with regression gate connected to a secured webhook service.
- Trusted current country-specific reporting registries reviewed by qualified local authorities.
- Real privacy/security and deployment reviews before collecting any non-synthetic evidence.
- Model training only with permitted de-identified data, approved compute and a supported fine-tuning backend.

## Security principle
No real victim details or incident contents in public GitHub, CI logs, LLM test prompts or demo recordings. Never automatically ingest PR content as instructions or train models directly from arbitrary GitHub contributions.
