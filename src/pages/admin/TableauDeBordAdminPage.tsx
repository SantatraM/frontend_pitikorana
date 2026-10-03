import { useEffect, useState } from "react";
import {
  ChevronRight,
  ClipboardList,
  GitBranch,
  MapPin,
  Network,
  Pencil,
  Settings,
  User,
  UserRound,
  Users,
} from "lucide-react";
import { Link } from "react-router-dom";
import { getDemandesInscription } from "../../api/demandesInscription";
import { getPersonnes, getProfilPersonne } from "../../api/personnes";
import { getElements, type ElementReference } from "../../api/referentielsInscription";
import { useAuth } from "../../hooks/useAuth";
import { useLanguage } from "../../hooks/useLanguage";
import { useLatestRequest } from "../../hooks/useLatestRequest";
import type { ProfilPersonne } from "../../types/profil";

type Overview = {
  people: number | null;
  razambe: number | null;
  taranaka: number | null;
  sampana: number | null;
};
const empty: Overview = {
  people: null,
  razambe: null,
  taranaka: null,
  sampana: null,
};
const initial = (a: string | null | undefined, b: string | undefined) =>
  [a, b]
    .filter(Boolean)
    .map((x) => x?.[0])
    .join("")
    .toUpperCase() || "A";
const type = (item: ElementReference, value: string) =>
  item.type_element?.code === value;

