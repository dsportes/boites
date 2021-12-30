/* eslint-disable func-call-spacing */
import Dexie from 'dexie'
import { Avatar, Compte, Invitgr, Invitct, Contact, Parrain, Rencontre, Groupe, Membre, Secret, Cv, data } from './modele.mjs'
import { store, cfg } from './util.mjs'
import { crypt } from './crypto.mjs'
import { AppExc, E_DB, INDEXT } from './api.mjs'

const STORES = {
  etat: 'id',
  compte: 'id',
  avatar: 'id',
  invitgr: '[id+ni]',
  contact: '[id+ic]',
  invitct: '[id+ni]',
  parrain: 'pph',
  rencontre: 'prh',
  groupe: 'id',
  membre: '[id+im]',
  secret: '[id+ns]',
  cv: 'id'
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
    db.version(1).stores(STORES)
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
    await data.db.etat.put({ id: 1, data: JSON.stringify(etat) })
  } catch (e) {
    throw data.setErDB(EX2(e))
  }
}

export async function getCompte () {
  go()
  try {
    const idb = await data.db.compte.get(1)
    return idb ? new Compte().fromIdb(await crypt.decrypter(data.ps.pcb, idb.data), idb.vs) : null
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
      if (avu.has(idb.id)) {
        vol += idb.data.length
        const x = new Avatar().fromIdb(await crypt.decrypter(data.clek, idb.data))
        r.push(x)
        data.vag.setVerAv(x.sid, INDEXT.AVATAR, x.v)
      } else {
        apurger.add(idb.id)
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
      if (gru.has(idb.id)) {
        vol += idb.data.length
        const x = new Groupe().fromIdb(await crypt.decrypter(data.clek, idb.data))
        data.vag.setVerGr(x.sid, INDEXT.GROUPE, x.v)
        r.push(x)
      } else {
        apurger.add(idb.id)
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
      const y = await crypt.decrypter(data.clek, idb.data)
      const x = new Invitgr().fromIdb(y, idb.vs)
      r.push(x)
      data.vag.setVerAv(x.sidav, INDEXT.INVITGR, x.v)
    })
    return { objs: r, vol: vol }
  } catch (e) {
    throw data.setErDB(EX2(e))
  }
}

export async function getInvitcts () {
  go()
  try {
    let vol = 0
    const r = []
    await data.db.invitct.each(async (idb) => {
      vol += idb.data.length
      const x = new Invitct().fromIdb(await crypt.decrypter(data.clek, idb.data), idb.vs)
      r.push(x)
      data.vag.setVerAv(x.sidav, INDEXT.INVITCT, x.v)
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
      const x = new Contact().fromIdb(await crypt.decrypter(data.clek, idb.data), idb.vs)
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
      const x = new Parrain().fromIdb(await crypt.decrypter(data.clek, idb.data), idb.vs)
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
      const x = new Membre().fromIdb(await crypt.decrypter(data.clek, idb.data), idb.vs)
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
      const x = new Secret().fromIdb(await crypt.decrypter(data.clek, idb.data), idb.vs)
      r.push(x)
      if (x.estAv) {
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
      const x = new Cv().fromIdb(await crypt.decrypter(data.clek, idb.data), idb.vs)
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
    await data.db.transaction('rw', TABLES, async () => {
      for (const i of lgr) {
        const id = { id: i }
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
    await data.db.transaction('rw', TABLES, async () => {
      for (const i of lav) {
        const id = { id: i }
        await data.db.avatar.where(id).delete()
        await data.db.invitgr.where(id).delete()
        await data.db.contact.where(id).delete()
        await data.db.invitct.where(id).delete()
        await data.db.rencontre.where(id).delete()
        await data.db.parrain.where(id).delete()
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
      const idb = obj.toIdb
      if (!obj.suppr) {
        idb.data = await crypt.crypter(obj.table === 'compte' ? d.ps.pcb : d.clek, idb.data)
        lidb.push({ table: obj.table, idb: idb })
      } else {
        lidb.push({ table: obj.table, suppr: true, pk: obj.pk })
      }
    }
    await d.db.transaction('rw', TABLES, async () => {
      for (let i = 0; i < lidb.length; i++) {
        const x = lidb[i]
        if (!x.suppr) {
          await d.db[x.table].put(x.idb)
        } else {
          await d.db[x.table].delete(x.pk)
        }
        if (cfg().debug) console.log(x.suppr ? 'del ' : 'put ' + x.table + ' - ' + (x.id || x.pk))
      }
    })
  } catch (e) {
    throw data.setErDB(EX2(e))
  }
}
