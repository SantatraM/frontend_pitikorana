export type InformationStatus = 'NOUVELLE' | 'EN_COURS' | 'TRAITEE'
export interface InformationDraft { nom: string; prenom: string; contact: string; message: string }
export interface InformationTicket { key: string; token: string; expires_at: string }
export interface InformationItem extends InformationDraft {
  id: string; origine: 'VISITEUR' | 'MEMBRE'; statut: InformationStatus
  date_creation: string; date_modification: string; revision: number
}
export interface InformationList {
  demandes: Omit<InformationItem, 'message'>[]
  pagination: { page: number; limit: number; total: number; total_pages: number }
}
