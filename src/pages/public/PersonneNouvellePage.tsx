import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { ApiError } from "../../api/apiClient";
import { rechercherPersonnesInscription } from "../../api/demandesInscription";
import { createPersonne, createPersonneComplete } from "../../api/personnes";
import { uploadPhotoPersonne } from "../../api/photosPersonne";
import {
  getActivites,
  getCentresInteret,
  getCompetences,
  getDomainesActivite,
} from "../../api/adminReferentiels";
import {
  getElements,
  getLiensFalimanjaka,
  getPays,
  getRegions,
  getSexes,
  getStatuts,
  getTypesElement,
  getVilles,
  type ElementReference,
  type LienReference,
  type PaysReference,
  type RegionReference,
  type SexeReference,
  type StatutReference,
  type TypeElementReference,
  type VilleReference,
} from "../../api/referentielsInscription";
import { getTypesRelation } from "../../api/typesRelation";
import { BranchCreateModal, type BranchType } from "../../components/branches/BranchCreateModal";
import { useLanguage } from "../../hooks/useLanguage";
import type { PersonneRecherchee } from "../../types/demandeInscription";
import type { TypeRelation } from "../../types/relationsPersonne";
import type {
  Activite,
  CentreInteret,
  Competence,
  DomaineActivite,
} from "../../types/adminReferentiels";

type Stage =
  "search" | "mode" | "guided" | "profile" | "validation" | "grouped";
type RelationModalStep = "search" | "provisional" | "define";
type DraftRelation = { person: PersonneRecherchee; typeId: string };
type ProvisionalDraft = Pick<
  Draft,
  | "nom"
  | "prenom"
  | "nom_usage"
  | "autres_appellations"
  | "id_sexe"
  | "id_statut"
  | "date_naissance"
  | "annee_naissance"
  | "lieu_naissance"
>;
type Confidentialite = Record<
  "email" | "facebook" | "telephone" | "whatsapp" | "adresse" | "photo",
  "PRIVE" | "MEMBRES"
>;
type Draft = {
  nom: string;
  prenom: string;
  nom_usage: string;
  autres_appellations: string;
  id_sexe: string;
  id_statut: string;
  date_naissance: string;
  annee_naissance: string;
  lieu_naissance: string;
  date_deces: string;
  annee_deces: string;
  adresse: string;
  id_pays: string;
  id_region: string;
  id_ville: string;
  id_lien: string;
  id_razambe: string;
  id_taranaka: string;
  id_sampana: string;
  telephone: string;
  whatsapp: string;
  email: string;
  facebook: string;
  lien_facebook: string;
  relations: DraftRelation[];
  activites: {
    id_activite: string;
    lieu_travail: string | null;
    etude_en_cours: string | null;
    formations: string | null;
    experience_anterieur: string | null;
    diplome_ou_apprentissage: string | null;
  }[];
  competences: { id_competence: string; partageable: boolean }[];
  centres: { id_centre_interet: string }[];
  confidentialite: Confidentialite;
  photo: File | null;
};
const defaultConfidentialite: Confidentialite = {
  email: "PRIVE",
  facebook: "PRIVE",
  telephone: "PRIVE",
  whatsapp: "PRIVE",
  adresse: "PRIVE",
  photo: "PRIVE",
};
const emptyDraft: Draft = {
  nom: "",
  prenom: "",
  nom_usage: "",
  autres_appellations: "",
  id_sexe: "",
  id_statut: "",
  date_naissance: "",
  annee_naissance: "",
  lieu_naissance: "",
  date_deces: "",
  annee_deces: "",
  adresse: "",
  id_pays: "",
  id_region: "",
  id_ville: "",
  id_lien: "",
  id_razambe: "",
  id_taranaka: "",
  id_sampana: "",
  telephone: "",
  whatsapp: "",
  email: "",
  facebook: "",
  lien_facebook: "",
  relations: [],
  activites: [],
  competences: [],
  centres: [],
  confidentialite: defaultConfidentialite,
  photo: null,
};
const emptyProvisional: ProvisionalDraft = {
  nom: "",
  prenom: "",
  nom_usage: "",
  autres_appellations: "",
  id_sexe: "",
  id_statut: "",
  date_naissance: "",
  annee_naissance: "",
  lieu_naissance: "",
};

const isSupportedPhoto = (file: File) =>
  ["image/jpeg", "image/png", "image/webp"].includes(file.type) &&
  file.size <= 5 * 1024 * 1024;

const formatFileSize = (size: number) => {
  if (size < 1024 * 1024) return `${Math.max(1, Math.round(size / 1024))} Ko`;
  return `${(size / (1024 * 1024)).toFixed(1)} MiB`;
};
function SearchIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none">
      <circle
        cx="10.5"
        cy="10.5"
        r="5.75"
        stroke="currentColor"
        strokeWidth="2"
      />
      <path
        d="m15 15 4.25 4.25"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}
const text = (person: PersonneRecherchee) =>
  [person.nom, person.prenom].filter(Boolean).join(" ");
const initials = (person: PersonneRecherchee) =>
  `${person.nom[0] ?? ""}${person.prenom?.[0] ?? ""}`.toUpperCase();
function refLabel(
  item: {
    traductions?: { libelle: string; langue?: { code: string } | null }[];
    nom?: string;
    libelle?: string;
    code?: string;
  },
  language: string,
) {
  return (
    item.traductions?.find((x) => x.langue?.code === language)?.libelle ??
    item.traductions?.[0]?.libelle ??
    item.nom ??
    item.libelle ??
    item.code ??
    "—"
  );
}

