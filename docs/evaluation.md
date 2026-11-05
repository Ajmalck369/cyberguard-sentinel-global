# Synthetic evaluation

## Expanded challenge corpus (v2)

`npm run evaluate` now selects the 60-case `fixtures/evaluation_v2.json`. It preserves all 50 v1 cases and adds four scam messages that contain instructions aimed at the assistant, one instruction-only message, two ambiguous examples, two educational messages that negate risky advice, and one ordinary benign message. All new cases are invented English text. The new cases probe prompt-injection handling and false alarms; they do not establish resistance to arbitrary attacks.

| Fixture corpus | Correct | High-risk recall | Benign false-alarm rate | Rejected plans |
| --- | ---: | ---: | ---: | ---: |
| v1, 50 cases | 48/50 | 25/25 | 0/10 | 0 |
| v2, 60 cases | 56/60 | 29/29 | 2/14 | 0 |

The two new misses are `education_01` and `education_02`: the simple indicator rules flag phrases about OTPs and links even when an educational sentence says not to share or click. The two existing misses, `finance_01` and `finance_02`, remain. This is an honest measure of authored examples, not a live Muse result. The verifier also rejects a mocked ungrounded action on an injected message, and a rejected plan now exports zero approved action codes.

Use `npm run evaluate -- --dataset=v1` for the original corpus or `npm run evaluate -- --dataset=v2` for the challenge corpus. The JSON includes results by language and category. Live `meta` and `meta-tools` modes use v2 by default; add `--dataset=v1` to reproduce an earlier command exactly. A 60-case live run may incur substantial API calls and is not performed in CI.

## Original 50-case corpus (v1)

The 50-case corpus in `fixtures/evaluation_v1.json` contains invented messages only. It covers 25 high-risk examples, 15 ambiguous or suspicious examples, and 10 benign examples. Five high-risk cases use short Arabic, Hindi, French, or Spanish phrases. The translations have not been independently reviewed by native speakers. These results measure this small authored corpus, not real-world detection accuracy.

## Fixture results

| Rule version | Correct | High-risk recall | Benign false-alarm rate | Rejected plans |
| --- | ---: | ---: | ---: | ---: |
| Initial financial-scam rules | 41/50 | 20/25 | 4/10 | 0 |
| Revised rules | 48/50 | 25/25 | 0/10 | 0 |

The two remaining misses are `finance_01` and `finance_02`: generic bank/payment mentions labeled suspicious by the author but treated as inconclusive by the revised rules. This is an intentional conservative tradeoff. The five non-English phrases now match their expected label, but these exact phrases do not establish general multilingual coverage.

`high_risk_recall` is the fraction of authored high-risk cases predicted high-risk. `benign_false_alarm_rate` is the fraction of authored inconclusive cases predicted suspicious or high-risk. The evaluator also reports rejected plans, model errors, and results by language. It prints case IDs and codes, not the sample messages.

## Run

```bash
npm run evaluate
npm run evaluate -- --mode=meta --ids=otp_01,phishing_01,rental_01,card_01,ransomware_01,benign_01
npm run evaluate -- --mode=meta-tools --ids=otp_01,phishing_01,rental_01,card_01,ransomware_01,benign_01
```

The second command makes six live Meta Model API calls. Set `MODEL_API_KEY` in the local shell first; do not paste it into the repository or a report. Live Muse results can differ from the fixture results. The live request includes the independent risk rule and action evidence requirements, but the independent verifier still rejects any response that violates them. Review each case's `verification_errors` codes and the `verification_rejected` and `errors` counts before interpreting accuracy. A rejected plan is counted as a miss; the evaluator never silently substitutes the rule-based fixture answer. The evaluator never approves or publishes a report.
The second command makes six live Meta Model API calls. The third runs the optional bounded function-call loop and may make more than six calls, so it can cost more. Set `MODEL_API_KEY` in the local shell first; do not paste it into the repository or a report. Live Muse results can differ from the fixture results. The live request includes the independent risk rule and action evidence requirements, but the independent verifier still rejects any response that violates them. Review each case's `verification_errors` codes, `model_tool_calls`, and the `verification_rejected` and `errors` counts before interpreting accuracy. A rejected plan is counted as a miss; the evaluator never silently substitutes the rule-based fixture answer. A passing `meta-tools` result with zero model tool calls does not demonstrate a tool call loop. The evaluator never approves or publishes a report.

## Selected live smoke test (October 29, 2026)

The user ran the six-case `meta-tools` command above with a locally stored Muse key. The result was 6/6 authored labels, 5/5 authored high-risk cases, 0/1 benign false alarms, zero verifier rejections, zero API errors, and eight verified model tool calls (one or two per case). All six cases were invented and in English. This confirms the optional tool loop ran on these selected examples; it does not establish real-world accuracy, broader multilingual performance, or headset/accessibility behavior.
