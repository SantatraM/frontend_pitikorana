export type VisibiliteConfidentielle = 'PRIVE' | 'MEMBRES'

export interface PreferencesConfidentialitePersonne {
  email: VisibiliteConfidentielle
  facebook: VisibiliteConfidentielle
  telephone: VisibiliteConfidentielle
  whatsapp: VisibiliteConfidentielle
  adresse: VisibiliteConfidentielle
  photo: VisibiliteConfidentielle
}

export type UpdatePreferencesConfidentialitePayload = Partial<
  Pick<
    PreferencesConfidentialitePersonne,
    'email' | 'facebook' | 'telephone' | 'whatsapp' | 'adresse' | 'photo'
  >
>
