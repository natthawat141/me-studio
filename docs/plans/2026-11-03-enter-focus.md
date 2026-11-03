# Enter and composer focus

- Reproduced before editing: sending a file with Enter temporarily disables the textarea and removes browser focus. After import the enabled textarea was not focused again. The focused-sidebar outline in the report was also rectangular because the title button did not inherit the row radius.
- Composer restores its own focus after a submission when focus was lost to the document. It does not override an explicit focus move to another control or another chat. Initial chat/open/new chat focus the composer once; settings/dialog focus-return remains independent.
- A synchronous submission guard prevents rapid reentry during file import, and held/repeated keydown Enter does not submit again. Empty submissions are ignored. Shift+Enter and IME safeguards remain in Prompt Kit.
- Sidebar title buttons inherit the row's rounded corners while retaining the neutral keyboard focus indicator. Keyboard accessibility was not removed.
- Regression failed on the original implementation (`toBeFocused`, textarea inactive). After the fix, build/lint and 11 related UI tests passed: async attachment send, repeated Enter, chat switching, IME, drafts, settings and folder Project flows.
- Updated native frontend resources after verifying no unsent files/text remained; original native UI retained under `.studio/frontend-review/ui-before-enter-focus`. No AI/provider calls were made.
