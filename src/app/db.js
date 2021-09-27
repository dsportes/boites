import Dexie from 'dexie'
import { store, post, debug } from './util'
import * as CONST from '../store/constantes'
const avro = require('avsc')
const crypt = require('./crypto')
const base64url = require('base64url')
const rowTypes = require('rowTypes')

let idb = null // idb courante

export class Idb {
  static get STORES () {
    return {
      compte: 'id',
      avatar: 'id',
      invitgr: 'niv+id',
      contact: 'id+ic',
      invitct: 'cch, id',
      parrain: 'pph, id',
      rencontre: 'prh, id',
      membre: 'id+im',
      secret: 'ids, id'
    }
  }

  constructor (nom) {
    this.db = new Dexie(nom, { autoOpen: true })
    this.db.version(1).stores(this.STORES)
    this.lmaj = []
    idb = this
  }

  async open () {
    await this.db.open()
    return idb
  }

  close () {
    if (this.db && this.db.isOpen()) {
      this.db.close()
      this.db = null
    }
  }

  raz () {
    this.lmaj.length = 0
  }

  addPut (rowObj) {
    this.lmaj.push({ cmd: 1, rowObj: rowObj })
  }

  addDel (table, sid, sid2) {
    this.lmaj.push({ cmd: 2, table, sid: sid, sid2: sid2 })
  }

  async commit () {
    await this.db.transaction(
      'rw',
      this.db.compte,
      this.db.avatar,
      this.db.invigr,
      this.db.contact,
      this.db.invitct,
      this.db.parrain,
      this.db.groupe,
      this.db.membre,
      this.db.secret,
      async () => {
        for (let i = 0; i < this.lmaj; i++) {
          const lm = this.lmaj[i]
          if (lm.cmd === 1) { // put
            const obj = lm.rowObj
            const table = obj.table
            switch (table) {
              case 'compte' : {
                await this.db.compte.put({ id: obj.sid, data: obj.row || obj.serial() })
                if (debug()) console.log('put compte: ' + obj.sid + ' - lg: ' + obj.row.length)
              }
            }
          } else { // del
            switch (lm.table) {
              case 'compte' : {
                await this.db.compte.delete(lm.sid)
                if (debug()) console.log('del compte: ' + lm.sid)
              }
            }
          }
        }
      }
    )
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
    this.mdp = crypt.pbkfd(mdp)
    this.mdp64 = base64url(this.mdp)
    this.mdph = crypt.hashBin(this.mdp)
  }
}

export class Compte {
  static get table () { return 'compte' }

  static get mavcType () {
    return avro.Type.forSchema({ // map des avatars du compte
      type: 'map',
      values: avro.Type.forSchema({
        name: 'avc',
        type: 'record',
        fields: [
          { name: 'nomc', type: 'string' },
          { name: 'cpriv', type: 'bytes' }
        ]
      })
    })
  }

  static get mmcType () {
    return avro.Type.forSchema({ // map des avatars du compte
      type: 'map',
      values: 'string'
    })
  }

  fromRow (arg) { // arg : JSON sérialisé
    this.row = rowTypes.compte.fromBuffer(arg)
    this.id = this.row.id
    this.sid = crypt.id2s(this.id)
    this.v = this.row.v
    this.dds = this.row.dds
    this.dpbh = this.row.dpbh
    this.pcbsh = this.row.pcbsh
    this.k = crypt.decrypter(session.clex, this.row.k)
    session.clek = this.k
    this.mmc = this.mmcType.fromBuffer(crypt.decrypter(session.clek, this.row.mmck))
    this.mavc = this.mavcType.fromBuffer(crypt.decrypter(session.clek, this.row.mack))
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
      mmck: crypt.crypter(session.clek, this.mmcType.toBuffer(this.mmc)),
      mack: crypt.crypter(session.clek, this.mavc.toBuffer(this.mavc))
    }
    this.row = rowTypes.compte.toBuffer(x)
    return this.row
  }

  static async ex1 () {
    await open('db1')

    const ph = new Phrase('lessanglotslongs', 'gareaugorille')
    session.clex = ph.pcb
    session.clek = crypt.sha256('maclek')

    const c = new Compte()
    c.id = 15151789
    c.cleidb = crypt.id2s(c.id)
    c.v = 2
    c.dpbh = ph.dpbh
    c.pcbsh = ph.pcbsh
    c.k = session.clek
    c.mmc = { 1: 'mot 1', 2: 'mot 2' }
    const id1 = base64url(crypt.intToU8(999001))
    const id2 = base64url(crypt.intToU8(999002))
    c.mavc = { }
    c.mavc[id1] = { cle: crypt.intToU8(1999001), pseudo: 'pseudo 1', cpriv: crypt.intToU8(2999001) }
    c.mavc[id2] = { cle: crypt.intToU8(1999002), pseudo: 'pseudo 2', cpriv: crypt.intToU8(2999002) }
    await c.toIdbCompte()
    const sqlbuf = c.toSqlCompte()
    const c2 = new Compte()
    c2.fromSqlCompte(sqlbuf)
    console.log(c2.dpbh)

    close()
  }
}
