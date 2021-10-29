/* eslint-disable func-call-spacing */
import Dexie from 'dexie'
import { Avatar, Compte, Invitgr, Invitct, Contact, Parrain, Rencontre, Groupe, Membre, Secret, Cv, data } from './modele'
import { store, cfg, sleep } from './util'
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
    return new Compte().fromIdb(crypt.decrypter(data.ps.pcb, idb.data), idb.vs)
  }

  async getAvatars () {
    let vol = 0
    const r = []
    await this.db.avatar.each(idb => {
      vol += idb.data.length
      const x = new Avatar().fromIdb(crypt.decrypter(data.clek, idb.data), idb.vs)
      r.push(x)
      this.refsAv.add(x.id)
      this.refsCv.add(x.id)
    })
    return { objs: r, vol: vol }
  }

  async getInvitgrs () {
    let vol = 0
    const r = []
    await this.db.invitgr.each(idb => {
      vol += idb.data.length
      const x = new Invitgr().fromIdb(crypt.decrypter(data.clek, idb.data), idb.vs)
      r.push(x)
      this.refsAv.add(x.id)
      this.refsCv.add(x.id)
      if (x.idg) this.refsGr.add(x.idg)
    })
    return { objs: r, vol: vol }
  }

  async getInvitcts () {
    let vol = 0
    const r = []
    await this.db.invitct.each(idb => {
      vol += idb.data.length
      const x = new Invitct().fromIdb(crypt.decrypter(data.clek, idb.data), idb.vs)
      r.push(x)
      this.refsAv.add(x.id)
      this.refsCv.add(x.id)
      if (x.nact) this.refsCv.add(x.nact.id)
    })
    return { objs: r, vol: vol }
  }

  async getContacts () {
    let vol = 0
    const r = []
    await this.db.contact.each(idb => {
      vol += idb.data.length
      const x = new Contact().fromIdb(crypt.decrypter(data.clek, idb.data), idb.vs)
      r.push(x)
      this.refsAv.add(x.id)
      this.refsCv.add(x.id)
      if (x.nact) this.refsCv.add(x.nact.id)
    })
    return { objs: r, vol: vol }
  }

  async getParrains () {
    let vol = 0
    const r = []
    await this.db.parrain.each(idb => {
      vol += idb.data.length
      const x = new Parrain().fromIdb(crypt.decrypter(data.clek, idb.data), idb.vs)
      r.push(x)
      this.refsAv.add(x.id)
      this.refsCv.add(x.id)
    })
    return { objs: r, vol: vol }
  }

  async getRencontres () {
    let vol = 0
    const r = []
    await this.db.rencontre.each(idb => {
      vol += idb.data.length
      const x = new Rencontre().fromIdb(crypt.decrypter(data.clek, idb.data), idb.vs)
      r.push(x)
      this.refsAv.add(x.id)
      this.refsCv.add(x.id)
    })
    return { objs: r, vol: vol }
  }

  async getGroupes () {
    let vol = 0
    const r = []
    await this.db.groupe.each(idb => {
      vol += idb.data.length
      const x = new Groupe().fromIdb(crypt.decrypter(data.clek, idb.data), idb.vs)
      r.push(x)
      this.refsGr.add(x.id)
    })
    return { objs: r, vol: vol }
  }

  async getMembres () {
    let vol = 0
    const r = []
    await this.db.membre.each(idb => {
      vol += idb.data.length
      const x = new Membre().fromIdb(crypt.decrypter(data.clek, idb.data), idb.vs)
      r.push(x)
      this.refsGr.add(x.id)
      if (x.na) { this.refsAv.add(x.na); this.refsCv.add(x.na) }
    })
    return { objs: r, vol: vol }
  }

  async getSecrets () {
    let vol = 0
    const r = []
    await this.db.secret.each(idb => {
      vol += idb.data.length
      const x = new Secret().fromIdb(crypt.decrypter(data.clek, idb.data), idb.vs)
      r.push(x)
      if (x.ts === 2) this.refsGr.add(x.id)
      else { this.refsAv.add(x.id); this.refsCv.add(x.id) }
    })
    return { objs: r, vol: vol }
  }

  async getCvs () {
    let vol = 0
    const r = []
    await this.db.cv.each(idb => {
      vol += idb.data.length
      const x = new Cv().fromIdb(crypt.decrypter(data.clek, idb.data), idb.vs)
      r.push(x)
      this.enregCvs.add(x.id)
    })
    return { objs: r, vol: vol }
  }

  /* Chargement de la totalité de la base en mémoire :
  - détermine les avatars et groupes référencés dans les rows de Idb
  - supprime de la base comme de la mémoire les rows / objets inutiles
  - puis récupère les CVs et supprime celles non référencées
  */
  async chargementIdb () {
    // eslint-disable-next-line no-unused-vars
    const dd = data
    data.stopChargt = false
    let objs, vol, t, nbp
    // const d = 1000
    this.refsAv = new Set()
    this.refsGr = new Set()
    this.refsCv = new Set()

    store().commit('ui/razidblec')
    t = true; ({ objs, vol } = await this.getAvatars())
    store().commit('db/setAvatars', objs)
    store().commit('ui/majidblec', { table: 'avatar', st: t, vol: vol, nbl: objs.length })
    // await sleep(d)
    if (data.stopChargt) throw Error('STOPCHARGT')

    t = true; ({ objs, vol } = await this.getInvitgrs())
    store().commit('db/setInvitgrs', objs)
    store().commit('ui/majidblec', { table: 'invitgr', st: t, vol: vol, nbl: objs.length })
    // await sleep(d)
    if (data.stopChargt) throw Error('STOPCHARGT')

    t = true; ({ objs, vol } = await this.getContacts())
    store().commit('db/setContacts', objs)
    store().commit('ui/majidblec', { table: 'invcontactitgr', st: t, vol: vol, nbl: objs.length })
    if (data.stopChargt) throw Error('STOPCHARGT')

    t = true; ({ objs, vol } = await this.getInvitcts())
    store().commit('db/setInvitcts', objs)
    store().commit('ui/majidblec', { table: 'invitct', st: t, vol: vol, nbl: objs.length })
    if (data.stopChargt) throw Error('STOPCHARGT')

    t = true; ({ objs, vol } = await this.getParrains())
    store().commit('db/setParrains', objs)
    store().commit('ui/majidblec', { table: 'parrain', st: t, vol: vol, nbl: objs.length })
    // await sleep(d)
    if (data.stopChargt) throw Error('STOPCHARGT')

    t = true; ({ objs, vol } = await this.getRencontres())
    store().commit('db/setRencontres', objs)
    store().commit('ui/majidblec', { table: 'rencontre', st: t, vol: vol, nbl: objs.length })
    if (data.stopChargt) throw Error('STOPCHARGT')

    t = true; ({ objs, vol } = await this.getGroupes())
    store().commit('db/setGroupes', objs)
    store().commit('ui/majidblec', { table: 'groupe', st: t, vol: vol, nbl: objs.length })
    if (data.stopChargt) throw Error('STOPCHARGT')

    t = true; ({ objs, vol } = await this.getMembres())
    store().commit('db/setMembres', objs)
    store().commit('ui/majidblec', { table: 'membre', st: t, vol: vol, nbl: objs.length })
    if (data.stopChargt) throw Error('STOPCHARGT')

    t = true; ({ objs, vol } = await this.getSecrets())
    store().commit('db/setSecrets', objs)
    store().commit('ui/majidblec', { table: 'secret', st: t, vol: vol, nbl: objs.length })
    // await sleep(d)
    if (data.stopChargt) throw Error('STOPCHARGT')

    // purge des avatars inutiles
    const avInutiles = new Set()
    const avUtiles = new Set(data.setAvatars)
    for (const id of this.refsAv) if (!avUtiles.has(id)) avInutiles.add(id)
    nbp = await this.purgeAvatars(avInutiles)
    store().commit('db/purgeAvatars', avUtiles)
    store().commit('ui/majidblec', { table: 'purgeav', st: t, vol: 0, nbl: nbp })
    if (data.stopChargt) throw Error('STOPCHARGT')

    // purge des groupes inutiles
    const grInutiles = new Set()
    const grUtiles = new Set(data.setGroupes)
    for (const id of this.refsGr) if (!grUtiles.has(id)) grInutiles.add(id)
    nbp = await this.purgeGroupes(grInutiles)
    store().commit('db/purgeGroupes', grUtiles)
    store().commit('ui/majidblec', { table: 'purgegr', st: t, vol: 0, nbl: nbp })
    // await sleep(d)
    if (data.stopChargt) throw Error('STOPCHARGT')

    // chargement des CVs
    this.enregCvs = new Set()
    t = true; ({ objs, vol } = await this.getCvs())
    store().commit('db/setCvs', objs)
    store().commit('ui/majidblec', { table: 'cv', st: t, vol: vol, nbl: objs.length })
    if (data.stopChargt) throw Error('STOPCHARGT')

    // purge des CVs inutiles
    const cvInutiles = new Set()
    const cvUtiles = new Set(data.setCvUtiles)
    for (const id of this.enregCvs) if (!cvUtiles.has(id)) cvInutiles.add(id)
    nbp = await this.purgeCvs(cvInutiles)
    store().commit('db/purgeCvs', cvUtiles)
    store().commit('ui/majidblec', { table: 'purgecv', st: t, vol: 0, nbl: nbp })

    data.idbSetAvatars = data.setAvatars
    data.idbSetGroupes = data.setGroupes
    data.idbsetCvsUtiles = data.setCvsUtiles
    await sleep(2000)
  }

  /*
  Purge des avatars du compte et des groupes inutiles, dans toutes les tables où ils apparaissent.
  - lav : liste des ids des avatars
  - lgr : liste des ids des groupes
  */
  async purgeGroupes (lgr) {
    if (!lgr || !lgr.size) return 0
    await this.db.transaction('rw', this.constructor.tables, async () => {
      for (const i of lgr) {
        const id = { id: i }
        await this.db.groupe.where(id).delete()
        await this.db.membre.where(id).delete()
        await this.db.secret.where(id).delete()
      }
    })
    return lgr.size
  }

  async purgeAvatars (lav) {
    if (!lav || !lav.size) return 0
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
    return lav.size
  }

  async purgeCvs (lcv) {
    if (!lcv || !lcv.size) return 0
    await this.db.transaction('rw', this.constructor.tables, async () => {
      for (const i of lcv) {
        const id = { id: i }
        await this.db.cv.where(id).delete()
      }
    })
    return lcv.size
  }

  /*
  Mise à jour (put ou delete) d'une liste d'objets (compte, avatar, etc.)
  */
  async commitRows (lobj) {
    if (!lobj || !lobj.length) return
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
