export interface InitialisationStatut {
  initialisation_requise: boolean
}

export type ModeInitialisation = 'NOUVELLE' | 'EXISTANTE'

export interface DonneesNouvellePersonneBootstrap {
  personne: {
    nom: string
    prenom: string | null
    nom_usage: string | null
    autres_appellations: string | null
    id_sexe: string | null
    date_naissance: string | null
    annee_naissance: number | null
    lieu_naissance: string | null
    adresse: string | null
    id_ville: string | null
    id_lien: string | null
    id_element: string | null
  }
  contact: {
    whatsapp: string | null
    facebook: string | null
    lien_facebook: string | null
  }
  activites: []
  competences: []
  centres_interet: []
}

export interface NouveauPremierAdminPayload {
  mode: 'NOUVELLE'
  email: string | null
  telephone: string | null
  mot_de_passe: string
  donnees: DonneesNouvellePersonneBootstrap
}

export interface PremierAdminExistantPayload {
  mode: 'EXISTANTE'
  id_personne: string
  email: string | null
  telephone: string | null
  mot_de_passe: string
}

export type PremierAdminPayload = NouveauPremierAdminPayload | PremierAdminExistantPayload

export interface PremierAdminCree {
  compte: {
    id: string
    role: 'ADMIN'
    statut: 'ACTIF'
  }
  personne: {
    id: string
    nom: string
    prenom: string | null
    nom_usage: string | null
  }
}
