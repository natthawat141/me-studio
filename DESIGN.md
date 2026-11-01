# me studio — interface standard

## Direction
White content #FFFFFF, quiet navigation #F9FAFB, ink #24272D, secondary text #657180, lines #E5E7EB, action blue #0074E8. Anuphan with system fallback. Thai-first; factual labels only, no decorative eyebrows/kickers.

## Hierarchy
- A consistent application shell owns primary navigation: Studio, Projects, Library, Settings. Settings may use category navigation inside its own shell, with one quiet return link.
- One page heading. Project title and video filename have different roles; do not put them into two competing navigation bars.
- Use whitespace, typography and alignment before borders. One enclosing surface per logical group. Do not nest bordered cards solely for layout.
- Library: thumbnail and metadata form one clickable item. The thumbnail is the visual anchor; filenames stay readable. Secondary actions use a menu or appear on hover AND keyboard focus/touch access. No hover-only essential actions.
- Inputs retain clear boundaries; selected navigation uses a subtle background. Return links are not bordered primary buttons.
- Right video area: preserve aspect ratio, contain full portrait video, resize with pointer and keyboard, allow close/reopen. Playback/fullscreen belongs to the player. Downloads must distinguish existing files from new render/export.

## Interaction requirements
Every core control has a useful next step. Disconnected services explain the actual setup needed. Never provide a nonfunctional “Connect” button. Prefer contextual voice selection near narration/characters; provider credentials belong to owner/admin settings.
Preserve drafts by conversation; navigation must not silently discard work. Distinguish loading, empty, failure and disconnected states. Surface save failures and conflicts without overwriting original data.
Keyboard focus visible; accessible labels; dialogs restore focus; layouts checked at 390px, 768px and 1440px. Main task must remain reachable when a mobile sidebar is open.

## Component/CSS ownership
Reuse installed Base UI/shadcn primitives. New feature styles belong with a named feature scope; avoid appending conflicting selectors or !important overrides. Refactor the owning rule. Existing global CSS is migration debt, not an example to copy.
Visual acceptance requires inspecting actual screenshots of changed states; lint/build alone do not verify UX.

Project names edit inline on click, Enter saves, Escape cancels, blur saves nonempty edits; empty blur restores the original. Keep the editor in the same layout position. Use dialogs for multi-step or consequential decisions, not a single name field.

Composer gear opens project Agent settings in the right workspace (replacing paperclip action). Plus remains file import. Settings use grouped controls/spacing and a scrollable body with an always-reachable close/done action. On phones use a full-screen panel, contain focus and restore it to the gear on close. Video stays mounted/paused behind settings, retaining playback position.
