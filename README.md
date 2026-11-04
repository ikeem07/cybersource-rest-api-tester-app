# Cybersource Transaction Inspector

Read-only TypeScript application for calling Cybersource Transaction Search and inspecting the responses. It is a tool for understanding the payloads behind the Business Center Transactions area. It does not authorize, capture, credit, void, or otherwise change payments.

Two Cybersource operations are supported:

- `POST /tss/v2/searches` — search transactions.
- `GET /tss/v2/transactions/{id}` — retrieve one transaction by its Cybersource request ID.

The browser talks only to the local API:

- `POST /api/transactions/search`
- `GET /api/transactions/:id`

Merchant credentials stay on the server. The local contract is in [`openapi/internal-api.yaml`](openapi/internal-api.yaml).

## Prerequisites

- Node.js 22 or later
- pnpm 11
- A Cybersource REST shared-secret key for the sandbox or for production

## Installation

```bash
pnpm install
cp .env.example .env.local
```

Fill in `.env.local`. The API and the Vite dev server read `.env.local` and then `.env` from the repository root. Values already set in the shell win, then `.env.local`, then `.env`. Both files are gitignored. `.env.example` has empty credential fields.

## Environment variables

| Variable | Required | Purpose |
| --- | --- | --- |
| `CYBERSOURCE_ENVIRONMENT` | yes | `apitest`, `production`, or `production-india` |
| `CYBERSOURCE_MERCHANT_ID` | yes | Transacting merchant ID. Sent as `v-c-merchant-id`. |
| `CYBERSOURCE_KEY_ID` | yes | REST shared-secret key ID. |
| `CYBERSOURCE_SHARED_SECRET` | yes | Base64 shared secret from the Business Center. Do not decode it first. |
| `CYBERSOURCE_BASE_URL` | yes in the example | Must match the environment: `https://apitest.cybersource.com`, `https://api.cybersource.com`, or `https://api.in.cybersource.com`. |
| `CYBERSOURCE_MERCHANT_REFERENCE_PREFIX` | yes | Letters or digits, 3 to 100 characters. Every search is limited to merchant reference numbers that start with this value. |
| `PORT` | no | Local API port. Default `3000`. |
| `CYBERSOURCE_TIMEOUT_MS` | no | Upstream timeout from 1000 to 180000. Default `120000`. |
| `CYBERSOURCE_LIVE_TESTS` | no | Set to `true` only for the optional sandbox smoke test. |
| `CYBERSOURCE_SMOKE_REQUEST_ID` | no | When live tests are enabled, also `GET` this existing request ID. |

Startup checks that the required variables are present and that the base URL host matches the environment. The process exits before it listens when they do not. Error text names the missing variables and does not print the values.

## Cybersource authentication setup

1. Open the sandbox Business Center at <https://ebc2test.cybersource.com>, or production at <https://ebc2.cybersource.com>. Merchants in India use the India Business Center.
2. Go to **Payment Configuration → Key Management**.
3. Generate a key and choose **REST - Shared Secret**.
4. Copy the merchant ID, key ID, and shared secret. The shared secret is shown once.
5. Put those values in `.env.local` (or `.env`) on the machine that runs the API. Do not put them in frontend code, Vite `VITE_` variables, or the repository.

