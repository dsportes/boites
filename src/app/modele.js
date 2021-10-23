/* eslint-disable no-unused-vars */
const avro = require('avsc')
const crypt = require('./crypto')
const base64url = require('base64url')
const rowTypes = require('./rowTypes')
import { session } from './ws'
import { store } from './util'
// import { store } from 'quasar/wrappers'

/* état de session */
export class Etat {
  constructor () {
    this.raz()
  }

  raz () {
    this.ps = null
    this.clek = null
    this.cleg = {}
    this.clec = {} // {id, {ic... }}
  }

  cleg (id) {
    return this.cleg[crypt.id2s(id)]
  }

  clec (id, ic) {
    // const
  }

  compte () {
    return store().state.db.compte
  }

  avc (id) {
    return this.compte().av(id)
  }

  avatar (id) {
    return store().getters['db/avatar'](id)
  }

  contact (id, ic) {
    return store().getters['db/contact']({ id, ic })
  }

  groupe (id) {
    return store().getters['db/groupe'](id)
  }
}
export const data = new Etat()

/** classes Phrase, MdpAdmin, Quotas ****************/
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

/** Schémas globaux *************************/
const arrayStringType = avro.Type.forSchema({ type: 'array', items: 'string' })
const arrayLongType = avro.Type.forSchema({ type: 'array', items: 'long' })
const arrayIntType = avro.Type.forSchema({ type: 'array', items: 'int' })

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
    { name: 'lct', type: arrayLongType }
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
    this.na = data.avc(this.id).na
    this.v = row.v
    this.st = row.st
    this.vcv = row.vcv
    this.dds = row.dds
    const x = arrayStringType.fromBuffer(crypt.decrypter(this.na.cle, row.cva))
    this.photo = x[0]
    this.info = x[1]
    this.lct = arrayLongType.fromBuffer(crypt.decrypter(data.clek, row.lctk))
    return this
  }

  get sid () { return crypt.id2s(this.id) }

  get toRow () { // après maj éventuelle de cv et / ou lct
    this.cva = crypt.crypter(this.na.cle, arrayStringType.toBuffer([this.photo, this.info]))
    this.lctk = crypt.crypter(data.clek, arrayLongType.toBuffer(this.lct))
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
    this.na = data.avc(this.id).na
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

  fromNomAvatar (na) {
    this.id = na.id
    this.vcv = 0
    this.st = 0
    this.na = na
    this.photo = ''
    this.info = na.nomc
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
    { name: 'phinf', type: ['null', 'bytes'], default: null }
  ]
  */
  fromRow (row, nomc) { // row : rowCv - item retour de sync
    this.id = row.id
    this.vcv = row.vcv
    this.st = row.cv
    this.nomc = nomc
    this.na = new NomAvatar(nomc)
    const x = row.phinf ? arrayStringType.fromBuffer(crypt.decrypter(this.na.cle, row.phinf)) : null
    this.photo = x ? x[0] : null
    this.info = x ? x[1] : null
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

/** contact **********************************/
const contactData = avro.Type.forSchema({ // map des avatars du compte
  type: 'map',
  values: avro.Type.forSchema({
    name: 'contactData',
    type: 'record',
    fields: [
      { name: 'nomc', type: 'string' },
      { name: 'cc', type: 'bytes' },
      { name: 'dlv', type: 'int' },
      { name: 'pph', type: 'long' },
      { name: 'nomc', type: 'string' },
      { name: 'mc', type: arrayStringType }
    ]
  })
})

const idbContact = avro.Type.forSchema({
  name: 'idbContact',
  type: 'record',
  fields: [
    { name: 'id', type: 'long' },
    { name: 'ic', type: 'int' },
    { name: 'v', type: 'int' },
    { name: 'st', type: 'int' }, // négatif, avatar supprimé / disparu, 0:OK, 1:alerte
    { name: 'q1', type: 'long' },
    { name: 'q2', type: 'long' },
    { name: 'qm1', type: 'long' },
    { name: 'qm2', type: 'long' },
    { name: 'ard', type: 'string' },
    { name: 'icb', type: 'int' },
    { name: 'data', type: contactData }
  ]
})

/*
  name: 'rowContact',
  type: 'record',
  fields: [
    { name: 'id', type: 'long' }, // pk 1
    { name: 'ic', type: 'int' }, // pk 2
    { name: 'v', type: 'int' },
    { name: 'st', type: 'int' },
    { name: 'q1', type: 'long' },
    { name: 'q2', type: 'long' },
    { name: 'qm1', type: 'long' },
    { name: 'qm2', type: 'long' },
    { name: 'ardc', type: 'bytes' },
    { name: 'icbc', type: 'bytes' },
    { name: 'datak', type: 'bytes' }
  ]
  - `ardc` : **ardoise** partagée entre A et B cryptée par la clé `cc` associée au contact _fort_ avec un avatar B.
  - `icbc` : pour un contact fort _accepté_, indice de A chez B (communiqué lors de l'acceptation par B) pour mise à jour dédoublée de l'ardoise et du statut, crypté par la clé `cc`.
  - `datak` : information cryptée par la clé K de A.
    - `nomc` : nom complet de l'avatar `nom@rnd`.
    - `cc` : 32 bytes aléatoires donnant la clé `cc` d'un contact _fort_ avec B (en attente ou accepté).
    - `dlv` : date limite de validité de l'invitation à être contact _fort_ ou du parrainage.
    - `pph` : hash du PBKFD2 de la phrase de parrainage.
    - `info` : information libre donnée par A à propos du contact.
    - `mc` : liste des mots clés associés par A au contact.
*/

export class Contact {
  get table () { return 'contact' }

  get sidIc () { return [crypt.id2s(this.id), this.ic] }

  fromRow (row) {
    this.id = row.id
    this.ic = row.ic
    this.v = row.v
    this.st = row.st
    this.q1 = row.q1
    this.q2 = row.q2
    this.qm1 = row.qm1
    this.qm2 = row.qm2
    this.data = contactData.fromBuffer(crypt.decrypter(data.clek, row.datak))
    this.ard = Buffer.from(crypt.decrypter(this.data.cc, row.ardc)).toString()
    this.icb = crypt.u8ToInt(crypt.decrypter(this.data.cc, row.icbc))
    return this
  }

  get toRow () {
    this.datak = crypt.crypter(data.clek, contactData.toBuffer(this.data))
    this.ardc = crypt.crypter(this.data.cc, this.ard)
    this.icbc = crypt.crypter(this.data.cc, crypt.int2u8(this.icb))
    const buf = rowTypes.rowSchemas.contact.toBuffer(this)
    delete this.datak
    delete this.icbc
    delete this.ardc
    return buf
  }

  get toIdb () {
    return idbContact.toBuffer(this)
  }

  fromIdb (idb) {
    const row = idbContact.fromBuffer(idb)
    this.id = row.id
    this.ic = row.ic
    this.v = row.v
    this.st = row.st
    this.q1 = row.q1
    this.q2 = row.q2
    this.qm1 = row.qm1
    this.qm2 = row.qm2
    this.data = row.data
    this.ard = row.ard
    this.icb = row.icb
    return this
  }
}
/** Groupe ***********************************/
/*
  name: 'rowGroupe',
  type: 'record',
  fields: [
    { name: 'id', type: 'long' }, // pk
    { name: 'v', type: 'int' },
    { name: 'dds', type: 'int' },
    { name: 'st', type: 'int' },
    { name: 'cvg', type: ['null', 'bytes'] },
    { name: 'mcg', type: ['null', 'bytes'] },
    { name: 'lstmg', type: ['null', 'bytes'] }
  ]
- `id` : id du groupe.
- `v` :
- `dds` :
- `st` : statut : < 0-supprimé - Deux chiffres `x y`
  - `x` : 1-ouvert, 2-fermé, 3-ré-ouverture en vote
  - `y` : 0-en écriture, 1-archivé
- `cvg` : carte de visite du groupe `[photo, info]` cryptée par la clé G du groupe.
- `mcg` : liste des mots clés définis pour le groupe cryptée par la clé du groupe cryptée par la clé G du groupe.
- `lstmg` : liste des ids des membres du groupe.
*/

const idbGroupe = avro.Type.forSchema({
  name: 'idbGroupe',
  type: 'record',
  fields: [
    { name: 'id', type: 'long' },
    { name: 'v', type: 'int' },
    { name: 'dds', type: 'int' },
    { name: 'st', type: 'int' },
    { name: 'cv', type: ['null', arrayStringType] },
    { name: 'mc', type: ['null', arrayIntType] },
    { name: 'lstm', type: ['null', arrayLongType] }
  ]
})

export class Groupe {
  get table () { return 'groupe' }

  get sid () { return crypt.id2s(this.id) }

  fromRow (row) {
    this.id = row.id
    this.v = row.v
    this.dds = row.dds
    this.st = row.st
    const cleg = data.cleg(this.id)
    this.cv = row.cvg ? arrayStringType.fromBuffer(crypt.decrypter(cleg, row.cvg)) : null
    this.mc = row.mcg ? arrayIntType.fromBuffer(crypt.decrypter(cleg, row.mcg)) : null
    this.lstm = row.lstmg ? arrayLongType.fromBuffer(crypt.decrypter(cleg, row.lstmg)) : null
    return this
  }

  get toRow () {
    const cleg = data.cleg(this.id)
    this.cvg = this.cv ? crypt.crypter(cleg, arrayStringType.toBuffer(this.cv)) : null
    this.mcg = this.mcg ? crypt.crypter(cleg, arrayIntType.toBuffer(this.mc)) : null
    this.lstmg = this.lstm ? crypt.crypter(cleg, arrayLongType.toBuffer(this.lstm)) : null
    const buf = rowTypes.rowSchemas.groupe.toBuffer(this)
    delete this.cvg
    delete this.mcg
    delete this.lstmg
    return buf
  }

  get toIdb () {
    return idbGroupe.toBuffer(this)
  }

  fromIdb (idb) {
    const row = idbGroupe.fromBuffer(idb)
    this.id = row.id
    this.v = row.v
    this.dds = row.dds
    this.st = row.st
    this.cv = row.cv
    this.mc = row.mc
    this.lstm = row.lstm
    return this
  }
}

/** Invitct **********************************/
/*
const rowInvitct = avro.Type.forSchema({
  name: 'rowInvitct',
  type: 'record',
  fields: [
    { name: 'id', type: 'long' }, // pk1
    { name: 'ni', type: 'int' }, // pk2
    { name: 'v', type: 'int' },
    { name: 'dlv', type: 'int' },
    { name: 'st', type: 'int' },
    { name: 'datap', type: ['null', 'bytes'] },
    { name: 'datak', type: ['null', 'bytes'] },
    { name: 'ardc', type: ['null', 'bytes'] }
  ]
})
*/
/*
`datap` : données cryptées par la clé publique de B.
- `nom@rnd` : nom complet de A.
- `ic` : numéro du contact de A pour B (pour que B puisse écrire le statut et l'ardoise dans `contact` de A).
- `cc` : clé `cc` du contact *fort* A / B, définie par A.
*/
const invitctData = avro.Type.forSchema({
  name: 'invitctData',
  type: 'record',
  fields: [
    { name: 'nomc', type: 'string' },
    { name: 'ic', type: 'int' },
    { name: 'cc', type: 'bytes' }
  ]
})

const idbInvitct = avro.Type.forSchema({
  name: 'idbInvitct',
  type: 'record',
  fields: [
    { name: 'id', type: 'long' },
    { name: 'ni', type: 'int' },
    { name: 'v', type: 'int' },
    { name: 'dlv', type: 'int' },
    { name: 'st', type: 'int' },
    { name: 'data', type: ['null', 'bytes'] },
    { name: 'ard', type: ['null', 'bytes'] }
  ]
})

export class Invitct {
  get table () { return 'invitct' }

  get sidNi () { return [crypt.id2s(this.id), this.ni] }

  fromRow (row) {
    this.id = row.id
    this.ni = row.ni
    this.v = row.v
    this.dlv = row.dlv
    this.st = row.st
    let rowData = null
    if (row.datak) {
      rowData = crypt.decrypter(data.clek, row.datak)
    } else if (row.datap) {
      const cpriv = data.avc(this.id).cpriv
      rowData = crypt.decrypterRSA(cpriv, row.datap)
    }
    this.data = rowData ? invitctData.fromBuffer(rowData) : null
    this.ard = row.ardc ? crypt.decrypter(this.data.cc, row.ardc) : null
    return this
  }

  get toRow () {
    this.datak = this.data ? crypt.crypter(data.clek, invitctData.toBuffer(this.data)) : null
    this.ardc = this.ard ? crypt.crypter(this.data.cc, this.ard) : null
    const buf = rowTypes.rowSchemas.invitct.toBuffer(this)
    delete this.datak
    delete this.ardc
    return buf
  }

  get toIdb () {
    return idbInvitct.toBuffer(this)
  }

  fromIdb (idb) {
    const row = idbInvitct.fromBuffer(idb)
    this.id = row.id
    this.ni = row.ni
    this.v = row.v
    this.dlv = row.dlv
    this.st = row.st
    this.data = row.data
    this.ard = row.ard
    return this
  }
}

/** Invitgr **********************************/
/*
  name: 'rowInvitgr',
  type: 'record',
  fields: [
    { name: 'id', type: 'long' }, // pk1
    { name: 'ni', type: 'int' }, // pk2
    { name: 'v', type: 'int' },
    { name: 'dlv', type: 'int' },
    { name: 'st', type: 'int' },
    { name: 'datap', type: ['null', 'bytes'] },
    { name: 'datak', type: ['null', 'bytes'] }
  ]
- `id` : id du membre invité.
- `ni` : numéro d'invitation.
- `v` :
- `dlv` :
- `st` : statut. Si `st` < 0, c'est une suppression annulation. 0:invité, 1:actif
- `datap` : pour une invitation _en cours_, crypté par la clé publique du membre invité, référence dans la liste des membres du groupe `[idg, cleg, im]`.
 - `idg` : id du groupe.
 - `cleg` : clé du groupe.
 - `im` : indice de membre de l'invité dans le groupe.
- `datak` : même données que `datap` mais cryptées par la clé K du compte de l'invité, après son acceptation.
*/
const invitgrData = avro.Type.forSchema({ // map des avatars du compte
  type: 'map',
  values: avro.Type.forSchema({
    name: 'invitgrData',
    type: 'record',
    fields: [
      { name: 'idg', type: 'long' },
      { name: 'cleg', type: 'bytes' },
      { name: 'im', type: 'int' }
    ]
  })
})

const idbInvitgr = avro.Type.forSchema({
  name: 'idbInvitgr',
  type: 'record',
  fields: [
    { name: 'id', type: 'long' },
    { name: 'ni', type: 'int' },
    { name: 'v', type: 'int' },
    { name: 'dlv', type: 'int' },
    { name: 'st', type: 'int' },
    { name: 'data', type: ['null', 'bytes'] }
  ]
})

export class Invitgr {
  get table () { return 'invitgr' }

  get sidNi () { return [crypt.id2s(this.id), this.ni] }

  fromRow (row) {
    this.id = row.id
    this.ni = row.ni
    this.v = row.v
    this.dlv = row.dlv
    this.st = row.st
    let rowData = null
    if (row.datak) {
      rowData = crypt.decrypter(data.clek, row.datak)
    } else if (row.datap) {
      const cpriv = data.avc(this.id).cpriv
      rowData = crypt.decrypterRSA(cpriv, row.datap)
    }
    this.data = rowData ? invitgrData.fromBuffer(rowData) : null
    return this
  }

  get toRow () {
    this.datak = this.data ? crypt.crypter(data.clek, invitgrData.toBuffer(this.data)) : null
    const buf = rowTypes.rowSchemas.invitct.toBuffer(this)
    delete this.datak
    return buf
  }

  get toIdb () {
    return idbInvitct.toBuffer(this)
  }

  fromIdb (idb) {
    const row = idbInvitgr.fromBuffer(idb)
    this.id = row.id
    this.ni = row.ni
    this.v = row.v
    this.dlv = row.dlv
    this.st = row.st
    this.data = row.data
    return this
  }
}

/** Membre ***********************************/
/*
  name: 'rowMembre',
  type: 'record',
  fields: [
    { name: 'id', type: 'long' }, // pk 1
    { name: 'im', type: 'int' }, // pk 2
    { name: 'v', type: 'int' },
    { name: 'st', type: 'int' },
    { name: 'dlv', type: 'int' },
    { name: 'datag', type: ['null', 'bytes'] },
    { name: 'ardg', type: ['null', 'bytes'] },
    { name: 'lmck', type: ['null', 'bytes'] }
  ]

- `id` : id du groupe.
- `im` : numéro du membre dans le groupe.
- `v` :
- `st` : statut. `xy` : < 0 signifie supprimé.
  - `x` : 1:pressenti, 2:invité, 3:ayant refusé, 3:actif, 8: résilié, 9:disparu.
  - `y` : 0:lecteur, 1:auteur, 2:administrateur.
- `vote` : vote de réouverture.
- `dlv` : date limite de validité de l'invitation. N'est significative qu'en statut _invité_.
- `datag` : données cryptées par la clé du groupe.
  - `nomc` : nom complet de l'avatar `nom@rnd` (donne la clé d'accès à sa carte de visite)
  - `ni` : numéro d'invitation du membre dans `invitgr` relativement à son `id` (issu de `nomc`).
  Permet de supprimer son accès au groupe (`st < 0, datap / datak null` dans `invitgr`) quand il est résilié / disparu.
  - `idi` : id du membre qui l'a pressenti puis invité.
  - `q1 q2` : balance des quotas donnés / reçus par le membre au groupe.
- `ardg` : ardoise du membre vis à vis du groupe, texte d'invitation / réponse de l'invité cryptée par la clé du groupe.
- `lmck` : liste, cryptée par la clé k du membre, des mots clés de rangement / recherche attribués par le membre quand il est actif.
*/

const membreData = avro.Type.forSchema({ // map des avatars du compte
  type: 'map',
  values: avro.Type.forSchema({
    name: 'membreData',
    type: 'record',
    fields: [
      { name: 'nomc', type: 'string' },
      { name: 'ni', type: 'int' },
      { name: 'idi', type: 'long' },
      { name: 'q1', type: 'long' },
      { name: 'q2', type: 'long' }
    ]
  })
})

const idbMembre = avro.Type.forSchema({
  name: 'idbMembre',
  type: 'record',
  fields: [
    { name: 'id', type: 'long' },
    { name: 'im', type: 'int' },
    { name: 'v', type: 'int' },
    { name: 'st', type: 'int' },
    { name: 'dlv', type: 'int' },
    { name: 'data', type: 'bytes' },
    { name: 'ard', type: 'string' },
    { name: 'lmc', type: ['null', 'bytes'] }
  ]
})

export class Membre {
  get table () { return 'membre' }

  get sidIm () { return [crypt.id2s(this.id), this.im] }

  fromRow (row) {
    this.id = row.id
    this.im = row.im
    this.v = row.v
    this.st = row.st
    this.dlv = row.dlv
    const cg = row.datag || row.ardg || row.lmck ? data.cleg(this.id) : null
    const rowData = row.datag ? crypt.decrypter(cg, row.datag) : null
    this.data = rowData ? invitgrData.fromBuffer(rowData) : null
    this.ard = row.ardg ? Buffer.from(crypt.decrypter(cg, row.ardg)).toString() : null
    const lmc = row.lmck ? crypt.decrypter(data.clek, row.lmck) : null
    this.lmc = lmc ? arrayIntType.fromBuffer(lmc) : null
    return this
  }

  get toRow () {
    const cg = this.data || this.ard || this.lmc ? data.cleg(this.id) : null
    this.datag = this.data ? crypt.crypter(cg, membreData.toBuffer(this.data)) : null
    this.ardg = this.ard ? crypt.crypter(cg, this.ard) : null
    this.lmck = this.lmc ? crypt.crypter(data.clek, arrayIntType.toBuffer(this.lmc)) : null
    const buf = rowTypes.rowSchemas.membre.toBuffer(this)
    delete this.datag
    delete this.ardg
    delete this.lmck
    return buf
  }

  get toIdb () {
    return idbInvitct.toBuffer(this)
  }

  fromIdb (idb) {
    const row = idbInvitgr.fromBuffer(idb)
    this.id = row.id
    this.im = row.im
    this.v = row.v
    this.dlv = row.dlv
    this.st = row.st
    this.data = row.data
    this.ard = row.ard
    this.lmc = row.lmc
    return this
  }
}

/** Parrain **********************************/
/*
  name: 'rowParrain',
  type: 'record',
  fields: [
    { name: 'pph', type: 'long' }, // pk
    { name: 'id', type: 'long' },
    { name: 'nc', type: 'int' },
    { name: 'dlv', type: 'int' },
    { name: 'st', type: 'int' },
    { name: 'v', type: 'int' },
    { name: 'q1', type: 'long' },
    { name: 'q2', type: 'long' },
    { name: 'qm1', type: 'long' },
    { name: 'qm2', type: 'long' },
    { name: 'datak', type: ['null', 'bytes'] },
    { name: 'datax', type: ['null', 'bytes'] },
    { name: 'ardc', type: ['null', 'bytes'] }
  ]
- `pph` : hash du PBKFD2 de la phrase de parrainage.
- `id` : id du parrain.
- `ic` : numéro de contact du filleul chez le parrain.
- `dlv` : la date limite de validité permettant de purger les parrainages (quels qu'en soient les statuts).
- `st` : 0: annulé par P, 1: en attente de décision de F, 2: accepté par F, 3: refusé par F
- `q1 q2 qm1 qm2` : quotas donnés par P à F en cas d'acceptation.
- `datak` : cryptée par la clé K du parrain, **phrase de parrainage et clé X** (PBKFD2 de la phrase). La clé X figure afin de ne pas avoir à recalculer un PBKFD2 en session du parrain pour qu'il puisse afficher `datax`.
- `datax` : données de l'invitation cryptées par le PBKFD2 de la phrase de parrainage.
  - `nomp` : `nom@rnd` nom complet de l'avatar P.
  - `nomf` : `nom@rnd` : nom complet du filleul F (donné par P).
  - `cc` : clé `cc` générée par P pour le couple P / F.
- `ardc` : cryptée par la clé `cc`, *ardoise*, texte de sollicitation écrit par A pour B et/ou réponse de B.
*/

const parrainPhCx = avro.Type.forSchema({ // map des avatars du compte
  type: 'map',
  values: avro.Type.forSchema({
    name: 'parrainPhCx',
    type: 'record',
    fields: [
      { name: 'ph', type: 'string' },
      { name: 'cx', type: 'bytes' }
    ]
  })
})

const parrainData = avro.Type.forSchema({ // map des avatars du compte
  type: 'map',
  values: avro.Type.forSchema({
    name: 'parrainData',
    type: 'record',
    fields: [
      { name: 'nomp', type: 'string' },
      { name: 'nomf', type: 'string' },
      { name: 'cc', type: 'bytes' }
    ]
  })
})

const idbParrain = avro.Type.forSchema({
  name: 'idbParrain',
  type: 'record',
  fields: [
    { name: 'pph', type: 'long' }, // pk
    { name: 'id', type: 'long' },
    { name: 'nc', type: 'int' },
    { name: 'dlv', type: 'int' },
    { name: 'st', type: 'int' },
    { name: 'v', type: 'int' },
    { name: 'q1', type: 'long' },
    { name: 'q2', type: 'long' },
    { name: 'qm1', type: 'long' },
    { name: 'qm2', type: 'long' },
    { name: 'phcx', type: ['null', parrainPhCx] },
    { name: 'data', type: ['null', parrainData] },
    { name: 'ard', type: ['null', 'string'] }
  ]
})

export class Parrain {
  get table () { return 'parrain' }

  get spph () { return crypt.id2s(this.pph) }

  fromRow (row) {
    this.pph = row.pph
    this.id = row.id
    this.nc = row.nc
    this.dlv = row.dlv
    this.st = row.st
    this.v = row.v
    this.q1 = row.q1
    this.q2 = row.q2
    this.qm1 = row.qm1
    this.qm2 = row.qm2
    const rowDatak = row.datak ? crypt.decrypter(data.clek, row.datak) : null
    this.phcx = rowDatak ? parrainPhCx.fromBuffer(rowDatak) : null
    const rowDatax = row.datax && this.phcx ? crypt.decrypter(this.phcx.cx, row.datax) : null
    this.data = rowDatax ? parrainData.fromBuffer(rowDatax) : null
    this.ard = row.ardc && this.data ? Buffer.from(crypt.decrypter(this.data.cc, row.ardc)).toString() : null
    return this
  }

  get toRow () {
    this.datak = this.phcx ? crypt.crypter(data.clek, parrainPhCx.toBuffer(this.phcx)) : null
    this.datax = this.phcx && this.data ? crypt.crypter(this.phcx.cx, parrainData.toBuffer(this.data)) : null
    this.ardc = this.data && this.ard ? crypt.crypter(this.data.cc, this.ard) : null
    const buf = rowTypes.rowSchemas.membre.toBuffer(this)
    delete this.datak
    delete this.ardg
    delete this.datax
    return buf
  }

  get toIdb () {
    return idbParrain.toBuffer(this)
  }

  fromIdb (idb) {
    const row = idbParrain.fromBuffer(idb)
    this.pph = row.pph
    this.id = row.id
    this.nc = row.nc
    this.dlv = row.dlv
    this.st = row.st
    this.v = row.v
    this.q1 = row.q1
    this.q2 = row.q2
    this.qm1 = row.qm1
    this.qm2 = row.qm2
    this.phcx = row.phcx
    this.data = row.data
    this.ard = row.ard
    return this
  }
}

// TODO: rencontre secrets
