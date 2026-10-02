# DeepSeek Desktop Local

Personal macOS install/update automation for DeepSeek Harness. This independent repository contains local branding, font, sidebar, and Markdown customizations; it is not an official DeepSeek project.

## Usage

Requires macOS, Git, Node.js (the selected upstream version's engines requirement), npm/npx, and network access. Scripts use the exact pnpm version declared by the selected official checkout.

```sh
./scripts/install.sh
./scripts/update.sh
open /Applications/DeepSeek.app
```

Both commands run the same idempotent clone/fetch/build/install pipeline. `install.sh` creates the dedicated clone if missing; `update.sh` rebuilds the version configured in `config.json`. Change `ref` to an official release tag to select another release, or to `master` to follow upstream. `./scripts/install.sh --cached-source` skips fetching and uses an already present local release tag; it still installs dependencies and builds. This explicit option is for a migration or temporary GitHub outage, and is allowed only with a release pin. The current pin is `dsh-v0.2.0-rc.2`. This pin does not claim to be the latest release.

## NODE_OPTIONS and the desktop host

Electron refuses to start when `NODE_OPTIONS` contains `--openssl-legacy-provider`, and the Desktop host dies immediately with `dsh desktop host exited with 9`. Desktop also re-reads the user's login shell (`zsh -ilc`) at startup and lets those values win over the inherited environment, so exporting the flag in `~/.zshrc` — common for VS Code — breaks the host even when the launcher itself is clean.

The installer handles both halves: it exports `DSH_DESKTOP_APP=1` from the generated launcher and strips the flag from its own `NODE_OPTIONS`. The `DSH_` prefix matters, because Desktop only preserves launcher-owned variables matching `DSH_`/`ELECTRON_` when merging the login-shell environment. A shell profile must still honour the marker:

```sh
if [ -z "$VSCODE_RESOLVING_ENVIRONMENT" ] && [ -z "$ELECTRON_RUN_AS_NODE" ] && [ -z "$DSH_DESKTOP_APP" ]; then
  export NODE_OPTIONS=--openssl-legacy-provider
fi
```

If the host still crashes, confirm the marker reached the probe shell with `DSH_DESKTOP_APP=1 zsh -ilc 'echo "[$NODE_OPTIONS]"'` — it must print `[]`.

## Slow GitHub downloads

Both the Electron binary and the primary-runtime archives are fetched from GitHub, which can be very slow or fail outright on some networks. `manage.mjs` gives each command a fixed timeout, so a stalled download aborts the install. When that happens:

- Electron: `install.js` skips the download entirely when `dist/version`, `path.txt` and the platform binary are already present under `node_modules/.pnpm/electron@<version>/node_modules/electron/`. Download the release zip from a fast mirror, verify it against `checksums.json` in that package, extract it into `dist/`, and write `path.txt` as `Electron.app/Contents/MacOS/Electron`.
- Primary runtime: `scripts/primary-runtime/prepare.ts` caches archives in a SHA-256-addressed directory (`apps/desktop/.desktop-build/downloads`), where each file is named by its own checksum and re-verified on read. Copying archives from another checkout of the same release into that directory is therefore safe and skips the download.

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

2026-10-02: fixed `dsh desktop host exited with 9: --openssl-legacy-provider is not allowed in NODE_OPTIONS`. The host was inheriting the flag from a global `NODE_OPTIONS` export in `~/.zshrc`; `scripts/install.ts` now exports `DSH_DESKTOP_APP=1` and sanitises `NODE_OPTIONS` in the generated launcher, and `~/.zshrc` honours the marker. Backed up as `~/.zshrc.bak-20261002`. VS Code behaviour is unchanged.

2026-10-02: rebuilt the installation on release `dsh-v0.2.0-rc.2` (commit `639ed015`), moving `config.json` from `dsh-v0.2.0-rc.1`. The dedicated clone did not exist on this machine before this run, so the update was effectively a first-time isolated install; the previously running app had been launched from the daily `deepseek-harness` checkout. The guarded CSS substitutions in `scripts/install.ts` required no changes and matched rc.2 unchanged. Documented the GitHub download workarounds used to finish the install.

2026-10-02: migrated the two untracked custom scripts into this independent project; replaced relative upstream imports with dedicated-clone imports, pinned the existing release, and separated build/source/UI-state paths. The maintainer of this repository owns compatibility with later upstream releases. Migration validation and installation status are recorded in `migration.md`.
