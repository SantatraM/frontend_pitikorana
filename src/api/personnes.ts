import { apiClient } from "./apiClient";
import type { ApiSuccess } from "../types/api";
import type {
  CreatePersonnePayload,
  Personne,
  UpdatePersonnePayload,
} from "../types/personne";
import type { ProfilPersonne } from "../types/profil";
export const getPersonnes = (lang = "fr") =>
  apiClient<ApiSuccess<Personne[]>>(
    `/api/personnes?lang=${encodeURIComponent(lang)}`,
  );
export const getPersonnesByElement = (idElement: string, lang = "fr") =>
  apiClient<ApiSuccess<Personne[]>>(
    `/api/personnes/element/${encodeURIComponent(idElement)}?lang=${encodeURIComponent(lang)}`,
  );
export const getPersonnesByElementDescendants = (idElement: string, lang = "fr") =>
  apiClient<ApiSuccess<Personne[]>>(
    `/api/personnes/element/${encodeURIComponent(idElement)}/descendants?lang=${encodeURIComponent(lang)}`,
  );
export const getPersonne = (id: string, lang = "fr") =>
  apiClient<ApiSuccess<Personne>>(
    `/api/personnes/${id}?lang=${encodeURIComponent(lang)}`,
  );
export const getProfilPersonne = (id: string, lang = "fr") =>
  apiClient<ApiSuccess<ProfilPersonne>>(
    `/api/personnes/${id}/profil?lang=${encodeURIComponent(lang)}`,
  );
export const createPersonne = (payload: CreatePersonnePayload) =>
  apiClient<ApiSuccess<Personne>>("/api/personnes", {
    method: "POST",
    body: payload,
  });
export interface CreatePersonneCompletePayload {
  personne: CreatePersonnePayload;
  contacts?: Array<{
    telephone?: string | null;
    whatsapp?: string | null;
    email?: string | null;
    facebook?: string | null;
    lien_facebook?: string | null;
  }>;
  relations?: Array<{ id_personne_liee: string; id_type_relation: string; action?: "CONFIRMER_MANUELLE" | null }>;
  activites?: Array<{
    id_activite: string;
    lieu_travail: string | null;
    etude_en_cours: string | null;
    formations: string | null;
    experience_anterieur: string | null;
    diplome_ou_apprentissage: string | null;
  }>;
  competences?: Array<{ id_competence: string; partageable: boolean }>;
  centres_interet?: Array<{ id_centre_interet: string }>;
  confidentialite?: Record<
    "email" | "facebook" | "telephone" | "whatsapp" | "adresse" | "photo",
    "PRIVE" | "MEMBRES"
  >;
}
export interface CreatePersonneCompleteResult {
  id_personne: string;
  personne: Personne;
}
export const createPersonneComplete = (
  payload: CreatePersonneCompletePayload,
) =>
  apiClient<ApiSuccess<CreatePersonneCompleteResult>>(
    "/api/personnes/complete",
    { method: "POST", body: payload },
  );
export const updatePersonne = (id: string, payload: UpdatePersonnePayload) =>
  apiClient<ApiSuccess<Personne>>(`/api/personnes/${id}`, {
    method: "PUT",
    body: payload,
  });

export const updatePersonneComplete = (
  id: string,
  payload: Required<CreatePersonneCompletePayload>,
) =>
  apiClient<ApiSuccess<CreatePersonneCompleteResult>>(
    `/api/personnes/${encodeURIComponent(id)}/complete`,
    { method: "PUT", body: payload },
  );
