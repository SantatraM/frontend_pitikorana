export type StatutDemandeInscription = 'EN_ATTENTE' | 'VALIDEE' | 'REFUSEE' | 'ANNULEE'
export type VisibiliteConfidentielle = 'PRIVE' | 'MEMBRES'
export type PreferencesConfidentialite = Partial<Record<'EMAIL' | 'FACEBOOK' | 'TELEPHONE' | 'WHATSAPP' | 'ADRESSE' | 'PHOTO', VisibiliteConfidentielle>>
export interface DeclaredOriginLevel { id: string | null; nom_propose: string | null }
export interface DeclaredOrigin { razambe: DeclaredOriginLevel; taranaka: DeclaredOriginLevel; sampana: DeclaredOriginLevel }
export interface PersonneDraft { nom: string; prenom: string | null; nom_usage: string | null; autres_appellations: string | null; id_sexe: string | null; id_statut: string | null; date_naissance: string | null; annee_naissance: number | null; lieu_naissance: string | null; date_deces: string | null; annee_deces: number | null; adresse: string | null; id_ville: string | null; id_lien: string | null; id_element: string | null }
export interface ContactDraft { whatsapp: string | null; facebook: string | null; lien_facebook: string | null }
export interface ActiviteDraft { id_activite: string; lieu_travail: string | null; etude_en_cours: string | null; formations: string | null; experience_anterieur: string | null; diplome_ou_apprentissage: string | null }
export interface CompetenceDraft { id_competence: string; partageable: boolean }
export interface CentreInteretDraft { id_centre_interet: string }
export interface NouvellePersonneDonnees { personne: PersonneDraft; contact: ContactDraft | null; activites?: ActiviteDraft[]; competences?: CompetenceDraft[]; centres_interet?: CentreInteretDraft[]; confidentialite?: PreferencesConfidentialite; photo_temporaire: string; origine_declaree?: DeclaredOrigin }
export interface CreationDemandePayload { id_personne: string | null; email: string | null; telephone: string | null; donnees: object | NouvellePersonneDonnees }
export interface DemandeCreationResult { id: string; reference: string; statut: 'EN_ATTENTE'; date_demande: string; code_suivi: string }
export interface SuiviDemandePayload { reference: string; code_suivi: string }
export interface DemandeInscription { reference: string; statut: StatutDemandeInscription; date_demande: string; date_traitement: string | null; commentaire_admin: string | null; photo_temporaire_url?: string | null }
export interface CreationComptePayload extends SuiviDemandePayload { mot_de_passe: string }
export interface CompteCree { id_compte_membre: string; id_personne: string; role: 'MEMBRE' | 'ADMIN' | 'PASTEUR' | 'BUREAU_ZANAKA_AMPIELEZANA'; statut: 'ACTIF' }
export interface PersonneRecherchee { id: string; nom: string; prenom: string | null; nom_usage: string | null; annee_naissance: number | null; lieu_naissance: string | null }

export interface RoleAttribue { id: string; code: 'MEMBRE' | 'ADMIN' | 'PASTEUR' | 'BUREAU_ZANAKA_AMPIELEZANA' }
export interface AdminDonneesDemande { personne?: PersonneDraft; contact?: ContactDraft | null; activites?: unknown[]; competences?: unknown[]; centres_interet?: unknown[]; photo_temporaire?: string; origine_declaree?: DeclaredOrigin }
export interface AdminDemandeInscription { id: string; id_personne: string | null; email: string | null; telephone: string | null; reference: string; donnees: AdminDonneesDemande; statut: { id: string; code: StatutDemandeInscription }; role_attribue: RoleAttribue | null; date_demande: string; date_traitement: string | null; id_compte_admin_traitement: string | null; commentaire_admin: string | null; photo_temporaire_url?: string | null }
export interface ValidationDemandePayload { role?: 'MEMBRE' | 'ADMIN' | 'PASTEUR' | 'BUREAU_ZANAKA_AMPIELEZANA'; commentaire_admin?: string | null }
export interface RefusDemandePayload { commentaire_admin?: string | null }
export interface TraitementDemandeResult { id: string; reference: string; statut: 'VALIDEE' | 'REFUSEE'; role_attribue?: RoleAttribue | null; id_personne?: string | null; date_traitement: string; commentaire_admin?: string | null }

