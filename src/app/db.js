/* eslint-disable func-call-spacing */
import Dexie from 'dexie'
import { Avatar, Compte, Invitgr, Invitct, Contact, Parrain, Rencontre, Groupe, Membre, Secret, Cv, data } from './modele'
import { store, cfg } from './util'
const crypt = require('./crypto')
const api = require('./api')
const AppExc = require('./api').AppExc

const SECRET = 0
const INVITGR = 1
export const AVATAR = 2
const CONTACT = 3
const INVITCT = 4
const RENCONTRE = 5
const PARRAIN = 6
export const GROUPE = 1
const MEMBRE = 2

const STORES = {
  etat: 'id',
  compte: 'id',
  avatar: 'id',
  invitgr: '[id+ni]',
  contact: '[id+ic]',
  invitct: '[id+ni]',
  parrain: 'pph,id',
  rencontre: 'prh,id',
  groupe: 'id',
  membre: '[id+im]',
  secret: '[id+ns]',
  cv: 'id'
}

const TABLES = []
for (const x in STORES) TABLES.push(x)

function EX1 (e) {
  return new AppExc(api.E_DB, 'Ouverture de la base locale impossible : ' + e.message)
}

function EX2 (e) {
  return new AppExc(api.E_DB, 'Erreur en lecture / écriture sur la base locale : ' + e.message, e.stack)
}

function go () {
  if (data.erDB) throw data.exIDB
}

export function idbSidCompte () {
  return localStorage.getItem(store().state.ui.org + '-' + data.ps.dpbh)
}

export function nombase () {
  return store().state.ui.org + '-' + idbSidCompte()
}

export async function openIDB () {
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
    await Dexie.delete(nombase())
  } catch (e) {
    console.log(e.toString())
  }
}

export async function getEtat () {
  go()
  try {
    const obj = await data.db.etat.get(1)
    let etat
    try {
      etat = JSON.parse(obj)
    } catch (e) {
      etat = { dhsyncok: 0, dhdebutsync: 0, vcv: 0 }
    }
    data.vcv = etat.vcv
    data.dhsyncok = etat.dhsyncok
    data.dhdebutsync = etat.dhdebutsync
  } catch (e) {
    throw data.setErDB(EX2(e))
  }
}

export async function setEtat () {
  go()
  try {
    const etat = { dhsyncok: data.dhsyncok, dhdebutsync: data.dhdebutsync, vcv: data.vcv }
    await this.db.etat.set(1, JSON.stringify(etat))
  } catch (e) {
    throw data.setErDB(EX2(e))
  }
}

export async function getCompte () {
  go()
  try {
    const idb = await data.db.compte.get(1)
    return idb ? new Compte().fromIdb(crypt.decrypter(data.ps.pcb, idb.data), idb.vs) : null
  } catch (e) {
    throw data.setErDB(EX2(e))
  }
}

export async function getAvatars () {
  go()
  try {
    let vol = 0
    const r = []
    await data.db.avatar.each(idb => {
      vol += idb.data.length
      const x = new Avatar().fromIdb(crypt.decrypter(data.clek, idb.data), idb.vs)
      r.push(x)
      data.setVerAv(x.sidav, AVATAR, x.v)
      this.refsAv.add(x.id)
      this.refsCv.add(x.id)
    })
    return { objs: r, vol: vol }
  } catch (e) {
    throw data.setErDB(EX2(e))
  }
}

