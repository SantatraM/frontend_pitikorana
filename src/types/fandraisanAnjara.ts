export type FandraisanAnjaraContributorType = 'RAZAMBE' | 'TARANAKA' | 'SAMPANA' | 'FOYER' | 'PERSONNE'
export type FandraisanAnjaraStatus = 'ACTIF' | 'ANNULE'
export interface FandraisanAnjaraPeriodFilters { date_debut?: string; date_fin?: string }
export interface FandraisanAnjaraMaterielSummary { designation: string; unite: string; quantite: string }
export interface FandraisanAnjaraStatistics { total_argent_mga: string; nombre_contributions_actives: number; nombre_contributeurs_distincts: number; nombre_razambe_representes: number; nombre_contributions_non_determinees: number; materiels: FandraisanAnjaraMaterielSummary[] }
export interface FandraisanAnjaraRazambeSummary { id_razambe: string | null; nom_razambe_actuel: string | null; total_argent_mga: string; nombre_contributions: number; nombre_contributeurs_distincts: number; materiels: FandraisanAnjaraMaterielSummary[] }
export interface FandraisanAnjaraRazambeList { razambe: FandraisanAnjaraRazambeSummary[]; non_determine: FandraisanAnjaraRazambeSummary | null }
export interface FandraisanAnjaraLine { nature: 'ARGENT' | 'MATERIEL'; montant: string | null; devise: 'MGA' | null; designation: string | null; quantite: string | null; unite: string | null; observation: string | null; ordre: number }
export interface FandraisanAnjaraContribution { id: string; date_contribution: string; contributeur: { type: FandraisanAnjaraContributorType; id: string; libelle_snapshot: string }; rattachements_historiques: { id_razambe: string | null; id_taranaka: string | null; id_sampana: string | null; resolution_razambe: 'RESOLU' | 'NON_DETERMINE' }; observation: string | null; statut: FandraisanAnjaraStatus; revision: number; lignes: FandraisanAnjaraLine[]; total_argent_mga: string }
export interface FandraisanAnjaraContributionsByDate { date_contribution: string; contributions: FandraisanAnjaraContribution[]; total_argent_mga: string; materiels: FandraisanAnjaraMaterielSummary[] }
export interface FandraisanAnjaraRazambeDetail { groupe: 'RAZAMBE' | 'NON_DETERMINE'; id_razambe: string | null; contributions_par_date: FandraisanAnjaraContributionsByDate[]; total_argent_mga: string; materiels: FandraisanAnjaraMaterielSummary[] }
export interface FandraisanAnjaraListItem { id: string; date_contribution: string; contributeur: { type: FandraisanAnjaraContributorType; id: string; libelle_snapshot: string }; rattachements_historiques: { id_razambe: string | null; resolution_razambe: 'RESOLU' | 'NON_DETERMINE' }; statut: FandraisanAnjaraStatus; revision: number; total_argent_mga: string; materiels: FandraisanAnjaraMaterielSummary[] }
export interface FandraisanAnjaraListResponse { contributions: FandraisanAnjaraListItem[]; pagination: { page: number; limit: number; total: number; total_pages: number } }
export interface FandraisanAnjaraCreateLine { nature: 'ARGENT' | 'MATERIEL'; montant?: string; devise?: 'MGA'; designation?: string; quantite?: string; unite?: string; observation?: string | null }
export interface FandraisanAnjaraCreatePayload { date_contribution: string; type_contributeur: FandraisanAnjaraContributorType; id_contributeur: string; observation?: string | null; lignes: FandraisanAnjaraCreateLine[] }
export interface FandraisanAnjaraUpdatePayload {
  revision: number
  motif_correction: string
  date_contribution?: string
  type_contributeur?: FandraisanAnjaraContributorType
  id_contributeur?: string
  observation?: string | null
  lignes?: FandraisanAnjaraCreateLine[]
}
export interface FandraisanAnjaraMutationResult { contribution: { id: string; statut: FandraisanAnjaraStatus; revision: number } }
export interface FandraisanAnjaraHistorySnapshot {
  id?: string
  date_contribution?: string
  type_contributeur?: FandraisanAnjaraContributorType
  id_contributeur?: string
  contributeur_libelle_snapshot?: string
  id_razambe_snapshot?: string | null
  id_taranaka_snapshot?: string | null
  id_sampana_snapshot?: string | null
  resolution_razambe?: 'RESOLU' | 'NON_DETERMINE'
  observation?: string | null
  statut?: FandraisanAnjaraStatus
  revision?: number
  id_compte_modificateur?: string | null
  id_compte_annulateur?: string | null
  date_annulation?: string | null
  motif_annulation?: string | null
  lignes?: FandraisanAnjaraLine[]
}
export interface FandraisanAnjaraHistoryEvent {
  action: 'CREATION' | 'CORRECTION' | 'ANNULATION'
  revision: number
  date_action: string
  acteur: { id_compte: string; nom: string | null; prenom: string | null; nom_usage: string | null }
  commentaire: string | null
  donnees_avant: FandraisanAnjaraHistorySnapshot | null
  donnees_apres: FandraisanAnjaraHistorySnapshot | null
}
export interface FandraisanAnjaraHistoryResponse { historique: FandraisanAnjaraHistoryEvent[] }
export interface FandraisanAnjaraFoyerSelectionPersonne { id: string; nom: string; prenom: string | null }
export interface FandraisanAnjaraFoyerSelection { id: string; type_foyer: 'COUPLE' | 'MONOPARENTAL'; libelle: string; personnes: FandraisanAnjaraFoyerSelectionPersonne[] }
export interface FandraisanAnjaraFoyerSelectionResponse { foyers: FandraisanAnjaraFoyerSelection[]; pagination: { page: number; limit: number; total: number; total_pages: number } }
