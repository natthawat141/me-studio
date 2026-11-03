# Readable Markdown and grounded creative replies

## Accepted direction

The supplied ChatGPT/DeepSeek screenshots define the existing visual direction: neutral light/dark surfaces, clear headings and paragraphs, real lists and shot tables, thin gray rules, no added response cards or decorative labels. Use the existing Anuphan typeface, chat palette and column alignment. Preserve the user's literal text and all saved history. Assistant bodies render Markdown instead of one preformatted paragraph.

## Implementation

Use MIT react-markdown plus remark-gfm for semantic formatting and tables. Keep raw HTML disabled and remote images out of Markdown; actual media continues through scoped local-file cards. Preserve response source rather than stripping link syntax. Code blocks/tables scroll within the answer at narrow widths. Tune paragraph/list rhythm and moderate heading weights without thick borders.

Update creative instructions to answer with a concrete recommendation and relevant rationale, strengthen the user's idea with motivation/pacing/setup/payoff, use a shot table when helpful, distinguish proposed timings from agreed constraints, and ask only consequential missing questions. Avoid generic flattery, unrequested emoji and rigid response templates. This changes guidance, not model weights or a guarantee of quality. Historical response wording is preserved.

## Acceptance

Old and new replies render emphasis/headings/lists/tables/code; source survives persistence. No raw HTML/script/remote-image execution; unsafe link protocols are inert. Tables and code do not overflow the page on mobile. Existing media cards, composer, model selection and draft behavior remain intact. Verify isolated UI in light/dark/mobile, native packaged UI, unit/lint/build, and document live-model evaluation as separate.

## Verification evidence

- Before implementation the native-response fixture failed to find a semantic heading because the response was one plain paragraph.
- Final production build, lint, TypeScript and API checks passed. Unit suite: 69 passed; Python suite: 5 passed.
- Final isolated UI suite: 44 passed. Markdown regression covers native-response source preservation, semantic headings/emphasis/lists/tables/code, blocked active HTML/JavaScript/remote-image loading, light/dark screenshots and a 390px viewport with contained table scrolling. Existing attachment, model, draft and Files regressions passed.
- npm run desktop:build passed. Reopened the packaged Mac app and inspected the user's existing conversation: emphasis and numbered lists now have native semantic accessibility nodes, no literal Markdown asterisks, and messages/attachments were preserved.
- Inspected desktop dark and mobile screenshots. Source dependencies are exact MIT versions; existing package versions were unchanged. Both direct-package licenses are bundled in runtime notices.
- No paid live-provider request was made. Updated directing guidance has not yet been evaluated against real model output; layout tests are not evidence of improved reasoning.

Implementation references: [react-markdown](https://github.com/remarkjs/react-markdown) and [remark-gfm](https://github.com/remarkjs/remark-gfm).
