/* eslint-disable no-unused-vars */
const avro = require('avsc')
const crypt = require('./crypto')
const base64url = require('base64url')
const rowTypes = require('./rowTypes')
import { session } from './ws'
import { store } from './util'
// import { store } from 'quasar/wrappers'

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

export function rowItemsToRows (rowItems) {
  const rows = {}
  function addRow (row) {
    if (!rows[row.table]) rows[row.table] = []
    rows[row.table].push(row)
  }
  let rowBuf
  rowItems.forEach(item => {
    rowBuf = rowTypes.fromBuffer(item.table, item.serial)
    switch (item.table) {
      case 'compte' : { addRow(new Compte().fromRow(rowBuf)); break }
      case 'avatar' : { addRow(new Avatar().fromRow(rowBuf)); break }
    }
  })
  return rows
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

const idbCompte = avro.Type.forSchema({
  name: 'idbCompte',
  type: 'record',
  fields: [
    { name: 'id', type: 'long' },
    { name: 'v', type: 'int' },
    { name: 'dds', type: 'int' },
    { name: 'dpbh', type: 'long' },
    { name: 'pcbh', type: 'long' },
    { name: 'k', type: 'bytes' },
    { name: 'mac', type: compteMacType },
    { name: 'mmc', type: compteMmcType }
  ]
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
  get table () { return 'compte' }

  nouveau (nomAvatar, cpriv) {
    this.id = crypt.rnd6()
    this.v = 0
    this.dds = 0
    this.dpbh = data.ps.dpbh
    this.pcbh = data.ps.pcbh
    this.k = crypt.random(32)
    this.mac = { }
    this.mac[nomAvatar.sid] = { na: nomAvatar, cpriv: cpriv }
    this.mmc = {}
    return this
  }

  get sid () { return crypt.id2s(this.id) }

  fromRow (row) {
    this.id = row.id
    this.v = row.v
    this.dds = row.dds
    this.dpbh = row.dpbh
    this.pcbh = row.pcbh
    this.k = crypt.decrypter(data.ps.pcb, row.kx)
    this.mmc = compteMmcType.fromBuffer(crypt.decrypter(this.k, row.mmck))
    this.mac = compteMacType.fromBuffer(crypt.decrypter(this.k, row.mack))
    for (const sid in this.mac) {
      const x = this.mac[sid]
      x.na = new NomAvatar(x.nomc)
      delete x.nomc
    }
    return this
  }

  fromIdb (idb) {
    const row = idbCompte.fromBuffer(idb)
    this.id = row.id
    this.v = row.v
    this.dds = row.dds
    this.dpbh = row.dpbh
    this.pcbh = row.pcbh
    this.k = row.k
    this.mmc = row.mmc
    this.mac = row.mac
    for (const sid in this.mac) {
      const x = this.mac[sid]
      x.na = new NomAvatar(x.nomc)
      delete x.nomc
    }
    return this
  }

  get toRow () { // après maj éventuelle de mac et / ou mmc
    this.mmck = crypt.crypter(data.clek, compteMmcType.toBuffer(this.mmc))
    for (const sid in this.mac) {
      const x = this.mac[sid]
      x.nomc = x.na.nomc
    }
    this.mack = crypt.crypter(data.clek, compteMacType.toBuffer(this.mac))
    for (const sid in this.mac) {
      const x = this.mac[sid]
      delete x.nomc
    }
    this.kx = crypt.crypter(data.ps.pcb, this.k)
    const buf = rowTypes.rowSchemas.compte.toBuffer(this)
    delete this.mack
    delete this.mmck
    delete this.kx
    return buf
  }

  get toIdb () {
    for (const sid in this.mac) {
      const x = this.mac[sid]
      x.nomc = x.na.nomc
    }
    return idbCompte.toBuffer(this)
  }

  get clone () { return new Compte().fromIdb(this.toIdb) }

  av (id) {
    return this.mac[crypt.id2s(id)]
  }
}

/** NomAvatar **********************************/
export class NomAvatar {
  constructor (n, nouveau) {
    if (nouveau) {
      this.rndb = crypt.random(15)
      this.nom = n
    } else {
      const i = n.lastIndexOf('@')
      this.nom = n.substring(0, i)
      this.rndb = base64url.toBuffer(n.substring(i + 1))
    }
  }

  get id () { return crypt.hashBin(this.rndb) }

  get nomc () { return this.nom + '@' + base64url(this.rndb) }

  get sid () { return crypt.id2s(this.id) }

  get cle () { return crypt.sha256(this.rndb) }
}

/** Avatar **********************************/
const avatarCvaType = avro.Type.forSchema({ type: 'array', items: 'string' })
const avatarLctType = avro.Type.forSchema({ type: 'array', items: 'long' })
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

const idbAvatar = avro.Type.forSchema({
  name: 'idbAvatar',
  type: 'record',
  fields: [
    { name: 'id', type: 'long' },
    { name: 'v', type: 'int' },
    { name: 'st', type: 'int' },
    { name: 'vcv', type: 'int' },
    { name: 'dds', type: 'int' },
    { name: 'photo', type: 'string' },
    { name: 'info', type: 'string' },
    { name: 'lct', type: avatarLctType }
  ]
})

export class Avatar {
  get table () { return 'avatar' }

  nouveau (nomAvatar) {
    this.na = nomAvatar
    this.id = this.na.id
    this.v = 0
    this.st = 0
    this.vcv = 0
    this.dds = 0
    this.photo = ''
    this.info = this.na.nomc
    this.lct = []
    return this
  }

  fromRow (row) {
    this.id = row.id
    this.na = avc(this.id).na
    this.v = row.v
    this.st = row.st
    this.vcv = row.vcv
    this.dds = row.dds
    const x = avatarCvaType.fromBuffer(crypt.decrypter(this.na.cle, row.cva))
    this.photo = x[0]
    this.info = x[1]
    this.lct = avatarLctType.fromBuffer(crypt.decrypter(data.clek, row.lctk))
    return this
  }

  get sid () { return crypt.id2s(this.id) }

  get toRow () { // après maj éventuelle de cv et / ou lct
    this.cva = crypt.crypter(this.na.cle, avatarCvaType.toBuffer([this.photo, this.info]))
    this.lctk = crypt.crypter(data.clek, avatarLctType.toBuffer(this.lct))
    const buf = rowTypes.rowSchemas.avatar.toBuffer(this)
    delete this.cva
    delete this.lctk
    return buf
  }

  get toIdb () {
    return idbAvatar.toBuffer(this)
  }

  fromIdb (idb) {
    const row = idbAvatar.fromBuffer(idb)
    this.id = row.id
    this.na = avc(this.id).na
    this.v = row.v
    this.st = row.st
    this.vcv = row.vcv
    this.dds = row.dds
    this.photo = row.photo
    this.info = row.info
    this.lct = row.lct
    return this
  }
}

/** cvIdb ************************************/
const cvIdb = avro.Type.forSchema({
  name: 'cvIdb',
  type: 'record',
  fields: [
    { name: 'id', type: 'long' },
    { name: 'vcv', type: 'int' },
    { name: 'st', type: 'int' }, // négatif, avatar supprimé / disparu, 0:OK, 1:alerte
    { name: 'nomc', type: 'string' },
    { name: 'photo', type: 'string' },
    { name: 'info', type: 'string' }
  ]
})

export class Cv {
  get table () { return 'cv' }

  nouveau (id, vcv, st, nomc, photo, info) {
    this.id = id
    this.vcv = vcv
    this.st = st
    this.na = new NomAvatar(nomc)
    this.photo = photo
    this.info = info
    return this
  }

  get sid () { return crypt.id2s(this.id) }

  fromAvatar (av) { // av : objet Avatar
    this.id = av.id
    this.vcv = av.vcv
    this.st = av.st
    this.na = av.na
    this.photo = av.photo
    this.info = av.info
    return this
  }

  /*
  name: 'rowCv',
  type: 'record',
  fields: [
    { name: 'id', type: 'long' },
    { name: 'vcv', type: 'int' },
    { name: 'st', type: 'int' }, // négatif, avatar supprimé / disparu, 0:OK, 1:alerte
    { name: 'serial', type: ['null', 'bytes'], default: null }
  ]
  */
  fromRow (row, nomc) { // row : rowCv - item retour de sync
    this.id = row.id
    this.vcv = row.vcv
    this.st = row.cv
    this.nomc = nomc
    this.na = new NomAvatar(nomc)
    const x = crypt.decrypter(this.na.cle, row.serial)
    this.photo = x[0]
    this.texte = x[1]
    return this
  }

  get toIdb () {
    this.nomc = this.na.nomc
    const buf = cvIdb.toBuffer(this)
    delete this.nomc
    return buf
  }

  fromIdb (idb) {
    const row = cvIdb.fromBuffer(idb)
    this.id = row.id
    this.vcv = row.vcv
    this.st = row.st
    this.na = new NomAvatar(row.nomc)
    this.photo = row.photo
    this.texte = row.texte
    return this
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
