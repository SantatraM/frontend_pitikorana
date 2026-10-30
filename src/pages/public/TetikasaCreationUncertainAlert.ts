import { createElement } from 'react'
import { Link } from 'react-router-dom'

export function TetikasaCreationUncertainAlert({ language }: { language: 'fr' | 'mg' }) {
  const message = language === 'fr'
    ? 'Résultat incertain : le projet a peut-être été créé. Consultez la liste et vérifiez son existence avant toute nouvelle tentative. Vos saisies seront perdues si vous quittez ce formulaire.'
    : 'Tsy azo antoka ny vokatra: mety efa voaforona ny tetikasa. Jereo ny lisitra ary hamarino raha efa misy izy alohan’ny hanandramana indray. Ho very ny zavatra nosoratanao raha miala amin’ity takelaka ity ianao.'
  const link = language === 'fr' ? 'Consulter les projets' : 'Hijery ny tetikasa'
  return createElement('aside', { className: 'tetikasa-create-uncertain', role: 'alert' },
    createElement('p', null, message), createElement(Link, { to: '/tetikasa' }, link))
}
