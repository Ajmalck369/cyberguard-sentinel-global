# Private development release checklist

## Ready in the repository

- Synthetic financial-scam and rental-deposit examples with independent verifier and local approval.
- Six-case user-run live Muse smoke test with no rejected plans or API errors.
- Optional capped Muse function-call loop with mocked tests and a six-case user-run live smoke test (8 verified model tool calls, no rejections or API errors).
- Fictional global property context, accessible text and speech controls, and optional stationary WebXR preview.
- Local hash-chain audit option and signed merged-PR staging module with explicit synthetic review.

## Requires external setup or review

- Choose a private hosting service and deployment identity. Do not make the demo a public intake for real reports.
- Connect licensed, current property and calamity sources for a chosen region; verify permissions, update frequency and provenance. The demo currently shows invented examples only.
- Configure a real PostgreSQL service and user authentication/authorization before multi-user or public access. The local audit file is a development option.
- Connect a secured, reachable GitHub webhook delivery endpoint and durable review store. The current signed endpoint listens only on loopback.
- Have native speakers review the short non-English cases and run a broader live evaluation if budget permits.
- Test on an actual VR headset and with screen reader, keyboard-only, speech and reduced-motion settings; the code has no device certification.
- Record the demo video from the final build, verify submission requirements and organizer eligibility, then submit only when the owner approves the final material.

The repository should remain private during development. Never commit API keys, raw messages or personal information.
