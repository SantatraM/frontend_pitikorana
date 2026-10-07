import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AppLayout } from '../components/layout/AppLayout'
import { PersonnesLayout } from '../components/layout/PersonnesLayout'
import { AdminLayout } from '../components/admin/AdminLayout'
import { MembreLayout } from '../components/membre/MembreLayout'
import { TableauDeBordAdminPage } from '../pages/admin/TableauDeBordAdminPage'
import { DemandesInscriptionPage } from '../pages/admin/DemandesInscriptionPage'
import { DemandeInscriptionDetailPage } from '../pages/admin/DemandeInscriptionDetailPage'
import { ReferentielsPage } from '../pages/admin/ReferentielsPage'
import { UtilisateursPage } from '../pages/admin/UtilisateursPage'
import { MonProfilAdminPage } from '../pages/admin/MonProfilAdminPage'
import { ModifierMonProfilAdminPage } from '../pages/admin/ModifierMonProfilAdminPage'
import { TableauDeBordMembrePage } from '../pages/membre/TableauDeBordMembrePage'
import { MonProfilMembrePage } from '../pages/membre/MonProfilMembrePage'
import { ModifierMonProfilMembrePage } from '../pages/membre/ModifierMonProfilMembrePage'
import { ConnexionPage } from '../pages/public/ConnexionPage'
import { InitialisationPage } from '../pages/public/InitialisationPage'
import { InscriptionPage } from '../pages/public/InscriptionPage'
import { NotFoundPage } from '../pages/public/NotFoundPage'
import { SuiviInscriptionPage } from '../pages/public/SuiviInscriptionPage'
import { PersonnesPage } from '../pages/public/PersonnesPage'
import { PersonneProfilPage } from '../pages/public/PersonneProfilPage'
import { PersonneModifierPage } from '../pages/public/PersonneModifierPage'
import { PersonneArbrePage } from '../pages/public/PersonneArbrePage'
import { PersonneFoyerPage } from '../pages/public/PersonneFoyerPage'
import { PersonneNouvellePage } from '../pages/public/PersonneNouvellePage'
import { BrancheFamilialePage } from '../pages/public/BrancheFamilialePage'
import { BranchesFamilialesPage } from '../pages/public/BranchesFamilialesPage'
import { AlahadinTaranakaPage } from '../pages/public/AlahadinTaranakaPage'
import { AlahadinTaranakaDetailPage } from '../pages/public/AlahadinTaranakaDetailPage'
import { SosoKevitraListPage } from '../pages/public/SosoKevitraListPage'
import { MesSosoKevitraPage } from '../pages/public/MesSosoKevitraPage'
import { SosoKevitraFormPage } from '../pages/public/SosoKevitraFormPage'
import { SosoKevitraDetailPage } from '../pages/public/SosoKevitraDetailPage'
import { SosoKevitraGestionPage } from '../pages/public/SosoKevitraGestionPage'
import { ProtectedRoute } from './ProtectedRoute'
import { RoleRoute } from './RoleRoute'
import { useAuth } from '../hooks/useAuth'
import { isBusinessManagerRole } from '../types/auth'

function RootRedirect() {
  const { user, isLoading } = useAuth()

  if (isLoading) return <main className="auth-loading" aria-live="polite">Vérification de la session…</main>
  if (!user) return <Navigate to="/connexion" replace />
  return <Navigate to={isBusinessManagerRole(user.compte.role) ? '/admin' : '/membre'} replace />
}
export function AppRouter() {
  return <BrowserRouter><Routes><Route element={<AppLayout />}>
    <Route index element={<RootRedirect />} />
    <Route path="connexion" element={<ConnexionPage />} />
    <Route path="initialisation" element={<InitialisationPage />} />
    <Route path="inscription" element={<InscriptionPage />} />
    <Route path="suivi-inscription" element={<SuiviInscriptionPage />} />
    <Route element={<ProtectedRoute />}>
      <Route element={<PersonnesLayout />}>
        <Route path="personnes" element={<PersonnesPage />} />
        <Route path="personnes/:id/arbre" element={<PersonneArbrePage />} />
        <Route path="personnes/:id/foyer" element={<PersonneFoyerPage />} />
        <Route path="personnes/:id" element={<PersonneProfilPage />} />
        <Route path="alahadin-taranaka" element={<AlahadinTaranakaPage />} />
        <Route path="alahadin-taranaka/:id" element={<AlahadinTaranakaDetailPage />} />
        <Route path="soso-kevitra" element={<SosoKevitraListPage />} />
        <Route path="soso-kevitra/mes" element={<MesSosoKevitraPage />} />
        <Route path="soso-kevitra/nouveau" element={<SosoKevitraFormPage />} />
        <Route path="soso-kevitra/:id/modifier" element={<SosoKevitraFormPage />} />
        <Route path="soso-kevitra/a-traiter" element={<SosoKevitraGestionPage />} />`r`n        <Route path="soso-kevitra/:id" element={<SosoKevitraDetailPage />} />
        <Route path="branches" element={<BranchesFamilialesPage />} />
        <Route path="branches/:id_element" element={<BrancheFamilialePage />} />
        <Route path="personnes/nouvelle" element={<PersonneNouvellePage />} />
        <Route path="personnes/:id/modifier" element={<PersonneModifierPage />} />
      </Route>
    </Route>
    <Route element={<ProtectedRoute />}>
      <Route element={<RoleRoute role="MEMBRE" />}><Route element={<MembreLayout />}><Route path="membre" element={<TableauDeBordMembrePage />} /><Route path="membre/profil" element={<MonProfilMembrePage />} /><Route path="membre/profil/modifier" element={<ModifierMonProfilMembrePage />} /></Route></Route>
      <Route element={<RoleRoute role={["ADMIN", "PASTEUR", "BUREAU_ZANAKA_AMPIELEZANA"]} />}><Route element={<AdminLayout />}><Route path="admin" element={<TableauDeBordAdminPage />} /><Route path="admin/profil" element={<MonProfilAdminPage />} /><Route path="admin/profil/modifier" element={<ModifierMonProfilAdminPage />} /><Route path="admin/demandes-inscription" element={<DemandesInscriptionPage />} /><Route path="admin/demandes-inscription/:id" element={<DemandeInscriptionDetailPage />} /><Route element={<RoleRoute role="ADMIN" />}><Route path="admin/referentiels" element={<ReferentielsPage />} /><Route path="utilisateurs" element={<UtilisateursPage />} /></Route></Route></Route>
    </Route>
    <Route path="*" element={<NotFoundPage />} />
  </Route></Routes></BrowserRouter>
}


