/* eslint-disable func-call-spacing */
import Dexie from 'dexie'
import { Avatar, Compte, Prefs, Compta, Couple, Groupe, Membre, Secret, data, estSingleton } from './modele.mjs'
import { store, deserial, serial, Sid } from './util.mjs'
import { crypt } from './crypto.mjs'
import { AppExc, E_DB } from './api.mjs'
import { schemas } from './schemas.mjs'

const STORES = {
  sessionsync: 'id',
  compte: 'id',
  compta: 'id',
  prefs: 'id',
  avatar: 'id',
  couple: 'id',
  groupe: 'id',
  membre: '[id+id2]', // im
  secret: '[id+id2]', // ns
  cv: 'id',
  faidx: 'id',
  fadata: 'id'
}

const TABLES = []
for (const x in STORES) TABLES.push(x)

function EX1 (e) {
  return new AppExc(E_DB, 'Ouverture de la base locale impossible', e.message + (e.stack ? '\n' + e.stack : ''))
}

function EX2 (e) {
  return new AppExc(E_DB, 'Erreur en lecture / écriture sur la base locale', e.message + '\n' + e.stack)
}

function go () {
  if (data.erDB) throw data.exIDB
}

export function idbSidCompte () {
  const k = store().state.ui.org + '-' + data.ps.dpbh
  return localStorage.getItem(k)
}

export function enregLScompte (sid) {
  const k = store().state.ui.org + '-' + data.ps.dpbh
  localStorage.setItem(k, sid)
}

export function nombase () {
  const idc = idbSidCompte()
  return idc ? store().state.ui.org + '-' + idc : null
}

export async function openIDB () {
  // eslint-disable-next-line no-unused-vars
  const d = data
  if (data.db) return
  try {
    data.nombase = nombase()
    const db = new Dexie(data.nombase, { autoOpen: true })
    db.version(2).stores(STORES)
    await db.open()
    data.ouvertureDB(db)
  } catch (e) {
    throw data.setErDB(EX1(e))
  }
}

export function closeIDB () {
  if (data.db && data.db.isOpen()) {
    try { data.db.close() } catch (e) {}
  }
  data.fermetureDB()
}

export async function deleteIDB (lsKey) {
  try {
    if (lsKey) {
      localStorage.removeItem(store().state.ui.org + '-' + data.ps.dpbh)
    }
    const nb = nombase()
    if (nb) await Dexie.delete(nb)
  } catch (e) {
    console.log(e.toString())
  }
}

/* Dernier état de session synchronisé
- dhdebutp : dh de début de la dernière session sync terminée
- dhfinp : dh de fin de la dernière session sync terminée
- dhdebut: dh de début de la session sync en cours
- dhsync: dh du dernier traitement de synchronisation
- dhpong: dh du dernier pong reçu
- vcv: version des CVs synchronisées
*/
schemas.forSchema({
  name: 'idbSessionSync',
  cols: ['dhdebutp', 'dhfinp', 'dhdebut', 'dhsync', 'dhpong', 'vcv']
})

function max (a) { let m = 0; a.forEach(x => { if (x > m) m = x }); return m }

class SessionSync {
  fromIdb (idb) {
    if (!idb) {
      this.dhdebutp = 0
      this.dhfinp = 0
      this.dhdebut = 0
      this.dhsync = 0
      this.dhpong = 0
      this.vcv = 0
    } else {
      schemas.deserialize('idbSessionSync', idb, this)
      this.dhdebutp = this.dhdebut
      this.dhfinp = max([this.dhdebut, this.dhsync, this.dhpong])
      this.dhdebut = 0
      this.dhsync = 0
      this.dhpong = 0
    }
    return this
  }

  async init () {
    try {
      this.fromIdb(await data.db.sessionsync.get(1))
      store().commit('ui/setsessionsync', this)
    } catch (e) {
      throw data.setErDB(EX2(e))
    }
  }

  async setConnexion (dh, vcv) {
    this.dhdebut = dh
    this.vcv = vcv
    await this.save()
  }

  async setDhSync (dh) {
    this.dhsync = dh
    await this.save()
  }

  async setDhPong (dh) {
    this.dhpong = dh
    await this.save()
  }

  async save () {
    try {
      await data.db.sessionsync.put({ id: '1', data: schemas.serialize('idbSessionSync', this) })
      store().commit('ui/setsessionsync', this)
    } catch (e) {
      throw data.setErDB(EX2(e))
    }
  }
}

export async function debutSessionSync () {
  const s = new SessionSync()
  await s.setConnexion()
  return s
}

export async function getCompte () {
  go()
  try {
    const idb = await data.db.compte.get('1')
    return idb ? new Compte().fromIdb(await crypt.decrypter(data.ps.pcb, idb.data)) : null
  } catch (e) {
    throw data.setErDB(EX2(e))
  }
}

export async function getPrefs () {
  go()
  try {
    const idb = await data.db.prefs.get('1')
    return idb ? new Prefs().fromIdb(await crypt.decrypter(data.clek, idb.data)) : null
  } catch (e) {
    throw data.setErDB(EX2(e))
  }
}

