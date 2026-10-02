import type { Personne } from './personne'
export interface ProfilActivite { id:string; id_personne:string; id_activite:string; id_domaine_activite:string|null; activite:string|null; domaine_activite:string|null; lieu_travail:string|null; etude_en_cours:string|null; formations:string|null; experience_anterieur:string|null; diplome_ou_apprentissage:string|null }
export interface ProfilCompetence { id:string; id_personne:string; id_competence:string; competence:string|null; partageable:boolean }
export interface ProfilCentreInteret { id:string; id_personne:string; id_centre_interet:string; centre_interet:string|null }
export interface ProfilRelation { id:string; id_personne_source:string; id_personne_cible:string; personne_source:{id:string;nom:string;prenom:string|null;sexe:string|null}|null; personne_cible:{id:string;nom:string;prenom:string|null;sexe:string|null}|null; type_relation:{id:string;code:string|null;libelle:string|null}|null }
export interface ProfilPersonne { personne:Personne; activites:ProfilActivite[]; competences:ProfilCompetence[]; centres_interet:ProfilCentreInteret[]; relations:ProfilRelation[]; can_manage?: boolean }
