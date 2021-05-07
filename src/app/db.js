import Dexie from 'dexie'
import { store } from './util'

const STORES = {
  compte: 'id, data',
  avatar: 'id, data',
  groupe: 'id, data',
  secret: 'id, data'
}

let db = null

export async function open (nom) {
  db = new Dexie(nom, { autoOpen: true })
  db.versions(1).stores(STORES)
  await db.open()
  return db
}

export function close () {
  if (db.isOpen()) {
    db.close()
    db = null
  }
}

const errcompte = 'Cette phrase ne correspond à aucun compte enregistré'
export async function connexion (ligne1, ligne2) {
  console.log('Phrase : ' + ligne1 + '\n' + ligne2)
  if (ligne1.startsWith('*')) return errcompte
  store().commit('ui/majstatuslogin', true)
}