Requests use the HTTP Signature scheme documented in [HTTP Signature Authentication](https://developer.cybersource.com/docs/cybs/en-us/platform/get-started/all/rest/get-started-rest/authentication/GenerateHeader/httpSignatureAuthentication.html):

- `Host`, `Date`, and `v-c-merchant-id` are signed.
- `POST` also signs `Digest: SHA-256=<base64 SHA-256 of the exact JSON body>`.
- `GET` does not send `Digest`.
- The signed header list is `host date (request-target) digest v-c-merchant-id` for `POST` and the same list without `digest` for `GET`.
- The signature is HMAC-SHA256 over that string, using the Base64-decoded shared secret, then Base64-encoded. Lines are separated by `\n` and the string does not end with a newline.

The server does not log the shared secret, the `Signature` header, the `Digest` header, or response bodies.

## Starting the application

```bash
pnpm dev
```

- API: <http://127.0.0.1:3000>
- UI: <http://127.0.0.1:5173>

The UI proxies `/api` to `PORT` (default 3000). Vite reads the same `.env.local` and `.env` files as the API, so a `PORT` in either file is used by both.

```bash
pnpm build
pnpm start
```

`pnpm start` serves the API and, after `pnpm build`, the built UI on `PORT`.

Other commands:

```bash
pnpm typecheck
pnpm test
pnpm test:coverage
pnpm lint
```

## Searching transactions

Open **Transaction Search**. The date-range dropdown defaults to **Last 7 Days**. Options are Last 1 Hour, Today, Yesterday, Last 7 Days, This Month, Last 30 days, and Custom. Custom shows a start date and an end date. Those calendar dates are Eastern Time: the start is 12:00 AM, and the end date runs through the end of that day by using the next Eastern midnight as an exclusive bound.

Every search sets `timezone` to `America/New_York` and adds `orderInformation.amountDetails.currency:USD`. The documented bracket form `currency:[USD]` is a range expression, and Transaction Search rejects it. Currency and application are not filters. The results table still shows currency and applications when Cybersource returns them. Relative ranges are calculated in Eastern Time when Search is clicked, including EST/EDT. The query sends those bounds as UTC epoch milliseconds because this API rejects ISO-8601 timestamps in `submitTimeUtc`. The end is exclusive. Paging resends that same `searchedAt` instant, so the window does not move between pages.

Every search also adds `clientReferenceInformation.code:<prefix>*`. `<prefix>` is `CYBERSOURCE_MERCHANT_REFERENCE_PREFIX` from the server environment. The browser cannot change it. Transaction Search expresses a prefix with a trailing wildcard, and that wildcard must have at least three characters before `*`. A prefix shorter than three characters, or one that contains anything other than letters and digits, is rejected at startup. The app does not drop rows in the browser after Cybersource returns them, because `offset`, `limit`, and `totalCount` belong to the query Cybersource already ran.

When the merchant reference field has a value, the server trims it and prepends the prefix if the value does not already start with that prefix. The check is case-sensitive. `12345` with prefix `ABC` is searched as `ABC12345`. `ABC12345` stays `ABC12345`. `XYZ12345` becomes `ABCXYZ12345`. An empty field adds no exact reference, and the prefix wildcard still applies. The exact value is ANDed with the wildcard, the date range, and any request ID or amount.

| Filter | Query field |
| --- | --- |
| Date range | `submitTimeUtc:[startMillis TO endMillis}` with an exclusive end |
| Merchant reference prefix | Always `clientReferenceInformation.code:<prefix>*` |
| Merchant reference number | `clientReferenceInformation.code` after the prefix rule above |
| Request ID | `id` |
| Amount | `orderInformation.amountDetails.totalAmount` |
| Currency | Always `orderInformation.amountDetails.currency:USD` |
| Page | `offset` and `limit` (limit 1–100) |
| Sort | `submitTimeUtc` and/or `id`, `asc` or `desc` |

Transaction status and application name are not documented as filters on this screen. `save` is always `false`, so this tester does not create a saved search on the merchant account.

The results table shows transaction date, request ID, merchant reference number, amount, currency, applications, and email when those values are present. A missing value is marked “Not returned”. Choose a request ID to open Transaction Details. **Raw JSON** shows the Cybersource body, including fields this UI does not have a column for.

The Transaction Date column formats `submitTimeUtc` in `America/New_York` as `MM/DD/YYYY hh:mm:ss AM/PM` followed by `EST` or `EDT`. The zone follows Eastern Standard Time and Eastern Daylight Time. The browser timezone is not used. The row still holds the original UTC timestamp from Cybersource, and sorting still sends `submitTimeUtc`. A missing or invalid timestamp stays “Not returned”.

## Retrieving transaction details

Open **Transaction Details**, paste a request ID, or follow one from search. The page calls `GET /tss/v2/transactions/{id}`.

Sections:

1. Order information
2. Transaction history and related identifiers
3. Customer information (`buyerInformation`, `billTo`, `shipTo`)
4. Request information
5. Payment information
6. Processing information, including `processorInformation` AVS and card-verification codes
7. Point of sale information
8. Line items
9. Merchant-defined data
10. Application information

Each section says when its object was not returned. An empty line-item or merchant-defined list is described as empty, which is different from missing. Related request IDs are shown only when this response includes them. One details call does not reconstruct the Business Center transaction history.

Application names, reason codes, AVS codes (`processorInformation.avs.code`), and card-verification codes (`processorInformation.cardVerification.resultCode`) are shown with documented descriptions. Unknown codes keep their original value. `avs.codeRaw` and `cardVerification.resultCodeRaw` are shown separately. Cybersource says not to evaluate AVS from the raw processor code.

Reason code `100` means that application succeeded. It does not mean the card was settled. Settlement is `ics_bill`. Codes such as `110` (partial approval), `480` (Decision Manager review), and `520` (issuer approved, declined by Smart Authorization) are not shown as generic failures.

The **Raw JSON** tab can show the complete payload or a sanitized copy. Copy and export of sanitized JSON redact `paymentInformation.card.number`, bank account numbers, and card security codes. Masked prefix and suffix values and request IDs stay.

## Automated tests

`pnpm test` uses Vitest and the illustrative fixtures in [`fixtures/`](fixtures/README.md). Those fixtures were written from the documented response shape. They are not captures of a live merchant. Tests do not need merchant credentials.

Coverage:

```bash
pnpm test:coverage
```

## Optional sandbox tests

The smoke test is read-only. It searches the last day and, only if you set `CYBERSOURCE_SMOKE_REQUEST_ID`, retrieves that existing transaction. It does not create a payment.

```bash
pnpm test:sandbox
```

That command sets `CYBERSOURCE_LIVE_TESTS=true` and reads credentials from `.env.local` and `.env`. It fails if the variables are missing or Cybersource rejects the signature.

## Troubleshooting

| HTTP status | What it usually means |
| --- | --- |
| 400 | The local validation failed, or Cybersource rejected the query. The message says which one. |
| 401 | Signature failure. Check the merchant ID, key ID, Base64 shared secret, environment, and host. A decoded or truncated secret will not match. |
| 403 | The key is not allowed to call Transaction Search for this merchant. |
| 404 | The request ID was not found. Cybersource also documents a short indexing delay and suggests retrying a new transaction after about five minutes. This app reports that and does not retry on its own. |
| 429 | Rate limit. Wait and honor `Retry-After` when Cybersource sends it. |
| 500, 502, 503 | Cybersource or the network path failed. The client does not automatically retry. |
| 504 | The local timeout elapsed. Transaction Details is documented to sometimes take longer than two minutes. Raise `CYBERSOURCE_TIMEOUT_MS` up to 180000. |

A successful HTTP response from search or details only means Cybersource returned a payload. Read the application reason codes before treating a transaction as accepted, reviewed, declined, or settled.

## Documentation differences

These are differences between sources, or between the docs and this tester. They are not guesses about fields that were never described.

- Current [HTTP Signature Authentication](https://developer.cybersource.com/docs/cybs/en-us/platform/get-started/all/rest/get-started-rest/authentication/GenerateHeader/httpSignatureAuthentication.html) signs the `Date` header. An older REST getting-started page signs `v-c-date`. This app follows the current `Date` scheme.
- The search example shows `"save": "save"`. That value is not a boolean and reads as a placeholder. API usage elsewhere treats `save` as a boolean. This tester always sends `false`.
- The query-field list’s request-ID row lost its field name in the rendered docs. The description matches the platform request ID, and search summaries use `id`, so the filter is sent as `id`.
- Transaction status is not in the supported query-field list. Application name is searchable in the API (`applicationInformation.applications.name`), and this tester does not send it. The currency example `orderInformation.amountDetails.currency:[USD]` is rejected by the query parser; this tester sends `orderInformation.amountDetails.currency:USD`. `submitTimeUtc` ranges use UTC epoch milliseconds. Search requests send `Accept: application/json`. Transaction details keep `Accept: application/hal+json;charset=utf-8`.
- Prefix matching on `clientReferenceInformation.code` uses a trailing wildcard, for example `clientReferenceInformation.code:ABC*`. The [search best practices](https://developer.cybersource.com/docs/cybs/en-us/txn-search/developer/all/rest/txn-search/txn-best-practice.html) require at least three characters before `*`. Accepted examples include `123*` and `ABCD*`. Unsupported examples include `*ABC`, `A*`, `AB*`, and `12*`. This tester requires the configured prefix to satisfy that rule and sends the wildcard from the server on every search. Orbit still does not index `POST /tss/v2/searches`, so this syntax comes from the Transaction Search guide.
- The services table calls `ics_score` “Advanced Fraud Screen”, `ics_auth_reversal` “Card Full Authorization Reversal”, and `ics_dcc` “DCC Lookup”. The screen uses Fraud Screening, Authorization Reversal, and Dynamic Currency Conversion Lookup, and it shows the services-table name when the wording differs.
- Reason-code text comes from the [Simple Order reason code reference](https://developer.cybersource.com/docs/cybs/en-us/reason-codes-so/reference/all/so/reason-codes-so/reason-codes-so.html). Transaction Search returns those numbers on applications. A separate REST-only reason-code catalog for TSS was not found.
- AVS descriptions are from [AVS Codes for Other Processors](https://developer.cybersource.com/docs/cybs/en-us/avs-codes/reference/all/na/avs-codes/avs-codes-intro/avs-codes-other-processors.html), which is the general table linked from the AVS introduction. Visa Platform Connect can return a different processor-specific set in `codeRaw`.
- Card-verification descriptions are the Cybersource CVN table published for `processorInformation.cardVerification.resultCode` consumers: [CVN Codes](https://developer.cybersource.com/docs/cybs/en-us/sa/developer/all/sa-hosted/secure-acceptance/sa-cvn-codes.html).
- The public Orbit index used while building this app did not include `POST /tss/v2/searches` or `GET /tss/v2/transactions/{id}`. The client follows the Transaction Search guide instead.

## Official references

- [Transaction Search and Details API](https://developer.cybersource.com/docs/cybs/en-us/txn-search/developer/all/rest/txn-search.html)
- [Creating a search request](https://developer.cybersource.com/docs/cybs/en-us/txn-search/developer/all/rest/txn-search/txn-search-intro/txn-search-request.html)
- [Filtering by query parameter](https://developer.cybersource.com/docs/cybs/en-us/txn-search/developer/all/rest/txn-search/txn-search-intro/txn-filtering.html)
- [Best practices for implementing searches](https://developer.cybersource.com/docs/cybs/en-us/txn-search/developer/all/rest/txn-search/txn-best-practice.html)
- [submitTimeUtc filtering](https://developer.cybersource.com/docs/cybs/en-us/txn-search/developer/all/rest/txn-search/txn-search-intro/txn-filtering/txn-search-filter-submitTimeUtc.html)
- [API reference](https://developer.cybersource.com/api/reference/api-reference.html)
- [AVS codes](https://developer.cybersource.com/docs/cybs/en-us/avs-codes/reference/all/na/avs-codes/avs-codes-intro.html)
- [Reason codes](https://developer.cybersource.com/docs/cybs/en-us/reason-codes-so/reference/all/so/reason-codes-so/reason-codes-so.html)
- [HTTP Signature Authentication](https://developer.cybersource.com/docs/cybs/en-us/platform/get-started/all/rest/get-started-rest/authentication/GenerateHeader/httpSignatureAuthentication.html)

## Bothy Board

The available Bothy Board credential can see Harbor, BothyBoard, and AgentCourses. It cannot see a board named CybersourceRestAPI. No second board was created. Implementation followed this repository’s specification rather than cards on that board.
