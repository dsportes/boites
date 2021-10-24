import Dexie from 'dexie'
import { Avatar, Compte, Invitgr, Invitct, Contact, Parrain, Rencontre, Groupe, Membre, Secret, Cv, data } from './modele'
import { store, cfg } from './util'
import { session } from './ws'
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
    await this.db.avatar.each(idb => { r.push(new Avatar().fromIdb(idb)) })
    return r
  }

  async getInvitgrs () {
    const r = []
    await this.db.invitgr.each(idb => { r.push(new Invitgr().fromIdb(idb)) })
    return r
  }

  async getInvitgct () {
    const r = []
    await this.db.invitct.each(idb => { r.push(new Invitct().fromIdb(idb)) })
    return r
  }

  async getContacts () {
    const r = []
    await this.db.contact.each(idb => { r.push(new Contact().fromIdb(idb)) })
    return r
  }

  async getParrains () {
    const r = []
    await this.db.parrain.each(idb => { r.push(new Parrain().fromIdb(idb)) })
    return r
  }

  async getRencontres () {
    const r = []
    await this.db.rencontre.each(idb => { r.push(new Rencontre().fromIdb(idb)) })
    return r
  }

  async getGroupes () {
    const r = []
    await this.db.groupe.each(idb => { r.push(new Groupe().fromIdb(idb)) })
    return r
  }

  async getMembres () {
    const r = []
    await this.db.membre.each(idb => { r.push(new Membre().fromIdb(idb)) })
    return r
  }

  async getSecrets () {
    const r = []
    await this.db.secret.each(idb => { r.push(new Secret().fromIdb(idb)) })
    return r
  }

  async getCvs () {
    const r = []
    await this.db.cv.each(idb => { r.push(new Cv().fromIdb(idb)) })
    return r
  }

  /*
  Purge des avatars du compte et des groupes inutiles, dans toutes les tables où ils apparaissent.
  - lav : liste des ids des avatars
  - lgr : liste des ids des groupes
  */
  async purgeRows (lav, lgr) {
    await this.db.transaction('rw', this.constructor.tables, async () => {
      for (let i = 0; i < lav.length; i++) {
        const id = { id: lav[i] }
        await this.db.avatar.where(id).delete()
        await this.db.invitgr.where(id).delete()
        await this.db.contact.where(id).delete()
        await this.db.invitct.where(id).delete()
        await this.db.rencontre.where(id).delete()
        await this.db.parrain.where(id).delete()
        await this.db.secret.where(id).delete()
      }
      for (let i = 0; i < lgr.length; i++) {
        const id = { id: lav[i] }
        await this.db.groupe.where(id).delete()
        await this.db.membre.where(id).delete()
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

export async function deconnexion () {
  store().commit('ui/majstatuslogin', false)
  const s = session.ws
  if (s) s.close()
}

// A refaire complètement
export async function testdb () {
  deleteIDB('toto')
  const db = new Idb('toto')
  await db.open()
}
