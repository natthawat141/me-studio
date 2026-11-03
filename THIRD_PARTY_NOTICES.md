# Third-party notices

## Anuphan font

Anuphan variable font is bundled from Google Fonts (`google/fonts`, `ofl/anuphan`) under the SIL Open Font License 1.1. Copyright and the full license are preserved in `public/fonts/OFL.txt`. Bundling the existing typeface removes the application's runtime Google Fonts stylesheet request.

## Prompt Kit UI components

`src/components/prompt-kit/prompt-input.tsx` and `file-upload.tsx` are adapted from [ibelick/prompt-kit](https://github.com/ibelick/prompt-kit/tree/5a9496635cc0e1bf7679fe2a9e35d9b36b99c08a/components/prompt-kit), pinned commit `5a9496635cc0e1bf7679fe2a9e35d9b36b99c08a`. Copyright (c) 2025 Julien Thibeaut, MIT. The complete original notice is retained in `src/components/prompt-kit/LICENSE` and copied into packaged runtime notices. Changes: Base UI Tooltip `render` compatibility, IME-safe Enter, preserve focus on controls, disabled/file-only drag handling, and SSR-safe drag overlay. Composer styling and application layout are me studio code. shadcn Base UI Textarea/Tooltip/DropdownMenu/Switch were added through the official shadcn CLI; dependency versions are in package-lock.json. No DeepSeek application UI source is copied into this screen.

## Internal agent foundation

me studio uses the published npm packages `@earendil-works/pi-agent-core` 1.4.0 and `@earendil-works/pi-ai` 1.4.0 as dependencies. Upstream: https://github.com/earendil-works/pi (formerly badlogic/pi-mono). Only the programmatic agent core is integrated; no upstream coding-agent CLI, bot, terminal or UI is copied into me studio. Package integrity and transitive dependency versions are recorded in package-lock.json. TypeBox 1.3.27 is the schema dependency used by this published release.

The following notice is retained from upstream's MIT license: https://github.com/earendil-works/pi/blob/main/LICENSE. This notice does not select or replace me studio's own project license. Other dependencies retain their own licenses/notices in their distributed packages; this is not an exhaustive dependency license inventory.

```text
MIT License

Copyright (c) 2025 Mario Zechner

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

## Python agent runtime

The active agent uses the official OpenAI Python SDK (Apache-2.0); source: https://github.com/openai/openai-python. Pinned versions and transitive dependencies are in `python/requirements.lock`. CPython is distributed under the Python Software Foundation license and related included notices. PyInstaller is used to freeze the worker under its GPL terms with the bootloader distribution exception: https://pyinstaller.org/en/stable/license.html.

The build copies installed dependency license/notice files and CPython's complete `LICENSE.txt` into `runtime/python-agent/notices` alongside the frozen executable. These upstream notices do not select a me studio project license. Pi remains for the legacy Meta path and tool-schema compatibility; the active video model/tool loop is Python.
