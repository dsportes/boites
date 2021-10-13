/* eslint-disable no-unused-vars */
const avro = require('avsc')
const crypt = require('./crypto')
const base64url = require('base64url')
const rowTypes = require('./rowTypes')
import { session } from './ws'
import { /* store */ cfg } from './util'

// const base64url = require('base64url')

// const JSONbig = require('json-bigint')

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
    this.pcbs64 = base64url(this.pcbs)
    this.pcbh = crypt.hashBin(this.pcb)
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

// eslint-disable-next-line no-unused-vars
const compteMmcType = avro.Type.forSchema({ // map des avatars du compte
  type: 'map',
  values: 'string'
})

export class NomAvatar {
  initNom (nom) {
    this.nom = nom
    const x = crypt.random(15)
    this.rnd = base64url(x)
    this.id = crypt.hashBin(x)
    this.nomc = this.nom + '@' + this.rnd
    return this
  }

  initNomc (nomc) {
    this.nomc = nomc
    const i = nomc.lastIndexof('@')
    this.nom = nomc.substring(0, i)
    this.rnd = nomc.substring(i + 1)
    const x = base64url.toBuffer(this.rnd)
    this.id = crypt.hashBin(x)
    return this
  }
}

/*
  fields: [
    { name: 'id', type: 'long' }, // pk
    { name: 'v', type: 'int' },
    { name: 'dds', type: 'int' },
    { name: 'dpbh', type: 'long' },
    { name: 'pcbh', type: 'long' },
    { name: 'kx', type: 'bytes' },
    { name: 'mack', type: 'bytes' },
    { name: 'mmck', type: 'bytes' }
  ]
*/
export class Compte {
  initCreate (ps, mdp, nom, quotas) {
    this.id = crypt.rnd6()
    const sid = crypt.id2s(this.id)
    this.v = 0
    this.dds = 0
    this.dpbh = ps.dpbh
    this.pcbh = ps.pcbh
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
    /*
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
    */
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
