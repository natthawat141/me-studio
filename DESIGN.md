# me studio — interface standard

## Direction
White content #FFFFFF, quiet navigation #F9FAFB, ink #24272D, secondary text #657180, lines #E5E7EB, action blue #0074E8. Anuphan with system fallback. Thai-first; factual labels only, no decorative eyebrows/kickers.

## Hierarchy
- Desktop V1 (`/desktop`) opens on a quiet Home with centered brand/composer. Sidebar owns แชตใหม่, search, folder Projects, history and Settings. A Project groups chats with a user-selected local folder; no manual scene form is required. First send becomes a conversation with the composer below. The right artifact preview is opt-in on artifact click, never opened automatically by a reply. Use regular/light typography and thin controls. Prompt Kit owns textarea/attachment interactions; shadcn Base UI owns dialogs/menus/switches.
- Project creation asks for a name and an explicit source-folder selection in the same dialog. Show the selected folder and permit changing it before a separate Create action; cancellation of the native picker preserves the selection. Use the existing accessible dialog primitive and the light desktop theme.
- One window-wide top navigation owns sidebar collapse, new chat, current conversation title, selected-file tab and Files panel access. Keep native traffic-light clearance; avoid separate competing window strips above chat/sidebar/file content. On desktop a collapsed history sidebar becomes a narrow functional icon rail; on phones hide the rail and retain top navigation controls. Do not add inactive back/forward or pretend file tabs.
- Desktop Settings has category navigation and one detail view at a time. Separate provider configuration from the model picker. Never imply that saved model metadata is authenticated provider access. Prototype API-key fields are disabled.
- Desktop controls, including portalled dialogs, use a neutral gray keyboard-focus outline (#858B95) and neutral hover backgrounds. Keep a visible keyboard focus indicator; brand/status blue does not apply to hover/focus outlines.
- Desktop search is a wide command palette: top search input, compact grouped action/chat/file/text results, soft highlighted selection, bottom category filters. Cmd/Ctrl+K opens it; arrows/Enter navigate, Escape closes and restores focus. Groups and filters describe real available data; do not add inactive folder/Pages/Space controls.
- Search follows the user's light Codex reference: translucent off-white #FAFAFB, grayscale frosted backdrop inside the panel, a clear dimmed page outside it, diffuse low-contrast shadow, regular system typography and thin 1.25px monochrome line icons. Selected rows/filter pills use a faint neutral gray; no colored pictorial icons or blue hover/focus. Keyboard guidance stays in the accessible description rather than extra footer text.
- The legacy browser studio retains Studio, Projects, Library and Settings until a separate migration is approved; its project-specific rules below do not apply to `/desktop`.
- One page heading. Project title and video filename have different roles; do not put them into two competing navigation bars.
- Use whitespace, typography and alignment before borders. One enclosing surface per logical group. Do not nest bordered cards solely for layout.
- Library: thumbnail and metadata form one clickable item. The thumbnail is the visual anchor; filenames stay readable. Secondary actions use a menu or appear on hover AND keyboard focus/touch access. No hover-only essential actions.
- Inputs retain clear boundaries; selected navigation uses a subtle background. Return links are not bordered primary buttons.
- Right video area: preserve aspect ratio, contain full portrait video, resize with pointer and keyboard, allow close/reopen. Playback/fullscreen belongs to the player. Downloads must distinguish existing files from new render/export.
- Desktop Files opens explicitly from the top-right panel button. Native folder selection reveals a read-only expandable tree with name filter/refresh; selecting media opens its preview beside the tree, keeping chat on the left. A single breadcrumb/toolbar row contains folder/refresh/expand/close controls; its separate file-tree toggle hides only the far-right tree without remounting the player or losing playback position. Use regular small text and monochrome line icons. Narrow panels switch between the tree and preview; phones use the existing full-screen right-panel layout. Closing the panel preserves the chosen folder/selection for the current app session and restores button focus.

## Interaction requirements
Every core control has a useful next step. Disconnected services explain the actual setup needed. Never provide a nonfunctional “Connect” button. Prefer contextual voice selection near narration/characters; provider credentials belong to owner/admin settings.
Preserve drafts by conversation; navigation must not silently discard work. Distinguish loading, empty, failure and disconnected states. Surface save failures and conflicts without overwriting original data.
Keyboard focus visible; accessible labels; dialogs restore focus; layouts checked at 390px, 768px and 1440px. Main task must remain reachable when a mobile sidebar is open.

## Component/CSS ownership
Reuse installed Base UI/shadcn primitives. New feature styles belong with a named feature scope; avoid appending conflicting selectors or !important overrides. Refactor the owning rule. Existing global CSS is migration debt, not an example to copy.
Visual acceptance requires inspecting actual screenshots of changed states; lint/build alone do not verify UX.

## Legacy project routes

These rules apply to the legacy project studio, not desktop V1. Project names edit inline on click, Enter saves, Escape cancels, blur saves nonempty edits; empty blur restores the original. Keep the editor in the same layout position. Use dialogs for multi-step or consequential decisions, not a single name field.

Composer gear opens project Agent settings in the right workspace (replacing paperclip action). Plus remains file import. Settings use grouped controls/spacing and a scrollable body with an always-reachable close/done action. On phones use a full-screen panel, contain focus and restore it to the gear on close. Video stays mounted/paused behind settings, retaining playback position.

Project settings: the project menu opens a compact directory dialog with the selected source root and output folder. Source is the read-only Files scope; output is persisted configuration for future generation. Use thin neutral separators and small hover actions in both themes.
