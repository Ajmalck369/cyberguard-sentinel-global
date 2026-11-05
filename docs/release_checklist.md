# Private development release checklist

## Ready in the repository

- Synthetic financial-scam and rental-deposit examples with independent verifier and local approval.
- Six-case user-run live Muse smoke test with no rejected plans or API errors.
- Optional capped Muse function-call loop with mocked tests and a six-case user-run live smoke test (8 verified model tool calls, no rejections or API errors).
- Fictional global property context, accessible text and speech controls, and optional stationary WebXR preview.
- Local hash-chain audit option and signed merged-PR staging module with explicit synthetic review.
- Optional PostgreSQL-backed synthetic approval and audit persistence with CI integration tests.
- Expanded 60-case offline challenge evaluation with category results and explicit false-alarm cases; rejected model plans export no approved action codes.
- Private submission draft with measured claims and a demo path in `docs/submission_packet.md`.

## Requires external setup or review

- Choose a private hosting service and deployment identity. Do not make the demo a public intake for real reports.
- Connect licensed, current property and calamity sources for a chosen region; verify permissions, update frequency and provenance. The demo currently shows invented examples only.
- Choose and configure a private PostgreSQL service, TLS, least-privilege roles, user authentication/authorization, backup and restore before multi-user or public access. The CI database is ephemeral; no production database is configured.
- Connect a secured, reachable GitHub webhook delivery endpoint and durable review store. The current signed endpoint listens only on loopback.
- Have native speakers review the short non-English cases and run a broader live evaluation if budget permits.
- Run the expanded corpus with Muse under the owner's local API key and review rejections, errors and educational false alarms before making any model-performance claim. The 60-case result in the repository is fixture-only.
- Test on an actual VR headset and with screen reader, keyboard-only, speech and reduced-motion settings; the code has no device certification.
- Record the demo video from the final build, confirm acceptance and current official rules in the participant portal, then submit only when the owner approves the final material. The public event page lists November 4, 2026 at 9:00 PM Eastern time as the deadline, subject to organizer changes.

The repository should remain private during development. Never commit API keys, raw messages or personal information.
