import Dexie from 'dexie'
import { store, cfg } from './util'
import { session } from './ws'

// import * as CONST from '../store/constantes'
const crypt = require('./crypto')
const rowTypes = require('./rowTypes')
const JSONbig = require('json-bigint')

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
      invitgr: 'niv, id',
      contact: 'id+ic',
      invitct: 'cch, id',
      parrain: 'pph, id',
      rencontre: 'prh, id',
      groupe: 'id',
      membre: 'id+im',
      secret: 'ids, id'
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
  Mise à jour (put ou delete) d'une liste d'items {table: ..., serial: ..., row: ...}
  - serial : le binaire des données
  - row : l'objet désérialisé
  */
  async commitRows (items) {
    await this.db.transaction('rw', this.constructor.tables, async () => {
      for (let i = 0; i < items.length; i++) {
        const item = items[i]
        const suppr = item.row.st !== undefined && item.row.st < 0
        switch (item.table) {
          case 'compte' : {
            await this.db.compte.put({ id: 1, data: item.serial })
            if (cfg().debug) console.log(suppr ? 'del' : 'put' + ' compte - ' + item.row.id)
            break
          }
          case 'avatar' : {
            if (!suppr) {
              await this.db.avatar.put({ id: item.row.id, data: item.serial })
            } else {
              await this.db.avatar.delete(item.row.id)
            }
            if (cfg().debug) console.log(suppr ? 'del' : 'put' + ' avatar - ' + item.row.id)
            break
          }
          case 'membre' : {
            if (!suppr) {
              await this.db.invitgr.put({ id: item.row.niv, im: item.row.im, data: item.serial })
            } else {
              await this.db.invitgr.delete([item.row.id, item.row.im])
            }
            if (cfg().debug) console.log(suppr ? 'del' : 'put' + ' membre - ' + item.row.id + ' / ' + item.row.im)
            break
          }
          case 'invitgr' : {
            if (!suppr) {
              await this.db.invitgr.put({ niv: item.row.niv, id: item.row.id, data: item.serial })
            } else {
              await this.db.invitgr.delete(item.niv)
            }
            if (cfg().debug) console.log(suppr ? 'del' : 'put' + ' invitgr - ' + item.row.niv)
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
  const c1 = {
    dhc: 123,
    pcbs: crypt.random(4),
    k: crypt.random(32),
    // idx: 456n,
    idx: 999007199254740991n,
    mcs: { 1: 'toto', 2: 'juju' },
    avatars: ['toto', 'titi']
  }

  console.log(c1.idx)
  console.log(JSONbig.stringify(c1))
  const buf = rowTypes.idbCompte.toBuffer(c1)
  const c2 = rowTypes.idbCompte.fromBuffer(buf)
  console.log(JSONbig.stringify(c2))
  console.log(c2.idx)
}
