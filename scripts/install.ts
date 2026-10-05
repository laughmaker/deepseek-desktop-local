import { execFileSync } from 'node:child_process'
import { createRequire } from 'node:module'
import { copyFileSync, existsSync, mkdirSync, readFileSync, readdirSync, renameSync, realpathSync, rmSync, writeFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
const repositoryRoot = process.env.DEEPSEEK_LOCAL_SOURCE
const expectedRoot = join(homedir(), 'Library', 'Application Support', 'DeepSeekDesktopLocal', 'source')
if (repositoryRoot !== expectedRoot || realpathSync(repositoryRoot) !== expectedRoot) throw new Error('Installer requires the dedicated DeepSeekDesktopLocal source directory')
const loadOfficial = (path: string) => import(pathToFileURL(join(repositoryRoot, path)).href)
const { writeClientBuildRecord } = await loadOfficial('scripts/client-build-environment.ts')
const { prepareDevelopmentApp } = await loadOfficial('apps/desktop/scripts/development-app.ts')
const { prepareDevelopmentProject } = await loadOfficial('apps/desktop/scripts/development-project.ts')
const { developmentRuntimeDirectory, resolveDesktopBuildTarget } = await loadOfficial('apps/desktop/scripts/desktop-build-paths.mjs')
const { DESKTOP_HOST_PROTOCOL_VERSION } = await loadOfficial('apps/desktop/src/host-protocol.ts')
const { preparePrimaryRuntime } = await loadOfficial('apps/desktop/scripts/prepare-primary-runtime.ts')

const appRoot = join(repositoryRoot, 'apps', 'desktop')
const buildRoot = join(appRoot, '.desktop-build', 'development')
const generatedBundle = join(buildRoot, 'Harness Dev.app')
const installedBundle = '/Applications/DeepSeek.app'
const legacyBundle = '/Applications/deepseek.app'
const stagingBundle = `/Applications/.DeepSeek.app-stage-${process.pid}`
const displacedBundle = `/Applications/.DeepSeek.app-old-${process.pid}`
const temporaryDirectory = join(homedir(), 'tmp', 'deepseek-desktop-local')
const backupBundle = join(temporaryDirectory, 'DeepSeek-previous.app')
const dshHome = join(homedir(), '.dsh')
const MARKDOWN_PREVIEW_THEME = `<style id="deepseek-markdown-preview-theme">
body[data-ds-dark-theme] [data-document-markdown] {
  --md-text: #e9e9e9;
  --md-text-strong: #fff;
  --md-text-muted: #a5a5a5;
  --md-border: rgb(255 255 255 / 11%);
  --md-border-strong: rgb(255 255 255 / 19%);
  --md-accent: #8ab4ff;
  --md-accent-soft: rgb(138 180 255 / 12%);
  --md-heading-1: rgb(231 77 71);
  --md-heading-2: rgb(215 148 64);
  --md-heading-3: rgb(7 170 246);
  --md-heading-4: rgb(163 110 251);
  --md-heading-5: rgb(109 215 215);
  --md-heading-6: rgb(175 191 5);
  --md-code-bg: #0c0c0c;
  --md-code-text: #d9e5ff;
  --md-table-bg: #161616;
  --md-table-head-bg: #222;
  --md-radius-sm: 6px;
  --md-radius-md: 10px;
  --md-content-width: 860px;
}

body:not([data-ds-dark-theme]) [data-document-markdown] {
  --md-text: #242424;
  --md-text-strong: #111;
  --md-text-muted: #5f6368;
  --md-border: rgb(0 0 0 / 12%);
  --md-border-strong: rgb(0 0 0 / 20%);
  --md-accent: #0969da;
  --md-accent-soft: rgb(9 105 218 / 8%);
  --md-heading-1: #c9372c;
  --md-heading-2: #9a5700;
  --md-heading-3: #006b9f;
  --md-heading-4: #7047a8;
  --md-heading-5: #147879;
  --md-heading-6: #626c00;
  --md-code-bg: #f6f8fa;
  --md-code-text: #244a7c;
  --md-table-bg: #fff;
  --md-table-head-bg: #f1f3f5;
}

[data-document-markdown] {
  box-sizing: border-box;
  width: min(100%, var(--md-content-width));
  margin-inline: auto;
  color: var(--md-text) !important;
  font-size: 13px !important;
  line-height: 1.75 !important;
  letter-spacing: .01em;
}

[data-document-markdown] > div {
  max-width: 100%;
  color: var(--md-text) !important;
  font-size: inherit !important;
  line-height: inherit !important;
}

[data-document-markdown] h1,
[data-document-markdown] h2,
[data-document-markdown] h3,
[data-document-markdown] h4,
[data-document-markdown] h5,
[data-document-markdown] h6 {
  padding-bottom: .35em;
  border-bottom: 1px solid var(--md-border);
  line-height: 1.3 !important;
}

[data-document-markdown] h1 {
  margin: 2.2em 0 .8em !important;
  padding-bottom: .45em;
  border-bottom-color: var(--md-border-strong);
  color: var(--md-heading-1) !important;
  font-size: calc(2rem - 2px) !important;
  font-weight: 750 !important;
}

[data-document-markdown] h2 {
  margin: 2em 0 .75em !important;
  color: var(--md-heading-2) !important;
  font-size: calc(1.45rem - 2px) !important;
  font-weight: 720 !important;
}

[data-document-markdown] h3 {
  margin: 1.65em 0 .55em !important;
  border-bottom: 0;
  color: var(--md-heading-3) !important;
  font-size: calc(1.15rem - 2px) !important;
  font-weight: 700 !important;
}

[data-document-markdown] h4,
[data-document-markdown] h5,
[data-document-markdown] h6 {
  margin: 1.3em 0 .45em !important;
  border-bottom: 0;
  font-weight: 680 !important;
}

[data-document-markdown] h4 { color: var(--md-heading-4) !important; }
[data-document-markdown] h5 { color: var(--md-heading-5) !important; }
[data-document-markdown] h6 { color: var(--md-heading-6) !important; }
[data-document-markdown] :is(h1, h2, h3, h4, h5, h6) strong { color: inherit !important; font-weight: inherit !important; }
[data-document-markdown] p { margin: 0 0 1em !important; }
[data-document-markdown] strong { color: var(--md-heading-1) !important; font-weight: 750 !important; }
[data-document-markdown] a,
[data-document-markdown] .fileMention { color: var(--md-accent) !important; text-decoration: none; }
[data-document-markdown] a:hover,
[data-document-markdown] a:focus,
[data-document-markdown] .fileMention:hover,
[data-document-markdown] .fileMention:focus { text-decoration: underline; }
[data-document-markdown] :is(ul, ol) { margin: 1em 0 !important; padding-left: 1.55em; }
[data-document-markdown] li { margin: .38em 0; }
[data-document-markdown] li::marker { color: var(--md-accent); font-weight: 700; }
[data-document-markdown] blockquote {
  margin: 1.25em 0 !important;
  padding: .85em 20px;
  border-left: 1.5px solid var(--md-accent);
  border-radius: 0 var(--md-radius-sm) var(--md-radius-sm) 0;
  background: var(--md-accent-soft);
  color: var(--md-text-muted) !important;
}
[data-document-markdown] .tableScroll { width: 100%; margin: 1.4em 0; }
[data-document-markdown] table {
  width: 100% !important;
  min-width: 0;
  margin: 0;
  border: 1px solid var(--md-border);
  border-radius: var(--md-radius-md);
  border-spacing: 0;
  background: var(--md-table-bg);
  table-layout: auto;
}
[data-document-markdown] thead { background: var(--md-table-head-bg); }
[data-document-markdown] th,
[data-document-markdown] td {
  padding: .75em .9em !important;
  border-right: 1px solid var(--md-border);
  border-bottom: 1px solid var(--md-border);
  text-align: left;
  vertical-align: middle;
  white-space: normal;
  overflow-wrap: anywhere;
}
[data-document-markdown] th { color: var(--md-text-strong); font-weight: 720; }
[data-document-markdown] pre {
  margin: 1.3em 0 !important;
  padding: 1em 20px !important;
  overflow-x: auto;
  border: 1px solid var(--md-border);
  border-radius: var(--md-radius-md);
  background: var(--md-code-bg);
}
[data-document-markdown] :not(pre) > code {
  padding: .16em .4em;
  border: 1px solid var(--md-border);
  border-radius: 5px;
  background: var(--md-code-bg);
  color: var(--md-code-text);
  font-size: .9em !important;
}
[data-document-markdown] hr {
  height: 1px;
  margin: 2.2em 0;
  border: 0;
  background: var(--md-border-strong);
}
[data-document-markdown] img {
  display: block;
  max-width: 100%;
  height: auto;
  margin: 1.25em auto;
  border: 1px solid var(--md-border);
  border-radius: var(--md-radius-md);
}
</style>`

const MARKDOWN_CHAT_THEME = `<style id="deepseek-markdown-chat-theme">
body[data-ds-dark-theme] [data-chat-flow-kind="assistant-step"] {
  --md-text: #efefef;
  --md-text-strong: #fff;
  --md-text-muted: #a5a5a5;
  --md-border: rgb(255 255 255 / 11%);
  --md-border-strong: rgb(255 255 255 / 19%);
  --md-accent: #8ab4ff;
  --md-accent-soft: rgb(138 180 255 / 12%);
  --md-heading-1: rgb(231 77 71);
  --md-heading-2: rgb(215 148 64);
  --md-heading-3: rgb(7 170 246);
  --md-heading-4: rgb(163 110 251);
  --md-heading-5: rgb(109 215 215);
  --md-heading-6: rgb(175 191 5);
  --md-code-bg: #0c0c0c;
  --md-code-text: #d9e5ff;
  --md-table-bg: #161616;
  --md-table-head-bg: #222;
  --md-radius-sm: 6px;
  --md-radius-md: 10px;
}

body:not([data-ds-dark-theme]) [data-chat-flow-kind="assistant-step"] {
  --md-text: #242424;
  --md-text-strong: #111;
  --md-text-muted: #5f6368;
  --md-border: rgb(0 0 0 / 12%);
  --md-border-strong: rgb(0 0 0 / 20%);
  --md-accent: #0969da;
  --md-accent-soft: rgb(9 105 218 / 8%);
  --md-heading-1: #c9372c;
  --md-heading-2: #9a5700;
  --md-heading-3: #006b9f;
  --md-heading-4: #7047a8;
  --md-heading-5: #147879;
  --md-heading-6: #626c00;
  --md-code-bg: #f6f8fa;
  --md-code-text: #244a7c;
  --md-table-bg: #fff;
  --md-table-head-bg: #f1f3f5;
}

[data-chat-flow-kind="assistant-step"] [data-slot="conversation.chat.node"] > div > div > div:has(> :is(p, h1, h2, h3, h4, h5, h6, ul, ol, blockquote, pre, table, hr)) {
  color: var(--md-text) !important;
  font-size: 13px !important;
  line-height: 1.75 !important;
  letter-spacing: .01em;
}

/* Thinking disclosures wrap a div rather than markdown children, so they miss
   the rule above, and their label carries its own 11px declaration. Match them
   on the stable data-variant hook instead of the hashed CSS-module class, and
   lift the label to 12px so the whole centre column shifts by the same +1. */
[data-chat-flow-kind="assistant-step"] [data-variant="think"] {
  font-size: 12px !important;
}
[data-chat-flow-kind="assistant-step"] [data-variant="think"] :is([class*="_text"], [class*="_title"]) {
  font-size: 12px !important;
}

[data-chat-flow-kind="assistant-step"] :is(h1, h2, h3, h4, h5, h6) {
  padding-bottom: .35em;
  border-bottom: 1px solid var(--md-border);
  line-height: 1.3 !important;
}

[data-chat-flow-kind="assistant-step"] h1 {
  margin: 1.45em 0 .65em !important;
  padding-bottom: .4em;
  border-bottom-color: var(--md-border-strong);
  color: var(--md-heading-1) !important;
  font-size: 1.8rem !important;
  font-weight: 750 !important;
}

[data-chat-flow-kind="assistant-step"] h2 {
  margin: 1.5em 0 .6em !important;
  color: var(--md-heading-2) !important;
  font-size: 1.4rem !important;
  font-weight: 720 !important;
}

[data-chat-flow-kind="assistant-step"] h3 {
  margin: 1.35em 0 .5em !important;
  border-bottom: 0;
  color: var(--md-heading-3) !important;
  font-size: 1.15rem !important;
  font-weight: 700 !important;
}

[data-chat-flow-kind="assistant-step"] h4,
[data-chat-flow-kind="assistant-step"] h5,
[data-chat-flow-kind="assistant-step"] h6 {
  margin: 1.15em 0 .4em !important;
  border-bottom: 0;
  font-weight: 680 !important;
}

[data-chat-flow-kind="assistant-step"] h4 { color: var(--md-heading-4) !important; }
[data-chat-flow-kind="assistant-step"] h5 { color: var(--md-heading-5) !important; }
[data-chat-flow-kind="assistant-step"] h6 { color: var(--md-heading-6) !important; }
[data-chat-flow-kind="assistant-step"] :is(h1, h2, h3, h4, h5, h6) strong { color: inherit !important; font-weight: inherit !important; }
[data-chat-flow-kind="assistant-step"] p { margin: 0 0 1em !important; }
[data-chat-flow-kind="assistant-step"] strong { color: var(--md-heading-1) !important; font-weight: 750 !important; }
[data-chat-flow-kind="assistant-step"] a,
[data-chat-flow-kind="assistant-step"] .fileLink { color: var(--md-accent) !important; text-decoration: none; }
[data-chat-flow-kind="assistant-step"] a:hover,
[data-chat-flow-kind="assistant-step"] a:focus,
[data-chat-flow-kind="assistant-step"] .fileLink:hover,
[data-chat-flow-kind="assistant-step"] .fileLink:focus { text-decoration: underline; }
[data-chat-flow-kind="assistant-step"] :is(ul, ol) { margin: 1em 0 !important; padding-left: 1.55em; }
[data-chat-flow-kind="assistant-step"] li { margin: .38em 0; }
[data-chat-flow-kind="assistant-step"] li::marker { color: var(--md-accent); font-weight: 700; }
[data-chat-flow-kind="assistant-step"] blockquote {
  margin: 1.1em 0 !important;
  padding: .75em 16px;
  border-left: 1.5px solid var(--md-accent);
  border-radius: 0 var(--md-radius-sm) var(--md-radius-sm) 0;
  background: var(--md-accent-soft);
  color: var(--md-text-muted) !important;
}
[data-chat-flow-kind="assistant-step"] .tableScroll { width: 100%; margin: 1.2em 0; }
[data-chat-flow-kind="assistant-step"] table {
  width: 100% !important;
  min-width: 0;
  margin: 0;
  border: 1px solid var(--md-border);
  border-radius: var(--md-radius-md);
  border-spacing: 0;
  background: var(--md-table-bg);
  table-layout: auto;
}
[data-chat-flow-kind="assistant-step"] thead { background: var(--md-table-head-bg); }
[data-chat-flow-kind="assistant-step"] th,
[data-chat-flow-kind="assistant-step"] td {
  padding: .65em .8em !important;
  border-right: 1px solid var(--md-border);
  border-bottom: 1px solid var(--md-border);
  text-align: left;
  vertical-align: middle;
  white-space: normal;
  overflow-wrap: anywhere;
}
[data-chat-flow-kind="assistant-step"] th { color: var(--md-text-strong); font-weight: 720; }
[data-chat-flow-kind="assistant-step"] pre {
  margin: 1.15em 0 !important;
  padding: .85em 16px !important;
  overflow-x: auto;
  border: 1px solid var(--md-border);
  border-radius: var(--md-radius-md);
  background: var(--md-code-bg);
}
[data-chat-flow-kind="assistant-step"] :not(pre) > code {
  padding: .16em .4em;
  border: 1px solid var(--md-border);
  border-radius: 5px;
  background: var(--md-code-bg);
  color: var(--md-code-text);
  font-size: .9em !important;
}
[data-chat-flow-kind="assistant-step"] hr {
  height: 1px;
  margin: 1.8em 0;
  border: 0;
  background: var(--md-border-strong);
}
[data-chat-flow-kind="assistant-step"] img {
  display: block;
  max-width: 100%;
  height: auto;
  margin: 1.1em auto;
  border: 1px solid var(--md-border);
  border-radius: var(--md-radius-md);
}
</style>`

const RIGHTBAR_DRAG_HANDLE = `<style id="deepseek-rightbar-drag-handle">
[data-side="rightbar"] {
  width: 18px !important;
  margin-left: -9px !important;
  cursor: col-resize;
  -webkit-app-region: no-drag;
}

[data-side="rightbar"]::after {
  content: '';
  position: absolute;
  top: 50%;
  left: 50%;
  width: 2px;
  height: 42px;
  border-radius: 999px;
  background: var(--dsw-alias-border-l3);
  opacity: .8;
  pointer-events: none;
  transform: translate(-50%, -50%);
  transition: height 120ms ease, width 120ms ease, background-color 120ms ease;
}

[data-side="rightbar"]:hover::after,
[data-side="rightbar"][data-dragging]::after {
  width: 3px;
  height: 60px;
  background: #8ab4ff;
  opacity: 1;
}
</style>`

const SIDEBAR_DENSITY_THEME = `<style id="deepseek-sidebar-density-theme">
/* Light-surface sidebar text scale. The app's own de-emphasised label tokens
   resolve to bluish-600 (3.58:1) against the light sidebar, which reads as dim.
   Titles and labels move up to label-primary, and the one step below them
   (section headings, timestamps, key caps) to label-secondary (5.6:1). Both
   tokens already flip per theme, so dark mode keeps its existing palette. */
[role="treeitem"][data-row-key^="workspace:"] [class*="_title"],
[role="treeitem"][data-row-key^="workspace:"] [class*="projectText"],
[role="treeitem"][data-row-key^="session:"] [class*="_title"] {
  color: var(--dsw-alias-label-primary) !important;
}

[class*="sidebarCol"] [class*="newSessionLabel"],
[class*="sidebarCol"] [class*="panelTitle"],
[class*="sidebarCol"] [class*="_label"] {
  color: var(--dsw-alias-label-primary) !important;
}

[class*="sidebarCol"] [class*="sectionLabel"] {
  color: var(--dsw-alias-label-secondary) !important;
}

[role="treeitem"][data-row-key^="session:"] [class*="_time"],
[class*="sidebarCol"] kbd {
  color: var(--dsw-alias-label-secondary) !important;
}

[role="treeitem"][data-row-key^="workspace:"] { height: 27.2px !important; }
[role="treeitem"][data-row-key^="session:"] { height: 25.6px !important; }
[role="treeitem"][data-row-key^="workspace:"] span,
[role="treeitem"][data-row-key^="session:"] span { line-height: 16px !important; }
</style>`

const SIDEBAR_LAYOUT_THEME = `<style id="deepseek-sidebar-layout-theme">
[class*="sidebarCol"] [class*="_root"] { position: relative !important; }
[class*="sidebarCol"] [class*="logoRow"] { display: none !important; }
[class*="sidebarCol"] button[class*="newSession"] {
  height: 32px !important;
  padding: 5px 12px !important;
  margin-bottom: 8px !important;
  border-radius: 10px !important;
  line-height: 18px !important;
}
[class*="sidebarCol"] [class*="panelList"] {
  position: absolute !important;
  right: 12px !important;
  bottom: 14px !important;
  z-index: 5;
  gap: 0 !important;
  margin: 0 !important;
}
[class*="sidebarCol"] [class*="panelList"] [class*="panelTitle"] { display: none !important; }
[class*="sidebarCol"] [class*="panelList"] button[class*="panelRow"] {
  width: 36px !important;
  height: 36px !important;
  min-height: 36px !important;
  justify-content: center !important;
  gap: 0 !important;
  margin: 0 !important;
  padding: 0 !important;
  border-radius: 12px !important;
}
</style>`

function run(command: string, args: string[], options: { cwd?: string } = {}): void {
  execFileSync(command, args, { cwd: options.cwd ?? repositoryRoot, stdio: 'inherit' })
}

function plist(path: string, key: string, value: string): void {
  run('/usr/libexec/PlistBuddy', ['-c', `Set :${key} ${value}`, path])
}

function replaceRequired(path: string, before: string, after: string, expected: number, previous?: string): void {
  const source = readFileSync(path, 'utf8')
  const beforeCount = source.split(before).length - 1
  const previousCount = previous === undefined ? 0 : source.split(previous).length - 1
  const afterCount = source.split(after).length - 1
  if (beforeCount === 0 && previousCount === 0 && afterCount === expected) return
  const from = beforeCount === expected ? before : previousCount === expected ? previous : undefined
  if (from === undefined) {
    throw new Error(`${path}: expected ${expected} instance(s) of ${JSON.stringify(before)} or its prior patch, found ${beforeCount} and ${previousCount}`)
  }
  writeFileSync(path, source.split(from).join(after))
}

function walkFiles(root: string, visit: (path: string) => void): void {
  for (const entry of readdirSync(root, { withFileTypes: true })) {
    const path = join(root, entry.name)
    if (entry.isDirectory()) walkFiles(path, visit)
    else if (entry.isFile()) visit(path)
  }
}

function patchBuiltBrandingAndScale(): void {
  const textExtensions = new Set(['.cjs', '.html', '.js', '.json', '.ts', '.webmanifest'])
  for (const root of [join(repositoryRoot, 'apps', 'web', 'dist'), join(appRoot, 'lib')]) {
    walkFiles(root, path => {
      if (!textExtensions.has(path.slice(path.lastIndexOf('.')))) return
      const source = readFileSync(path, 'utf8')
      const branded = source.replaceAll('DeepSeek Harness', 'DeepSeek').replaceAll('DSH Local Build', 'DeepSeek')
      if (branded !== source) writeFileSync(path, branded)
    })
  }

  const themeClient = join(repositoryRoot, 'packages', 'client', 'ui-theme', 'lib', 'client.js')
  replaceRequired(themeClient, 'fontSize: 14,', 'fontSize: 12,', 1, 'fontSize: 13,')
  replaceRequired(themeClient, 'return 14;', 'return 12;', 1, 'return 13;')
  replaceRequired(themeClient, ': 14;', ': 12;', 1, ': 13;')
  replaceRequired(
    join(repositoryRoot, 'packages', 'client', 'ui-theme', 'lib', 'types', 'theme-settings.js'),
    'DEFAULT_FONT_SIZE = 14;', 'DEFAULT_FONT_SIZE = 12;', 1, 'DEFAULT_FONT_SIZE = 13;',
  )

  const sidebarClient = join(repositoryRoot, 'packages', 'client', 'ui-sidebar', 'lib', 'client.js')
  replaceRequired(
    sidebarClient,
    '--dsh-scrollbar-thumb-hover:var(--dsw-alias-scrollbar-hover-l2);flex-direction:column;font-size:14px;display:flex}',
    '--dsh-scrollbar-thumb-hover:var(--dsw-alias-scrollbar-hover-l2);flex-direction:column;font-size:12px;display:flex}',
    1,
    '--dsh-scrollbar-thumb-hover:var(--dsw-alias-scrollbar-hover-l2);flex-direction:column;font-size:13px;display:flex}',
  )
  replaceRequired(
    sidebarClient,
    'font-size:14px;font-weight:500;line-height:22px;display:flex;position:relative;overflow:hidden;container-type:inline-size',
    'font-size:12px;font-weight:500;line-height:22px;display:flex;position:relative;overflow:hidden;container-type:inline-size',
    1,
    'font-size:13px;font-weight:500;line-height:22px;display:flex;position:relative;overflow:hidden;container-type:inline-size',
  )
  replaceRequired(
    sidebarClient,
    'height:24px;font-size:18px;font-weight:600;line-height:24px;display:inline-flex',
    'height:24px;font-size:16px;font-weight:600;line-height:24px;display:inline-flex',
    1,
    'height:24px;font-size:17px;font-weight:600;line-height:24px;display:inline-flex',
  )
  replaceRequired(
    sidebarClient,
    'white-space:nowrap;font-size:17px}',
    'white-space:nowrap;font-size:15px}',
    1,
    'white-space:nowrap;font-size:16px}',
  )

  const layoutClient = join(repositoryRoot, 'packages', 'client', 'ui-layout', 'lib', 'client.js')
  replaceRequired(
    layoutClient,
    'clampWidth(sidebar, 264, 420)', 'clampWidth(sidebar, 132, 420)', 1,
    'clampWidth(sidebar, 132, 420)',
  )
  replaceRequired(
    layoutClient,
    'clampWidth(px, 264, 420)', 'clampWidth(px, 132, 420)', 1,
    'clampWidth(px, 132, 420)',
  )

  const workspaceClient = join(repositoryRoot, 'packages', 'client', 'ui-workspace', 'lib', 'client.js')
  replaceRequired(
    workspaceClient,
    'margin-left:4px;font-size:14px;line-height:20px;overflow:hidden}',
    'margin-left:4px;font-size:12px;line-height:20px;overflow:hidden}',
    1,
    'margin-left:4px;font-size:13px;line-height:20px;overflow:hidden}',
  )
  replaceRequired(
    workspaceClient,
    'white-space:nowrap;min-width:0;font-size:14px;line-height:20px;overflow:hidden}',
    'white-space:nowrap;min-width:0;font-size:12px;line-height:20px;overflow:hidden}',
    1,
    'white-space:nowrap;min-width:0;font-size:13px;line-height:20px;overflow:hidden}',
  )
  replaceRequired(
    workspaceClient,
    'outline:none;padding:0 2px;font-size:14px;line-height:20px}',
    'outline:none;padding:0 2px;font-size:12px;line-height:20px}',
    1,
    'outline:none;padding:0 2px;font-size:13px;line-height:20px}',
  )
  // CSS module hashes include the checkout path; match the local class suffix and exact declarations.
  const hoverTitles = readFileSync(workspaceClient, 'utf8').match(/\.[A-Za-z0-9_-]+_hoverTitle\{color:#fff;overflow-wrap:break-word;font-size:1[234]px;line-height:20px\}/g) ?? []
  if (hoverTitles.length !== 1) throw new Error(`${workspaceClient}: expected exactly one hoverTitle style, found ${hoverTitles.length}`)
  const hoverTitle = hoverTitles[0]!
  if (!hoverTitle.includes('font-size:12px')) {
    replaceRequired(workspaceClient, hoverTitle, hoverTitle.replace(/font-size:1[34]px/, 'font-size:12px'), 1)
  }

  const index = join(repositoryRoot, 'apps', 'web', 'dist', 'index.html')
  const html = readFileSync(index, 'utf8')
  if (!html.includes('</head>')) throw new Error(`${index}: missing closing head tag`)
  const withoutLocalStyles = html
    .replace(/<style id="deepseek-page-scale">[\s\S]*?<\/style>/g, '')
    .replace(/<style id="deepseek-markdown-preview-theme">[\s\S]*?<\/style>/g, '')
    .replace(/<style id="deepseek-markdown-chat-theme">[\s\S]*?<\/style>/g, '')
    .replace(/<style id="deepseek-rightbar-drag-handle">[\s\S]*?<\/style>/g, '')
    .replace(/<style id="deepseek-sidebar-density-theme">[\s\S]*?<\/style>/g, '')
    .replace(/<style id="deepseek-sidebar-layout-theme">[\s\S]*?<\/style>/g, '')
  if (!readFileSync(join(repositoryRoot, 'packages', 'client', 'ui-sidebar-documentpreview', 'lib', 'client.js'), 'utf8')
    .includes('data-document-markdown')) {
    throw new Error('Markdown preview theme target was not found in the built client package')
  }
  if (!readFileSync(join(repositoryRoot, 'packages', 'client', 'ui-chat', 'lib', 'client.js'), 'utf8')
    .includes('data-chat-flow-kind')) {
    throw new Error('Assistant Markdown theme target was not found in the built client package')
  }
  if (!withoutLocalStyles.includes('</head>')) throw new Error(`${index}: missing closing head tag`)
  writeFileSync(index, withoutLocalStyles.replace('</head>', `${MARKDOWN_PREVIEW_THEME}${MARKDOWN_CHAT_THEME}${RIGHTBAR_DRAG_HANDLE}${SIDEBAR_DENSITY_THEME}${SIDEBAR_LAYOUT_THEME}</head>`))

  const buildRecordPath = join(repositoryRoot, '.dsh-build', 'client-build-environment.json')
  const buildRecord = JSON.parse(readFileSync(buildRecordPath, 'utf8')) as {
    environment: Record<string, string>
  }
  writeClientBuildRecord(repositoryRoot, { ...buildRecord.environment, DSH_CLIENT_TITLE: 'DeepSeek' })

  // The development launcher executes Electron directly, so macOS uses Electron's
  // runtime Dock image unless the app sets its dock icon explicitly.
  const mainBundle = join(appRoot, 'lib', 'main.js')
  replaceRequired(
    mainBundle,
    'WebContentsView, app, clipboard, dialog, ipcMain, nativeTheme,',
    'WebContentsView, app, clipboard, dialog, ipcMain, nativeImage, nativeTheme,',
    1,
  )
  const earlyIconSetup = "if (process.platform === 'darwin' && process.env.DSH_APP_ICON) app.dock?.setIcon(nativeImage.createFromPath(process.env.DSH_APP_ICON));\n"
  const compiledMain = readFileSync(mainBundle, 'utf8')
  if (compiledMain.includes(earlyIconSetup)) writeFileSync(mainBundle, compiledMain.replace(earlyIconSetup, ''))
  replaceRequired(
    mainBundle,
    '})) app.whenReady().then(main).catch(',
    "})) app.whenReady().then(() => { if (process.platform === 'darwin' && process.env.DSH_APP_ICON) app.dock?.setIcon(nativeImage.createFromPath(process.env.DSH_APP_ICON)); return main(); }).catch(",
    1,
  )
}

function createIcon(iconPath: string, outputPath: string): void {
  const iconset = `${outputPath}.iconset`
  rmSync(iconset, { recursive: true, force: true })
  mkdirSync(iconset, { recursive: true })
  const source = iconPath
  const representations: Array<[number, string]> = [
    [16, 'icon_16x16.png'], [32, 'icon_16x16@2x.png'],
    [32, 'icon_32x32.png'], [64, 'icon_32x32@2x.png'],
    [128, 'icon_128x128.png'], [256, 'icon_128x128@2x.png'],
    [256, 'icon_256x256.png'], [512, 'icon_256x256@2x.png'],
    [512, 'icon_512x512.png'], [1024, 'icon_512x512@2x.png'],
  ]
  for (const [size, filename] of representations) {
    run('/usr/bin/sips', ['-z', String(size), String(size), source, '--out', join(iconset, filename)])
  }
  run('/usr/bin/iconutil', ['-c', 'icns', iconset, '-o', outputPath])
  rmSync(iconset, { recursive: true, force: true })
}

function installBundle(): void {
  if (!existsSync(generatedBundle)) throw new Error(`Generated app bundle is missing: ${generatedBundle}`)
  // Keep the build-only app from claiming the installed app's Launch Services
  // identity. Otherwise Dock can pick its generic Electron icon for DeepSeek.
  plist(join(generatedBundle, 'Contents', 'Info.plist'), 'CFBundleIdentifier', 'com.deepseek.harness.desktop.local.build')
  rmSync(stagingBundle, { recursive: true, force: true })
  rmSync(displacedBundle, { recursive: true, force: true })
  run('/usr/bin/ditto', [generatedBundle, stagingBundle])

  const contents = join(stagingBundle, 'Contents')
  const infoPlist = join(contents, 'Info.plist')
  const launcher = join(contents, 'MacOS', 'HarnessDev')
  const installedLauncher = join(contents, 'MacOS', 'DeepSeek')
  const primaryRuntimeDirectory = developmentRuntimeDirectory()
  let launcherText = readFileSync(launcher, 'utf8')
  launcherText = launcherText.replaceAll(generatedBundle, installedBundle)
  launcherText = launcherText.replace(/^export DSH_HOME=.*$/m, `export DSH_HOME='${dshHome}'`)
  launcherText = launcherText.replace(/^export DSH_HOME=.*$/m, `export DSH_HOME='${dshHome}'\nexport DSH_APP_ICON='${join(installedBundle, 'Contents', 'Resources', 'deepseek-dock.png')}'\nexport DSH_DESKTOP_PRIMARY_RUNTIME_DIR='${primaryRuntimeDirectory}'\nexport DSH_DESKTOP_APP='1'`)
  // Electron refuses to start when NODE_OPTIONS carries --openssl-legacy-provider, and shell
  // profiles commonly export it globally (VS Code does). Desktop also re-reads the login-shell
  // environment and lets shell values win, so DSH_DESKTOP_APP is exported here for the user's
  // shell profile to recognise; the strip below only covers the launcher's own environment.
  launcherText = launcherText.replace(
    /^export DSH_DESKTOP_PRIMARY_RUNTIME_DIR=.*$/m,
    `$&\nNODE_OPTIONS=$(printf '%s' "\${NODE_OPTIONS-}" | sed 's/--openssl-legacy-provider//g')\nexport NODE_OPTIONS`,
  )
  writeFileSync(launcher, launcherText, { mode: 0o755 })
  renameSync(launcher, installedLauncher)

  const resources = join(contents, 'Resources')
  const iconSource = join(appRoot, 'resources', 'icon-macos.png')
  const appIcon = join(resources, 'DeepSeek.icns')
  createIcon(iconSource, appIcon)
  copyFileSync(appIcon, join(resources, 'electron.icns'))
  run('/usr/bin/sips', ['-s', 'format', 'png', appIcon, '--out', join(resources, 'deepseek-dock.png')])
  plist(infoPlist, 'CFBundleExecutable', 'DeepSeek')
  plist(infoPlist, 'CFBundleIdentifier', 'com.deepseek.harness.desktop.app')
  plist(infoPlist, 'CFBundleName', 'DeepSeek')
  plist(infoPlist, 'CFBundleDisplayName', 'DeepSeek')
  // Use the full filename so Launch Services resolves our replacement icon
  // instead of falling back to Electron's generic Dock icon.
  plist(infoPlist, 'CFBundleIconFile', 'DeepSeek.icns')
  execFileSync('/usr/bin/codesign', ['--force', '--deep', '--sign', '-', stagingBundle], { stdio: 'inherit' })
  run('/usr/bin/codesign', ['--verify', '--deep', '--strict', stagingBundle])

  const previousBundle = existsSync(installedBundle) ? installedBundle : existsSync(legacyBundle) ? legacyBundle : undefined
  if (previousBundle !== undefined) {
    mkdirSync(temporaryDirectory, { recursive: true })
    rmSync(backupBundle, { recursive: true, force: true })
    run('/usr/bin/ditto', [previousBundle, backupBundle])
    renameSync(previousBundle, displacedBundle)
  }
  try {
    renameSync(stagingBundle, installedBundle)
  } catch (error) {
    if (existsSync(displacedBundle)) renameSync(displacedBundle, installedBundle)
    throw error
  }
  rmSync(displacedBundle, { recursive: true, force: true })
  const launchServices = '/System/Library/Frameworks/CoreServices.framework/Frameworks/LaunchServices.framework/Support/lsregister'
  // The development bundle and the previous lowercase install share the
  // production bundle ID. Remove those stale registrations so Dock resolves
  // the installed DeepSeek.icns instead of Electron's generic icon.
  for (const staleBundle of [generatedBundle, legacyBundle, backupBundle]) {
    if (existsSync(staleBundle)) {
      try {
        execFileSync(launchServices, ['-u', staleBundle], { stdio: 'ignore' })
      } catch {
        // Stale backup bundles may no longer be valid Launch Services entries.
      }
    }
  }
  run(launchServices, ['-f', installedBundle])
  run('/usr/bin/mdimport', [installedBundle])
  console.log(`Installed ${installedBundle}; DSH_HOME=${dshHome}`)
}

async function main(): Promise<void> {
  mkdirSync(dshHome, { recursive: true })
  patchBuiltBrandingAndScale()

  const require = createRequire(join(appRoot, 'package.json'))
  const electron = require('electron') as string
  const version = (JSON.parse(readFileSync(join(appRoot, 'package.json'), 'utf8')) as { version: string }).version
  const pnpmVersion = (JSON.parse(readFileSync(join(appRoot, 'node_modules', 'pnpm', 'package.json'), 'utf8')) as { version: string }).version
  const release = {
    schemaVersion: 1,
    version,
    hostProtocolVersion: DESKTOP_HOST_PROTOCOL_VERSION,
    nodeVersion: execFileSync(electron, ['-p', 'process.versions.node'], {
      encoding: 'utf8', env: { ...process.env, ELECTRON_RUN_AS_NODE: '1' },
    }).trim(),
    pnpmVersion,
  }

  prepareDevelopmentProject({
    projectDir: join(buildRoot, 'project'),
    cliDir: join(repositoryRoot, 'apps', 'cli'),
    hostDir: join(repositoryRoot, 'apps', 'desktop-host'),
    dependencyDir: join(repositoryRoot, 'node_modules', '.pnpm', 'node_modules'),
    release,
    target: resolveDesktopBuildTarget(),
  })
  await preparePrimaryRuntime()

  prepareDevelopmentApp({
    electron,
    appRoot,
    directory: buildRoot,
    home: dshHome,
    userData: join(homedir(), 'Library', 'Application Support', 'DeepSeekDesktopLocal', 'electron-user-data'),
    mainPort: 9229,
    rendererPort: 9222,
    hostPort: 9230,
    openDevtools: '0',
  })
  installBundle()
}

await main().catch((error: unknown) => {
  rmSync(stagingBundle, { recursive: true, force: true })
  console.error(error instanceof Error ? error.message : error)
  process.exitCode = 1
})
