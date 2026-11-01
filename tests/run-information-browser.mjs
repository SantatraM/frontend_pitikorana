import { createServer } from 'vite'
import { spawn } from 'node:child_process'
import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
const executable = process.env.EDGE_PATH || 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'
const server = await createServer({ server: { host: '127.0.0.1', port: 5189, strictPort: true } })
await server.listen()
async function render(width) {
  const profile = mkdtempSync(join(tmpdir(), 'pitikorana-information-'))
  return new Promise((resolve, reject) => {
    const child = spawn(executable, ['--headless', '--disable-gpu', '--no-first-run', `--user-data-dir=${profile}`, `--virtual-time-budget=${process.env.INFORMATION_TIME_BUDGET || 120000}`, '--window-size=1500,1100', ...(process.env.INFORMATION_SCREENSHOT_DIR ? [`--screenshot=${join(process.env.INFORMATION_SCREENSHOT_DIR, `information-${process.env.INFORMATION_CAPTURE ? 'admin-' : ''}${width}.png`)}`] : []), '--dump-dom', `http://127.0.0.1:5189/tests/information.browser.html?width=${width}${process.env.INFORMATION_CAPTURE ? '&capture=admin' : ''}`], { windowsHide: true })
    let stdout = ''; let stderr = ''
    child.stdout.on('data', d => { stdout += d }); child.stderr.on('data', d => { stderr += d })
    const timer = setTimeout(() => { child.kill(); reject(new Error('Browser process timeout')) }, 180000)
    child.on('error', error => { clearTimeout(timer); reject(error) })
    child.on('close', code => { clearTimeout(timer); code === 0 ? resolve(stdout) : reject(new Error(`Browser process exited (${code}): ${stderr.slice(-600)}`)) })
  })
}
try {
  for (const width of (process.env.INFORMATION_WIDTHS ? process.env.INFORMATION_WIDTHS.split(',').map(Number) : [320, 390, 768, 1024, 1440])) {
    let raw
    // Retry only a failed browser process/missing report, never a failed scenario.
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const output = await render(width)
        raw = output.match(/<pre id="test-result"[^>]*>(.*?)<\/pre>/s)?.[1]
        if (!raw) throw new Error('Missing browser report')
        break
      } catch (error) {
        if (attempt === 1) throw error
        console.log(`Edge interrupted at ${width}px; retrying once with a fresh temporary profile.`)
      }
    }
    const result = JSON.parse(raw.replace(/&quot;/g, '"').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>'))
    console.log(JSON.stringify(result))
    if (!result.passed || result.width !== width) process.exitCode = 1
  }
} finally { await server.close() }
