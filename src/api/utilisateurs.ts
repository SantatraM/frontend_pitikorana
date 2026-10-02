import { apiClient } from './apiClient'

export type Utilisateur = {
  id: string
  personne: { id: string; nom: string; prenom: string | null; nom_usage: string | null }
  contact: { email: string | null; telephone: string | null }
  role: { id: string; code: 'ADMIN' | 'PASTEUR' | 'BUREAU_ZANAKA_AMPIELEZANA' | 'MEMBRE' }
  statut: { id: string; code: 'ACTIF' | 'SUSPENDU' | 'EN_ATTENTE_MOT_DE_PASSE' }
}
type ApiResponse<T> = { success: boolean; data: T }

export const getUtilisateurs = () => apiClient<ApiResponse<Utilisateur[]>>('/api/utilisateurs')
export const updateUtilisateurRole = (id: string, role: Utilisateur['role']['code']) => apiClient<ApiResponse<Utilisateur>>('/api/utilisateurs/' + id + '/role', { method: 'PATCH', body: { role } })
export const updateUtilisateurStatut = (id: string, statut: 'ACTIF' | 'SUSPENDU') => apiClient<ApiResponse<Utilisateur>>('/api/utilisateurs/' + id + '/statut', { method: 'PATCH', body: { statut } })