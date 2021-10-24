import Dexie from 'dexie'
import { Avatar, Compte, Invitgr, Invitct, Contact, Parrain, Rencontre, Groupe, Membre, Secret, Cv, data } from './modele'
import { store, cfg } from './util'
const crypt = require('./crypto')

export async function deleteIDB (nombase) {
  try {
    await Dexie.delete(nombase)
  } catch (e) {
    console.log(e.toString())
  }
}

export class Idb {
  static get STORES () {
    return {
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
  }

  static get tables () {
    const t = []
    for (const x in this.STORES) t.push(x)
    return t
  }

  constructor (nom) {
    this.db = new Dexie(nom, { autoOpen: true })
    this.db.version(1).stores(this.constructor.STORES)
    this.constructor.idb = this
  }

  async open () {
    await this.db.open()
  }

  close () {
    if (this.db && this.db.isOpen()) {
      this.db.close()
      this.db = null
    }
  }

  async getCompte () {
    const idb = await this.db.compte.get(1)
    return new Compte().fromIdb(idb)
  }

  async getAvatars () {
    const r = []
    await this.db.avatar.each(idb => {
      const x = new Avatar().fromIdb(idb)
      r.push(x)
      this.refsAv.add(x.id)
      this.refsCv.add(x.id)
    })
    return r
  }

  async getInvitgrs () {
    const r = []
    await this.db.invitgr.each(idb => {
      const x = new Invitgr().fromIdb(idb)
      r.push(x)
      this.refsAv.add(x.id)
      this.refsCv.add(x.id)
      if (x.idg) this.refsGr.add(x.idg)
    })
    return r
  }

  async getInvitcts () {
    const r = []
    await this.db.invitct.each(idb => {
      const x = new Invitct().fromIdb(idb)
      r.push(x)
      this.refsAv.add(x.id)
      this.refsCv.add(x.id)
      if (x.nact) this.refsCv.add(x.nact.id)
    })
    return r
  }

  async getContacts () {
    const r = []
    await this.db.contact.each(idb => {
      const x = new Contact().fromIdb(idb)
      r.push(x)
      this.refsAv.add(x.id)
      this.refsCv.add(x.id)
      if (x.nact) this.refsCv.add(x.nact.id)
    })
    return r
  }

  async getParrains () {
    const r = []
    await this.db.parrain.each(idb => {
      const x = new Parrain().fromIdb(idb)
      r.push(x)
      this.refsAv.add(x.id)
      this.refsCv.add(x.id)
    })
    return r
  }

  async getRencontres () {
    const r = []
    await this.db.rencontre.each(idb => {
      const x = new Rencontre().fromIdb(idb)
      r.push(x)
      this.refsAv.add(x.id)
      this.refsCv.add(x.id)
    })
    return r
  }

  async getGroupes () {
    const r = []
    await this.db.groupe.each(idb => {
      const x = new Groupe().fromIdb(idb)
      r.push(x)
      this.refsGr.add(x.id)
    })
    return r
  }

  async getMembres () {
    const r = []
    await this.db.membre.each(idb => {
      const x = new Membre().fromIdb(idb)
      r.push(x)
      this.refsGr.add(x.id)
      if (x.na) { this.refsAv.add(x.na); this.refsCv.add(x.na) }
    })
    return r
  }

  async getSecrets () {
    const r = []
    await this.db.secret.each(idb => {
      const x = new Secret().fromIdb(idb)
      r.push(x)
      if (x.ts === 2) this.refsGr.add(x.id)
      else { this.refsAv.add(x.id); this.refsCv.add(x.id) }
    })
    return r
  }

  async getCvs () {
    const r = []
    await this.db.cv.each(idb => {
      const x = new Cv().fromIdb(idb)
      r.push(x)
      this.enregCv.add(x.id)
    })
    return r
  }

  /* Chargement de la totalité de la base en mémoire :
  - détermine les avatars et groupes référencés dans les rows de Idb
  - supprime de la base comme de la mémoire les rows / objets inutiles
  - puis récupère les CVs et supprime celles non référencées
  */
  async chargementIdb () {
    let objs
    this.refsAv = new Set()
    this.refsGr = new Set()
    this.refsCv = new Set()

    objs = await this.getAvatars()
    store().commit('db/setAvatars', objs)
    objs = await this.getInvitgrs()
    store().commit('db/setInvitgrs', objs)
    objs = await this.getContacts()
    store().commit('db/setContacts', objs)
    objs = await this.getInvitcts()
    store().commit('db/setInvitcts', objs)
    objs = await this.getParrains()
    store().commit('db/setParrains', objs)
    objs = await this.getRencontres()
    store().commit('db/setRencontres', objs)
    objs = await this.getGroupes()
    store().commit('db/setGroupes', objs)
    objs = await this.getMembres()
    store().commit('db/setMembres', objs)
    objs = await this.getSecrets()
    store().commit('db/setSecrets', objs)

    // purge des avatars inutiles
    const avInutiles = new Set()
    const avUtiles = new Set(data.setAvatars)
    for (const id of this.refsAv) if (!avUtiles.has(id)) avInutiles.add(id)
    await this.purgeAvatars(avInutiles)
    store().commit('db/purgeAvatars', avUtiles)

    // purge des groupes inutiles
    const grInutiles = new Set()
    const grUtiles = new Set(data.setGroupes)
    for (const id of this.refsGr) if (!grUtiles.has(id)) grInutiles.add(id)
    await this.purgeGroupes(grInutiles)
    store().commit('db/purgeGroupes', grUtiles)

    // chargement des CVs
    this.enregCvs = new Set()
    objs = await this.getCvs()
    store().commit('db/setCvs', objs)

    // purge des CVs inutiles
    const cvInutiles = new Set()
    const cvUtiles = new Set(data.setCvUtiles)
    for (const id of this.enregCv) if (!cvUtiles.has(id)) cvInutiles.add(id)
    await this.purgeCvs(cvInutiles)
    store().commit('db/purgeGroupes', cvUtiles)

    data.idbSetAvatars = data.setAvatars
    data.idbSetGroupes = data.setGroupes
    data.idbsetCvsUtiles = data.setCvsUtiles
  }

  /*
  Purge des avatars du compte et des groupes inutiles, dans toutes les tables où ils apparaissent.
  - lav : liste des ids des avatars
  - lgr : liste des ids des groupes
  */
  async purgeGroupes (lgr) {
    await this.db.transaction('rw', this.constructor.tables, async () => {
      for (const i of lgr) {
        const id = { id: i }
        await this.db.groupe.where(id).delete()
        await this.db.membre.where(id).delete()
        await this.db.secret.where(id).delete()
      }
    })
  }

  async purgeAvatars (lav) {
    await this.db.transaction('rw', this.constructor.tables, async () => {
      for (const i of lav) {
        const id = { id: i }
        await this.db.avatar.where(id).delete()
        await this.db.invitgr.where(id).delete()
        await this.db.contact.where(id).delete()
        await this.db.invitct.where(id).delete()
        await this.db.rencontre.where(id).delete()
        await this.db.parrain.where(id).delete()
        await this.db.secret.where(id).delete()
      }
    })
  }

  /*
  Mise à jour (put ou delete) d'une liste d'objets (compte, avatar, etc.)
  */
  async commitRows (lobj) {
    await this.db.transaction('rw', this.constructor.tables, async () => {
      for (let i = 0; i < lobj.length; i++) {
        const obj = lobj[i]
        const suppr = obj.st !== undefined && obj.st < 0
        const idb = obj.toIdb
        if (!suppr) {
          idb.data = crypt.crypter(obj.table === 'compte' ? data.ps.pcb : data.clek, idb.data)
          await this.db[obj.table].put(idb)
        } else {
          await this.db[obj.table].delete(obj.pk)
        }
        if (cfg().debug) console.log(suppr ? 'del ' : 'put ' + obj.table + ' - ' + obj.sid)
      }
    })
  }
}
