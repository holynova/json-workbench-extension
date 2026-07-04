# Chrome Web Store Listing Draft

## Product Details

Name: JSON Workbench

Short description:

Repair JSON and generate Schema, TypeScript, Zod, Pydantic, and mock data locally.

Category:

Developer Tools

Language:

English

## Detailed Description

JSON Workbench is a local-first developer tool for fixing JSON-like input and turning it into useful implementation artifacts.

Paste JSON, import a file, type manually, or send selected page text through the context menu. JSON Workbench repairs common JSON issues, formats the result, and generates copy-ready outputs without sending your data anywhere.

Core features:

- Repair common JSON issues such as trailing commas, unquoted keys, single quotes, incomplete brackets, JSONL, and JSON blocks inside logs.
- Format and minify repaired JSON.
- Generate JSON Schema, TypeScript definitions, Zod schemas, and Pydantic v2 models.
- Generate semantic mock data using local rules for fields such as city, email, id, URL, date, status, price, company, and name.
- Work in the Chrome Side Panel or a full-page workbench.
- Import `.json`, `.txt`, and `.log` files.
- Copy every generated output with one click.
- Keep local history in your browser with a Private mode that pauses history saving.
- Highlight repair failures directly in the editor when a line or column can be identified.

Privacy and offline behavior:

JSON Workbench is designed for sensitive developer data. It does not use AI, telemetry, analytics, remote APIs, or network calls. All repair, parsing, generation, mock data, and history storage happen locally in your browser.

The extension may store your original input and repaired JSON in local browser storage so history works. You can use Private mode to pause local history, delete individual history items, clear all history, or clear entries marked as sensitive.

## One-Sentence Value Proposition

Fix messy JSON and generate developer-ready outputs locally, with no network calls.

## Feature Bullets

- Local-only JSON repair and formatting.
- JSON Schema, TypeScript, Zod, and Pydantic generation.
- Semantic mock data in English and Chinese.
- Side Panel and full-page workbench.
- Local history with Private mode.
- Editor error highlighting for failed repairs.

## Search Keywords

JSON formatter, JSON repair, JSON schema, TypeScript generator, Zod generator, Pydantic generator, mock data, JSONL, developer tools, local JSON

## Permission Justifications

`sidePanel`:
Used to provide the primary JSON Workbench interface beside the current page.

`contextMenus`:
Used to add a "Fix selected JSON" action when users explicitly select text on a page.

`storage`:
Used for local settings, pending selected text handoff, and local history metadata.

`clipboardRead`:
Used only after the user clicks the Paste button to read clipboard text for processing.

## Data Usage Disclosure

Data collected from users:

- Website content: selected page text only when the user chooses the context menu action.
- User activity: local history of inputs processed by the user, stored only on the user's device.

Data handling:

- No data is sold.
- No data is used for advertising.
- No data is used for creditworthiness.
- No data is transferred to third parties.
- No data leaves the user's browser.
- User-provided JSON may be stored locally for history unless Private mode is enabled.

## Support Copy

Support URL:

https://github.com/holynova/json-workbench-extension/issues

Website URL:

https://holynova.github.io/json-workbench-extension/
