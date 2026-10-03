import { getActivites, getCentresInteret, getCompetences, getDomainesActivite } from './adminReferentiels'
import {
  getElements,
  getLiensFalimanjaka,
  getPays,
  getRegions,
  getSexes,
  getStatuts,
  getTypesElement,
  getVilles,
} from './referentielsInscription'
import { getTypesRelation } from './typesRelation'

export async function loadPersonCoreReferences(language: string) {
  const [sexes, statuts, liens, elements, typesElement, pays, regions, villes, relationTypes] = await Promise.all([
    getSexes(), getStatuts(), getLiensFalimanjaka(), getElements(), getTypesElement(), getPays(), getRegions(), getVilles(), getTypesRelation(language),
  ])
  return { sexes, statuts, liens, elements, typesElement, pays, regions, villes, relationTypes }
}

export async function loadPersonCatalogReferences() {
  const [domains, activities, competences, centres] = await Promise.all([
    getDomainesActivite(), getActivites(), getCompetences(), getCentresInteret(),
  ])
  return { domains, activities, competences, centres }
}
