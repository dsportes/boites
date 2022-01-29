/* eslint-disable func-call-spacing */
import Dexie from 'dexie'
import { Avatar, Compte, Prefs, Invitgr, Contact, Parrain, Rencontre, Groupe, Membre, Secret, Cv, data } from './modele.mjs'
import { store, deserial, serial } from './util.mjs'
import { crypt } from './crypto.mjs'
import { AppExc, E_DB, INDEXT } from './api.mjs'

const STORES = {
  etat: 'id',
  compte: 'id',
  prefs: 'id',
  avatar: 'id',
  invitgr: '[id+id2]', // ni
  contact: '[id+id2]', // ic
  parrain: 'id', // pph
  rencontre: 'id', // prh
  groupe: 'id',
  membre: '[id+id2]', // im
  secret: '[id+id2]', // ns
  cv: 'id',
  pjidx: 'id',
  pjdata: 'id'
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
    data.db = db
    store().commit('ui/majstatutidb', 1)
  } catch (e) {
    throw data.setErDB(EX1(e))
  }
}

export function closeIDB () {
  if (data.db && data.db.isOpen()) {
    try { data.db.close() } catch (e) {}
  }
  data.db = null
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

export async function getEtat () {
  go()
  try {
    const obj = await data.db.etat.get(1)
    try {
      return JSON.parse(obj.data)
    } catch (e) {
      return { dhsync: 0, statut: 0, vcv: 0 }
    }
  } catch (e) {
    throw data.setErDB(EX2(e))
  }
}

export async function setEtat () {
  go()
  try {
    const etat = { dhsync: data.dhsync, statut: data.statut, vcv: data.vcv }
    await data.db.etat.put({ id: '1', data: JSON.stringify(etat) })
  } catch (e) {
    throw data.setErDB(EX2(e))
  }
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

export async function getAvatars (avu) { // avu : set des ids des avatars utiles
  go()
  try {
    let vol = 0
    const apurger = new Set()
    const r = []
    await data.db.avatar.each(async (idb) => {
      const x = new Avatar().fromIdb(await crypt.decrypter(data.clek, idb.data))
      if (avu.has(x.id)) {
        vol += idb.data.length
        r.push(x)
        data.vag.setVerAv(x.sid, INDEXT.AVATAR, x.v)
      } else {
        apurger.add(x.id)
      }
    })
    return { objs: r, vol: vol, apurger }
  } catch (e) {
    throw data.setErDB(EX2(e))
  }
}

export async function getGroupes (gru) { // gru : set des Ids des groupes utiles
  go()
  try {
    let vol = 0
    const apurger = new Set()
    const r = []
    await data.db.groupe.each(async (idb) => {
      const x = new Groupe().fromIdb(await crypt.decrypter(data.clek, idb.data))
      if (gru.has(x.id)) {
        vol += idb.data.length
        data.vag.setVerGr(x.sid, INDEXT.GROUPE, x.v)
        r.push(x)
      } else {
        apurger.add(x.id)
      }
    })
    return { objs: r, vol: vol, apurger }
  } catch (e) {
    throw data.setErDB(EX2(e))
  }
}

export async function getInvitgrs () {
  go()
  try {
    let vol = 0
    const r = []
    await data.db.invitgr.each(async (idb) => {
      vol += idb.data.length
      const x = new Invitgr().fromIdb(await crypt.decrypter(data.clek, idb.data))
      r.push(x)
    })
    return { objs: r, vol: vol }
  } catch (e) {
    throw data.setErDB(EX2(e))
  }
}

export async function getContacts () {
  go()
  try {
    let vol = 0
    const r = []
    await data.db.contact.each(async (idb) => {
      vol += idb.data.length
      const x = new Contact().fromIdb(await crypt.decrypter(data.clek, idb.data))
      r.push(x)
      data.vag.setVerAv(x.sidav, INDEXT.CONTACT, x.v)
    })
    return { objs: r, vol: vol }
  } catch (e) {
    throw data.setErDB(EX2(e))
  }
}

export async function getParrains () {
  go()
  try {
    let vol = 0
    const r = []
    await data.db.parrain.each(async (idb) => {
      vol += idb.data.length
      const x = new Parrain().fromIdb(await crypt.decrypter(data.clek, idb.data))
      r.push(x)
      data.vag.setVerAv(x.sidav, INDEXT.PARRAIN, x.v)
    })
    return { objs: r, vol: vol }
  } catch (e) {
    throw data.setErDB(EX2(e))
  }
}

export async function getRencontres () {
  go()
  try {
    let vol = 0
    const r = []
    await data.db.rencontre.each(async (idb) => {
      vol += idb.data.length
      const x = new Rencontre().fromIdb(await crypt.decrypter(data.clek, idb.data))
      r.push(x)
      data.vag.setVerAv(x.sidav, INDEXT.RENCONTRE, x.v)
    })
    return { objs: r, vol: vol }
  } catch (e) {
    throw data.setErDB(EX2(e))
  }
}

export async function getMembres () {
  go()
  try {
    let vol = 0
    const r = []
    await data.db.membre.each(async (idb) => {
      vol += idb.data.length
      const x = new Membre().fromIdb(await crypt.decrypter(data.clek, idb.data))
      r.push(x)
      data.vag.setVerGr(x.sidgr, INDEXT.MEMBRE, x.v)
    })
    return { objs: r, vol: vol }
  } catch (e) {
    throw data.setErDB(EX2(e))
  }
}

export async function getSecrets () {
  go()
  try {
    let vol = 0
    const r = []
    await data.db.secret.each(async (idb) => {
      vol += idb.data.length
      const x = new Secret().fromIdb(await crypt.decrypter(data.clek, idb.data))
      r.push(x)
      if (x.ts < 2) {
        data.vag.setVerAv(x.sidavgr, INDEXT.SECRET, x.v)
      } else {
        data.vag.setVerGr(x.sidavgr, INDEXT.SECRET, x.v)
      }
    })
    return { objs: r, vol: vol }
  } catch (e) {
    throw data.setErDB(EX2(e))
  }
}

export async function getCvs () {
  go()
  try {
    let vol = 0
    const r = []
    await data.db.cv.each(async (idb) => {
      vol += idb.data.length
      const x = new Cv().fromIdb(await crypt.decrypter(data.clek, idb.data))
      r.push(x)
    })
    return { objs: r, vol: vol }
  } catch (e) {
    throw data.setErDB(EX2(e))
  }
}

/*
Purge des avatars du compte et des groupes inutiles, dans toutes les tables où ils apparaissent.
- lav : liste des ids des avatars
- lgr : liste des ids des groupes
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
        await data.db.invitgr.where(id).delete()
        await data.db.contact.where(id).delete()
        await data.db.invitct.where(id).delete()
        await data.db.secret.where(id).delete()
      }
    })
    return lav.size
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
        await data.db.cv.where(id).delete()
      }
    })
    return lcv.size
  } catch (e) {
    throw data.setErDB(EX2(e))
  }
}

/*
Mise à jour (put ou delete) d'une liste d'objets (compte, avatar, etc.)
*/
export async function commitRows (lobj) {
  go()
  try {
    if (!lobj || !lobj.length) return
    const d = data
    const lidb = []
    for (let i = 0; i < lobj.length; i++) {
      const obj = lobj[i]
      const x = { table: obj.table, row: {} }
      x.row.id = obj.table === 'compte' || obj.table === 'prefs' ? '1' : crypt.u8ToB64(await crypt.crypter(data.clek, obj.sid, 1), true)
      if (obj.sid2) x.row.id2 = crypt.u8ToB64(await crypt.crypter(data.clek, obj.sid2, 1), true)
      if (!obj.suppr) {
        x.row.data = await crypt.crypter(obj.table === 'compte' ? d.ps.pcb : d.clek, obj.toIdb)
        lidb.push(x)
      } else {
        x.suppr = true
        lidb.push(x)
        if (obj.table === 'compte') lidb.push({ table: 'prefs', suppr: true, row: { id: '1' } })
      }
    }
    await d.db.transaction('rw', TABLES, async () => {
      for (let i = 0; i < lidb.length; i++) {
        const x = lidb[i]
        if (!x.suppr) {
          await d.db[x.table].put(x.row)
        } else {
          await d.db[x.table].delete(x.row.id)
        }
        // if (cfg().debug) console.log(x.suppr ? 'del ' : 'put ' + x.table + ' - ' + (x.id || x.pk))
      }
    })
  } catch (e) {
    throw data.setErDB(EX2(e))
  }
}

/*
  Gestion des pièces jointes
  Table pjdata : id, data
  - id : identifiant b64 crypté par la clé K de la pièce jointe. sid@sid2@cle
  - data : contenu (éventuellement gzippé) crypté par la clé K de la pièce jointe. Comme en stockage serveur.
  Table pjidx : id, hv
  - id : le même que pjdata
  - data : { id, ns, cle, hv } sérialisé, crypté par la clé k
*/

export async function getPjidx () {
  // retourne une liste de { id, ns, cle, hv }
  go()
  try {
    const r = []
    await data.db.pjidx.each(async (idb) => {
      const x = deserial(await crypt.decrypter(data.clek, idb.data))
      r.push(x)
    })
    return r
  } catch (e) {
    throw data.setErDB(EX2(e))
  }
}

export async function getPjdata ({ id, ns, cle }) {
  /* retourne le contenu (gzippé crypté) de la pièce jointe clé du secret */
  go()
  try {
    const sidpj = crypt.idToSid(id) + '@' + crypt.idToSid(ns) + '@' + cle
    const idk = crypt.u8ToB64((await crypt.crypter(data.clek, sidpj, 1)))
    const row = await data.db.pjdata.get(idk)
    return row ? row.data : null
  } catch (e) {
    throw data.setErDB(EX2(e))
  }
}

export async function putPj ({ id, ns, cle, hv }, buf) { // buf est gzippé / crypté. Si null, c'est une suppression
  const sidpj = crypt.idToSid(id) + '@' + crypt.idToSid(ns) + '@' + cle
  const idk = crypt.u8ToB64((await crypt.crypter(data.clek, sidpj, 1)))
  const bufk = buf ? await crypt.crypter(data.clek, serial({ id, ns, cle, hv })) : null
  await data.db.transaction('rw', TABLES, async () => {
    if (buf) {
      await data.db.pjidx.put({ id: idk, data: bufk })
      await data.db.pjdata.put({ id: idk, data: buf })
    } else {
      await data.db.pjidx.delete(idk)
      await data.db.pjdata.delete(idk)
    }
  })
}
