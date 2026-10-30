import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import ts from 'typescript'

const read = (path) => readFile(new URL(path, import.meta.url), 'utf8')

test('permissions, confirmation et verrouillage du workflow', async () => {
  const source = await read('./TetikasaDetailPage.tsx')
  assert.match(source, /const canDecide = user\?\.compte\.role === 'ADMIN' \|\| user\?\.compte\.role === 'PASTEUR'/)
  assert.match(source, /item\.statut\.code === 'VALIDE' && canDecide \? \['OUVRIR'\] : \[\]/)
  assert.match(source, /\{pendingAction && <div/)
  assert.match(source, /if \(!item \|\| !pendingAction \|\| busy\.current \|\| needsReload\) return/)
  assert.match(source, /busy\.current = true[\s\S]*await transitionTetikasa\(id, pendingAction, item\.revision, required \? comment\.trim\(\) : null\)/)
  assert.match(source, /await transitionTetikasa[\s\S]*const response = await getTetikasa\(id\)[\s\S]*setItem\(response\.data\)/)
  assert.match(source, /TETIKASA_REVISION_CONFLICT[\s\S]*setNeedsReload\(true\)/)
  assert.match(source, /OUVERTURE_PROJET: t\('tetikasaWorkflow\.historyOpen'\)/)
  assert.match(source, /isBusinessManagerRole\(user\?\.compte\.role\) && <section/)
  assert.match(source, /setPendingAction\(null\); if \(!needsReload\)/)
})

test('contrat API : action et révision exacte avec client simulé', async () => {
  const source = await read('../../api/tetikasa.ts')
  const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText
    .replace("import { apiClient } from './apiClient';", 'const apiClient = globalThis.__tetikasaMock;')
  const calls = []
  globalThis.__tetikasaMock = async (...args) => { calls.push(args); return { success: true } }
  try {
    const api = await import(`data:text/javascript;base64,${Buffer.from(compiled).toString('base64')}`)
    await api.transitionTetikasa('projet', 'OUVRIR', '2026-10-17T10:00:00.123456Z', null)
    assert.deepEqual(calls, [['/api/tetikasa/projet/transition', { method: 'POST', body: { action: 'OUVRIR', revision: '2026-10-17T10:00:00.123456Z', commentaire: null } }]])
  } finally { delete globalThis.__tetikasaMock }
})

test('traductions, statut et anciens workflows restent présents', async () => {
  for (const file of ['../../i18n/fr.ts', '../../i18n/mg.ts']) {
    const source = await read(file)
    for (const key of ['open', 'openStatus', 'openTitle', 'openConfirm', 'openAccept', 'openCancel', 'openSuccess', 'historyOpen']) assert.match(source, new RegExp(`\\b${key}:`))
  }
  const detail = await read('./TetikasaDetailPage.tsx')
  const list = await read('./TetikasaListPage.tsx')
  for (const source of [detail, list]) assert.match(source, /MISOKATRA: t\('tetikasaWorkflow\.openStatus'\)/)
  assert.match(detail, /\['VALIDATION', 'REFUS', 'RETOUR_CORRECTION'\]/)
  assert.match(detail, /\['SOUMISSION_VALIDATION'\]/)
})
