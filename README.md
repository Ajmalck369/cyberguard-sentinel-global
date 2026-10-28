# CyberGuard Sentinel Global (new hackathon starter)

**Defensive, synthetic-data-only verification-first cybercrime response demo.** New standalone code, not a fork of UAE Cyber Guard. All agencies and reports are fictional, no live integration exists.

The demo focuses on financial scam signals: phishing links, OTP and card-detail requests, claimed bank or support emails, card compromise claims, ransomware-themed emails, and rental deposit pressure. Choose an invented example in the browser. These are illustrative text cues, not proof of sender identity, card cloning, malware infection, or property ownership. Do not paste real messages or attachments.

## Run (Node.js 22+; target Node 24)

```bash
npm test
npm start
# open http://127.0.0.1:8099
```

Fixture mode runs without credentials and is **not evidence of live AI**. For live Muse Spark on **synthetic messages only**:

```bash
AI_MODE=meta MODEL_API_KEY=your_key npm start
```

PowerShell: `$env:AI_MODE='meta'; $env:MODEL_API_KEY='...'; npm start`.

Uses documented Meta API base `https://api.meta.ai/v1`, model `muse-spark-1.3`, Chat Completions and JSON schema output. Live API was not tested without credentials.

## Privacy and evidence

No real messages, evidence, victim details or secrets. Frontend requires synthetic-content confirmation. **This is a demo consent checkbox, not a technical guarantee that the text is synthetic**; never expose the demo as a public intake system. No writes to GitHub from web/API. JSON report is sanitized through a strict projection.

## Optional manual GitHub issue (only for reviewed synthetic examples)

Provide `GITHUB_TOKEN` with minimal `Issues:write` permission on one designated repository and `GITHUB_REPOSITORY=owner/repo`. Run:

```bash
node scripts/publish_intelligence.mjs fixtures/synthetic_approved.json
```

Only the projected metadata reaches GitHub; the example intentionally contains excluded free text. **This is publishing, not model training.** Do not connect public incoming PRs as auto-approved learning material.

## Verification state

Built and run locally with Node 22; `npm test` executed. No actual Meta API key, GitHub token, government partner, persistent database, Flutter application or deployable production security was configured. Implementation is an initial proof of architecture, not the complete target platform.

See `docs/architecture.md` and `docs/hackathon_plan.md`.

## Milestone M2: traceable bounded tool orchestration (October 26, 2026)

The POST `/api/v1/synthetic_assessments` endpoint now also returns `run_id`, `trace`, and `tool_results`. The Muse Spark model proposes action codes in structured JSON; the application checks evidence/action allowlists and dispatches safe guidance lookups to a local versioned synthetic playbook. A report request is only a pending proposal. No reports are created, sent to agencies, banks, or GitHub. The browser displays an ordered trace.

This is the **first bounded tool-execution slice**, not yet model-native function calling or a multi-turn agent loop. There is currently no persisted human approval workflow, cross-agency case execution, GitHub ingestion, or autonomous retraining. Live Meta inference must be tested separately with your own account; local tests use injected deterministic fixtures.

Run `npm test` to execute the automated tests. Set `AI_MODE=meta`, `MODEL_API_KEY` and optionally `META_MODEL=muse-spark-1.3` to use your live model. Never send genuine victim evidence through the free-credit model API.

## Milestone M3: independent verification

The verifier now computes risk from locally observed indicators and checks the model's risk, action vocabulary, evidence references, structure, and size limits before any guidance lookup. A rejected proposal executes no tools. API responses contain a safe projection of the plan, so untrusted model prose and extra fields cannot be echoed to the browser. The human gate remains simulated; no report is sent. The pull request test workflow runs the Node test suite without API credentials.

## Next step: local approval decision

After an assessment proposes a synthetic report, review the sanitized metadata in the browser and choose **Approve locally** or **Decline** within 15 minutes. This one-time decision is held only in server memory and is lost when the app restarts. Approval does not publish a GitHub issue, send a report, or authorize real-world action. The server listens on `127.0.0.1` and requires a matching local origin for browser requests.

## Synthetic referral preview

Choose the Global, UAE, or India **demo** pack before analyzing. An approved synthetic proposal creates a local referral preview with a versioned review checklist and `destination: "none"`; a declined or expired proposal creates none. The packs contain no official reporting routes or legal rules. A human would need to verify any real destination independently. The preview contains only sanitized metadata and disappears when the server restarts.

## Financial scam examples

The expanded synthetic examples use a versioned indicator vocabulary (`evaluation_version: v2`). Independent verification still blocks unsupported action and evidence codes. Guidance is based on published advice about [rental listing fraud](https://consumer.ftc.gov/articles/rental-listing-scams), [verification-code scams](https://consumer.ftc.gov/consumer-alerts/2024/03/whats-verification-code-why-would-someone-ask-me-it), [card-data compromise](https://www.consumerfinance.gov/consumer-tools/bank-accounts/watch-accounts-closely-when-card-data-is-hacked/), and [phishing attachments](https://www.cisa.gov/sites/default/files/2024-09/Secure-Our-World-Phishing-Tip-Sheet.pdf). New patterns are English demo rules; the language selector does not imply validated detection in every language.
