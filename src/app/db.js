import Dexie from 'dexie'
import { store, post, cfg } from './util'

import * as CONST from '../store/constantes'
const avro = require('avsc')
const crypt = require('./crypto')
const base64url = require('base64url')
const rowTypes = require('./rowTypes')

export class Idb {
  static get STORES () {
    return {
      compte: 'id',
      avatar: 'id',
      invitgr: 'niv, ida',
      contact: 'ida+ic',
      invitct: 'cch, ida',
      parrain: 'pph, ida',
      rencontre: 'prh, ida',
      groupe: 'id',
      membre: 'ida+im',
      secret: 'id, idag'
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
    this.lmaj = []
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

  razMaj () {
    this.lmaj.length = 0
  }

  addMaj (rowObj) {
    this.lmaj.push(rowObj)
  }

  async getCompte () {
    const r = await this.db.compte.get(1)
    return new Compte().fromRow(r.data)
  }

  async getInvitgr (ida) {
    const r = []
    await this.db.invitgr.where({ ida: ida }).each(x => {
      r.push(new Invitgr().fromRow(x.data))
    })
    return r
  }

  async commit () {
    const lmaj = this.lmaj
    await this.db.transaction('rw', this.constructor.tables, async () => {
      for (let i = 0; i < lmaj.length; i++) {
        const obj = lmaj[i]
        const table = obj.table
        const suppr = obj.st && obj.st < 0
        let id1 = ''
        let id2 = ''
        switch (table) {
          case 'compte' : {
            id1 = 1
            await this.db.compte.put({ id: 1, data: obj.row || obj.serial() })
            break
          }
          case 'avatar' : {
            id1 = obj.sid
            if (!suppr) {
              await this.db.avatar.put({ id: id1, data: obj.row || obj.serial() })
            } else {
              await this.db.avatar.delete(id1)
            }
            break
          }
          case 'invitgr' : {
            id1 = obj.sniv
            id2 = obj.sid
            if (!suppr) {
              await this.db.invitgr.put({ niv: id1, ida: id2, data: obj.row || obj.serial() })
            } else {
              await this.db.invitgr.delete(id1)
            }
            break
          }
        }
        if (cfg().debug) console.log(suppr ? 'del' : 'put' + table + ' - ' + id1 + ' @ ' + id2)
      }
    })
    this.razMaj()
  }
}

/*
Détermine si une connexion ou création est possible avec cette phrase secrète
args = { dpbh, clex, pcbs: base64url(sha256(clex)) }
Retours = status ...
0: phrase secrète non reconnue
1: compte identifié. { status:1, id:id du compte, k:clé k, avatars:[noms longs des avatars] }
2: création de compte privilégié possible. { status:2 }
3: création de compte standard possible. { status:3, cext:cext du parrain }
*/
export async function connexion (ps) {
  const mode = store().state.ui.mode
  const args = { dpbh: ps.dpbh, pcbsh: ps.pcbsh }
  try {
    if (mode === CONST.MODE_AVION) {
      console.log('connexion locale')
      return { status: 0 }
    } else {
      return await post('m1', 'testconnexion', args, 'Connexion ...', 'respBase1')
    }
  } catch (e) {
    return { status: -1 }
  }
}

/* état de session */
export const session = {
  // non persistant
  phrase: null,
  clex: null, // PBKFD2 de la phrase complète saisie (clé X)
  clek: null, // clé k

  // persistant
  idc: null, // id du compte
  dhds: 0, // date-heure de dernière synchronisation persistée
  secavartars: {}, // avatars dont les secrets sont persistants en session : {ida, dhds}
  secgroupes: {} // groupes dont les secrets sont persistants en session : {idg, dhds}
}

export class Phrase {
  constructor (debut, fin) {
    this.debut = debut
    this.fin = fin
    this.pcb = crypt.pbkfd(debut + '\n' + fin)
    this.pcbs = crypt.sha256(this.pcb)
    this.pcbs64 = base64url(this.pcbs)
    this.pcbsh = crypt.hashBin(this.pcbs)
    this.dpbh = crypt.hashBin(crypt.pbkfd(debut))
  }
}

export class MdpAdmin {
  constructor (mdp) {
    this.mdp = mdp
    this.mdpb = crypt.pbkfd(mdp)
    this.mdp64 = base64url(this.mdpb)
    this.mdph = crypt.hashBin(this.mdpb)
  }
}

export class Quotas {
  constructor (src) {
    this.q1 = src ? src.q1 : 0
    this.q2 = src ? src.q2 : 0
    this.qm1 = src ? src.qm1 : 0
    this.qm2 = src ? src.qm2 : 0
  }

  raz () {
    this.q1 = 0
    this.q2 = 0
    this.qm1 = 0
    this.qm2 = 0
    return this
  }
}

/** Compte **********************************/
const compteMacType = avro.Type.forSchema({ // map des avatars du compte
  type: 'map',
  values: avro.Type.forSchema({
    name: 'mac',
    type: 'record',
    fields: [
      { name: 'nomc', type: 'string' },
      { name: 'cpriv', type: 'bytes' }
    ]
  })
})

const compteMmcType = avro.Type.forSchema({ // map des avatars du compte
  type: 'map',
  values: 'string'
})

export class Compte {
  get table () { return 'compte' }

  fromRow (arg) { // arg : JSON sérialisé
    this.row = rowTypes.compte.fromBuffer(arg)
    this.id = this.row.id
    this.sid = crypt.id2s(this.id)
    this.v = this.row.v
    this.dds = this.row.dds
    this.dpbh = this.row.dpbh
    this.pcbsh = this.row.pcbsh
    this.k = crypt.decrypter(session.clex, this.row.k)
    this.mmc = compteMmcType.fromBuffer(crypt.decrypter(this.k, this.row.mmck))
    this.mac = compteMacType.fromBuffer(crypt.decrypter(this.k, this.row.mack))
    return this
  }

  serial () {
    const x = {
      id: this.id,
      v: this.v,
      dds: this.dds,
      dpbh: this.dpbh,
      pcbsh: this.pcbsh,
      k: crypt.crypter(session.clex, this.k),
      mmck: crypt.crypter(this.k, compteMmcType.toBuffer(this.mmc)),
      mack: crypt.crypter(this.k, compteMacType.toBuffer(this.mac))
    }
    this.row = rowTypes.compte.toBuffer(x)
    return this.row
  }

  static async ex1 () {
    const idb = new Idb('db1')
    await idb.open()

    const ph = new Phrase(cfg().phrase1[0], cfg().phrase1[1])
    session.clex = ph.pcb

    const c = new Compte()
    c.id = 15151789
    c.sid = crypt.id2s(c.id)
    c.v = 2
    c.dds = 27
    c.dpbh = ph.dpbh
    c.pcbsh = ph.pcbsh
    c.k = crypt.sha256('maclek')
    c.mmc = { 1: 'mot 1', 2: 'mot 2' }
    c.mac = { }
    c.mac[crypt.id2s(999001)] = { nomc: 'pseudo1@toto1', cpriv: crypt.intToU8(2999001) }
    c.mac[crypt.id2s(999002)] = { nomc: 'pseudo2@toto2', cpriv: crypt.intToU8(2999002) }
    idb.addMaj(c)
    await idb.commit()

    session.clek = c.k
    const c2 = new Compte()
    c2.fromRow(c.row)
    console.log(c2.dpbh)

    idb.close()
  }
}

/** Invitgr **********************************/
const invitgrDatak = avro.Type.forSchema({ // map des avatars du compte
  type: 'map',
  values: avro.Type.forSchema({
    name: 'invitgrDatak',
    type: 'record',
    fields: [
      { name: 'idg', type: 'long' },
      { name: 'im', type: 'long' },
      { name: 'info', type: 'string' },
      { name: 'mc', type: { type: 'array', items: 'int' } }
    ]
  })
})

export class Invitgr {
  get table () { return 'invitgr' }

  fromRow (arg) { // arg : JSON sérialisé
    this.row = rowTypes.invitgr.fromBuffer(arg)
    this.niv = this.row.niv
    this.sniv = crypt.id2s(this.niv)
    this.id = this.row.id
    this.sid = crypt.id2s(this.id)
    this.v = this.row.v
    this.dlv = this.row.dlv
    this.st = this.row.st
    this.datap = this.row.datap
    this.datak = this.row.datak ? invitgrDatak.fromBuffer(crypt.decrypter(session.clek, this.row.datak)) : null
    this.clegk = this.row.clegk ? crypt.decrypter(session.clek, this.row.clegk) : null
    return this
  }

  serial () {
    const x = {
      niv: this.niv,
      id: this.id,
      v: this.v,
      dlv: this.dlv,
      st: this.st,
      datap: this.row.datap,
      datak: crypt.crypter(session.clek, invitgrDatak.toBuffer(this.datak)),
      clegk: crypt.crypter(session.clek, this.clegk)
    }
    this.row = rowTypes.invitgr.toBuffer(x)
    return this.row
  }
}
