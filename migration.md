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
