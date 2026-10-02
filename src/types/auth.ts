export type AuthRole = 'MEMBRE' | 'ADMIN' | 'PASTEUR' | 'BUREAU_ZANAKA_AMPIELEZANA'

export const isBusinessManagerRole = (role: AuthRole | null | undefined) =>
  role === 'ADMIN' || role === 'PASTEUR' || role === 'BUREAU_ZANAKA_AMPIELEZANA'
export type AuthAccountStatus = 'ACTIF' | 'SUSPENDU' | 'EN_ATTENTE_MOT_DE_PASSE'

export interface AuthCompte {
  id: string
  role: AuthRole
  statut: AuthAccountStatus
}

export interface AuthPersonne {
  id: string
  nom: string
  prenom: string | null
  nom_usage: string | null
}

export interface AuthUser {
  compte: AuthCompte
  personne: AuthPersonne
}

export interface LoginPayload {
  identifiant: string
  mot_de_passe: string
}
