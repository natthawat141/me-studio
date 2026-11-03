# Panel icon and terminal assessment

Removed the visible Files label and folder icon from the global panel toggle, leaving a 32px icon button with open/close accessibility labels. Removed the old mobile rule that would hide its now-only icon. Production build, focused navigation/Files UI checks and lint are the validation scope.

Terminal assessment: the application currently has no xterm/node-pty dependency or terminal IPC. Recommended reuse is @xterm/xterm for terminal emulation and Microsoft's node-pty for a real PTY, connected through owned-main-frame IPC. Both upstreams publish MIT terms; retain copyright/license notices when integrating. Official sources inspected 2026-11-03: https://github.com/xtermjs/xterm.js and https://github.com/microsoft/node-pty, including their LICENSE files. No packages installed and no shell access added in this change.

Proposed next UX: keep the global icon as a toggle; put a Files/Terminal selector inside the opened panel. Terminal sessions should survive hiding the panel, start in the chosen Project directory and be controlled by the user. Starting in a directory is not filesystem confinement; AI command execution is a separate capability. Main integration work is PTY lifecycle, resize/input/output, bounded buffering and native module packaging.

Frontend build `zCEFf9R35cKMgqFweL_1F` is staged under `.studio/panel-icon-ui-staged`. The running native app was observed with an explicitly connected AI session; it was left running, so this staged UI has not replaced its release runtime yet. Preserve the active native worker and its in-memory provider configuration.
