# Private submission draft

This draft is for the project owner to review and enter into the accepted-participant portal. It has not been submitted or published. Confirm the portal's current fields, official rules, eligibility, and allowed access method before using it. The [official event page](https://events.cerebralvalley.ai/e/meta-ai-developer-hackathon) lists November 4, 2026 at 9:00 PM Eastern time as the project deadline, subject to organizer changes.

## Project summary

CyberGuard Sentinel Global is a synthetic-data research demo for financial-scam messages, including phishing, OTP requests, card-compromise claims, ransomware-themed emails, and rental-deposit pressure. Meta Muse Spark proposes a risk assessment and bounded guidance actions. An independent verifier checks the proposed risk, observed indicators, evidence references, and action vocabulary before any local guidance lookup. A human can approve a fictional report preview once; no bank, agency, or GitHub report is sent from the browser. The demo also includes invented property context, optional read-aloud controls, and a stationary WebXR room preview.

## Technical evidence

- Live Muse evidence: a user-run, selected six-case English synthetic smoke test matched 6/6 authored labels, with zero verifier rejections or API errors. The optional Muse function-call run made eight verified local tool calls. This is a selected smoke test, not real-world accuracy.
- Offline fixture evidence: the original 50-case corpus matched 48/50 authored labels. The expanded 60-case challenge corpus matched 56/60; it exposed two educational false alarms and retained two ambiguous finance misses. Four injected scam-message examples were labelled high-risk by the fixture rules. These are authored offline examples, not live Muse results.
- Automated checks: the private repository runs Node tests in GitHub Actions with an ephemeral PostgreSQL service. PostgreSQL approvals are one-time, store only projected metadata and token hashes, and append a checked audit chain.
- Boundaries: the local server listens only on loopback. The property and calamity fields are fictional. The browser requires synthetic-content confirmation, but that checkbox cannot prove an input is synthetic. There is no real-world reporting, autonomous learning, public intake, or production authentication.

## Demo path

1. Start the app locally with `npm ci`, `npm test`, and `npm start`.
2. Show an invented OTP request, the observed indicator codes, Muse proposal, independent verification, and bounded guidance trace.
3. Approve or decline the fictional report locally; show that its destination is `none`.
4. Show rental-deposit pressure, fictional property context, text guidance, read-aloud option, and the VR room fallback.
5. Close with the evaluation results and the four documented fixture misses.

The recording outline is in [demo_script.md](demo_script.md). Capture a video only from the final build. Keep API keys, personal accounts, genuine messages, and private repository details off screen.

## Owner actions before submission

- Confirm acceptance and the current official rules in your participant account. Decide which track and team details apply; the repository does not establish eligibility.
- Choose a private demo access method or ask the organizer whether a local recording is sufficient. The app is not ready to expose as a public intake service.
- Record and review the final video, then add only the links and files required by the participant portal.
- Submit the entry yourself or explicitly authorize submission. Keep the repository private unless you separately approve a visibility change.
