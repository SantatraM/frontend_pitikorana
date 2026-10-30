import type { TetikasaCreationPayload } from '../../api/tetikasa'

export const CREATION_CURRENCY = 'MGA' as const

type Person = { id: string }
export type CreationForm = {
  general: { titre: string; description: string; raison: string; objectif: string; beneficiaires: string; lieu: string; lieuUnknown: boolean; debut: string; fin: string }
  responsables: { person: Person; principal: boolean }[]
  actions: { titre: string; description: string; responsable: string; debut: string; fin: string }[]
  resources: { type: TetikasaCreationPayload['ressources'][number]['type_ressource']; description: string; quantite: string; unite: string; observation: string }[]
  budget: { designation: string; quantite: string; prix: string }[]
}
export type CreationIssue = { step: number; code: 'title' | 'dates' | 'actions' | 'resources' | 'budget' | 'incomplete' }
const nullable = (value: string) => value.trim() || null
function decimalValid(value: string, precision: number, scale: number, positive: boolean) {
  const match = /^(\d+)(?:\.(\d+))?$/.exec(value.trim())
  return !!match && match[1].length + (match[2]?.length ?? 0) <= precision && (match[2]?.length ?? 0) <= scale && (!positive || /[1-9]/.test(value))
}
export function validateCreation(form: CreationForm, action: 'BROUILLON' | 'SOUMETTRE'): CreationIssue | null {
  const { general: g, responsables, actions, resources, budget } = form
  if (!g.titre.trim() || g.titre.trim().length > 200) return { step: 0, code: 'title' }
  if (g.debut && g.fin && g.fin < g.debut) return { step: 1, code: 'dates' }
  if (actions.length > 200 || actions.some((a) => !a.titre.trim() || a.titre.trim().length > 200 || (a.debut && a.fin && a.fin < a.debut) || (a.responsable && !responsables.some((r) => r.person.id === a.responsable)))) return { step: 2, code: 'actions' }
  if (responsables.length > 50 || responsables.filter((r) => r.principal).length > 1 || new Set(responsables.map((r) => r.person.id)).size !== responsables.length) return { step: 1, code: 'actions' }
  if (resources.length > 200 || resources.some((r) => !r.description.trim() || r.description.trim().length > 100000 || r.unite.trim().length > 100 || r.observation.trim().length > 100000 || (r.quantite.trim() && !decimalValid(r.quantite, 12, 3, true)))) return { step: 2, code: 'resources' }
  if (budget.length > 200 || budget.some((b) => !b.designation.trim() || b.designation.trim().length > 100000 || !decimalValid(b.quantite, 12, 3, true) || !decimalValid(b.prix, 18, 2, false))) return { step: 3, code: 'budget' }
  if ([g.description, g.raison, g.objectif, g.beneficiaires, g.lieu].some((s) => s.trim().length > 100000) || actions.some((a) => a.description.trim().length > 100000)) return { step: 0, code: 'incomplete' }
  if (action === 'SOUMETTRE' && (!g.description.trim() || !g.objectif.trim() || !g.beneficiaires.trim() || (!g.lieu.trim() && !g.lieuUnknown) || !g.debut || !g.fin || !responsables.length || !actions.length)) return { step: 4, code: 'incomplete' }
  return null
}
export function creationPayload(form: CreationForm, action: 'BROUILLON' | 'SOUMETTRE'): TetikasaCreationPayload {
  const g = form.general
  return { action, titre: g.titre.trim(), description: nullable(g.description), raison: nullable(g.raison), objectif: nullable(g.objectif), beneficiaires: nullable(g.beneficiaires), lieu: nullable(g.lieu), lieu_non_defini: g.lieuUnknown, date_debut_prevue: nullable(g.debut), date_fin_prevue: nullable(g.fin), devise: CREATION_CURRENCY,
    responsables: form.responsables.map((r) => ({ id_personne: r.person.id, type_responsabilite: r.principal ? 'PRINCIPAL' : 'ASSOCIE' })),
    actions: form.actions.map((a, i) => ({ titre: a.titre.trim(), description: nullable(a.description), id_responsable: nullable(a.responsable), date_debut_prevue: nullable(a.debut), date_fin_prevue: nullable(a.fin), ordre: i + 1 })),
    ressources: form.resources.map((r, i) => ({ type_ressource: r.type, description: r.description.trim(), quantite: nullable(r.quantite), unite: nullable(r.unite), observation: nullable(r.observation), ordre: i + 1 })),
    budget: form.budget.map((b, i) => ({ designation: b.designation.trim(), quantite: b.quantite.trim(), prix_unitaire_estime: b.prix.trim(), ordre: i + 1 })) }
}
