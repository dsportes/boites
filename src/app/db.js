import Dexie from 'dexie'

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
