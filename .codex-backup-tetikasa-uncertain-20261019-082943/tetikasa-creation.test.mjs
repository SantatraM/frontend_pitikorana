import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import ts from 'typescript'
import { creationPayload, validateCreation } from './tetikasaCreateValidation.ts'

const form = () => ({ general: { titre: 'Projet', description: 'Description', raison: '', objectif: 'Objectif', beneficiaires: 'Tous', lieu: 'Lieu', lieuUnknown: false, debut: '2026-01-01', fin: '2026-12-31' }, responsables: [{ person: { id: 'p1' }, principal: true }], actions: [{ titre: 'Action', description: '', responsable: 'p1', debut: '', fin: '' }], resources: [{ type: 'OLONA', description: 'Aide', quantite: '2', unite: '', observation: '' }], budget: [{ designation: 'Matériel', quantite: '2', prix: '1.25' }] })
test('payload complet pour les deux actions et devise MGA fixe', () => {
  for (const action of ['BROUILLON', 'SOUMETTRE']) {
    const payload = creationPayload(form(), action)
    assert.equal(validateCreation(form(), action), null)
    assert.equal(payload.action, action); assert.equal(payload.devise, 'MGA')
    assert.equal(payload.responsables[0].id_personne, 'p1'); assert.equal(payload.actions[0].id_responsable, 'p1')
    assert.equal(payload.ressources[0].quantite, '2'); assert.equal(payload.budget[0].prix_unitaire_estime, '1.25')
  }
})
test('validations et conservation des données en entrée', () => {
  const data = form(); data.general.titre = ' '
  assert.equal(validateCreation(data, 'BROUILLON').code, 'title'); assert.equal(data.budget[0].prix, '1.25')
  data.general.titre = 'Projet'; data.budget[0].quantite = '0'
  assert.equal(validateCreation(data, 'BROUILLON').code, 'budget')
  data.budget[0].quantite = '1'; data.general.description = ''
  assert.equal(validateCreation(data, 'SOUMETTRE').code, 'incomplete'); assert.equal(validateCreation(data, 'BROUILLON'), null)
})
test('requête de création non rejouée après 401 ou erreur réseau', async () => {
  const source = (await readFile(new URL('../../api/apiClient.ts', import.meta.url), 'utf8')).replace('import.meta.env.VITE_API_URL', 'undefined')
  const js = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText
  const client = await import(`data:text/javascript;base64,${Buffer.from(js).toString('base64')}`)
  const original = globalThis.fetch
  try {
    let count = 0
    globalThis.fetch = async () => { count++; return new Response('{}', { status: 401 }) }
    await assert.rejects(client.apiClient('/api/tetikasa', { method: 'POST', body: {}, retryAfterRefresh: false, expectedStatus: 201 }), { status: 401 })
    assert.equal(count, 1)
    for (const status of [400, 403, 409, 500]) {
      count = 0; globalThis.fetch = async () => { count++; return new Response('{}', { status }) }
      await assert.rejects(client.apiClient('/api/tetikasa', { method: 'POST', body: {}, retryAfterRefresh: false, expectedStatus: 201 }), { status })
      assert.equal(count, 1)
    }
    count = 0; globalThis.fetch = async () => { count++; throw new TypeError('network') }
    await assert.rejects(client.apiClient('/api/tetikasa', { method: 'POST', body: {}, retryAfterRefresh: false, expectedStatus: 201 }))
    assert.equal(count, 1)
    count = 0; globalThis.fetch = async () => { count++; return new Response('{}', { status: 201 }) }
    await client.apiClient('/api/tetikasa', { method: 'POST', body: {}, retryAfterRefresh: false, expectedStatus: 201 }); assert.equal(count, 1)
  } finally { globalThis.fetch = original }
})
