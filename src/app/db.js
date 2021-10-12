import Dexie from 'dexie'
import { store, post, cfg } from './util'
import { newSession, session } from './ws'

import * as CONST from '../store/constantes'
const avro = require('avsc')
const crypt = require('./crypto')
const base64url = require('base64url')
const rowTypes = require('./rowTypes')
const JSONbig = require('json-bigint')

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

/*
Connexion à un compte par sa phrase secrète
Retour : 0:OK, -1:erreur technique, 1:non authentifié
*/
export async function connexion (ps) {
  const mode = store().state.ui.mode
  try {
    if (mode === CONST.MODE_AVION) {
      console.log('connexion locale')
      return 0
    } else {
      const s = await newSession()
      console.log('connexion distante: ' + s.sessionId)
      const args = { sessionId: s.sessionId, pcbsh: ps.pcbsh, dpbh: ps.dpbh }
      const ret = await post('m1', 'testconnexion', args, 'Connexion ...', 'respBase1')
      if (ret.status === 0) {
        store().commit('ui/majstatuslogin', true)
      } else {
        store().commit('ui/majstatuslogin', false)
      }
      return ret
    }
  } catch (e) {
    return { status: -1, dh: 0, sessionId: '', rows: [] }
  }
}

/* état de session */
export const etatsession = {
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

/* On poste :
- le row Compte, v et dds à 0
- la clé publique de l'avatar pour la table avrsa
- les quotas pour la table avgrvq
- le row Avatar, v et dds à 0
Retour:
- status :
  0: créé et connecté
  1: était déjà créé avec la bonne phrase secrète, transformé en login
  2: début de phrase secrète déjà utilisée - refus
  -1: erreur technique
- dh, sessionId
- rowItems retournés :
  compte
  avatar (1 pour le status 0)
*/
export async function creationCompte (mdp, ps, nom, quotas) {

}
