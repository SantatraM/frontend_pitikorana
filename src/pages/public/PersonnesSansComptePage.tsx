import { Eye, Search } from "lucide-react";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { ApiError } from "../../api/apiClient";
import {
  getPersonnesSansCompte,
  type PersonneSansCompte,
  type PersonnesSansComptePagination,
} from "../../api/personnes";
import { useLanguage } from "../../hooks/useLanguage";
import "./Personnes.css";

const LIMITS = [10, 20, 50] as const;

function pageNumbers(current: number, total: number) {
  if (total <= 7) return Array.from({ length: total }, (_, index) => index + 1);
  const candidates = new Set([1, total, current - 1, current, current + 1]);
  return [...candidates].filter((page) => page >= 1 && page <= total).sort((a, b) => a - b);
}

export function PersonnesSansComptePage() {
  const { t } = useLanguage();
  const [search, setSearch] = useState("");
  const [appliedSearch, setAppliedSearch] = useState("");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState<(typeof LIMITS)[number]>(10);
  const [items, setItems] = useState<PersonneSansCompte[]>([]);
  const [pagination, setPagination] = useState<PersonnesSansComptePagination>({
    page: 1, limit: 10, total: 0, total_pages: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    void Promise.resolve()
      .then(() => {
        if (!active) return null;
        setLoading(true);
        setError(null);
        return getPersonnesSansCompte({ recherche: appliedSearch, page, limit });
      })
      .then((response) => {
        if (!active || !response) return;
        const next = response.data;
        setItems(next?.personnes ?? []);
        setPagination(next?.pagination ?? { page: 1, limit, total: 0, total_pages: 0 });
        if (next?.pagination && page > Math.max(1, next.pagination.total_pages)) {
          setPage(Math.max(1, next.pagination.total_pages));
        }
      })
      .catch((caught) => {
        if (active) setError(caught instanceof ApiError ? caught.message : t("admin.peopleWithoutAccountLoadError"));
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [appliedSearch, limit, page, t]);

  const pages = useMemo(() => pageNumbers(pagination.page, pagination.total_pages), [pagination]);
  const start = pagination.total === 0 ? 0 : (pagination.page - 1) * pagination.limit + 1;
  const end = Math.min(pagination.page * pagination.limit, pagination.total);
  const missing = t("admin.notProvided");
  const submitSearch = (event: FormEvent) => {
    event.preventDefault();
    setPage(1);
    setAppliedSearch(search.trim());
  };

  return <section className="admin-people-page"><div className="admin-people-sheet people-without-account-sheet">
    <header className="admin-page-heading"><div><h2>{t("admin.peopleWithoutAccount")}</h2><span>{t("admin.peopleWithoutAccountDescription")}</span></div></header>
    <form className="admin-people-tools people-without-account-search" onSubmit={submitSearch}>
      <label className="admin-search"><Search size={18} aria-hidden="true" /><span className="sr-only">{t("admin.searchPeopleWithoutAccount")}</span><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder={t("admin.searchPeopleWithoutAccount")} /></label>
      <button className="admin-button admin-button-primary" type="submit">{t("admin.search")}</button>
    </form>
    {error ? <p className="form-error" role="alert">{error}</p> : null}
    {loading ? <p className="admin-empty">{t("admin.loadingPeople")}</p> : items.length === 0 ? <p className="admin-empty">{t("admin.noPeopleWithoutAccount")}</p> : <>
      <div className="admin-people-table-wrap"><table className="admin-people-table people-without-account-table"><thead><tr><th>{t("registration.newForm.name")}</th><th>{t("registration.newForm.firstName")}</th><th>{t("registration.newForm.email")}</th><th>{t("registration.newForm.phone")}</th><th>{t("registration.newForm.whatsapp")}</th><th>{t("admin.actions")}</th></tr></thead><tbody>{items.map((personne) => <tr key={personne.id_personne}><td>{personne.nom}</td><td>{personne.prenom ?? missing}</td><td>{personne.email ?? missing}</td><td>{personne.telephone ?? missing}</td><td>{personne.whatsapp ?? missing}</td><td><Link className="admin-person-view" to={`/personnes/${personne.id_personne}`} aria-label={t("admin.viewPersonRecord")} title={t("admin.viewPersonRecord")}><Eye size={18} aria-hidden="true" /></Link></td></tr>)}</tbody></table></div>
      <div className="admin-people-mobile-list people-without-account-mobile">{items.map((personne) => <article key={personne.id_personne}><div><strong>{personne.nom} {personne.prenom ?? ""}</strong><Link className="admin-person-view" to={`/personnes/${personne.id_personne}`} aria-label={t("admin.viewPersonRecord")} title={t("admin.viewPersonRecord")}><Eye size={18} aria-hidden="true" /></Link></div><p>{t("registration.newForm.email")}: {personne.email ?? missing}</p><p>{t("registration.newForm.phone")}: {personne.telephone ?? missing}</p><p>{t("registration.newForm.whatsapp")}: {personne.whatsapp ?? missing}</p></article>)}</div>
      <footer className="admin-pagination people-without-account-pagination"><span>{t("admin.showingPeople").replace("{start}", String(start)).replace("{end}", String(end)).replace("{total}", String(pagination.total))}</span><label>{t("admin.rowsPerPage")}<select value={limit} onChange={(event) => { setLimit(Number(event.target.value) as (typeof LIMITS)[number]); setPage(1); }}>{LIMITS.map((value) => <option value={value} key={value}>{value}</option>)}</select></label><div><button type="button" onClick={() => setPage((value) => Math.max(1, value - 1))} disabled={pagination.page <= 1}>‹</button>{pages.map((value, index) => <span key={value}>{index > 0 && value - pages[index - 1] > 1 ? <i aria-hidden="true">…</i> : null}<button type="button" className={value === pagination.page ? "active" : ""} onClick={() => setPage(value)}>{value}</button></span>)}<button type="button" onClick={() => setPage((value) => Math.min(Math.max(1, pagination.total_pages), value + 1))} disabled={pagination.page >= pagination.total_pages}>›</button></div></footer>
    </>}
  </div></section>;
}
