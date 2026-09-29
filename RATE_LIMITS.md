# Gemini budget protection — SearchFix 1.5.0

This is backend scheduling, not model training. The fallback order stays the same.

## Configured limits

The limits below come from the AI Studio table supplied on September 28, 2026. The left number in that table is peak usage over seven days; the right number is the limit. Do not treat the peak as today's exact usage.

| Model | RPM | Input TPM | RPD |
| --- | ---: | ---: | ---: |
| gemini-3.5-flash-lite | 15 | 250,000 | 500 |
| gemini-3.1-flash-lite | 15 | 250,000 | 500 |
| gemini-3.8-flash | 5 | 250,000 | 20 |
| gemini-3.7-flash | 5 | 250,000 | 20 |
| gemini-3.6-flash | 5 | 250,000 | 20 |
| gemini-3.5-flash | 5 | 250,000 | 20 |
| gemini-2.5-flash | 5 | 250,000 | 20 |

`config/gemini-rate-limits.json` contains these values. Its `safetyFactor` is 0.8: the local ceilings are **12 RPM / 200,000 TPM / 400 RPD** for Lite and **4 RPM / 200,000 TPM / 16 RPD** for the other candidates. Each incoming request must fit all three remaining budgets before generation. Unknown or zero quotas are skipped.

## What is counted

- Optional legacy key checks (not called by the extension), comment classification, PDF/TA analysis, final decisions and each retry share model counters. A model appearing in both chains still has one counter.
- Before generation, Gemini's `countTokens` checks the system text, comment/evidence text and every PDF part. The reservation adds 10% plus 256 tokens for formatting overhead. If the count fails or does not fit, generation is skipped on that model. Actual reported input usage can increase the reservation; failures do not refund it.
- Token-count calls are conservatively charged against the local RPM/RPD request allowance too. A successful count-plus-generation pair therefore consumes two local request slots. These are deliberately stricter local budgets, not a claim that Google bills countTokens as generation requests.
- Reservations happen atomically before sending. The minute window includes a one-second buffer. SDK internal retries are disabled; application retries must pass the checks again.
- A provider 429 also starts a 61-second cooldown for that model. This handles usage the backend could not observe. If every candidate is blocked, the service returns a clear budget error; the current workflow requires review rather than inventing an analysis result. Retry after the minute window clears, or after the daily reset if RPD is full.

The tracker persists counts in `data/runtime/gemini-usage.json` before calls. Restarting preserves usage. Do not delete this file to bypass quotas; it contains counts and model names, not keys or order contents. A corrupt or unwritable usage file stops requests. Installation archives exclude live usage; preserve the existing file during an update.

For the first start on September 28 only, daily counts conservatively start at the supplied seven-day peaks: Flash 3.5 = 15, Flash 3.7 = 1, Flash Lite 3.5 = 5, and the remaining candidates = 0. This can overcount today's usage. Flash 3.5 will consequently be skipped today because its remaining local allowance cannot fit a count-plus-generation pair. The dated baseline expires automatically. Any usage after the supplied snapshot, or a different installation's prior usage, must be accounted for separately.

## Project scope and limitations

[Google's rate-limit documentation](https://ai.google.dev/gemini-api/docs/rate-limits) specifies project-level limits and a midnight Pacific reset for RPD. A 429 is a rejected request, not destruction of the key. The current account values are shown in [AI Studio](https://aistudio.google.com/rate-limit). Google also notes that capacity may vary and other limits can apply.

All keys using this single backend share its budget conservatively. Use one running backend for a project. Separate local copies, other apps, and requests sent directly to Gemini cannot be observed here. Multiple server processes would need a shared atomic quota store before deployment. If Google reports models sharing one quota, assign the same `quotaGroup` and identical limits to those model entries. Refresh the configured values if your project tier changes. Local checks reduce avoidable 429s; they cannot guarantee that Google will never return one.

The token preflight follows Google's [token-counting guidance](https://ai.google.dev/gemini-api/docs/tokens). No production key or document was sent during automated verification.

## Apply the update

Close the old service window, start `START-SearchFix.cmd`, and reload the extension. Version 1.5.0 uses the supplied limits automatically. The terminal logs `gemini.budget-skip` before switching a locally blocked model, and `gemini.chain-exhausted` if no candidate can proceed.
