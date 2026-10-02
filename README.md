# DeepSeek Desktop Local

Personal macOS install/update automation for DeepSeek Harness. This independent repository contains local branding, font, sidebar, and Markdown customizations; it is not an official DeepSeek project.

## Usage

Requires macOS, Git, Node.js (the selected upstream version's engines requirement), npm/npx, and network access. Scripts use the exact pnpm version declared by the selected official checkout.

```sh
./scripts/install.sh
./scripts/update.sh
open /Applications/DeepSeek.app
```

Both commands run the same idempotent clone/fetch/build/install pipeline. `install.sh` creates the dedicated clone if missing; `update.sh` rebuilds the version configured in `config.json`. Change `ref` to an official release tag to select another release, or to `master` to follow upstream. `./scripts/install.sh --cached-source` skips fetching and uses an already present local release tag; it still installs dependencies and builds. This explicit option is for a migration or temporary GitHub outage, and is allowed only with a release pin. The initial pin is `dsh-v0.2.0-rc.1`, the release used by the existing local installation. This pin does not claim to be the latest release.

## Isolation and ownership

- Automation: this repository's `scripts/` and `config.json`, managed independently with Git.
- Official source: `~/Library/Application Support/DeepSeekDesktopLocal/source/`, a separate clone with its own `.git` and dependencies. Never redirect this directory through a symlink.
- Electron UI state: `~/Library/Application Support/DeepSeekDesktopLocal/electron-user-data/`.
- Installed application: `/Applications/DeepSeek.app`.
- Logs, icon generation and previous app backup: `~/tmp/deepseek-desktop-local/`.
- Existing sessions and settings: `~/.dsh`, shared with the pre-migration installation to preserve user data.

The scripts never use the daily `deepseek-harness` checkout. Official helpers are loaded from the dedicated clone. Local substitutions affect only its generated build files; tracked upstream source remains unchanged. The installer requires the exact dedicated source path. Keep the dedicated clone: this is a source-backed personal development app, not a portable distribution bundle. Updating the automation repository alone does not update the application; run the update command.

Upstream CSS changes may require maintaining the guarded substitutions in `scripts/install.ts`. A failed match stops installation. Builds finish before the running app is asked to quit; installation retains one previous app bundle and attempts rollback if the final rename fails. To restore the previous installation, quit DeepSeek and restore `~/tmp/deepseek-desktop-local/DeepSeek-previous.app` to `/Applications/DeepSeek.app`; its original source directory must still exist.

## GitHub

Public repository: [laughmaker/deepseek-desktop-local](https://github.com/laughmaker/deepseek-desktop-local). Publish only the files in this automation repository. Do not add the official clone, generated application, dependencies, logs, runtime state, or `~/.dsh`. The project has no upstream DeepSeek push remote by default.

## Changes

2026-10-02: migrated the two untracked custom scripts into this independent project; replaced relative upstream imports with dedicated-clone imports, pinned the existing release, and separated build/source/UI-state paths. The maintainer of this repository owns compatibility with later upstream releases. Migration validation and installation status are recorded in `migration.md`.
