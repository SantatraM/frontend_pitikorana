import { apiClient } from './apiClient'
import type { ApiSuccess } from '../types/api'
import type { AdminDemandeInscription, CompteCree, TraitementDemandeResult, CreationComptePayload, CreationDemandePayload, DemandeCreationResult, DemandeInscription, PersonneRecherchee, RefusDemandePayload, SuiviDemandePayload, ValidationDemandePayload } from '../types/demandeInscription'

export interface PhotoTemporaireDemande { chemin_photo_temporaire: string; url_photo: string }
export const uploadPhotoTemporaireDemande = (photo: File) => { const body = new FormData(); body.append('photo', photo); return apiClient<ApiSuccess<PhotoTemporaireDemande>>('/api/demandes-inscription/photo-temporaire', { method: 'POST', body }) }
export const creerDemandeInscription = (payload: CreationDemandePayload) => apiClient<ApiSuccess<DemandeCreationResult>>('/api/demandes-inscription', { method: 'POST', body: payload })
export const suivreDemandeInscription = (payload: SuiviDemandePayload) => apiClient<ApiSuccess<DemandeInscription>>('/api/demandes-inscription/suivi', { method: 'POST', body: payload })
export const rechercherPersonnesInscription = (query: string) => apiClient<ApiSuccess<PersonneRecherchee[]>>(`/api/demandes-inscription/recherche-personne?q=${encodeURIComponent(query)}`)
export const creerCompteDepuisDemande = (payload: CreationComptePayload) => apiClient<ApiSuccess<CompteCree>>('/api/demandes-inscription/creer-compte', { method: 'POST', body: payload })

export const getDemandesInscription = () => apiClient<ApiSuccess<AdminDemandeInscription[]>>('/api/demandes-inscription')
export const getDemandeInscription = (id: string) => apiClient<ApiSuccess<AdminDemandeInscription>>(`/api/demandes-inscription/${id}`)
export const validerDemandeInscription = (id: string, payload: ValidationDemandePayload) => apiClient<ApiSuccess<TraitementDemandeResult>>(`/api/demandes-inscription/${id}/valider`, { method: 'POST', body: payload })
export const refuserDemandeInscription = (id: string, payload: RefusDemandePayload) => apiClient<ApiSuccess<TraitementDemandeResult>>(`/api/demandes-inscription/${id}/refuser`, { method: 'POST', body: payload })