export function PersonneNouvellePage() {
  const { t, language } = useLanguage();
  const [stage, setStage] = useState<Stage>("search");
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [sexes, setSexes] = useState<SexeReference[]>([]);
  const [statuts, setStatuts] = useState<StatutReference[]>([]);
  const [liens, setLiens] = useState<LienReference[]>([]);
  const [elements, setElements] = useState<ElementReference[]>([]);
  const [typesElement, setTypesElement] = useState<TypeElementReference[]>([]);
  const [pays, setPays] = useState<PaysReference[]>([]);
  const [regions, setRegions] = useState<RegionReference[]>([]);
  const [villes, setVilles] = useState<VilleReference[]>([]);
  const [types, setTypes] = useState<TypeRelation[]>([]);
  const [domains, setDomains] = useState<DomaineActivite[]>([]);
  const [activities, setActivities] = useState<Activite[]>([]);
  const [skills, setSkills] = useState<Competence[]>([]);
  const [interests, setInterests] = useState<CentreInteret[]>([]);
  const [activityDomain, setActivityDomain] = useState("");
  const [activitySearch, setActivitySearch] = useState("");
  const [skillSearch, setSkillSearch] = useState("");
  const [interestSearch, setInterestSearch] = useState("");
  const [activitiesExpanded, setActivitiesExpanded] = useState(false);
  const [skillsExpanded, setSkillsExpanded] = useState(false);
  const [interestsExpanded, setInterestsExpanded] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<PersonneRecherchee[]>([]);
  const [searched, setSearched] = useState(false);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [modal, setModal] = useState(false);
  const [modalStep, setModalStep] = useState<RelationModalStep>("search");
  const [relationQuery, setRelationQuery] = useState("");
  const [relationResults, setRelationResults] = useState<PersonneRecherchee[]>(
    [],
  );
  const [relationSearched, setRelationSearched] = useState(false);
  const [selected, setSelected] = useState<PersonneRecherchee | null>(null);
  const [typeId, setTypeId] = useState("");
  const [relationError, setRelationError] = useState<string | null>(null);
  const [provisional, setProvisional] =
    useState<ProvisionalDraft>(emptyProvisional);
  const [creatingProvisional, setCreatingProvisional] = useState(false);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [creatingComplete, setCreatingComplete] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [createdId, setCreatedId] = useState<string | null>(null);
  const [photoWarning, setPhotoWarning] = useState<string | null>(null);
  const [branchCreate, setBranchCreate] = useState<{ type: BranchType; razambeId: string; taranakaId: string } | null>(null);
  const [branchCreateHint, setBranchCreateHint] = useState<string | null>(null);
  useEffect(() => {
    void Promise.all([
      getSexes(),
      getStatuts(),
      getLiensFalimanjaka(),
      getElements(),
      getTypesElement(),
      getPays(),
      getRegions(),
      getVilles(),
      getTypesRelation(language),
    ])
      .then(([a, b, c, d, typeElements, e, f, g, h]) => {
        setSexes(a.data ?? []);
        setStatuts(b.data ?? []);
        setLiens(c.data ?? []);
        setElements(d.data ?? []);
        setTypesElement(typeElements.data ?? []);
        setPays(e.data ?? []);
        setRegions(f.data ?? []);
        setVilles(g.data ?? []);
        setTypes(h.data ?? []);
      })
      .catch(() => undefined);
  }, [language]);
  useEffect(() => {
    void Promise.all([
      getDomainesActivite(),
      getActivites(),
      getCompetences(),
      getCentresInteret(),
    ])
      .then(([a, b, c, d]) => {
        setDomains(a.data ?? []);
        setActivities(b.data ?? []);
        setSkills(c.data ?? []);
        setInterests(d.data ?? []);
      })
      .catch(() => undefined);
  }, []);
  useEffect(() => {
    if (!draft.photo) {
      setPhotoPreview(null);
      return;
    }
    const url = URL.createObjectURL(draft.photo);
    setPhotoPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [draft.photo]);
  const update = (key: Exclude<keyof Draft, "relations">, value: string) =>
    setDraft((current) => ({ ...current, [key]: value }));
  const search = async (event: FormEvent) => {
    event.preventDefault();
    const q = query.trim();
    if (q.length < 2) {
      setError(t("admin.duplicateSearchMinimum"));
      return;
    }
    setSearching(true);
    setError(null);
    try {
      const r = await rechercherPersonnesInscription(q);
      setResults(r.data ?? []);
      setSearched(true);
    } catch (e) {
      setError(
        e instanceof ApiError ? e.message : t("admin.duplicateUnavailable"),
      );
    } finally {
      setSearching(false);
    }
  };
  const relationSearch = async (event: FormEvent) => {
    event.preventDefault();
    const q = relationQuery.trim();
    if (q.length < 2) {
      setRelationError(t("admin.duplicateSearchMinimum"));
      return;
    }
    setRelationError(null);
    try {
      const r = await rechercherPersonnesInscription(q);
      setRelationResults(r.data ?? []);
      setRelationSearched(true);
    } catch (e) {
      setRelationError(
        e instanceof ApiError ? e.message : t("admin.duplicateUnavailable"),
      );
    }
  };
  const razambes = elements.filter(
    (e) => e.type_element?.code === "RAZAMBE",
  );
  const taranakas = elements.filter(
    (e) =>
      e.type_element?.code === "TARANAKA" &&
      e.parent?.id === draft.id_razambe,
  );
  const sampanas = elements.filter(
    (e) =>
      e.type_element?.code === "SAMPANA" &&
      e.parent?.id === draft.id_taranaka,
  );
  const openBranchCreate = (type: BranchType) => {
    if (type === "TARANAKA" && !draft.id_razambe) {
      setBranchCreateHint(t("admin.selectRazambeFirst"));
      return;
    }
    if (type === "SAMPANA" && (!draft.id_razambe || !draft.id_taranaka)) {
      setBranchCreateHint(t("admin.selectRazambeAndTaranakaFirst"));
      return;
    }
    setBranchCreateHint(null);
    setBranchCreate({ type, razambeId: draft.id_razambe, taranakaId: draft.id_taranaka });
  };
  const onBranchCreated = (element: ElementReference) => {
    setElements((items) => items.some((item) => item.id === element.id) ? items : [...items, element]);
    setDraft((current) => {
      if (branchCreate?.type === "RAZAMBE") return { ...current, id_razambe: element.id, id_taranaka: "", id_sampana: "" };
      if (branchCreate?.type === "TARANAKA") return { ...current, id_taranaka: element.id, id_sampana: "" };
      return { ...current, id_sampana: element.id };
    });
    setBranchCreate(null);
  };
  const isDeceasedStatus = (statutId: string) =>
    statuts.some(
      (statut) =>
        statut.id === statutId &&
        statut.code?.trim().toUpperCase() === "DECEDE",
    );
  const deceased = isDeceasedStatus(draft.id_statut);
  const openModal = () => {
    setModal(true);
    setModalStep("search");
    setRelationError(null);
    setSelected(null);
    setTypeId("");
  };
  const addRelation = () => {
    if (!selected || !typeId) return;
    setDraft((current) => ({
      ...current,
      relations: [...current.relations, { person: selected, typeId }],
    }));
    setModal(false);
  };
  const createProvisional = async () => {
    if (creatingProvisional) return;
    if (!provisional.nom.trim()) {
      setRelationError(t("registration.newForm.requiredName"));
      return;
    }
    setCreatingProvisional(true);
    setRelationError(null);
    try {
      const none = (value: string) => value.trim() || null;
      const response = await createPersonne({
        nom: provisional.nom.trim(),
        prenom: none(provisional.prenom),
        nom_usage: none(provisional.nom_usage),
        autres_appellations: none(provisional.autres_appellations),
        id_sexe: provisional.id_sexe || null,
        id_statut: provisional.id_statut || null,
        date_naissance: provisional.date_naissance || null,
        annee_naissance: provisional.annee_naissance
          ? Number(provisional.annee_naissance)
          : null,
        lieu_naissance: none(provisional.lieu_naissance),
        date_deces: null,
        annee_deces: null,
        adresse: null,
        id_ville: null,
        id_lien: null,
        id_element: null,
      });
      if (!response.data) throw new Error(t("admin.duplicateUnavailable"));
      const person = response.data;
      setSelected({
        id: person.id,
        nom: person.nom,
        prenom: person.prenom,
        nom_usage: person.nom_usage,
        annee_naissance: person.annee_naissance,
        lieu_naissance: person.lieu_naissance,
      });
      setModalStep("define");
    } catch (caught) {
      setRelationError(
        caught instanceof ApiError
          ? caught.message
          : t("admin.duplicateUnavailable"),
      );
    } finally {
      setCreatingProvisional(false);
    }
  };
  const createComplete = async () => {
    if (creatingComplete || createdId) return;
    if (!draft.nom.trim()) {
      setCreateError(t("registration.newForm.requiredName"));
      return;
    }
    const none = (value: string) => value.trim() || null;
    setCreatingComplete(true);
    setCreateError(null);
    try {
      const result = await createPersonneComplete({
        personne: {
          nom: draft.nom.trim(),
          prenom: none(draft.prenom),
          nom_usage: none(draft.nom_usage),
          autres_appellations: none(draft.autres_appellations),
          id_sexe: draft.id_sexe || null,
          id_statut: draft.id_statut || null,
          date_naissance: draft.date_naissance || null,
          annee_naissance: draft.annee_naissance
            ? Number(draft.annee_naissance)
            : null,
          lieu_naissance: none(draft.lieu_naissance),
          date_deces: deceased ? draft.date_deces || null : null,
          annee_deces:
            deceased && draft.annee_deces
              ? Number(draft.annee_deces)
              : null,
          adresse: none(draft.adresse),
          id_ville: draft.id_ville || null,
          id_lien: draft.id_lien || null,
          id_element:
            draft.id_sampana || draft.id_taranaka || draft.id_razambe || null,
        },
        contacts:
          draft.telephone ||
          draft.whatsapp ||
          draft.email ||
          draft.facebook ||
          draft.lien_facebook
            ? [
                {
                  telephone: none(draft.telephone),
                  whatsapp: none(draft.whatsapp),
                  email: none(draft.email),
                  facebook: none(draft.facebook),
                  lien_facebook: none(draft.lien_facebook),
                },
              ]
            : [],
        relations: draft.relations.map((r) => ({
          id_personne_liee: r.person.id,
          id_type_relation: r.typeId,
        })),
        activites: draft.activites,
        competences: draft.competences,
        centres_interet: draft.centres,
        confidentialite: draft.confidentialite,
      });
      const id = result.data?.id_personne;
      if (!id) throw new Error(t("admin.completeUnavailable"));
      setCreatedId(id);
      if (draft.photo) {
        try {
          await uploadPhotoPersonne(id, draft.photo);
          setDraft(emptyDraft);
        } catch {
          setPhotoWarning(t("admin.completePhotoWarning"));
        }
      } else setDraft(emptyDraft);
    } catch (caught) {
      setCreateError(
        caught instanceof ApiError
          ? caught.message
          : t("admin.completeUnavailable"),
      );
    } finally {
      setCreatingComplete(false);
    }
  };
  const stepper = (active: number) => (
    <ol className="admin-guided-stepper">
      {[
        [1, t("admin.guidedIdentityFamily")],
        [2, t("admin.guidedProfilePhoto")],
        [3, t("admin.guidedPrivacyValidation")],
      ].map(([n, label]) => {
        const step = Number(n);
        return (
          <li
            className={
              step === active ? "active" : step < active ? "complete" : ""
            }
            key={String(step)}
          >
            <span>{step < active ? "✓" : step}</span>
            <small>{label}</small>
          </li>
        );
      })}
    </ol>
  );
  const catalogLabel = (item: {
    traductions: { libelle: string; code_langue?: string }[];
  }) =>
    item.traductions.find((x) => x.code_langue === language)?.libelle ??
    item.traductions.find((x) => x.code_langue === "fr")?.libelle ??
    item.traductions[0]?.libelle ??
    "—";
  const availableActivities = activities.filter(
    (x) =>
      (!activityDomain || x.id_domaine_activite === activityDomain) &&
      catalogLabel(x).toLowerCase().includes(activitySearch.toLowerCase()) &&
      !draft.activites.some((a) => a.id_activite === x.id),
  );
  const availableSkills = skills.filter(
    (x) =>
      catalogLabel(x).toLowerCase().includes(skillSearch.toLowerCase()) &&
      !draft.competences.some((a) => a.id_competence === x.id),
  );
  const availableInterests = interests.filter(
    (x) =>
      catalogLabel(x).toLowerCase().includes(interestSearch.toLowerCase()) &&
      !draft.centres.some((a) => a.id_centre_interet === x.id),
  );
  const displayCatalog = <T,>(
    entries: T[],
    expanded: boolean,
    searchTerm: string,
  ) => (expanded || searchTerm.trim() ? entries : entries.slice(0, 6));
  const remainingCount = (entries: unknown[]) =>
    Math.max(entries.length - 6, 0);
  const branchCreateModal = branchCreate ? <BranchCreateModal open elements={elements} typesElement={typesElement} initialType={branchCreate.type} initialRazambeId={branchCreate.razambeId} initialTaranakaId={branchCreate.taranakaId} onClose={() => setBranchCreate(null)} onCreated={onBranchCreated} /> : null;
  if (stage === "validation")
    return (
      <section className="admin-guided-page">
        <header className="admin-new-person-header">
          <div>
            <button
              className="admin-new-person-back"
              type="button"
              onClick={() => setStage("profile")}
            >
              ← {t("registration.newForm.previous")}
            </button>
            <h1>{t("admin.newPersonTitle")}</h1>
            <p>{t("admin.guidedPrivacyValidation")} — 3/3</p>
          </div>
          {stepper(3)}
        </header>
        {createdId ? (
          <section className="admin-guided-card admin-complete-success">
            <h2>
              {photoWarning
                ? t("admin.completePartial")
                : t("admin.completeSuccess")}
            </h2>
            <p>{photoWarning ?? t("admin.completeSuccessHelp")}</p>
            <Link className="admin-button" to={`/personnes/${createdId}`}>
              {t("admin.duplicateView")}
            </Link>
          </section>
        ) : (
          <CompleteReview
            draft={draft}
            t={t}
            language={language}
            sexes={sexes}
            statuts={statuts}
            liens={liens}
            elements={elements}
            pays={pays}
            regions={regions}
            villes={villes}
            activities={activities}
            skills={skills}
            interests={interests}
            label={catalogLabel}
            photoPreview={photoPreview}
            onEditIdentity={() => setStage("guided")}
            onEditProfile={() => setStage("profile")}
            onPrivacy={(key, value) =>
              setDraft((current) => ({
                ...current,
                confidentialite: { ...current.confidentialite, [key]: value },
              }))
            }
          />
        )}
        {!createdId && (
          <footer className="admin-guided-footer">
            <Link
              className="admin-entry-mode-outline"
              to="/personnes"
            >
              {t("admin.cancel")}
            </Link>
            <div className="admin-guided-footer-actions">
              <button
                type="button"
                className="admin-entry-mode-outline"
                onClick={() => setStage("profile")}
              >
                {t("registration.newForm.previous")}
              </button>
              <button
                type="button"
                className="admin-button"
                disabled={creatingComplete}
                onClick={createComplete}
              >
                {creatingComplete
                  ? t("admin.completeCreating")
                  : t("admin.completeCreate")}
              </button>
            </div>
          </footer>
        )}
        {createError && (
          <p className="admin-new-person-search-error">{createError}</p>
        )}
      </section>
    );
  if (stage === "profile")
    return (
      <section className="admin-guided-page">
        <header className="admin-new-person-header">
          <div>
            <button
              className="admin-new-person-back"
              type="button"
              onClick={() => setStage("guided")}
            >
              ← {t("registration.newForm.previous")}
            </button>
            <h1>{t("admin.newPersonTitle")}</h1>
            <p>{t("admin.guidedProfilePhoto")} — 2/3</p>
          </div>
          {stepper(2)}
        </header>
        <ProfileBlock title={`1. ${t("registration.newForm.activities")}`}>
          <div className="admin-profile-grid">
            <div>
              <Select
                label={t("registration.newForm.domain")}
                value={activityDomain}
                onChange={setActivityDomain}
                options={domains.map((x) => [x.id, catalogLabel(x)])}
              />
              <Field
                label={t("registration.newForm.searchActivity")}
                value={activitySearch}
                onChange={setActivitySearch}
              />
              <div
                className={`admin-catalog-list ${activitiesExpanded || activitySearch.trim() ? "expanded" : ""}`}
              >
                {displayCatalog(
                  availableActivities,
                  activitiesExpanded,
                  activitySearch,
                ).map((x) => (
                  <button
                    type="button"
                    className="reference-chip"
                    key={x.id}
                    disabled={draft.activites.length >= 20}
                    onClick={() =>
                      setDraft((d) => ({
                        ...d,
                        activites: [
                          ...d.activites,
                          {
                            id_activite: x.id,
                            lieu_travail: null,
                            etude_en_cours: null,
                            formations: null,
                            experience_anterieur: null,
                            diplome_ou_apprentissage: null,
                          },
                        ],
                      }))
                    }
                  >
                    + {catalogLabel(x)}
                  </button>
                ))}
              </div>
              {!activitySearch.trim() && availableActivities.length > 6 && (
                <button
                  className="admin-catalog-toggle"
                  type="button"
                  onClick={() => setActivitiesExpanded((value) => !value)}
                >
                  {activitiesExpanded
                    ? t("admin.seeLessCompact")
                    : `${t("admin.seeMoreCompact")} (${remainingCount(availableActivities)})`}
                </button>
              )}
            </div>
            <div>
              {draft.activites.map((a, i) => (
                <article className="admin-profile-selected" key={a.id_activite}>
                  <b>
                    {catalogLabel(
                      activities.find((x) => x.id === a.id_activite) ?? {
                        traductions: [],
                      },
                    )}
                  </b>
                  <button
                    type="button"
                    onClick={() =>
                      setDraft((d) => ({
                        ...d,
                        activites: d.activites.filter((_, n) => n !== i),
                      }))
                    }
                  >
                    {t("registration.newForm.remove")}
                  </button>
                  {(
                    [
                      "lieu_travail",
                      "etude_en_cours",
                      "formations",
                      "experience_anterieur",
                      "diplome_ou_apprentissage",
                    ] as const
                  ).map((k) => (
                    <Field
                      key={k}
                      label={
                        (
                          {
                            lieu_travail: t("registration.newForm.workPlace"),
                            etude_en_cours: t("registration.newForm.studies"),
                            formations: t("registration.newForm.training"),
                            experience_anterieur: t(
                              "registration.newForm.experience",
                            ),
                            diplome_ou_apprentissage: t(
                              "registration.newForm.diploma",
                            ),
                          } as Record<string, string>
                        )[k]
                      }
                      value={a[k] ?? ""}
                      onChange={(v) =>
                        setDraft((d) => ({
                          ...d,
                          activites: d.activites.map((z, n) =>
                            n === i ? { ...z, [k]: v } : z,
                          ),
                        }))
                      }
                    />
                  ))}
                </article>
              ))}
            </div>
          </div>
        </ProfileBlock>
        <ProfileBlock title={`2. ${t("registration.newForm.competences")}`}>
          <div className="admin-profile-grid">
            <div>
              <Field
                label={t("registration.newForm.searchSkill")}
                value={skillSearch}
                onChange={setSkillSearch}
              />
              <div
                className={`admin-catalog-list ${skillsExpanded || skillSearch.trim() ? "expanded" : ""}`}
              >
                {displayCatalog(
                  availableSkills,
                  skillsExpanded,
                  skillSearch,
                ).map((x) => (
                  <button
                    type="button"
                    className="reference-chip"
                    key={x.id}
                    onClick={() =>
                      setDraft((d) => ({
                        ...d,
                        competences: [
                          ...d.competences,
                          { id_competence: x.id, partageable: false },
                        ],
                      }))
                    }
                  >
                    + {catalogLabel(x)}
                  </button>
                ))}
              </div>
              {!skillSearch.trim() && availableSkills.length > 6 && (
                <button
                  className="admin-catalog-toggle"
                  type="button"
                  onClick={() => setSkillsExpanded((value) => !value)}
                >
                  {skillsExpanded
                    ? t("admin.seeLessCompact")
                    : `${t("admin.seeMoreCompact")} (${remainingCount(availableSkills)})`}
                </button>
              )}
            </div>
            <div>
              {draft.competences.map((x, i) => (
                <article
                  className="admin-profile-selected"
                  key={x.id_competence}
                >
                  <b>
                    {catalogLabel(
                      skills.find((s) => s.id === x.id_competence) ?? {
                        traductions: [],
                      },
                    )}
                  </b>
                  <label>
                    <input
                      type="checkbox"
                      checked={x.partageable}
                      onChange={(e) =>
                        setDraft((d) => ({
                          ...d,
                          competences: d.competences.map((z, n) =>
                            n === i
                              ? { ...z, partageable: e.target.checked }
                              : z,
                          ),
                        }))
                      }
                    />
                    {x.partageable
                      ? t("registration.newForm.shareable")
                      : t("registration.newForm.notShareable")}
                  </label>
                  <button
                    type="button"
                    onClick={() =>
                      setDraft((d) => ({
                        ...d,
                        competences: d.competences.filter((_, n) => n !== i),
                      }))
                    }
                  >
                    {t("registration.newForm.remove")}
                  </button>
                </article>
              ))}
            </div>
          </div>
        </ProfileBlock>
        <ProfileBlock title={`3. ${t("registration.newForm.interests")}`}>
          <div className="admin-profile-grid">
            <div>
              <Field
                label={t("registration.newForm.searchInterest")}
                value={interestSearch}
                onChange={setInterestSearch}
              />
              <div
                className={`admin-catalog-list ${interestsExpanded || interestSearch.trim() ? "expanded" : ""}`}
              >
                {displayCatalog(
                  availableInterests,
                  interestsExpanded,
                  interestSearch,
                ).map((x) => (
                  <button
                    type="button"
                    className="reference-chip"
                    key={x.id}
                    onClick={() =>
                      setDraft((d) => ({
                        ...d,
                        centres: [...d.centres, { id_centre_interet: x.id }],
                      }))
                    }
                  >
                    + {catalogLabel(x)}
                  </button>
                ))}
              </div>
              {!interestSearch.trim() && availableInterests.length > 6 && (
                <button
                  className="admin-catalog-toggle"
                  type="button"
                  onClick={() => setInterestsExpanded((value) => !value)}
                >
                  {interestsExpanded
                    ? t("admin.seeLessCompact")
                    : `${t("admin.seeMoreCompact")} (${remainingCount(availableInterests)})`}
                </button>
              )}
            </div>
            <div>
              {draft.centres.map((x, i) => (
                <article
                  className="admin-profile-selected"
                  key={x.id_centre_interet}
                >
                  <b>
                    {catalogLabel(
                      interests.find((s) => s.id === x.id_centre_interet) ?? {
                        traductions: [],
                      },
                    )}
                  </b>
                  <button
                    type="button"
                    onClick={() =>
                      setDraft((d) => ({
                        ...d,
                        centres: d.centres.filter((_, n) => n !== i),
                      }))
                    }
                  >
                    {t("registration.newForm.remove")}
                  </button>
                </article>
              ))}
            </div>
          </div>
        </ProfileBlock>
        <ProfileBlock title={`4. ${t("admin.photo")}`}>
          <p className="admin-profile-help">{t("admin.guidedPhotoHelp")}</p>
          {draft.photo && photoPreview ? (
            <div className="admin-local-photo-preview">
              <img src={photoPreview} alt="" />
              <div>
                <b>{draft.photo.name}</b>
                <small>{formatFileSize(draft.photo.size)}</small>
                <label className="admin-entry-mode-outline">
                  {t("admin.photoReplace")}
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={(event) => {
                      const file = event.target.files?.[0] ?? null;
                      if (file && isSupportedPhoto(file))
                        setDraft((current) => ({ ...current, photo: file }));
                    }}
                  />
                </label>
                <button
                  type="button"
                  className="admin-photo-remove"
                  onClick={() =>
                    setDraft((current) => ({ ...current, photo: null }))
                  }
                >
                  {t("registration.newForm.remove")}
                </button>
              </div>
            </div>
          ) : (
            <label className="admin-photo-unavailable">
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={(event) => {
                  const file = event.target.files?.[0] ?? null;
                  if (file && isSupportedPhoto(file))
                    setDraft((current) => ({ ...current, photo: file }));
                }}
              />
              <b>{t("admin.addPhoto")}</b>
              <small>{t("admin.photoFormats")}</small>
            </label>
          )}
        </ProfileBlock>
        <footer className="admin-guided-footer">
          <Link className="admin-entry-mode-outline" to="/personnes">
            {t("admin.cancel")}
          </Link>
          <div className="admin-guided-footer-actions">
            <button
              type="button"
              className="admin-entry-mode-outline"
              onClick={() => setStage("guided")}
            >
              {t("registration.newForm.previous")}
            </button>
            <button
              type="button"
              className="admin-button"
              onClick={() => setStage("validation")}
            >
              {t("admin.continue")} →
            </button>
          </div>
        </footer>
      </section>
    );
  if (stage === "guided")
    return (
      <section className="admin-guided-page">
        <header className="admin-new-person-header">
          <div>
            <button
              className="admin-new-person-back"
              onClick={() => setStage("mode")}
              type="button"
            >
              ← {t("admin.guidedBackMode")}
            </button>
            <h1>{t("admin.newPersonTitle")}</h1>
            <p>{t("admin.guidedStepOneSubtitle")}</p>
          </div>
          {stepper(1)}
        </header>
        <div className="admin-guided-card">
          <h2>1. {t("admin.guidedSituation")}</h2>
          <p>{t("admin.guidedSituationHelp")}</p>
          <div className="admin-guided-fields four">
            <Field
              label={t("registration.newForm.name")}
              required
              value={draft.nom}
              onChange={(v) => update("nom", v)}
            />
            <Field
              label={t("registration.newForm.firstName")}
              value={draft.prenom}
              onChange={(v) => update("prenom", v)}
            />
            <Field
              label={t("registration.newForm.usageName")}
              value={draft.nom_usage}
              onChange={(v) => update("nom_usage", v)}
            />
            <Field
              label={t("registration.newForm.aliases")}
              value={draft.autres_appellations}
              onChange={(v) => update("autres_appellations", v)}
            />
            <Select
              label={t("registration.newForm.sex")}
              value={draft.id_sexe}
              onChange={(v) => update("id_sexe", v)}
              options={sexes.map((x) => [x.id, refLabel(x, language)])}
            />
            <Select
              label={t("registration.newForm.status")}
              value={draft.id_statut}
              onChange={(v) =>
                setDraft((current) => ({
                  ...current,
                  id_statut: v,
                  ...(isDeceasedStatus(v)
                    ? {}
                    : { date_deces: "", annee_deces: "" }),
                }))
              }
              options={statuts.map((x) => [x.id, refLabel(x, language)])}
            />
            <Field
              label={t("registration.newForm.birthDate")}
              type="date"
              value={draft.date_naissance}
              onChange={(v) => update("date_naissance", v)}
            />
            <Field
              label={t("registration.newForm.birthYear")}
              type="number"
              value={draft.annee_naissance}
              onChange={(v) => update("annee_naissance", v)}
            />
            <Field
              label={t("registration.newForm.birthPlace")}
              value={draft.lieu_naissance}
              onChange={(v) => update("lieu_naissance", v)}
            />
          </div>
          {deceased && (
            <div className="admin-guided-fields two admin-death-fields">
              <Field
                label={t("registration.newForm.deathDate")}
                type="date"
                value={draft.date_deces}
                onChange={(v) => update("date_deces", v)}
              />
              <Field
                label={t("registration.newForm.deathYear")}
                type="number"
                value={draft.annee_deces}
                onChange={(v) => update("annee_deces", v)}
              />
            </div>
          )}
        </div>
        <div className="admin-guided-card">
          <h2>2. {t("admin.guidedCoordinates")}</h2>
          <p>{t("admin.guidedCoordinatesHelp")}</p>
          <div className="admin-guided-fields four">
            <Field
              label={t("registration.newForm.address")}
              value={draft.adresse}
              onChange={(v) => update("adresse", v)}
            />
            <Select
              label={t("registration.newForm.country")}
              value={draft.id_pays}
              onChange={(v) =>
                setDraft((c) => ({
                  ...c,
                  id_pays: v,
                  id_region: "",
                  id_ville: "",
                }))
              }
              options={pays.map((x) => [x.id, x.nom])}
            />
            <Select
              label={t("registration.newForm.region")}
              value={draft.id_region}
              onChange={(v) =>
                setDraft((c) => ({ ...c, id_region: v, id_ville: "" }))
              }
              options={regions
                .filter((x) => x.id_pays === draft.id_pays)
                .map((x) => [x.id, x.nom])}
              disabled={!draft.id_pays}
            />
            <Select
              label={t("registration.newForm.city")}
              value={draft.id_ville}
              onChange={(v) => update("id_ville", v)}
              options={villes
                .filter((x) => x.id_region === draft.id_region)
                .map((x) => [x.id, x.nom])}
              disabled={!draft.id_region}
            />
            <Field
              label={t("registration.newForm.phone")}
              value={draft.telephone}
              onChange={(v) => update("telephone", v)}
            />
            <Field
              label={t("registration.newForm.whatsapp")}
              value={draft.whatsapp}
              onChange={(v) => update("whatsapp", v)}
            />
            <Field
              label={t("registration.newForm.email")}
              type="email"
              value={draft.email}
              onChange={(v) => update("email", v)}
            />
            <Field
              label={t("registration.newForm.facebook")}
              value={draft.facebook}
              onChange={(v) => update("facebook", v)}
            />
            <Field
              label={t("registration.newForm.facebookLink")}
              value={draft.lien_facebook}
              onChange={(v) => update("lien_facebook", v)}
            />
          </div>
          <Select
            label={t("registration.newForm.link")}
            value={draft.id_lien}
            onChange={(v) => update("id_lien", v)}
            options={liens.map((x) => [x.id, refLabel(x, language)])}
          />
        </div>
        <div className="admin-guided-card">
          <h2>3. {t("admin.guidedFamily")}</h2>
          <p>{t("admin.guidedFamilyHelp")}</p>
          <div className="admin-guided-family">
            <section>
              <h3>{t("admin.attachment")}</h3>
              <div className="admin-guided-fields three">
                <div className="admin-guided-branch-field"><Select
                  label={t("admin.razambe")}
                  value={draft.id_razambe}
                  onChange={(v) =>
                    setDraft((c) => ({
                      ...c,
                      id_razambe: v,
                      id_taranaka: "",
                      id_sampana: "",
                    }))
                  }
                  options={razambes.map((x) => [x.id, x.nom])}
                /><button type="button" className="admin-guided-branch-add" aria-label={t("admin.addRazambe")} onClick={() => openBranchCreate("RAZAMBE")}>{t("admin.branchAdd")}</button></div>
                <div className="admin-guided-branch-field"><Select
                  label={t("admin.taranaka")}
                  value={draft.id_taranaka}
                  onChange={(v) =>
                    setDraft((c) => ({ ...c, id_taranaka: v, id_sampana: "" }))
                  }
                  options={taranakas.map((x) => [x.id, x.nom])}
                  disabled={!draft.id_razambe}
                /><button type="button" className="admin-guided-branch-add" aria-label={t("admin.addTaranaka")} onClick={() => openBranchCreate("TARANAKA")}>{t("admin.branchAdd")}</button></div>
                <div className="admin-guided-branch-field"><Select
                  label={t("admin.sampana")}
                  value={draft.id_sampana}
                  onChange={(v) => update("id_sampana", v)}
                  options={sampanas.map((x) => [x.id, x.nom])}
                  disabled={!draft.id_taranaka}
                /><button type="button" className="admin-guided-branch-add" aria-label={t("admin.addSampana")} onClick={() => openBranchCreate("SAMPANA")}>{t("admin.branchAdd")}</button></div>
              </div>
              {branchCreateHint && <p className="person-edit-branch-hint" role="status">{branchCreateHint}</p>}
            </section>
            <section className="admin-guided-relations">
              <div>
                <h3>{t("admin.relationTitle")}</h3>
                <p>{t("admin.relationHelp")}</p>
              </div>
              <button
                className="admin-button"
                type="button"
                onClick={openModal}
              >
                + {t("admin.addRelation")}
              </button>
              <RelationTable
                relations={draft.relations}
                types={types}
                onRemove={(index) =>
                  setDraft((c) => ({
                    ...c,
                    relations: c.relations.filter((_, i) => i !== index),
                  }))
                }
                t={t}
              />
            </section>
          </div>
        </div>
        <footer className="admin-guided-footer">
          <Link
            className="admin-entry-mode-outline"
            to="/personnes"
          >
            {t("admin.cancel")}
          </Link>
          <div className="admin-guided-footer-actions">
            <button
              type="button"
              className="admin-button"
              onClick={() => setStage("profile")}
            >
              {t("admin.continue")} →
            </button>
          </div>
        </footer>
        {modal && (
          <RelationModal
            t={t}
            step={modalStep}
            setStep={setModalStep}
            query={relationQuery}
            setQuery={setRelationQuery}
            results={relationResults}
            searched={relationSearched}
            search={relationSearch}
            selected={selected}
            setSelected={setSelected}
            types={types}
            typeId={typeId}
            setTypeId={setTypeId}
            error={relationError}
            provisional={provisional}
            setProvisional={setProvisional}
            sexes={sexes}
            statuts={statuts}
            language={language}
            creating={creatingProvisional}
            onCreate={createProvisional}
            onClose={() => setModal(false)}
            onAdd={addRelation}
          />
        )}
        {branchCreateModal}
      </section>
    );
  if (stage === "mode")
    return (
      <section className="admin-new-person-search-page">
        <header className="admin-new-person-header">
          <div>
            <button
              className="admin-new-person-back"
              type="button"
              onClick={() => setStage("search")}
            >
              ← {t("admin.newPersonBackSearch")}
            </button>
            <h1>{t("admin.newPersonTitle")}</h1>
            <p>{t("admin.newPersonModeSubtitle")}</p>
            <small className="admin-entry-mode-intro">
              {t("admin.newPersonModeHelp")}
            </small>
          </div>
          <ol
            className="admin-mode-process"
            aria-label={t("admin.newPersonModeSubtitle")}
          >
            <li className="complete">
              <span>✓</span>
              {t("admin.modeProcessSearch")}
            </li>
            <li className="active">
              <span>2</span>
              {t("admin.modeProcessMode")}
            </li>
            <li>
              <span>3</span>
              {t("admin.modeProcessEntry")}
            </li>
            <li>
              <span>4</span>
              {t("admin.modeProcessValidation")}
            </li>
          </ol>
        </header>
        <div className="admin-entry-mode-grid">
          <section className="admin-entry-mode-card admin-entry-mode-card-guided">
            <div className="admin-entry-mode-card-topline">
              <span className="admin-entry-mode-recommended">
                {t("admin.recommended")}
              </span>
            </div>
            <div className="admin-entry-mode-hero">
              <div>
                <h2>{t("admin.guidedModeTitle")}</h2>
                <p>{t("admin.guidedModeDescription")}</p>
              </div>
            </div>
            <ul className="admin-entry-mode-checklist">
              <li>✓ {t("admin.guidedIdentityFamily")}</li>
              <li>✓ {t("admin.guidedProfilePhoto")}</li>
              <li>✓ {t("admin.guidedPrivacyValidation")}</li>
            </ul>
            <span className="admin-entry-mode-meta">
              {t("admin.modeGuidedSteps")}
            </span>
            <button
              className="admin-button admin-entry-mode-primary"
              onClick={() => setStage("guided")}
              type="button"
            >
              {t("admin.guidedStart")} →
            </button>
          </section>
          <section className="admin-entry-mode-card">
            <div className="admin-entry-mode-hero">
              <div>
                <h2>{t("admin.groupedModeTitle")}</h2>
                <p>{t("admin.groupedModeDescription")}</p>
              </div>
            </div>
            <ul className="admin-entry-mode-checklist">
              <li>✓ {t("admin.modeGroupedBenefitOne")}</li>
              <li>✓ {t("admin.modeGroupedBenefitTwo")}</li>
              <li>✓ {t("admin.modeGroupedBenefitThree")}</li>
            </ul>
            <span className="admin-entry-mode-meta">
              {t("admin.modeOnePage")}
            </span>
            <button
              className="admin-entry-mode-outline"
              onClick={() => setStage("grouped")}
              type="button"
            >
              {t("admin.groupedStart")}
            </button>
          </section>
        </div>
      </section>
    );
  if (stage === "grouped")
    return (
      <section className="admin-guided-page admin-grouped-page">
        <header className="admin-new-person-header">
          <div>
            <button className="admin-new-person-back" type="button" onClick={() => setStage("mode")}>
              ← {t("admin.guidedBackMode")}
            </button>
            <h1>{t("admin.newPersonTitle")}</h1>
            <p>{t("admin.groupedModeDescription")}</p>
          </div>
        </header>
        <GroupedSheet
          draft={draft} setDraft={setDraft} t={t} language={language}
          sexes={sexes} statuts={statuts} liens={liens} pays={pays} regions={regions} villes={villes}
          razambes={razambes} taranakas={taranakas} sampanas={sampanas} types={types}
          activities={activities} skills={skills} interests={interests} domains={domains}
          catalogLabel={catalogLabel} deceased={deceased} isDeceasedStatus={isDeceasedStatus}
          activityDomain={activityDomain} setActivityDomain={setActivityDomain} activitySearch={activitySearch} setActivitySearch={setActivitySearch}
          skillSearch={skillSearch} setSkillSearch={setSkillSearch} interestSearch={interestSearch} setInterestSearch={setInterestSearch}
          activitiesExpanded={activitiesExpanded} setActivitiesExpanded={setActivitiesExpanded} skillsExpanded={skillsExpanded} setSkillsExpanded={setSkillsExpanded} interestsExpanded={interestsExpanded} setInterestsExpanded={setInterestsExpanded}
          availableActivities={availableActivities} availableSkills={availableSkills} availableInterests={availableInterests} displayCatalog={displayCatalog}
          photoPreview={photoPreview} openModal={openModal} onCreate={createComplete} creating={creatingComplete} createdId={createdId} createError={createError} openBranchCreate={openBranchCreate} branchCreateHint={branchCreateHint}
        />
        {modal && <RelationModal t={t} step={modalStep} setStep={setModalStep} query={relationQuery} setQuery={setRelationQuery} results={relationResults} searched={relationSearched} search={relationSearch} selected={selected} setSelected={setSelected} types={types} typeId={typeId} setTypeId={setTypeId} error={relationError} provisional={provisional} setProvisional={setProvisional} sexes={sexes} statuts={statuts} language={language} creating={creatingProvisional} onCreate={createProvisional} onClose={() => setModal(false)} onAdd={addRelation} />}
        {branchCreateModal}
      </section>
    );
  return (
    <section className="admin-new-person-search-page">
      <header className="admin-new-person-header">
        <div>
          <Link className="admin-new-person-back" to="/personnes">
            ← {t("admin.newPersonBack")}
          </Link>
          <h1>{t("admin.newPersonTitle")}</h1>
          <p>{t("admin.newPersonSubtitle")}</p>
        </div>
        {stepper(1)}
      </header>
      <section className="admin-new-person-search-card">
        <span className="admin-new-person-search-icon">
          <SearchIcon />
        </span>
        <div className="admin-new-person-search-copy">
          <h2>{t("admin.duplicateSearchTitle")}</h2>
          <p>{t("admin.duplicateSearchDescription")}</p>
        </div>
        <form className="admin-new-person-search-form" onSubmit={search}>
          <div className="admin-new-person-search-input">
            <SearchIcon />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t("admin.duplicateSearchPlaceholder")}
            />
          </div>
          <button
            className="admin-button admin-new-person-submit"
            disabled={searching}
          >
            {t("admin.duplicateSearchAction")}
          </button>
        </form>
        {error && <p className="admin-new-person-search-error">{error}</p>}
      </section>
      {searched && results.length === 0 && (
        <section className="admin-new-person-empty-card">
          <span className="admin-new-person-search-icon">
            <SearchIcon />
          </span>
          <div>
            <h2>{t("admin.duplicateEmptyTitle")}</h2>
            <p>{t("admin.duplicateEmptyDescription")}</p>
          </div>
          <button
            className="admin-button"
            type="button"
            onClick={() => setStage("mode")}
          >
            + {t("admin.duplicateCreate")}
          </button>
        </section>
      )}
      {searched && results.length > 0 && <Results results={results} t={t} />}
    </section>
  );
}
function Field({
  label,
  value,
  onChange,
  type = "text",
  required = false,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  required?: boolean;
}) {
  return (
    <label className="admin-guided-field">
      {label}
      {required ? " *" : ""}
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
      />
    </label>
  );
}
function GroupedSheet(props: any) {
  const { draft, setDraft, t, language, sexes, statuts, liens, pays, regions, villes, razambes, taranakas, sampanas, types, activities, skills, interests, domains, catalogLabel, deceased, isDeceasedStatus, activityDomain, setActivityDomain, activitySearch, setActivitySearch, skillSearch, setSkillSearch, interestSearch, setInterestSearch, activitiesExpanded, setActivitiesExpanded, skillsExpanded, setSkillsExpanded, interestsExpanded, setInterestsExpanded, availableActivities, availableSkills, availableInterests, displayCatalog, photoPreview, openModal, onCreate, creating, createdId, createError, openBranchCreate, branchCreateHint } = props;
  const update = (key: string, value: string) => setDraft((d: Draft) => ({ ...d, [key]: value }));
  const addActivity = (id: string) => setDraft((d: Draft) => d.activites.length >= 20 ? d : ({ ...d, activites: [...d.activites, { id_activite:id, lieu_travail:null, etude_en_cours:null, formations:null, experience_anterieur:null, diplome_ou_apprentissage:null }] }));
  return <>
    <section className="admin-guided-card"><h2>1. {t("admin.guidedSituation")}</h2><div className="admin-guided-fields four">
      {[["nom","registration.newForm.name",true],["prenom","registration.newForm.firstName"],["nom_usage","registration.newForm.usageName"],["autres_appellations","registration.newForm.aliases"]].map(([key,label,required]: any) => <Field key={key} label={t(label)} required={required} value={draft[key]} onChange={(v) => update(key,v)} />)}
      <Select label={t("registration.newForm.sex")} value={draft.id_sexe} onChange={(v) => update("id_sexe",v)} options={sexes.map((x:any)=>[x.id,refLabel(x,language)])}/>
      <Select label={t("registration.newForm.status")} value={draft.id_statut} onChange={(v) => setDraft((d:Draft)=>({...d,id_statut:v,...(isDeceasedStatus(v)?{}:{date_deces:"",annee_deces:""})}))} options={statuts.map((x:any)=>[x.id,refLabel(x,language)])}/>
      <Field label={t("registration.newForm.birthDate")} type="date" value={draft.date_naissance} onChange={(v)=>update("date_naissance",v)}/><Field label={t("registration.newForm.birthYear")} type="number" value={draft.annee_naissance} onChange={(v)=>update("annee_naissance",v)}/><Field label={t("registration.newForm.birthPlace")} value={draft.lieu_naissance} onChange={(v)=>update("lieu_naissance",v)}/>
      {deceased && <><Field label={t("registration.newForm.deathDate")} type="date" value={draft.date_deces} onChange={(v)=>update("date_deces",v)}/><Field label={t("registration.newForm.deathYear")} type="number" value={draft.annee_deces} onChange={(v)=>update("annee_deces",v)}/></>}
    </div></section>
    <section className="admin-guided-card"><h2>2. {t("admin.guidedCoordinates")}</h2><div className="admin-guided-fields four">
      <Field label={t("registration.newForm.address")} value={draft.adresse} onChange={(v)=>update("adresse",v)}/><Select label={t("registration.newForm.country")} value={draft.id_pays} onChange={(v)=>setDraft((d:Draft)=>({...d,id_pays:v,id_region:"",id_ville:""}))} options={pays.map((x:any)=>[x.id,x.nom])}/><Select label={t("registration.newForm.region")} value={draft.id_region} disabled={!draft.id_pays} onChange={(v)=>setDraft((d:Draft)=>({...d,id_region:v,id_ville:""}))} options={regions.filter((x:any)=>x.id_pays===draft.id_pays).map((x:any)=>[x.id,x.nom])}/><Select label={t("registration.newForm.city")} value={draft.id_ville} disabled={!draft.id_region} onChange={(v)=>update("id_ville",v)} options={villes.filter((x:any)=>x.id_region===draft.id_region).map((x:any)=>[x.id,x.nom])}/>
      {[['telephone','registration.newForm.phone'],['whatsapp','registration.newForm.whatsapp'],['email','registration.newForm.email'],['facebook','registration.newForm.facebook'],['lien_facebook','registration.newForm.facebookLink']].map(([key,label])=><Field key={key} label={t(label)} value={draft[key]} onChange={(v)=>update(key,v)}/>)}</div><Select label={t("registration.newForm.link")} value={draft.id_lien} onChange={(v)=>update("id_lien",v)} options={liens.map((x:any)=>[x.id,refLabel(x,language)])}/></section>
    <section className="admin-guided-card"><h2>3. {t("admin.guidedFamily")}</h2><div className="admin-guided-family"><section><div className="admin-guided-fields three"><div className="admin-guided-branch-field"><Select label={t("admin.razambe")} value={draft.id_razambe} onChange={(v)=>setDraft((d:Draft)=>({...d,id_razambe:v,id_taranaka:"",id_sampana:""}))} options={razambes.map((x:any)=>[x.id,x.nom])}/><button type="button" className="admin-guided-branch-add" aria-label={t("admin.addRazambe")} onClick={()=>openBranchCreate("RAZAMBE")}>{t("admin.branchAdd")}</button></div><div className="admin-guided-branch-field"><Select label={t("admin.taranaka")} value={draft.id_taranaka} disabled={!draft.id_razambe} onChange={(v)=>setDraft((d:Draft)=>({...d,id_taranaka:v,id_sampana:""}))} options={taranakas.map((x:any)=>[x.id,x.nom])}/><button type="button" className="admin-guided-branch-add" aria-label={t("admin.addTaranaka")} onClick={()=>openBranchCreate("TARANAKA")}>{t("admin.branchAdd")}</button></div><div className="admin-guided-branch-field"><Select label={t("admin.sampana")} value={draft.id_sampana} disabled={!draft.id_taranaka} onChange={(v)=>update("id_sampana",v)} options={sampanas.map((x:any)=>[x.id,x.nom])}/><button type="button" className="admin-guided-branch-add" aria-label={t("admin.addSampana")} onClick={()=>openBranchCreate("SAMPANA")}>{t("admin.branchAdd")}</button></div></div>{branchCreateHint&&<p className="person-edit-branch-hint" role="status">{branchCreateHint}</p>}</section><section className="admin-guided-relations"><button className="admin-button" type="button" onClick={openModal}>+ {t("admin.addRelation")}</button><RelationTable relations={draft.relations} types={types} t={t} onRemove={(i)=>setDraft((d:Draft)=>({...d,relations:d.relations.filter((_:any,n:number)=>n!==i)}))}/></section></div></section>
    <CatalogSection title={`4. ${t("registration.newForm.activities")}`} entries={availableActivities} expanded={activitiesExpanded} setExpanded={setActivitiesExpanded} search={activitySearch} setSearch={setActivitySearch} searchLabel={t("registration.newForm.searchActivity")} displayCatalog={displayCatalog} catalogLabel={catalogLabel} onAdd={addActivity} extra={<Select label={t("registration.newForm.domain")} value={activityDomain} onChange={setActivityDomain} options={domains.map((x:any)=>[x.id,catalogLabel(x)])}/>} selected={draft.activites.map((a:any,i:number)=><article className="admin-profile-selected" key={a.id_activite}><b>{catalogLabel(activities.find((x:any)=>x.id===a.id_activite)||{traductions:[]})}</b><button type="button" onClick={()=>setDraft((d:Draft)=>({...d,activites:d.activites.filter((_:any,n:number)=>n!==i)}))}>{t("registration.newForm.remove")}</button>{['lieu_travail','etude_en_cours','formations','experience_anterieur','diplome_ou_apprentissage'].map((k)=><Field key={k} label={t(`registration.newForm.${({lieu_travail:'workPlace',etude_en_cours:'studies',formations:'training',experience_anterieur:'experience',diplome_ou_apprentissage:'diploma'} as any)[k]}`)} value={a[k]||''} onChange={(v)=>setDraft((d:Draft)=>({...d,activites:d.activites.map((z:any,n:number)=>n===i?{...z,[k]:v}:z)}))}/>)}</article>)}/>
    <CatalogSection title={`5. ${t("registration.newForm.competences")}`} entries={availableSkills} expanded={skillsExpanded} setExpanded={setSkillsExpanded} search={skillSearch} setSearch={setSkillSearch} searchLabel={t("registration.newForm.searchSkill")} displayCatalog={displayCatalog} catalogLabel={catalogLabel} onAdd={(id:string)=>setDraft((d:Draft)=>({...d,competences:[...d.competences,{id_competence:id,partageable:false}]}))} selected={draft.competences.map((x:any,i:number)=><article className="admin-profile-selected" key={x.id_competence}><b>{catalogLabel(skills.find((s:any)=>s.id===x.id_competence)||{traductions:[]})}</b><label><input type="checkbox" checked={x.partageable} onChange={(e)=>setDraft((d:Draft)=>({...d,competences:d.competences.map((z:any,n:number)=>n===i?{...z,partageable:e.target.checked}:z)}))}/>{x.partageable?t("registration.newForm.shareable"):t("registration.newForm.notShareable")}</label><button type="button" onClick={()=>setDraft((d:Draft)=>({...d,competences:d.competences.filter((_:any,n:number)=>n!==i)}))}>{t("registration.newForm.remove")}</button></article>)}/>
    <CatalogSection title={`6. ${t("registration.newForm.interests")}`} entries={availableInterests} expanded={interestsExpanded} setExpanded={setInterestsExpanded} search={interestSearch} setSearch={setInterestSearch} searchLabel={t("registration.newForm.searchInterest")} displayCatalog={displayCatalog} catalogLabel={catalogLabel} onAdd={(id:string)=>setDraft((d:Draft)=>({...d,centres:[...d.centres,{id_centre_interet:id}]}))} selected={draft.centres.map((x:any,i:number)=><article className="admin-profile-selected" key={x.id_centre_interet}><b>{catalogLabel(interests.find((s:any)=>s.id===x.id_centre_interet)||{traductions:[]})}</b><button type="button" onClick={()=>setDraft((d:Draft)=>({...d,centres:d.centres.filter((_:any,n:number)=>n!==i)}))}>{t("registration.newForm.remove")}</button></article>)}/>
    <section className="admin-guided-card"><h2>7. {t("admin.photo")}</h2>{draft.photo&&photoPreview?<div className="admin-local-photo-preview"><img src={photoPreview} alt=""/><div><b>{draft.photo.name}</b><small>{formatFileSize(draft.photo.size)}</small><button type="button" onClick={()=>setDraft((d:Draft)=>({...d,photo:null}))}>{t("registration.newForm.remove")}</button></div></div>:<label className="admin-photo-unavailable"><input type="file" accept="image/jpeg,image/png,image/webp" onChange={(e)=>{const f=e.target.files?.[0];if(f&&isSupportedPhoto(f))setDraft((d:Draft)=>({...d,photo:f}))}}/><b>{t("admin.addPhoto")}</b><small>{t("admin.photoFormats")}</small></label>}</section>
    <section className="admin-guided-card"><h2>8. {t("admin.guidedPrivacyValidation")}</h2><div className="admin-privacy-grid">{(['email','facebook','telephone','whatsapp','adresse','photo'] as const).map((key)=><fieldset key={key}><legend>{t(key==='photo'?'admin.photo':`registration.newForm.${key==='telephone'?'phone':key}`)}</legend>{(['PRIVE','MEMBRES'] as const).map((value)=><label key={value}><input type="radio" name={key} checked={draft.confidentialite[key]===value} onChange={()=>setDraft((d:Draft)=>({...d,confidentialite:{...d.confidentialite,[key]:value}}))}/>{value}</label>)}</fieldset>)}</div></section>
    <section className="admin-guided-card"><h2>9. {t("admin.completeReview")}</h2><p>{t("admin.completeReviewHelp")}</p>{createdId?<Link className="admin-button" to={`/personnes/${createdId}`}>{t("admin.duplicateView")}</Link>:<button className="admin-button" type="button" disabled={creating} onClick={onCreate}>{creating?t("admin.completeCreating"):t("admin.completeCreate")}</button>}{createError&&<p className="admin-new-person-search-error">{createError}</p>}</section>
  </>;
}
function CatalogSection({title,entries,expanded,setExpanded,search,setSearch,searchLabel,displayCatalog,catalogLabel,onAdd,selected,extra}:any){const {t}=useLanguage();return <section className="admin-profile-block"><h2>{title}</h2><div className="admin-profile-grid"><div>{extra}<Field label={searchLabel} value={search} onChange={setSearch}/><div className={`admin-catalog-list ${expanded||search.trim()?'expanded':''}`}>{displayCatalog(entries,expanded,search).map((x:any)=><button type="button" className="reference-chip" key={x.id} onClick={()=>onAdd(x.id)}>+ {catalogLabel(x)}</button>)}</div>{!search.trim()&&entries.length>6&&<button className="admin-catalog-toggle" type="button" onClick={()=>setExpanded(!expanded)}>{expanded?t("admin.seeLessCompact"):`${t("admin.seeMoreCompact")} (${entries.length-6})`}</button>}</div><div>{selected}</div></div></section>}
function CompleteReview({
  draft,
  t,
  language,
  sexes,
  statuts,
  liens,
  elements,
  pays,
  regions,
  villes,
  activities,
  skills,
  interests,
  label,
  photoPreview,
  onEditIdentity,
  onEditProfile,
  onPrivacy,
}: {
  draft: Draft;
  t: (key: any) => string;
  language: string;
  sexes: SexeReference[];
  statuts: StatutReference[];
  liens: LienReference[];
  elements: ElementReference[];
  pays: PaysReference[];
  regions: RegionReference[];
  villes: VilleReference[];
  activities: Activite[];
  skills: Competence[];
  interests: CentreInteret[];
  label: (item: {
    traductions: { libelle: string; code_langue?: string }[];
  }) => string;
  photoPreview: string | null;
  onEditIdentity: () => void;
  onEditProfile: () => void;
  onPrivacy: (
    key: keyof Confidentialite,
    value: Confidentialite[keyof Confidentialite],
  ) => void;
}) {
  const deceased = statuts.some(
    (statut) =>
      statut.id === draft.id_statut &&
      statut.code?.trim().toUpperCase() === "DECEDE",
  );
  const ref = (
    items: {
      id: string;
      nom?: string;
      libelle?: string;
      traductions?: { libelle: string; langue?: { code: string } | null }[];
    }[],
    id: string,
  ) => refLabel(items.find((x) => x.id === id) ?? {}, language);
  const attachment =
    [
      ref(elements, draft.id_razambe),
      ref(elements, draft.id_taranaka),
      ref(elements, draft.id_sampana),
    ]
      .filter((x) => x !== "—")
      .join(" → ") || "—";
  return (
    <>
      <section className="admin-guided-card">
        <h2>1. {t("registration.newForm.privacy")}</h2>
        <p>{t("registration.newForm.privacyHelp")}</p>
        <div className="admin-privacy-grid">
          {(
            [
              ["email", t("registration.newForm.email")],
              ["telephone", t("registration.newForm.phone")],
              ["whatsapp", t("registration.newForm.whatsapp")],
              ["facebook", t("registration.newForm.facebook")],
              ["adresse", t("registration.newForm.address")],
              ["photo", t("admin.photo")],
            ] as const
          ).map(([key, name]) => (
            <fieldset key={key}>
              <legend>{name}</legend>
              {(["PRIVE", "MEMBRES"] as const).map((value) => (
                <label key={value}>
                  <input
                    type="radio"
                    name={key}
                    checked={draft.confidentialite[key] === value}
                    onChange={() => onPrivacy(key, value)}
                  />
                  {value === "PRIVE"
                    ? t("registration.newForm.private")
                    : t("registration.newForm.members")}
                </label>
              ))}
            </fieldset>
          ))}
        </div>
      </section>
      <section className="admin-guided-card">
        <h2>2. {t("admin.completeReview")}</h2>
        <p>{t("admin.completeReviewHelp")}</p>
        <div className="admin-complete-summary">
          <SummaryCard title={t("admin.identity")} onEdit={onEditIdentity}>
            <p>
              <b>{draft.nom}</b> {draft.prenom}
            </p>
            <p>
              {ref(sexes, draft.id_sexe)} · {ref(statuts, draft.id_statut)}
            </p>
            {deceased && (draft.date_deces || draft.annee_deces) && (
              <p>
                {[
                  draft.date_deces &&
                    `${t("registration.newForm.deathDate")}: ${draft.date_deces}`,
                  draft.annee_deces &&
                    `${t("registration.newForm.deathYear")}: ${draft.annee_deces}`,
                ]
                  .filter(Boolean)
                  .join(" · ")}
              </p>
            )}
            <p>{attachment}</p>
            <p>
              {ref(liens, draft.id_lien)} · {t("admin.relationTitle")}:{" "}
              {draft.relations.length}
            </p>
          </SummaryCard>
          <SummaryCard title={t("admin.contact")} onEdit={onEditIdentity}>
            <p>
              {[
                draft.adresse,
                ref(villes, draft.id_ville),
                ref(regions, draft.id_region),
                ref(pays, draft.id_pays),
              ]
                .filter((x) => x && x !== "—")
                .join(", ") || "—"}
            </p>
            <p>
              {[
                draft.telephone,
                draft.whatsapp,
                draft.email,
                draft.facebook,
                draft.lien_facebook,
              ]
                .filter(Boolean)
                .join(" · ") || "—"}
            </p>
          </SummaryCard>
          <SummaryCard
            title={`${t("registration.newForm.activities")} (${draft.activites.length})`}
            onEdit={onEditProfile}
          >
            <p>
              {draft.activites
                .map((x) =>
                  label(
                    activities.find((a) => a.id === x.id_activite) ?? {
                      traductions: [],
                    },
                  ),
                )
                .join(", ") || "—"}
            </p>
          </SummaryCard>
          <SummaryCard
            title={`${t("registration.newForm.competences")} (${draft.competences.length})`}
            onEdit={onEditProfile}
          >
            <p>
              {draft.competences
                .map(
                  (x) =>
                    `${label(skills.find((a) => a.id === x.id_competence) ?? { traductions: [] })} — ${x.partageable ? t("registration.newForm.shareable") : t("registration.newForm.notShareable")}`,
                )
                .join(", ") || "—"}
            </p>
          </SummaryCard>
          <SummaryCard
            title={`${t("registration.newForm.interests")} (${draft.centres.length})`}
            onEdit={onEditProfile}
          >
            <p>
              {draft.centres
                .map((x) =>
                  label(
                    interests.find((a) => a.id === x.id_centre_interet) ?? {
                      traductions: [],
                    },
                  ),
                )
                .join(", ") || "—"}
            </p>
          </SummaryCard>
          <SummaryCard title={t("admin.photo")} onEdit={onEditProfile}>
            {photoPreview ? (
              <img className="admin-complete-photo" src={photoPreview} alt="" />
            ) : (
              <p>{t("admin.completeNoPhoto")}</p>
            )}
          </SummaryCard>
        </div>
      </section>
    </>
  );
}
function SummaryCard({
  title,
  onEdit,
  children,
}: {
  title: string;
  onEdit: () => void;
  children: ReactNode;
}) {
  const { t } = useLanguage();
  return (
    <article className="admin-complete-card">
      <header>
        <h3>{title}</h3>
        <button type="button" onClick={onEdit}>
          {t("admin.edit")}
        </button>
      </header>
      {children}
    </article>
  );
}
function ProfileBlock({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="admin-guided-card admin-profile-block">
      <h2>{title}</h2>
      {children}
    </section>
  );
}
function Select({
  label,
  value,
  onChange,
  options,
  disabled = false,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: string[][];
  disabled?: boolean;
}) {
  return (
    <label className="admin-guided-field">
      {label}
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
      >
        <option value="">—</option>
        {options.map(([id, name]) => (
          <option key={id} value={id}>
            {name}
          </option>
        ))}
      </select>
    </label>
  );
}
function Results({
  results,
  t,
}: {
  results: PersonneRecherchee[];
  t: (key: any) => string;
}) {
  return (
    <section className="admin-new-person-results-card">
      <h2>
        {t("admin.duplicateResults").replace("{count}", String(results.length))}
      </h2>
      {results.map((p) => (
        <article className="admin-new-person-result" key={p.id}>
          <span className="admin-new-person-result-avatar">{initials(p)}</span>
          <div className="admin-new-person-result-identity">
            <h3>{text(p)}</h3>
            <p>{p.lieu_naissance ?? ""}</p>
          </div>
          <Link className="admin-new-person-view" to={`/personnes/${p.id}`}>
            {t("admin.duplicateView")}
          </Link>
        </article>
      ))}
    </section>
  );
}
function RelationTable({
  relations,
  types,
  onRemove,
  t,
}: {
  relations: DraftRelation[];
  types: TypeRelation[];
  onRemove: (index: number) => void;
  t: (key: any) => string;
}) {
  return (
    <div className="admin-draft-relations">
      <div className="admin-draft-relation-head">
        <b>{t("admin.relationPerson")}</b>
        <b>{t("admin.relationType")}</b>
        <b>{t("admin.actions")}</b>
      </div>
      {relations.length ? (
        relations.map((r, i) => (
          <div key={`${r.person.id}-${r.typeId}`}>
            <span>{text(r.person)}</span>
            <span>{types.find((x) => x.id === r.typeId)?.libelle ?? "—"}</span>
            <button type="button" onClick={() => onRemove(i)}>
              {t("admin.remove")}
            </button>
          </div>
        ))
      ) : (
        <p>{t("admin.noRelation")}</p>
      )}
    </div>
  );
}
function RelationModal({
  t,
  step,
  setStep,
  query,
  setQuery,
  results,
  searched,
  search,
  selected,
  setSelected,
  types,
  typeId,
  setTypeId,
  error,
  provisional,
  setProvisional,
  sexes,
  statuts,
  language,
  creating,
  onCreate,
  onClose,
  onAdd,
}: {
  t: (key: any) => string;
  step: RelationModalStep;
  setStep: (s: RelationModalStep) => void;
  query: string;
  setQuery: (v: string) => void;
  results: PersonneRecherchee[];
  searched: boolean;
  search: (e: FormEvent) => void;
  selected: PersonneRecherchee | null;
  setSelected: (p: PersonneRecherchee) => void;
  types: TypeRelation[];
  typeId: string;
  setTypeId: (v: string) => void;
  error: string | null;
  provisional: ProvisionalDraft;
  setProvisional: (draft: ProvisionalDraft) => void;
  sexes: SexeReference[];
  statuts: StatutReference[];
  language: string;
  creating: boolean;
  onCreate: () => void;
  onClose: () => void;
  onAdd: () => void;
}) {
  return (
    <div className="admin-relation-overlay" role="dialog" aria-modal="true">
      <section className="admin-relation-modal">
        <header>
          <div>
            <h2>{t("admin.relationModalTitle")}</h2>
            <p>{t("admin.relationModalHelp")}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={t("admin.closeMenu")}
          >
            ×
          </button>
        </header>
        <ol className="admin-relation-stepper">
          <li className={step === "search" ? "active" : ""}>
            <span>1</span>
            {t("admin.newPersonStepSearch")}
          </li>
          <li className={step === "provisional" ? "active" : ""}>
            <span>2</span>
            {t("admin.relationCreateStep")}
          </li>
          <li className={step === "define" ? "active" : ""}>
            <span>3</span>
            {t("admin.relationDefineStep")}
          </li>
        </ol>
        {step === "search" && (
          <div className="admin-relation-modal-body">
            <h3>1. {t("admin.relationSearchTitle")}</h3>
            <p>{t("admin.relationSearchHelp")}</p>
            <form className="admin-new-person-search-form" onSubmit={search}>
              <div className="admin-new-person-search-input">
                <SearchIcon />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={t("admin.duplicateSearchPlaceholder")}
                />
              </div>
              <button className="admin-button">
                {t("admin.duplicateSearchAction")}
              </button>
            </form>
            {results.length > 0 && <Results results={results} t={t} />}{" "}
            {results.length > 0 && (
              <div className="admin-modal-select-list">
                {results.map((p) => (
                  <button
                    type="button"
                    key={p.id}
                    onClick={() => {
                      setSelected(p);
                      setStep("define");
                    }}
                  >
                    {t("admin.select")} — {text(p)}
                  </button>
                ))}
              </div>
            )}
            {searched && results.length === 0 && (
              <div className="admin-provisional-empty">
                <h3>{t("admin.relationNoResult")}</h3>
                <p>{t("admin.relationNoResultHelp")}</p>
                <button
                  type="button"
                  className="admin-entry-mode-outline"
                  onClick={() => setStep("provisional")}
                >
                  + {t("admin.relationCreateStep")}
                </button>
              </div>
            )}
          </div>
        )}
        {step === "provisional" && (
          <div className="admin-relation-modal-body">
            <h3>2. {t("admin.provisionalTitle")}</h3>
            <p>{t("admin.provisionalHelp")}</p>
            <div className="admin-guided-fields two">
              <Field
                label={t("registration.newForm.name")}
                required
                value={provisional.nom}
                onChange={(v) => setProvisional({ ...provisional, nom: v })}
              />
              <Field
                label={t("registration.newForm.firstName")}
                value={provisional.prenom}
                onChange={(v) => setProvisional({ ...provisional, prenom: v })}
              />
              <Field
                label={t("registration.newForm.usageName")}
                value={provisional.nom_usage}
                onChange={(v) =>
                  setProvisional({ ...provisional, nom_usage: v })
                }
              />
              <Field
                label={t("registration.newForm.aliases")}
                value={provisional.autres_appellations}
                onChange={(v) =>
                  setProvisional({ ...provisional, autres_appellations: v })
                }
              />
              <Select
                label={t("registration.newForm.sex")}
                value={provisional.id_sexe}
                onChange={(v) => setProvisional({ ...provisional, id_sexe: v })}
                options={sexes.map((x) => [x.id, refLabel(x, language)])}
              />
              <Select
                label={t("registration.newForm.status")}
                value={provisional.id_statut}
                onChange={(v) =>
                  setProvisional({ ...provisional, id_statut: v })
                }
                options={statuts.map((x) => [x.id, refLabel(x, language)])}
              />
              <Field
                label={t("registration.newForm.birthDate")}
                type="date"
                value={provisional.date_naissance}
                onChange={(v) =>
                  setProvisional({ ...provisional, date_naissance: v })
                }
              />
              <Field
                label={t("registration.newForm.birthYear")}
                type="number"
                value={provisional.annee_naissance}
                onChange={(v) =>
                  setProvisional({ ...provisional, annee_naissance: v })
                }
              />
              <Field
                label={t("registration.newForm.birthPlace")}
                value={provisional.lieu_naissance}
                onChange={(v) =>
                  setProvisional({ ...provisional, lieu_naissance: v })
                }
              />
            </div>
            {error && <p className="admin-new-person-search-error">{error}</p>}
            <button
              className="admin-button"
              type="button"
              disabled={creating}
              onClick={onCreate}
            >
              {t("admin.provisionalCreate")} →
            </button>
          </div>
        )}
        {step === "define" && selected && (
          <div className="admin-relation-modal-body">
            <h3>
              {t("admin.selectedPerson")} : {text(selected)}
            </h3>
            <Select
              label={t("admin.relationType")}
              value={typeId}
              onChange={setTypeId}
              options={types.map((x) => [x.id, x.libelle ?? "—"])}
            />
            <footer>
              <button
                className="admin-entry-mode-outline"
                type="button"
                onClick={() => setStep("search")}
              >
                ← {t("admin.back")}
              </button>
              <button
                className="admin-button"
                type="button"
                disabled={!typeId}
                onClick={onAdd}
              >
                {t("admin.relationAdd")}
              </button>
            </footer>
          </div>
        )}
      </section>
    </div>
  );
}
