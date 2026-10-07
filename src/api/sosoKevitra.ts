import { apiClient } from "./apiClient";
import type { ApiSuccess } from "../types/api";
import type {
  SosoCategory,
  SosoContribution,
  SosoDetail,
  SosoDraftPayload,
  SosoMyItem,
  SosoPhoto,
  SosoPublicItem,
} from "../types/sosoKevitra";
const base = "/api/soso-kevitra";
const langPath = (path: string, language: "fr" | "mg") =>
  `${path}${path.includes("?") ? "&" : "?"}lang=${language}`;
const files = (items: File[]) => {
  const body = new FormData();
  items.forEach((item) => body.append("photos", item));
  return body;
};
export const getSosoPublics = (language: "fr" | "mg") =>
  apiClient<ApiSuccess<SosoPublicItem[]>>(langPath(base, language));
export const getSosoDetail = (id: string, language: "fr" | "mg") =>
  apiClient<ApiSuccess<SosoDetail>>(
    langPath(`${base}/${encodeURIComponent(id)}`, language),
  );
export const getMySoso = (language: "fr" | "mg") =>
  apiClient<ApiSuccess<SosoMyItem[]>>(
    langPath(`${base}/mes-propositions`, language),
  );
export const getMyDrafts = (language: "fr" | "mg") =>
  apiClient<ApiSuccess<SosoMyItem[]>>(
    langPath(`${base}/mes-brouillons`, language),
  );
export const getContributionCategories = (language: "fr" | "mg") =>
  apiClient<ApiSuccess<SosoCategory[]>>(
    langPath(`${base}/categories-contribution`, language),
  );
export const getToReview = (language: "fr" | "mg") =>
  apiClient<ApiSuccess<SosoMyItem[]>>(
    langPath(`${base}/admin/a-verifier`, language),
  );
export const createDraft = (payload: SosoDraftPayload, language: "fr" | "mg") =>
  apiClient<ApiSuccess<SosoDetail>>(langPath(base, language), {
    method: "POST",
    body: payload,
  });
export const updateDraft = (
  id: string,
  payload: SosoDraftPayload,
  language: "fr" | "mg",
) =>
  apiClient<ApiSuccess<SosoDetail>>(
    langPath(`${base}/${encodeURIComponent(id)}`, language),
    { method: "PUT", body: payload },
  );
