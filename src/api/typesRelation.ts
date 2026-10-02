import { apiClient } from './apiClient'
import type { ApiSuccess } from '../types/api'
import type { TypeRelation } from '../types/relationsPersonne'

type Raw = Record<string, unknown>
const record = (value: unknown): Raw => value !== null && typeof value === 'object' && !Array.isArray(value) ? value as Raw : {}
const text = (value: unknown): string | null => typeof value === 'string' && value ? value : null

function normalize(value: unknown): TypeRelation {
  const raw = record(value)
  return {
    id: text(raw.id ?? raw._id) ?? '',
    code: text(raw.code ?? raw._code),
    id_inverse_defaut: text(raw.id_inverse_defaut ?? raw._id_inverse_defaut),
    id_inverse_masculin: text(raw.id_inverse_masculin ?? raw._id_inverse_masculin),
    id_inverse_feminin: text(raw.id_inverse_feminin ?? raw._id_inverse_feminin),
    id_traduction: text(raw.id_traduction ?? raw._id_traduction),
    id_langue: text(raw.id_langue ?? raw._id_langue),
    code_langue: text(raw.code_langue ?? raw._code_langue),
    nom_langue: text(raw.nom_langue ?? raw._nom_langue),
    libelle: text(raw.libelle ?? raw._libelle),
  }
}

export async function getTypesRelation(lang = 'fr') {
  const response = await apiClient<ApiSuccess<unknown[]>>(`/api/types-relation/langue/${encodeURIComponent(lang)}`)
  return { success: true as const, data: (response.data ?? []).map(normalize) }
}
