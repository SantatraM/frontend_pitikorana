import { createServer } from 'vite'
import { spawn } from 'node:child_process'
import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
const executable = process.env.EDGE_PATH || 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'
const server = await createServer({ server: { host: '127.0.0.1', port: 5188, strictPort: true } })
await server.listen()
try {
  for (const width of [390, 1440]) {
    const profile = mkdtempSync(join(tmpdir(), 'pitikorana-selector-'))
    const output = await new Promise((resolve, reject) => {
      const child = spawn(executable, ['--headless', '--disable-gpu', '--no-first-run', `--user-data-dir=${profile}`, '--virtual-time-budget=90000', '--window-size=1500,1100', '--dump-dom', `http://127.0.0.1:5188/tests/contributor-selector.browser.html?width=${width}`], { windowsHide: true })
      let stdout = ''; let stderr = ''
      child.stdout.on('data', d => { stdout += d }); child.stderr.on('data', d => { stderr += d })
      const timer = setTimeout(() => { child.kill(); reject(new Error('Browser timeout')) }, 120000)
      child.on('error', reject)
      child.on('close', code => { clearTimeout(timer); code === 0 ? resolve(stdout) : reject(new Error(stderr.slice(-1500))) })
    })
    const raw = output.match(/<pre id="test-result">(.*?)<\/pre>/s)?.[1]
    if (!raw) throw new Error('Missing browser result')
    const result = JSON.parse(raw.replace(/&quot;/g, '"').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>'))
    console.log(JSON.stringify(result))
    if (!result.passed || result.width !== width) process.exitCode = 1
  }
} finally { await server.close() }
