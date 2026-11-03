# UI-specific rules

Read ../../AGENTS.md, ../../DESIGN.md and ../../docs/ai-guide.md. Reuse installed Base UI/shadcn, Prompt Kit and Lucide before making a new primitive. Keep feature components/styles under their existing owner rather than scattering files at this directory root.

- `/desktop` composes studio/desktop-screen with chat, settings, preview and layout components. It is chat-first with folder Projects and no manual scene form. Project Agent settings and legacy project editor rules apply only to the existing legacy routes.
- Accepted style: white/light, regular text, thin monochrome icons, neutral hover/focus, one visual boundary per logical group. No decorative eyebrows/kickers, emoji-style icons, thick controls or nested decorative bordered cards.
- No secret/provider/native transport/business calls in components. Use hooks/services and shared contracts; do not import server-only modules. File preview uses the existing workspace service, not direct filesystem paths.
- Right panel is explicitly opened by the user. Preserve chat drafts, selected folder, aspect ratio, close/reopen and useful empty/error/loading states. Source files are escaped text, never injected with innerHTML or executed.
- Styled accessible menus/dialogs use existing primitives. Preserve keyboard focus/return, IME-safe composition, arrows/Enter/Escape, touch access and reachable close actions. Do not remove focus indicators to match a screenshot.
- Sample replies/artifacts remain labelled examples. Name-only attachments are not uploads; display metadata is not provider authentication. Every primary action must have a working next step or an honest setup message.
- Run relevant tests/ui flows after a production build; inspect actual changed screens at relevant widths and native UI when needed. Report visual verification gaps rather than inferring polish from build success.
