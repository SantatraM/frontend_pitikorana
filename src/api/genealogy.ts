import { apiClient } from './apiClient'
import type { ApiSuccess } from '../types/api'

export type GenealogySex = 'MASCULIN' | 'FEMININ' | null

export interface GenealogyPerson {
  id: string
  nom: string
  prenom: string | null
  sexe: GenealogySex
}

export interface GenealogySibling extends GenealogyPerson {
  origine: 'EXPLICITE' | 'DEDUITE' | 'EXPLICITE_ET_DEDUITE'
}

export interface GenealogyFamily {
  personne: GenealogyPerson
  parents: GenealogyPerson[]
  conjoints: GenealogyPerson[]
  enfants: GenealogyPerson[]
  fratrie: GenealogySibling[]
}

export interface FoyerIdentity {
  parents: string[]
}

export interface FoyerOrigine {
  statut: 'COMPLET' | 'INCOMPLET'
  identite: FoyerIdentity | null
  parents: GenealogyPerson[]
  enfants: GenealogyPerson[]
}

export interface FoyerForme {
  statut: 'COMPLET'
  type_foyer: 'COUPLE' | 'MONOPARENTAL'
  identite: FoyerIdentity
  personne: GenealogyPerson
  conjoint: GenealogyPerson | null
  enfants: GenealogyPerson[]
}

export interface FoyerPersonne {
  personne: GenealogyPerson
  foyer_origine: FoyerOrigine | null
  foyer_forme: FoyerForme | null
}
export interface GenealogyAscendantNode extends GenealogyPerson {
  generation: number
  parents: GenealogyAscendantNode[]
}

export interface GenealogyDescendantNode extends GenealogyPerson {
  generation: number
  enfants: GenealogyDescendantNode[]
}

export const getFamillePersonne = (id: string) =>
  apiClient<ApiSuccess<GenealogyFamily>>(`/api/personnes/${encodeURIComponent(id)}/famille`)

export const getAscendantsPersonne = (id: string) =>
  apiClient<ApiSuccess<GenealogyAscendantNode>>(`/api/personnes/${encodeURIComponent(id)}/ascendants`)

export const getDescendantsPersonne = (id: string) =>
  apiClient<ApiSuccess<GenealogyDescendantNode>>(`/api/personnes/${encodeURIComponent(id)}/descendants`)
export const getFoyerPersonne = (id: string) =>
  apiClient<ApiSuccess<FoyerPersonne>>(`/api/personnes/${encodeURIComponent(id)}/foyer`)