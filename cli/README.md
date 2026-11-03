# me studio CLI

Local setup tools for coding assistants and technical users. Run from the application checkout after its existing `npm ci` setup; no new packages or global installation are required.

```sh
node cli/me-studio.mjs --help
node cli/me-studio.mjs doctor --json
node cli/me-studio.mjs providers list --env-file /path/to/settings.env --json
node cli/me-studio.mjs models list --provider openai --env-file /path/to/settings.env --json
node cli/me-studio.mjs config show --env-file /path/to/settings.env --json
node cli/me-studio.mjs config set chat.model MODEL_ID --provider openai --label 'My model' --env-file /path/to/settings.env
node cli/me-studio.mjs config set speech.voice VOICE_ID --label 'My voice' --env-file /path/to/settings.env
node cli/me-studio.mjs config set mode self-hosted --env-file /path/to/settings.env
```

Replace MODEL_ID and VOICE_ID with IDs you have verified with the relevant provider. This CLI does not discover provider models or verify account entitlement. Model lists are the locally configured lists.

`config show`, `models list` and `providers list` use the application's existing `buildCatalog` validator in `src/lib/provider-config.ts`. `config set chat.model` adds or updates that provider's local list and sets the matching default provider/model together. Writes validate the chosen file independently of shell environment, preserve unrelated assignments/comments, use an exclusive lock plus atomic replacement, and set file mode 0600. Symlinks, hardlinks, oversized files and corrupt model lists are rejected.

The CLI never automatically opens `.env.local`. Reading a file requires `--env-file`; without it, inspection uses only the current process environment. The explicit file takes precedence over shell values. Output contains safe catalog metadata and key-presence booleans, never credential values. Do not pass credentials as arguments: credential-writing commands are deliberately absent.

Exit codes: 0 success; 1 doctor found missing tools; 2 invalid command/configuration or filesystem failure. `--json` pretty-prints JSON; operational results and errors are JSON even without the flag, so assistants can parse them. Errors go to stderr. No provider API calls are made, including during doctor.

## Desktop integration boundary

This version configures the **backend env catalog**, not the Electron renderer's localStorage or the in-memory native worker. The current native production adapter fixes its OpenAI model in code; editing the env catalog does not switch that model. The application must explicitly consume a shared configuration service before CLI writes can change a running Desktop session. Results include `desktopSessionChanged: false` where relevant.

Project registration, secure key storage/import, remote model discovery and live Desktop reload are deferred until the native app has a coordinated configuration interface. The CLI does not touch its userData, chat history, project registry or credential store. It does not create files in animation projects or launch/restart/build the app.

This folder is isolated for parallel development: no root package scripts/lockfile, UI, native runtime or existing configuration files were modified to add it. An executable alias/global `me-studio` command can be packaged later with the app.

## Verification

```sh
node --test cli/runner.test.mjs
npx eslint cli/*.mjs
```

Tests use temporary synthetic env files and injected doctor results. They cover selection consistency, credential redaction, preservation of multiline values, duplicate model prevention, corrupt data, locks, symlinks, quoting, argument errors and exit codes. They do not call AI providers or change the real app configuration.
