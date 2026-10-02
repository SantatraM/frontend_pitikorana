export interface Langue {
  id: string
  code: string
  nom: string
}

export interface TraductionReferentiel {
  id?: string
  id_langue: string
  code_langue?: string
  libelle: string
}

export interface DomaineActivite {
  id: string
  traductions: TraductionReferentiel[]
}

export interface Activite {
  id: string
  id_domaine_activite: string | null
  traductions: TraductionReferentiel[]
}

export interface Competence {
  id: string
  traductions: TraductionReferentiel[]
}

export interface CentreInteret {
  id: string
  traductions: TraductionReferentiel[]
}

export interface TraductionsReferentielPayload {
  traductions: Array<Pick<TraductionReferentiel, 'id_langue' | 'libelle'>>
}

export interface ActivitePayload extends TraductionsReferentielPayload {
  id_domaine_activite: string | null
}
