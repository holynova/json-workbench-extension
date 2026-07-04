# JSON Workbench Extension Product Spec

## Positioning

JSON Workbench is a privacy-first Chrome extension for repairing JSON-like input and generating developer-ready artifacts. It runs fully locally, never calls the network, and never uses AI or telemetry.

The product turns raw, incomplete, or noisy JSON-like data into:

- repaired and formatted JSON
- minified JSON
- raw-vs-repaired diff
- JSON Schema
- TypeScript definitions
- Zod definitions
- Pydantic v2 models
- semantic mock data

## Non-Negotiable Constraints

- No network access, no AI, no telemetry.
- All processing happens locally in the browser.
- Minimal Chrome permissions.
- User clipboard is read only after an explicit user click.
- Page selection is processed only through explicit right-click menu actions.
- History stores original JSON input automatically, but only locally.
- Repair behavior must be conservative and explainable.
- If repair fails, derived outputs are not generated.

## Primary Surfaces

### Side Panel

The side panel is the main interface.

- Top toolbar: paste from clipboard, import file, open full page, settings.
- Main tabs: input, outputs, history.
- Output tabs: formatted, minified, diff, JSON Schema, TypeScript, Zod, Pydantic, mock.
- Every output tab has its own copy button.
- Mock output has refresh, locale, array size, and seed controls.

### Full Page Workbench

The full page workbench is for larger payloads and longer generated code.

- Left side: input, history, repair report.
- Right side: outputs.

## Input Sources

Supported:

- Manual input.
- Clipboard, read only after user clicks a paste/check button.
- Page selected text through a context menu.
- File import for `.json`, `.txt`, and `.log`.
- JSONL as a first-class input format.
- Explicit extraction of all JSON blocks from logs or mixed text.

Not supported:

- Automatic clipboard reads.
- Automatic selection monitoring.
- Shortcut-based selection reads in v1.

Keyboard shortcuts may open the tool, but must not read selected page content.

## Repair Strategy

Core repair engine: `jsonrepair`.

Pipeline:

1. Accept raw input.
2. Strip Markdown code fences.
3. Detect JSON, JSONL, or JSON-like blocks.
4. Convert JSONL to an array.
5. Extract the most likely JSON block from noisy text by default.
6. Allow explicit extraction of all JSON blocks.
7. Repair with `jsonrepair`.
8. Validate with `JSON.parse`.
9. Generate formatted and minified JSON.
10. Generate a repair report.

Repair principles:

- Apply conservative fixes.
- Record preprocessing actions.
- Record warnings for uncertain transformations.
- Show parser diagnostics when repair fails.
- Do not generate schema, type, code, or mock outputs when repair fails.

Failure diagnostics should include:

- line and column where available
- nearby snippet
- likely cause
- suggested manual fix
- attempted repair steps

## Derived Outputs

All derived outputs are based only on the repaired valid JSON.

### JSON Schema

- Default draft: 2020-12.
- Optional draft: Draft-07.
- Default does not set `additionalProperties: false`.
- Strict object schema is an explicit option.
- Supports format inference for uuid, email, uri, date, date-time, IPv4, IPv6, phone, color, latitude, longitude, currency, amount, and price.

### TypeScript

- Prefer `interface` by default.
- Use `type` for unions, literals, and other cases that interfaces cannot express cleanly.
- Type and class names are normalized to PascalCase.
- JSON field names are preserved by default.
- Invalid identifiers are quoted.
- camelCase fields are an explicit option.

### Zod

- Generate named schema constants such as `RootSchema`.
- Preserve JSON field names by default.
- Use inferred enum and format information where appropriate.

### Pydantic v2

- Generate Pydantic v2 models by default.
- Use PascalCase class names.
- Use aliases for JSON keys that are not valid Python identifiers.

### Semantic Mock

- Local semantic rules plus `@faker-js/faker`.
- English and Chinese locales.
- Browser language can provide the default locale.
- Supports refresh, deterministic seed, array size, and custom rules.
- History stores locale and seed so previous mock output can be reproduced.

Inference priority:

1. Existing value format.
2. Key semantics.
3. Path context.
4. Sample distribution.
5. Type fallback.

## Type Inference Rules

For arrays of objects:

- Default behavior merges object shapes.
- Missing fields become optional.
- Strict union mode is an advanced option.

Enum inference:

- Modes: off, conservative, aggressive.
- Default: conservative.
- Conservative mode only infers enum-like short string sets for fields such as `status`, `type`, `kind`, `role`, `state`, `category`, `mode`, `level`, and `priority`.
- Fields such as `id`, `name`, `title`, `description`, `email`, `url`, and `address` are not inferred as enums by default.

## Custom Mock Rules

v1 supports declarative custom mock rules.

Supported rule fields:

- key or path match
- generator selection
- fixed value
- enum values
- number range
- locale override
- priority
- enabled flag

Not supported:

- JavaScript execution.
- User-supplied scripts.

Rules can be imported and exported as JSON.

## History

Storage: IndexedDB.

Automatically saved:

- raw input
- repaired JSON
- source
- repair status
- repair report summary
- input hash
- timestamps
- use count
- payload size
- top-level keys
- sensitive flag
- mock locale
- mock seed
- selected settings snapshot

Deduplication:

- Deduplicate by raw input hash.
- Same raw input updates `lastUsedAt` and `useCount`.
- Different raw inputs with the same repaired output are kept as separate records.

Privacy controls:

- private mode
- delete one history item
- clear all
- clear sensitive
- history max items

Sensitive keys include:

- password
- passwd
- pwd
- token
- secret
- apiKey
- authorization
- cookie
- session
- privateKey

Sensitive records are marked but not blocked.

## Permissions

Manifest V3 permissions should be minimal.

Target permissions:

- `sidePanel`
- `contextMenus`
- `storage`
- `clipboardRead`

Avoid unless proven necessary:

- `<all_urls>`
- host permissions
- `scripting`
- `activeTab`

Privacy checks must verify:

- no `fetch`
- no `XMLHttpRequest`
- no remote scripts
- manifest permissions stay minimal
- CSP disallows remote scripts

## Performance

- Heavy work runs in a Web Worker.
- Outputs are generated lazily.
- Size tiers:
  - 0-1 MB: full functionality.
  - 1-5 MB: full functionality with a size notice.
  - 5-20 MB: recommend full page; avoid automatic generation of all outputs.
  - 20 MB+: require confirmation; disable expensive outputs by default.
- Mock arrays use bounded sample counts.
- History enforces capacity limits.

## Testing Strategy

Unit tests:

- repair pipeline
- JSON-like block extraction
- JSONL conversion
- schema inference
- TypeScript generator
- Zod generator
- Pydantic generator
- semantic mock inference
- custom mock rules
- sensitive key detection
- history hash/dedupe
- settings migration

Golden tests:

- fixed input to schema, TypeScript, Zod, Pydantic, and mock outputs
- nested objects
- arrays with optional fields
- enums
- nullable values
- format inference
- invalid key names

Property-style tests:

- formatted and minified output must parse
- repaired JSON must parse when repair succeeds
- mock output must match inferred structure
- minify/format round trip preserves data

E2E tests:

- side panel opens
- manual input flow
- clipboard button flow
- context menu selected text flow
- file import
- JSONL handling
- copy buttons
- export
- history save/dedupe/delete
- private mode
- settings changes
- no-network guard

