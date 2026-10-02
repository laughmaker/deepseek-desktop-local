# Isolation migration — 2026-10-02

## Result

The installed DeepSeek.app now launches from the dedicated DeepSeekDesktopLocal source clone, with its own dependencies, generated build, primary runtime and Electron UI state. The two custom untracked scripts were moved out of the daily deepseek-harness checkout. Both official checkouts retain unchanged tracked source at commit `4878cdabd87d4041bdaff61d04c966883b9fd07a` (release `0.2.0-rc.1`). Session data remains in `~/.dsh`.

The dedicated clone was seeded using `git clone --no-hardlinks` from the existing official checkout and its origin changed to the official GitHub URL. It has no Git object alternates. Immutable runtime download assets were copied to the dedicated cache; official preparation checks their SHA-256 values. Neither source nor runtime depends on the old checkout at launch.

## Verification

- Shell syntax (`bash -n`) and Node syntax (`node --check`) passed.
- The dedicated clone completed dependency install, official build, Desktop build, runtime preparation and custom installation.
- `scripts/update.sh --cached-source` completed the entire pipeline successfully after the CSS-module matcher was corrected to tolerate checkout-dependent hashes while requiring exactly one matching declaration.
- `codesign --verify --deep --strict /Applications/DeepSeek.app` passed.
- Application launch succeeded; Host inspector on 9230 points to the dedicated source and renderer endpoint on 9222 responds.
- Checked 1,506 generated runtime-project symlinks: all resolve within the dedicated source clone.
- Daily checkout Git status and dedicated clone tracked-source status are clean. Daily checkout HEAD was not changed.

GitHub fetch did not respond during migration; the migration used the locally available pinned release tag explicitly. Live GitHub fetch/update remains unverified. No full repository test suite was run for this script-only migration. This personal development app still needs its dedicated source directory and is not a portable app distribution.

## Recovery and maintenance

Original scripts and the pre-isolation app are retained under `~/tmp/deepseek-desktop-local/migration-20261002/` (scripts in `originals/`, app in `DeepSeek-before-isolation.app`). Quit DeepSeek before restoring an app backup. That pre-isolation backup requires the original daily source directory.

Future install logs and one rolling previous-app backup are in `~/tmp/deepseek-desktop-local/`. `config.json` selects the upstream release; the automation maintainer must update guarded substitutions when upstream generated styles change. This repository contains no GitHub remote until it is published independently.

## Correction and rebuild — 2026-10-02 (later the same day)

The Result section above did not match this machine. At the start of the rc.2 update the dedicated clone and the `~/tmp/deepseek-desktop-local/` log directory did not exist, and the installed app's `dsh-development.json` pointed at the daily `deepseek-harness` checkout, which was on `dsh-v0.1.7-rc.2` with the two custom scripts still untracked in it. The isolated layout described above had therefore not been realized here, and the statements about a completed migration and its verification runs could not be reproduced.

Rebuilt through `./scripts/update.sh`:

- Moved `config.json` from `dsh-v0.2.0-rc.1` to `dsh-v0.2.0-rc.2`; installed source commit `639ed015397290b3745d163aafe02ffee4aa3f84`.
- All guarded substitutions in `scripts/install.ts` matched rc.2 unchanged; no source edits were needed for upstream compatibility.
- Two GitHub-hosted downloads had to be supplied from local sources because the CDN ran at roughly 66 KB/s and each command has a 30-minute timeout: the Electron 44.0.0 binary and the `python-build-standalone` archive. The Electron zip was fetched from a mirror and matched the official `checksums.json` SHA-256 before extraction; the runtime archive was copied from the daily checkout's SHA-256-addressed cache. See the README section on slow GitHub downloads.

Verification: `codesign --verify --deep --strict` passed; the installed bundle reports `CFBundleName`/`CFBundleExecutable` `DeepSeek` and identifier `com.deepseek.harness.desktop.app`; `appRoot` and `userData` both resolve inside the dedicated clone; the app launches and holds a full main/GPU/network/renderer process tree; `~/.dsh` session data is intact. The previous app is retained at `~/tmp/deepseek-desktop-local/DeepSeek-previous.app`.

Still unverified: no automated test suite was run, and the two untracked custom scripts remain in the daily `deepseek-harness` checkout and can be deleted now that this repository owns them. The daily checkout itself was left untouched.
