import { readFileSync, existsSync, mkdirSync, realpathSync, openSync, closeSync, rmdirSync } from 'node:fs'
import { homedir } from 'node:os'
import { join, resolve } from 'node:path'
import { execFileSync, spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const project = resolve(fileURLToPath(new URL('..', import.meta.url)))
const config = JSON.parse(readFileSync(join(project, 'config.json'), 'utf8'))
if (process.platform !== 'darwin') throw new Error('This installer supports macOS only')
if (config.repository !== 'https://github.com/deepseek-ai/deepseek-harness.git' || typeof config.ref !== 'string' || !/^[A-Za-z0-9._/-]+$/.test(config.ref) || config.ref.startsWith('-')) throw new Error('Invalid official repository or Git ref')
const state = join(homedir(), 'Library', 'Application Support', 'DeepSeekDesktopLocal')
const source = join(state, 'source')
const logs = join(homedir(), 'tmp', 'deepseek-desktop-local')
mkdirSync(state, { recursive: true })
mkdirSync(logs, { recursive: true })
// Refuse symlinked state/source so configuration cannot redirect builds into another checkout.
if (realpathSync(state) !== state || (existsSync(source) && realpathSync(source) !== source)) throw new Error('Dedicated source/state directories must not be symlinks')
const lock = join(state, 'install.lock')
try { mkdirSync(lock) } catch { throw new Error(`Another install may be running. If interrupted, remove the empty lock directory: ${lock}`) }
const log = join(logs, `install-${new Date().toISOString().replaceAll(':', '-')}.log`)
const descriptor = openSync(log, 'a')
function run(label, command, args, cwd = source) {
  console.log(label)
  const result = spawnSync(command, args, { cwd, timeout: command === 'git' ? 180000 : 1800000, stdio: ['ignore', descriptor, descriptor], env: { ...process.env, DEEPSEEK_LOCAL_SOURCE: source, TMPDIR: logs } })
  if (result.error || result.status !== 0) {
    console.error(readFileSync(log, 'utf8').split('\n').slice(-60).join('\n'))
    throw new Error(`${label} failed; full log: ${log}`, { cause: result.error })
  }
}
function git(args) { return execFileSync('git', ['-C', source, ...args], { encoding: 'utf8' }).trim() }
try {
  if (!existsSync(source)) run('Cloning official source into dedicated directory…', 'git', ['clone', config.repository, source], state)
  if (git(['remote', 'get-url', 'origin']) !== config.repository) throw new Error('Dedicated clone has an unexpected origin')
  if (git(['status', '--porcelain', '--untracked-files=no'])) throw new Error('Dedicated clone has tracked changes; commit or restore them before updating')
  const cached = process.argv.slice(2).includes('--cached-source')
  if (process.argv.slice(2).some(arg => arg !== '--cached-source')) throw new Error('Unknown option')
  if (cached && !config.ref.startsWith('dsh-v')) throw new Error('Cached-source mode requires a pinned release tag')
  if (!cached) run('Fetching configured version…', 'git', ['-c', 'http.version=HTTP/1.1', 'fetch', 'origin', config.ref])
  run('Selecting configured version…', 'git', ['checkout', '--detach', cached ? `refs/tags/${config.ref}` : 'FETCH_HEAD'])
  const manifest = JSON.parse(readFileSync(join(source, 'package.json'), 'utf8'))
  if (!/^pnpm@\d+\.\d+\.\d+$/.test(manifest.packageManager)) throw new Error('Unsupported package manager declaration')
  const pnpm = ['--yes', manifest.packageManager]
  run('Installing locked dependencies…', 'npx', [...pnpm, 'install', '--frozen-lockfile'])
  run('Building official application…', 'npx', [...pnpm, 'run', 'build:official'])
  run('Building Desktop shell…', 'npx', [...pnpm, '--dir', join(source, 'apps', 'desktop'), 'run', 'build'])
  // Quit only after all builds pass, immediately before replacing the installed bundle.
  const running = spawnSync('pgrep', ['-f', '^/Applications/(deepseek|DeepSeek)\\.app/Contents/MacOS/Electron '])
  if (running.status === 0) {
    execFileSync('osascript', ['-e', 'tell application id "com.deepseek.harness.desktop.app" to quit'])
    for (let attempt = 0; attempt < 30; attempt++) {
      if (spawnSync('pgrep', ['-f', '^/Applications/(deepseek|DeepSeek)\\.app/Contents/MacOS/Electron ']).status !== 0) break
      execFileSync('/bin/sleep', ['1'])
    }
    if (spawnSync('pgrep', ['-f', '^/Applications/(deepseek|DeepSeek)\\.app/Contents/MacOS/Electron ']).status === 0) throw new Error('DeepSeek did not quit; installation stopped')
  }
  run('Installing custom Desktop app…', 'npx', [...pnpm, 'exec', 'tsx', join(project, 'scripts', 'install.ts')])
  console.log(`Installed source commit: ${git(['rev-parse', 'HEAD'])}\nLog: ${log}`)
} finally { closeSync(descriptor); rmdirSync(lock) }
