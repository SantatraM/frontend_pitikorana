export type TetikasaStatusCode = 'DRAFITRA' | 'EN_ATTENTE_VALIDATION' | 'VALIDE' | 'REFUSE'

export type TetikasaTransitionAction = 'SOUMISSION_VALIDATION' | 'VALIDATION' | 'REFUS' | 'RETOUR_CORRECTION'

export interface TetikasaPerson {
  id: string
  nom: string
  prenom: string | null
  nom_usage: string | null
}

export interface TetikasaListItem {
  id: string
  titre: string | null
  statut: { code: TetikasaStatusCode }
  created_by: Pick<TetikasaPerson, 'id' | 'nom' | 'prenom'>
  lieu: string | null
  lieu_non_defini: boolean
  date_debut_prevue: string | null
  date_fin_prevue: string | null
  date_creation: string
  date_modification: string
  id_soso_kevitra_source: string | null
  total_budget_calcule: string
}
export interface TetikasaResponsablePayload {
  id?: string
  id_personne: string
  type_responsabilite: 'PRINCIPAL' | 'ASSOCIE'
}

export interface TetikasaActionPayload {
  id?: string
  titre: string
  description: string | null
  id_responsable: string | null
  date_debut_prevue: string | null
  date_fin_prevue: string | null
  ordre: number
}
export type TetikasaRessourceType = 'OLONA' | 'FAHAIZA_MANAO' | 'FITAOVANA_ZAVATRA' | 'FITATERANA' | 'TOERANA' | 'HAFA'

export interface TetikasaRessourcePayload {
  id?: string
  type_ressource: TetikasaRessourceType
  description: string
  quantite: string | null
  unite: string | null
  observation: string | null
  ordre: number
}

export interface TetikasaBudgetPayload {
  id?: string
  designation: string
  quantite: string
  prix_unitaire_estime: string
  ordre: number
}

export interface TetikasaMainUpdatePayload {
  titre?: string | null
  description?: string | null
  raison?: string | null
  objectif?: string | null
  beneficiaires?: string | null
  lieu?: string | null
  lieu_non_defini?: boolean
  date_debut_prevue?: string | null
  date_fin_prevue?: string | null
  devise?: string
}

export interface TetikasaDetail {
  id: string
  id_soso_kevitra_source: string | null
  titre: string | null
  description: string | null
  raison: string | null
  objectif: string | null
  beneficiaires: string | null
  lieu: string | null
  lieu_non_defini: boolean
  periode_source_soso: string | null
  ressources_source_soso: string | null
  date_debut_prevue: string | null
  date_fin_prevue: string | null
  devise: string
  date_creation: string
  date_modification: string
  revision: string
  statut: { id: string; code: TetikasaStatusCode }
  created_by: TetikasaPerson
  responsables: Array<{ id: string; type_responsabilite: 'PRINCIPAL' | 'ASSOCIE'; date_creation: string; personne: TetikasaPerson }>
  actions: Array<{ id: string; titre: string; description: string | null; id_responsable: string | null; date_debut_prevue: string | null; date_fin_prevue: string | null; ordre: number }>
  ressources: Array<{ id: string; type_ressource: TetikasaRessourceType; description: string; quantite: string | null; unite: string | null; observation: string | null; ordre: number }>
  budget: Array<{ id: string; designation: string; quantite: string; prix_unitaire_estime: string; ordre: number }>
  total_budget_calcule: string
  historique: Array<{ id: string; action: string; commentaire: string | null; date_creation: string; acteur: TetikasaPerson }>
}
