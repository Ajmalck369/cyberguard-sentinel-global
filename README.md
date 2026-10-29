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

Uses documented Meta API base `https://api.meta.ai/v1`, model `muse-spark-1.3`, Chat Completions and JSON schema output. A user-run live smoke test of six invented English cases matched all six authored labels with no verifier rejections or API errors. This small selected test is not real-world detection accuracy.

For an optional, bounded [Meta function-calling](https://dev.meta.ai/docs/cookbook/tool-function-calling) demonstration, set `AI_MODE=meta-tools` with the same local `MODEL_API_KEY`. The model can request only fixed local guidance lookups; each request is checked against observed indicators before execution. This mode has mocked tests but still needs a live API smoke test. `AI_MODE=meta` remains the tested single-call path.

## Privacy and evidence

No real messages, evidence, victim details or secrets. Frontend requires synthetic-content confirmation. **This is a demo consent checkbox, not a technical guarantee that the text is synthetic**; never expose the demo as a public intake system. No writes to GitHub from web/API. JSON report is sanitized through a strict projection. The server listens on `127.0.0.1` only.

For an optional local hash-chained metadata audit, set `AUDIT_FILE` to a path under an ignored private directory such as `private_data/audit.jsonl`. Audit records of assessments and local approval decisions then survive a restart; the pending approval itself remains in memory. The file contains bounded codes and hashes, not the original message. This is not a PostgreSQL deployment, authenticated multi-user access control, or a tamper-proof external ledger.

## Optional manual GitHub issue (only for reviewed synthetic examples)

Provide `GITHUB_TOKEN` with minimal `Issues:write` permission on one designated repository and `GITHUB_REPOSITORY=owner/repo`. Run:

```bash
node scripts/publish_intelligence.mjs fixtures/synthetic_approved.json
```

Only the projected metadata reaches GitHub; the example intentionally contains excluded free text. **This is publishing, not model training.** Do not connect public incoming PRs as auto-approved learning material.

## Verification state

Built and run locally with Node 24; `npm test` executed. No Meta API key, GitHub token, government partner, PostgreSQL database, Flutter application or deployable production security is included in the repository. Implementation is a synthetic proof of architecture, not the complete target platform.

See `docs/architecture.md` and `docs/hackathon_plan.md`.

## Milestone M2: traceable bounded tool orchestration (October 26, 2026)

The POST `/api/v1/synthetic_assessments` endpoint now also returns `run_id`, `trace`, and `tool_results`. The Muse Spark model proposes action codes in structured JSON; the application checks evidence/action allowlists and dispatches safe guidance lookups to a local versioned synthetic playbook. A report request is only a pending proposal. No reports are created, sent to agencies, banks, or GitHub. The browser displays an ordered trace.

This is the **first bounded tool-execution slice**. Optional `AI_MODE=meta-tools` now demonstrates a capped, model-native function-call loop with independently checked local lookups. There is no cross-agency case execution or autonomous retraining. Live Meta inference uses your own account; local automated tests use injected fixtures.

Run `npm test` to execute the automated tests. Set `AI_MODE=meta`, `MODEL_API_KEY` and optionally `META_MODEL=muse-spark-1.3` to use your live model. Never send genuine victim evidence through the free-credit model API.

## Milestone M3: independent verification

The verifier now computes risk from locally observed indicators and checks the model's risk, action vocabulary, evidence references, structure, and size limits before any guidance lookup. A rejected proposal executes no tools. API responses contain a safe projection of the plan, so untrusted model prose and extra fields cannot be echoed to the browser. The human gate remains simulated; no report is sent. The pull request test workflow runs the Node test suite without API credentials.

## Next step: local approval decision

After an assessment proposes a synthetic report, review the sanitized metadata in the browser and choose **Approve locally** or **Decline** within 15 minutes. This one-time decision is held only in server memory and is lost when the app restarts. Approval does not publish a GitHub issue, send a report, or authorize real-world action. The server listens on `127.0.0.1` and requires a matching local origin for browser requests.

## Synthetic referral preview

Choose the Global, UAE, or India **demo** pack before analyzing. An approved synthetic proposal creates a local referral preview with a versioned review checklist and `destination: "none"`; a declined or expired proposal creates none. The packs contain no official reporting routes or legal rules. A human would need to verify any real destination independently. The preview contains only sanitized metadata and disappears when the server restarts.

## Financial scam examples

The expanded synthetic examples use a versioned indicator vocabulary (`evaluation_version: v2`). Independent verification still blocks unsupported action and evidence codes. Guidance is based on published advice about [rental listing fraud](https://consumer.ftc.gov/articles/rental-listing-scams), [verification-code scams](https://consumer.ftc.gov/consumer-alerts/2024/03/whats-verification-code-why-would-someone-ask-me-it), [card-data compromise](https://www.consumerfinance.gov/consumer-tools/bank-accounts/watch-accounts-closely-when-card-data-is-hacked/), and [phishing attachments](https://www.cisa.gov/sites/default/files/2024-09/Secure-Our-World-Phishing-Tip-Sheet.pdf). Most patterns are English demo rules; a few short multilingual phrases are exploratory and do not imply validated coverage in every language.

## Synthetic evaluation

Run `npm run evaluate` for 50 invented scam, ambiguous, and benign examples. The current fixture rules match 48/50 authored labels; this is a small demonstration result, not a real-world accuracy claim. Five short non-English examples are exploratory and require native-speaker review. For an explicit live Muse smoke test using your local `MODEL_API_KEY`, see `docs/evaluation.md`. No live API calls run in CI.

## Accessibility, property context and VR preview

The browser demo presents verified guidance as text and offers optional speech reading, a stop control, keyboard focus styles, a skip link, larger text and reduced-motion support. No information is available only through audio. A stationary standalone WebXR room can open on supported headsets; other devices get a text description and top-view drawing. These are prototype features, not a formal accessibility or headset certification.

The global property context is **entirely fictional**: it illustrates rental, upcoming project, land value and calamity-history fields with demo credits and a fictional location. No external property data source is connected. Muse cannot independently verify market values, ownership, project permits or past events. Current authoritative and licensed data would be required before showing real property claims.

## Reviewed intelligence staging

`src/intelligence.js` verifies a signed, same-repository, merged-PR webhook event and stages its provenance. A human must then explicitly promote a strictly sanitized synthetic report into a versioned in-memory registry. There is no automatic learning, model-weight update, live webhook listener or external publication. A hosted, persistent ingestion service remains future work.

Run `npm run intelligence-demo` to exercise the staging and review sequence with a fictional repository and fictional signing secret. It never contacts GitHub.

See `docs/demo_script.md` and `docs/release_checklist.md` for the remaining submission work.
