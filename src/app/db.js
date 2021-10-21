import Dexie from 'dexie'
import { store, cfg } from './util'
import { session } from './ws'
const rowTypes = require('./rowTypes')

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
    const x = await this.db.compte.get(1)
    return rowTypes.rowSchemas.compte.fromBuffer(x.data)
  }

  async getInvitgr (id) { // pas sur qu'on ait besoin de filtrer: on lit toutes les invitations
    const r = []
    await this.db.invitgr.where({ id: id }).each(x => {
      r.push(rowTypes.rowSchemas.invitgr.fromBuffer(x.data))
    })
    return r
  }

  /*
  Purge des avatars du compte et des groupes inutiles, dans toutes les tables où ils apparaissent.
  - lav : liste des ids des avatars
  - lgr : liste des ids des groupes
  */
  async purgeRows (lav, lgr) {
    await this.db.transaction('rw', this.constructor.tables, async () => {
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
        switch (obj.table) {
          case 'compte' : {
            await this.db.compte.put({ id: 1, data: obj.toIdb })
            if (cfg().debug) console.log(suppr ? 'del' : 'put' + ' compte - ' + obj.sid)
            break
          }
          case 'avatar' : {
            if (!suppr) {
              await this.db.avatar.put({ id: obj.id, data: obj.toIdb })
            } else {
              await this.db.avatar.delete(obj.id)
            }
            if (cfg().debug) console.log(suppr ? 'del' : 'put' + ' avatar - ' + obj.sid)
            break
          }
          case 'membre' : {
            if (!suppr) {
              await this.db.membre.put({ id: obj.id, im: obj.im, data: obj.toIdb })
            } else {
              await this.db.membre.delete([obj.id, obj.im])
            }
            if (cfg().debug) console.log(suppr ? 'del' : 'put' + ' membre - ' + obj.sid + ' / ' + obj.im)
            break
          }
          case 'cv' : {
            if (!suppr) {
              await this.db.cv.put({ id: obj.id, data: obj.toIdb })
            } else {
              await this.db.cv.delete(obj.id)
            }
            if (cfg().debug) console.log(suppr ? 'del' : 'put' + ' cv - ' + obj.sid)
            break
          }
          case 'invitgr' : {
            if (!suppr) {
              await this.db.invitgr.put({ id: obj.id, ni: obj.ni, data: obj.toIdb })
            } else {
              await this.db.invitgr.delete([obj.id, obj.ni])
            }
            if (cfg().debug) console.log(suppr ? 'del' : 'put' + ' invitgr - ' + obj.sid + ' / ' + obj.ni)
            break
          }
        }
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