export function TableauDeBordAdminPage() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const id = user?.personne.id;
  const canManageReferences = user?.compte.role === "ADMIN";
  const [profile, setProfile] = useState<ProfilPersonne | null>(null);
  const [overview, setOverview] = useState<Overview>(empty);
  const [pending, setPending] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [secondaryError, setSecondaryError] = useState(false);
  const { startRequest, isCurrentRequest } = useLatestRequest();
  useEffect(() => {
    if (!id) {
      setLoading(false);
      return;
    }
    const request = startRequest();
    if (!isCurrentRequest(request)) return;
    void Promise.allSettled([
      getProfilPersonne(id),
      getPersonnes(),
      getElements(),
      getDemandesInscription(),
    ]).then(([p, people, elements, requests]) => {
      if (!isCurrentRequest(request)) return;
      setProfile(p.status === "fulfilled" ? (p.value.data ?? null) : null);
      const next = { ...empty };
      let failed = false;
      if (people.status === "fulfilled") next.people = people.value.data?.length ?? 0;
      else failed = true;
      if (elements.status === "fulfilled") {
        const list = elements.value.data ?? [];
        next.razambe = list.filter((x) => type(x, "RAZAMBE")).length;
        next.taranaka = list.filter((x) => type(x, "TARANAKA")).length;
        next.sampana = list.filter((x) => type(x, "SAMPANA")).length;
      } else failed = true;
      if (requests.status === "fulfilled")
        setPending(
          (requests.value.data ?? []).filter((x) => x.statut.code === "EN_ATTENTE").length,
        );
      else {
        setPending(null);
        failed = true;
      }
      setOverview(next);
      setSecondaryError(failed);
      setLoading(false);
    });
  }, [id, isCurrentRequest, startRequest]);
  const person = profile?.personne;
  const name = person?.prenom || person?.nom || user?.personne.prenom || t("admin.administrator");
  const family = [
    { label: t("admin.razambe"), item: person?.razambe, Icon: Network },
    { label: t("admin.taranaka"), item: person?.taranaka, Icon: Users },
    { label: t("admin.sampana"), item: person?.sampana, Icon: GitBranch },
  ];
  const stats = [
    {
      label: t("admin.people"),
      value: overview.people,
      Icon: Users,
      to: "/personnes",
    },
    {
      label: t("admin.razambe"),
      value: overview.razambe,
      Icon: Network,
      to: "/branches",
    },
    {
      label: t("admin.taranaka"),
      value: overview.taranaka,
      Icon: Users,
      to: "/branches",
    },
    {
      label: t("admin.sampana"),
      value: overview.sampana,
      Icon: GitBranch,
      to: "/branches",
    },
  ];
  const actions = [
    { to: "/personnes/nouvelle", Icon: UserRound, title: t("admin.addPerson") },
    { to: "/personnes", Icon: Users, title: t("admin.people") },
    { to: "/branches", Icon: GitBranch, title: t("admin.familyBranch") },
    {
      to: "/admin/demandes-inscription",
      Icon: ClipboardList,
      title: t("admin.requests"),
    },
    { to: "/admin/referentiels", Icon: Settings, title: t("admin.references") },
    { to: "/admin/profil", Icon: User, title: t("admin.myProfile") },
  ].filter((action) => canManageReferences || action.to !== "/admin/referentiels");
  if (loading) return <p className="auth-loading">{t("member.loadingProfile")}</p>;
  return (
    <section className="admin-dashboard membre-dashboard membre-dashboard-v2">
      <header className="admin-page-heading membre-page-heading">
        <h2>{t("admin.dashboard")}</h2>
        <span>{t("admin.dashboardIntro")}</span>
      </header>
      {person && (
        <>
          <section className="membre-dashboard-profile-card">
            <div className="membre-dashboard-avatar">
              {person.photo?.url_photo ? (
                <img src={person.photo.url_photo} alt="" />
              ) : (
                <span>{initial(person.prenom, person.nom)}</span>
              )}
            </div>
            <div className="membre-dashboard-profile-content">
              <p>
                {t("admin.hello")}, {name}
              </p>
              <h1>{[person.prenom, person.nom].filter(Boolean).join(" ")}</h1>
              <div className="membre-dashboard-profile-meta">
                <span>{t("admin.administrator")}</span>
                {person.ville?.nom && (
                  <span>
                    <MapPin size={14} />
                    {person.ville.nom}
                  </span>
                )}
              </div>
            </div>
            <div className="membre-dashboard-profile-actions">
              <Link className="admin-entry-mode-outline" to="/admin/profil">
                {t("admin.myProfile")}
              </Link>
              <Link className="admin-button" to="/admin/profil/modifier">
                <Pencil size={15} />
                {t("admin.edit")}
              </Link>
            </div>
          </section>
          <section className="membre-dashboard-section">
            <header>
              <h2>
                <Network size={19} />
                {t("member.familyAttachment")}
              </h2>
            </header>
            <div className="membre-dashboard-family-grid">
              {family.map(({ label, item, Icon }) =>
                item?.id ? (
                  <Link
                    key={label}
                    to={`/branches/${item.id}`}
                    className="membre-dashboard-family-card"
                  >
                    <Icon size={19} />
                    <span>
                      <small>{label}</small>
                      <strong>{item.nom}</strong>
                    </span>
                    <ChevronRight size={16} />
                  </Link>
                ) : (
                  <div key={label} className="membre-dashboard-family-card is-empty">
                    <Icon size={19} />
                    <span>
                      <small>{label}</small>
                      <strong>{t("member.notProvided")}</strong>
                    </span>
                  </div>
                ),
              )}
            </div>
          </section>
        </>
      )}
      <section className="membre-dashboard-section">
        <header>
          <h2>
            <Users size={19} />
            {t("member.overview")}
          </h2>
        </header>
        {secondaryError && (
          <p className="membre-dashboard-note">{t("member.dashboardDataError")}</p>
        )}
        <div className="membre-dashboard-stats">
          {stats.map(({ label, value, Icon, to }) => (
            <Link className="membre-dashboard-stat" key={label} to={to}>
              <Icon size={19} />
              <span>
                <small>{label}</small>
                <strong>{value ?? "—"}</strong>
              </span>
              <ChevronRight size={16} />
            </Link>
          ))}
        </div>
      </section>
      <section className="membre-dashboard-section">
        <header>
          <h2>
            <ClipboardList size={19} />
            {t("admin.requests")}
          </h2>
        </header>
        <div className="membre-dashboard-stats">
          <Link className="membre-dashboard-stat" to="/admin/demandes-inscription">
            <ClipboardList size={19} />
            <span>
              <small>{t("admin.statusPending")}</small>
              <strong>{pending ?? "—"}</strong>
            </span>
            <ChevronRight size={16} />
          </Link>
          {canManageReferences && (
            <Link className="membre-dashboard-stat" to="/admin/referentiels">
              <Settings size={19} />
              <span>
                <small>{t("admin.references")}</small>
                <strong>→</strong>
              </span>
              <ChevronRight size={16} />
            </Link>
          )}
        </div>
      </section>
      <section className="membre-dashboard-section">
        <header>
          <h2>
            <ChevronRight size={19} />
            {t("member.quickActions")}
          </h2>
        </header>
        <div className="admin-action-grid membre-action-grid">
          {actions.map(({ to, Icon, title }) => (
            <Link className="admin-action-card" to={to} key={to}>
              <span className="admin-action-icon">
                <Icon size={18} />
              </span>
              <strong>{title}</strong>
              <p>{t("admin.dashboardIntro")}</p>
              <small>
                {t("admin.view")} <ChevronRight size={15} />
              </small>
            </Link>
          ))}
        </div>
      </section>
    </section>
  );
}