export async function getInvitgrs () {
  go()
  try {
    let vol = 0
    const r = []
    await data.db.invitgr.each(idb => {
      vol += idb.data.length
      const x = new Invitgr().fromIdb(crypt.decrypter(data.clek, idb.data), idb.vs)
      r.push(x)
      data.setVerAv(x.sidav, INVITGR, x.v)
      this.refsAv.add(x.id)
      this.refsCv.add(x.id)
      if (x.idg) this.refsGr.add(x.idg)
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
    await data.db.invitct.each(idb => {
      vol += idb.data.length
      const x = new Invitct().fromIdb(crypt.decrypter(data.clek, idb.data), idb.vs)
      r.push(x)
      data.setVerAv(x.sidav, INVITCT, x.v)
      data.refsAv.add(x.id)
      data.refsCv.add(x.id)
      if (x.nact) this.refsCv.add(x.nact.id)
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
    await data.db.contact.each(idb => {
      vol += idb.data.length
      const x = new Contact().fromIdb(crypt.decrypter(data.clek, idb.data), idb.vs)
      r.push(x)
      data.setVerAv(x.sidav, CONTACT, x.v)
      data.refsAv.add(x.id)
      data.refsCv.add(x.id)
      if (x.nact) data.refsCv.add(x.nact.id)
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
    await data.db.parrain.each(idb => {
      vol += idb.data.length
      const x = new Parrain().fromIdb(crypt.decrypter(data.clek, idb.data), idb.vs)
      r.push(x)
      data.setVerAv(x.sidav, PARRAIN, x.v)
      data.refsAv.add(x.id)
      data.refsCv.add(x.id)
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
    await data.db.rencontre.each(idb => {
      vol += idb.data.length
      const x = new Rencontre().fromIdb(crypt.decrypter(data.clek, idb.data), idb.vs)
      r.push(x)
      data.setVerAv(x.sidav, RENCONTRE, x.v)
      data.refsAv.add(x.id)
      data.refsCv.add(x.id)
    })
    return { objs: r, vol: vol }
  } catch (e) {
    throw data.setErDB(EX2(e))
  }
}

export async function getGroupes () {
  go()
  try {
    let vol = 0
    const r = []
    await data.db.groupe.each(idb => {
      vol += idb.data.length
      const x = new Groupe().fromIdb(crypt.decrypter(data.clek, idb.data), idb.vs)
      data.setVerGr(x.sidgr, GROUPE, x.v)
      r.push(x)
      data.refsGr.add(x.id)
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
    await data.db.membre.each(idb => {
      vol += idb.data.length
      const x = new Membre().fromIdb(crypt.decrypter(data.clek, idb.data), idb.vs)
      r.push(x)
      data.setVerGr(x.sidgr, MEMBRE, x.v)
      data.refsGr.add(x.id)
      if (x.na) { data.refsAv.add(x.na); data.refsCv.add(x.na) }
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
    await data.db.secret.each(idb => {
      vol += idb.data.length
      const x = new Secret().fromIdb(crypt.decrypter(data.clek, idb.data), idb.vs)
      r.push(x)
      if (x.estAv) {
        data.setVerAv(x.sidavgr, SECRET, x.v)
      } else {
        data.setVerGr(x.sidavgr, SECRET, x.v)
      }
      if (x.ts === 2) data.refsGr.add(x.id)
      else { data.refsAv.add(x.id); data.refsCv.add(x.id) }
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
    await data.db.cv.each(idb => {
      vol += idb.data.length
      const x = new Cv().fromIdb(crypt.decrypter(data.clek, idb.data), idb.vs)
      r.push(x)
      data.enregCvs.add(x.id)
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
    await data.db.transaction('rw', TABLES, async () => {
      for (let i = 0; i < lobj.length; i++) {
        const obj = lobj[i]
        const suppr = obj.st !== undefined && obj.st < 0
        const idb = obj.toIdb
        if (!suppr) {
          idb.data = crypt.crypter(obj.table === 'compte' ? data.ps.pcb : data.clek, idb.data)
          await data.db[obj.table].put(idb)
        } else {
          await data.db[obj.table].delete(obj.pk)
        }
        if (cfg().debug) console.log(suppr ? 'del ' : 'put ' + obj.table + ' - ' + obj.sid)
      }
    })
  } catch (e) {
    throw data.setErDB(EX2(e))
  }
}