export async function getCompta () {
  go()
  try {
    const idb = await data.db.compta.get('1')
    return idb ? new Compta().fromIdb(await crypt.decrypter(data.clek, idb.data)) : null
  } catch (e) {
    throw data.setErDB(EX2(e))
  }
}

// Retourne une map : clé: id de l'avatar, valeur: son objet Avatar
export async function getAvatars () {
  go()
  try {
    const r = {}
    await data.db.avatar.each(async (idb) => {
      const x = new Avatar().fromIdb(await crypt.decrypter(data.clek, idb.data))
      r[x.id] = x
    })
    return r
  } catch (e) {
    throw data.setErDB(EX2(e))
  }
}

export async function getGroupes () {
  go()
  try {
    const r = {}
    await data.db.groupe.each(async (idb) => {
      const x = new Groupe().fromIdb(await crypt.decrypter(data.clek, idb.data))
      r[x.id] = x
    })
    return r
  } catch (e) {
    throw data.setErDB(EX2(e))
  }
}

export async function getCouples () {
  go()
  try {
    const r = {}
    await data.db.contact.each(async (idb) => {
      const x = new Couple().fromIdb(await crypt.decrypter(data.clek, idb.data))
      r[x.id] = x
    })
    return r
  } catch (e) {
    throw data.setErDB(EX2(e))
  }
}

export async function getMembres () {
  go()
  try {
    const r = {}
    const v = {}
    await data.db.membre.each(async (idb) => {
      const x = new Membre().fromIdb(await crypt.decrypter(data.clek, idb.data))
      let e = r[x.id]; if (!e) { e = {}; r[x.id] = e }
      e[x.ns] = x
      const v1 = v[x.id]
      if (!v1 || v1 < x.v) v[x.id] = x.v
    })
    return [r, v]
  } catch (e) {
    throw data.setErDB(EX2(e))
  }
}

export async function getSecrets () {
  go()
  try {
    const r = {}
    const v = {}
    await data.db.secret.each(async (idb) => {
      const x = new Secret().fromIdb(await crypt.decrypter(data.clek, idb.data))
      let e = r[x.id]; if (!e) { e = {}; r[x.id] = e }
      e[x.ns] = x
      const v1 = v[x.id]
      if (!v1 || v1 < x.v) v[x.id] = x.v
    })
    return [r, v]
  } catch (e) {
    throw data.setErDB(EX2(e))
  }
}

export async function getCvs (utilesvp, utilesvz, buf) {
  go()
  try {
    const r = {}
    await data.db.cv.each(async (idb) => {
      const cv = {}
      schemas.deserialize('idbCv', await crypt.decrypter(data.clek, idb.data), cv)
      if (utilesvp.has(cv.id) || utilesvz.has(cv.id)) {
        r[cv.id] = cv
      } else {
        buf.supprIDB({ table: 'cv', id: cv.id })
      }
    })
    return r
  } catch (e) {
    throw data.setErDB(EX2(e))
  }
}

/*
Purge des avatars du compte et des groupes inutiles, dans toutes les tables où ils apparaissent.
- lav : liste des ids des avatars
- lgr : liste des ids des groupes
- lcc : liste des ids des couples
*/
export async function purgeGroupes (lgr) {
  go()
  try {
    if (!lgr || !lgr.size) return 0
    const idgc = []
    for (const i of lgr) idgc.push(crypt.u8ToB64(await crypt.crypter(data.clek, crypt.idToSid(i), 1), true))
    await data.db.transaction('rw', TABLES, async () => {
      for (let i = 0; i < idgc.length; i++) {
        const id = { id: idgc[i] }
        await data.db.groupe.where(id).delete()
        await data.db.membre.where(id).delete()
        await data.db.secret.where(id).delete()
      }
    })
    return lgr.size
  } catch (e) {
    throw data.setErDB(EX2(e))
  }
}

export async function purgeAvatars (lav) {
  go()
  try {
    if (!lav || !lav.size) return 0
    const idac = []
    for (const i of lav) idac.push(crypt.u8ToB64(await crypt.crypter(data.clek, crypt.idToSid(i), 1), true))
    await data.db.transaction('rw', TABLES, async () => {
      for (let i = 0; i < idac.length; i++) {
        const id = { id: idac[i] }
        await data.db.avatar.where(id).delete()
        await data.db.secret.where(id).delete()
      }
    })
    return lav.size
  } catch (e) {
    throw data.setErDB(EX2(e))
  }
}

export async function purgeCouples (lcc) {
  go()
  try {
    if (!lcc || !lcc.size) return 0
    const idcc = []
    for (const i of lcc) idcc.push(crypt.u8ToB64(await crypt.crypter(data.clek, crypt.idToSid(i), 1), true))
    await data.db.transaction('rw', TABLES, async () => {
      for (let i = 0; i < idcc.length; i++) {
        const id = { id: idcc[i] }
        await data.db.couple.where(id).delete()
        await data.db.secret.where(id).delete()
      }
    })
    return lcc.size
  } catch (e) {
    throw data.setErDB(EX2(e))
  }
}

