import { useEffect, useState } from 'react'
import { useAuth } from '../../hooks/useAuth'
import { useLanguage } from '../../hooks/useLanguage'
import { getPreferencesConfidentialitePersonne } from '../../api/confidentialitePersonne'
import { getProfilPersonne } from '../../api/personnes'
import { PersonneProfileContent } from '../../components/personne/PersonneProfileContent'
import type { PreferencesConfidentialitePersonne } from '../../types/confidentialitePersonne'
import type { ProfilPersonne } from '../../types/profil'

export function MonProfilAdminPage() {
  const { user } = useAuth(); const { t, language } = useLanguage()
  const personId = user?.personne.id
  const [profile, setProfile] = useState<ProfilPersonne | null>(null); const [privacy, setPrivacy] = useState<PreferencesConfidentialitePersonne | null>(null); const [error, setError] = useState(false)
  useEffect(() => { if (!personId) return; let active = true; setError(false); setProfile(null); void Promise.all([getProfilPersonne(personId, language), getPreferencesConfidentialitePersonne(personId)]).then(([profileResponse, privacyResponse]) => { if (active) { setProfile(profileResponse.data ?? null); setPrivacy(privacyResponse.data ?? null) } }).catch(() => { if (active) setError(true) }); return () => { active = false } }, [personId, language])
  if (!personId) return <p className="form-error" role="alert">{t('admin.personEdit.noPerson')}</p>
  if (!profile) return <p className={error ? 'form-error' : 'auth-loading'} role={error ? 'alert' : undefined}>{error ? t('member.profileLoadError') : t('member.loadingProfile')}</p>
  return <PersonneProfileContent profile={profile} privacy={privacy} showEdit heroBadge={t('admin.administrator')} editTo="/admin/profil/modifier" />
}
