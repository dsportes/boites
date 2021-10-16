/* eslint-disable no-unused-vars */
const avro = require('avsc')
const crypt = require('./crypto')
const base64url = require('base64url')
const rowTypes = require('./rowTypes')
import { session } from './ws'
import { /* store */ cfg } from './util'
import { store } from 'quasar/wrappers'

// const base64url = require('base64url')

// const JSONbig = require('json-bigint')

/* état de session */
export const data = {
  ps: null, // phrase secrète saisie
  clek: null // clé k
}

export function compte () {
  return store().state.db.compte
}

export function avc (id) {
  return compte().av(id)
}

export function avatar (id) {
  return store().getters['db.avatar'](id)
}

/** classes Phrase, MdpAdmin, Quotas */
export class Phrase {
  constructor (debut, fin) {
    this.pcb = crypt.pbkfd(debut + '\n' + fin)
    this.pcb64 = base64url(this.pcb)
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
      { name: 'cpriv', type: 'string' }
    ]
  })
})

const compteMmcType = avro.Type.forSchema({ // map des avatars du compte
  type: 'map',
  values: 'string'
})

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
  initCreate (nomAvatar, cpriv) {
    this.id = crypt.rnd6()
    const sid = crypt.id2s(this.id)
    this.v = 0
    this.dds = 0
    this.dpbh = data.ps.dpbh
    this.pcbh = data.ps.pcbh
    this.k = data.clek
    this.kx = crypt.crypter(data.ps.pcb, this.k)
    this.mac = { }
    this.mac[crypt.id2s(nomAvatar.id)] = { nomc: nomAvatar.nomc, na: nomAvatar, cpriv: cpriv }
    this.mack = crypt.crypter(data.clek, compteMacType.toBuffer(this.mac))
    this.mmc = {}
    this.mmck = crypt.crypter(data.clek, compteMmcType.toBuffer(this.mmc))
    return this
  }

  fromRow (row) { // item désérialisé
    this.id = row.id
    this.sid = crypt.id2s(this.id)
    this.v = row.v
    this.dds = row.dds
    this.dpbh = row.dpbh
    this.pcbh = row.pcbh
    this.kx = row.kx
    this.k = crypt.decrypter(data.ps.pcb, this.kx)
    data.clek = this.k
    this.mmck = row.mmck
    this.mack = row.mack
    this.mmc = compteMmcType.fromBuffer(crypt.decrypter(data.clek, this.mmck))
    this.mac = compteMacType.fromBuffer(crypt.decrypter(data.clek, this.mack))
    for (const sid in this.mac) {
      const x = this.mac[sid]
      x.na = new NomAvatar().initNomc(x.nomc)
    }
    return this
  }

  serial () { // après maj éventuelle de mac et / mmc
    this.mmck = crypt.crypter(data.clek, compteMmcType.toBuffer(this.mmc))
    this.mack = crypt.crypter(data.clek, compteMacType.toBuffer(this.mac))
    return rowTypes.rowSchemas.compte.toBuffer()
  }

  av (id) {
    return this.mac[base64url(id)]
  }
}

/** Avatar **********************************/
const avatarCvaType = avro.Type.forSchema({ type: 'array', items: 'string' })
const avatarLctType = avro.Type.forSchema({ type: 'array', items: 'int' })
/*
  fields: [
    { name: 'id', type: 'long' }, // pk
    { name: 'v', type: 'int' },
    { name: 'st', type: 'int' },
    { name: 'vcv', type: 'int' },
    { name: 'dds', type: 'int' },
    { name: 'cva', type: 'bytes' },
    { name: 'lctk', type: 'bytes' }
  ]
*/

export class NomAvatar {
  initNom (nom) {
    this.nom = nom
    const x = crypt.random(15)
    this.rnd = base64url(x)
    this.id = crypt.hashBin(x)
    this.cle = crypt.sha256(x)
    this.nomc = this.nom + '@' + this.rnd
    return this
  }

  initNomc (nomc) {
    this.nomc = nomc
    const i = nomc.lastIndexof('@')
    this.nom = nomc.substring(0, i)
    this.rnd = nomc.substring(i + 1)
    const x = base64url.toBuffer(this.rnd)
    this.cle = crypt.sha256(x)
    this.id = crypt.hashBin(x)
    return this
  }
}

export class Avatar {
  initCreate (nomAvatar) {
    this.nomAvatar = nomAvatar
    this.id = nomAvatar.id
    this.v = 0
    this.st = 0
    this.vcv = 0
    this.dds = 0
    this.cv = ['', nomAvatar.nomc]
    this.cva = crypt.crypter(nomAvatar.cle, avatarCvaType.toBuffer(this.cv))
    this.lct = []
    this.lctk = crypt.crypter(data.clek, avatarLctType.toBuffer(this.lct))
    return this
  }

  fromRow (row) { // item désérialisé
    this.id = row.id
    this.nomAvatar = avc(this.id).na
    this.sid = crypt.id2s(this.id)
    this.v = row.v
    this.st = row.st
    this.vcv = row.vcv
    this.dds = row.dds
    this.cva = row.cva
    this.cv = avatarCvaType.fromBuffer(crypt.decrypter(this.nomAvatar.cle, this.cva))
    this.lctk = row.lctk
    this.lct = avatarLctType.fromBuffer(crypt.decrypter(data.clek, this.lctk))
    return this
  }

  serial () { // après maj éventuelle de cv et / ou lct
    this.cva = crypt.crypter(this.nomAvatar.cle, avatarCvaType.toBuffer(this.cv))
    this.lctk = crypt.crypter(data.clek, avatarLctType.toBuffer(this.lct))
    return rowTypes.rowSchemas.avatar.toBuffer()
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