export const deleteDraft = (id: string) =>
  apiClient<ApiSuccess<unknown>>(`${base}/${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
export const submitSoso = (id: string, language: "fr" | "mg") =>
  apiClient<ApiSuccess<SosoDetail>>(
    langPath(`${base}/${encodeURIComponent(id)}/soumettre`, language),
    { method: "POST", body: {} },
  );
const textAction = (
  path: string,
  id: string,
  raison: string,
  language: "fr" | "mg",
) =>
  apiClient<ApiSuccess<SosoDetail>>(
    langPath(`${base}/${encodeURIComponent(id)}/${path}`, language),
    { method: "POST", body: { raison } },
  );
export const requestCorrection = (
  id: string,
  raison: string,
  language: "fr" | "mg",
) => textAction("demander-correction", id, raison, language);
export const unpublishSoso = (
  id: string,
  raison: string,
  language: "fr" | "mg",
) => textAction("non-publier", id, raison, language);
export const publishSoso = (
  id: string,
  date_fin_consultation: string,
  language: "fr" | "mg",
) =>
  apiClient<ApiSuccess<SosoDetail>>(
    langPath(`${base}/${encodeURIComponent(id)}/publier`, language),
    { method: "POST", body: { date_fin_consultation } },
  );
export const extendSoso = (
  id: string,
  nouvelle_date_fin_consultation: string,
  raison: string,
) =>
  apiClient<ApiSuccess<unknown>>(
    `${base}/${encodeURIComponent(id)}/prolonger`,
    { method: "POST", body: { nouvelle_date_fin_consultation, raison } },
  );
export const decideSoso = (
  id: string,
  decision: "ACCEPTE" | "REFUSE",
  observation: string,
) =>
  apiClient<ApiSuccess<unknown>>(`${base}/${encodeURIComponent(id)}/decision`, {
    method: "POST",
    body: { decision, observation: observation || null },
  });
export const supportSoso = (id: string) =>
  apiClient<
    ApiSuccess<{ nombre_soutiens: number; utilisateur_soutient: boolean }>
  >(`${base}/${encodeURIComponent(id)}/soutien`, { method: "POST", body: {} });
export const removeSupportSoso = (id: string) =>
  apiClient<
    ApiSuccess<{ nombre_soutiens: number; utilisateur_soutient: boolean }>
  >(`${base}/${encodeURIComponent(id)}/soutien`, { method: "DELETE" });
export const createContribution = (
  id: string,
  body: { categorie: string; titre: string; description: string },
  language: "fr" | "mg",
) =>
  apiClient<ApiSuccess<SosoContribution>>(
    langPath(`${base}/${encodeURIComponent(id)}/contributions`, language),
    { method: "POST", body },
  );
export const updateContribution = (
  id: string,
  contributionId: string,
  body: { categorie: string; titre: string; description: string },
  language: "fr" | "mg",
) =>
  apiClient<ApiSuccess<unknown>>(
    langPath(
      `${base}/${encodeURIComponent(id)}/contributions/${encodeURIComponent(contributionId)}`,
      language,
    ),
    { method: "PUT", body },
  );
export const withdrawContribution = (
  id: string,
  contributionId: string,
  language: "fr" | "mg",
) =>
  apiClient<ApiSuccess<unknown>>(
    langPath(
      `${base}/${encodeURIComponent(id)}/contributions/${encodeURIComponent(contributionId)}`,
      language,
    ),
    { method: "DELETE" },
  );
export const moderateContribution = (
  id: string,
  contributionId: string,
  action: "masquer" | "restaurer",
  raison: string,
  language: "fr" | "mg",
) =>
  apiClient<ApiSuccess<unknown>>(
    langPath(
      `${base}/${encodeURIComponent(id)}/contributions/${encodeURIComponent(contributionId)}/${action}`,
      language,
    ),
    { method: "POST", body: { raison } },
  );
export const uploadSosoPhotos = (id: string, items: File[]) =>
  apiClient<ApiSuccess<SosoPhoto[]>>(
    `${base}/${encodeURIComponent(id)}/photos`,
    { method: "POST", body: files(items) },
  );
export const deleteSosoPhoto = (id: string, photoId: string) =>
  apiClient<ApiSuccess<unknown>>(
    `${base}/${encodeURIComponent(id)}/photos/${encodeURIComponent(photoId)}`,
    { method: "DELETE" },
  );
export const reorderSosoPhotos = (id: string, photo_ids: string[]) =>
  apiClient<ApiSuccess<SosoPhoto[]>>(
    `${base}/${encodeURIComponent(id)}/photos/ordre`,
    { method: "PUT", body: { photo_ids } },
  );
export const uploadContributionPhotos = (
  id: string,
  contributionId: string,
  items: File[],
) =>
  apiClient<ApiSuccess<SosoPhoto[]>>(
    `${base}/${encodeURIComponent(id)}/contributions/${encodeURIComponent(contributionId)}/photos`,
    { method: "POST", body: files(items) },
  );
export const deleteContributionPhoto = (
  id: string,
  contributionId: string,
  photoId: string,
) =>
  apiClient<ApiSuccess<unknown>>(
    `${base}/${encodeURIComponent(id)}/contributions/${encodeURIComponent(contributionId)}/photos/${encodeURIComponent(photoId)}`,
    { method: "DELETE" },
  );
export const reorderContributionPhotos = (
  id: string,
  contributionId: string,
  photo_ids: string[],
) =>
  apiClient<ApiSuccess<SosoPhoto[]>>(
    `${base}/${encodeURIComponent(id)}/contributions/${encodeURIComponent(contributionId)}/photos/ordre`,
    { method: "PUT", body: { photo_ids } },
  );