export async function purgeCvs (lcv) {
  go()
  try {
    if (!lcv || !lcv.size) return 0
    await data.db.transaction('rw', TABLES, async () => {
      for (const i of lcv) {
        const id = { id: i }
        await data.db.repertoire.where(id).delete()
      }
    })
    return lcv.size
  } catch (e) {
    throw data.setErDB(EX2(e))
  }
}

/*
Mise à jour / suppression de listes d'objets (compte, avatar, etc.)
*/
export async function commitRows (lmaj, lsuppr) {
  go()
  try {
    const lidb = []
    const lidbs = []
    if (lmaj || !lmaj.length) {
      for (let i = 0; i < lmaj.length; i++) {
        const obj = lmaj[i]
        const x = { table: obj.table, row: {} }
        x.row.id = estSingleton(obj.table) ? '1' : crypt.u8ToB64(await crypt.crypter(data.clek, Sid(obj.id), 1), true)
        if (obj.id2) x.row.id2 = crypt.u8ToB64(await crypt.crypter(data.clek, Sid(obj.id2), 1), true)
        if (obj.table === 'compte') {
          x.row.data = await crypt.crypter(data.ps.pcb, obj.toIdb)
        } else if (obj.table === 'cv') {
          x.row.data = await crypt.crypter(data.clek, schemas.serialize('idbCv', obj))
        } else {
          x.row.data = await crypt.crypter(data.clek, obj.toIdb)
        }
        lidb.push(x)
      }
    }

    if (!lsuppr || !lsuppr.length) return
    for (let i = 0; i < lsuppr.length; i++) {
      const obj = lsuppr[i]
      const x = { ...obj }
      x.id = estSingleton(obj.table) ? '1' : crypt.u8ToB64(await crypt.crypter(data.clek, Sid(obj.id), 1), true)
      if (obj.id2) x.id2 = crypt.u8ToB64(await crypt.crypter(data.clek, Sid(obj.id2), 1), true)
      lidbs.push(x)
      if (obj.table === 'compte') {
        lidbs.push({ table: 'prefs', id: '1' })
        lidbs.push({ table: 'compta', id: '1' })
      }
    }

    await data.db.transaction('rw', TABLES, async () => {
      for (let i = 0; i < lidb.length; i++) {
        const x = lidb[i]
        await data.db[x.table].put(x.row)
      }
      for (let i = 0; i < lidbs.length; i++) {
        const x = lidbs[i]
        if (x.row.id2) {
          await data.db[x.table].where({ id: x.id, id2: x.id2 }).delete()
        } else {
          await data.db[x.table].where({ id: x.id }).delete()
        }
      }
    })
  } catch (e) {
    throw data.setErDB(EX2(e))
  }
}

/*
  Gestion des pièces jointes
  Table fadata : id, data
  - id : identifiant b64 crypté par la clé K de la pièce jointe. sid@sid2@cle
  - data : contenu (éventuellement gzippé) crypté par la clé K de la pièce jointe. Comme en stockage serveur.
  Table faidx : id, hv
  - id : le même que fadata
  - data : { id, ns, cle, hv } sérialisé, crypté par la clé k
*/

export async function getFaidx () {
  // retourne une liste de { id, ns, cle, hv }
  go()
  try {
    const r = []
    await data.db.faidx.each(async (idb) => {
      const x = deserial(await crypt.decrypter(data.clek, idb.data))
      r.push(x)
    })
    return r
  } catch (e) {
    throw data.setErDB(EX2(e))
  }
}

export async function getFadata ({ id, ns, cle }) {
  /* retourne le contenu (gzippé crypté) de la pièce jointe clé du secret */
  go()
  try {
    const sidpj = crypt.idToSid(id) + '@' + crypt.idToSid(ns) + '@' + cle
    const idk = crypt.u8ToB64((await crypt.crypter(data.clek, sidpj, 1)))
    const row = await data.db.fadata.get(idk)
    return row ? row.data : null
  } catch (e) {
    throw data.setErDB(EX2(e))
  }
}

export async function putFa ({ id, ns, cle, hv }, buf) { // buf est gzippé / crypté. Si null, c'est une suppression
  const sidpj = crypt.idToSid(id) + '@' + crypt.idToSid(ns) + '@' + cle
  const idk = crypt.u8ToB64((await crypt.crypter(data.clek, sidpj, 1)))
  const bufk = buf ? await crypt.crypter(data.clek, serial({ id, ns, cle, hv })) : null
  await data.db.transaction('rw', TABLES, async () => {
    if (buf) {
      await data.db.faidx.put({ id: idk, data: bufk })
      await data.db.fadata.put({ id: idk, data: buf })
    } else {
      await data.db.faidx.delete(idk)
      await data.db.fadata.delete(idk)
    }
  })
}
