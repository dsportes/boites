import Dexie from 'dexie'
import { store, post } from './util'
import * as CONST from '../store/constantes'
const crypt = require('./crypto')
const types = require('./api').types
const base64url = require('base64url')

const STORES = {
  compte: 'cleidb'
}

let db = null

export async function open (nom) {
  db = new Dexie(nom, { autoOpen: true })
  db.version(1).stores(STORES)
  await db.open()
  return db
}

export function close () {
  if (db.isOpen()) {
    db.close()
    db = null
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

export function idc () {
  const i = crypt.u8ToInt(crypt.random(5))
  return (Math.floor(i / 4) * 4)
}
export function ida () {
  const i = crypt.u8ToInt(crypt.random(5))
  return (Math.floor(i / 4) * 4) + 1
}
export function idg () {
  const i = crypt.u8ToInt(crypt.random(5))
  return (Math.floor(i / 4) * 4) + 2
}
export function ids () {
  const i = crypt.u8ToInt(crypt.random(6))
  return (Math.floor(i / 4) * 4) + 3
}
/*
console.log(base64url(crypt.intToU8(idc())))
console.log(base64url(crypt.intToU8(ida())))
console.log('idc\n')
for (let i = 0; i < 10; i++) console.log(idc().toString(16))
console.log('ida\n')
for (let i = 0; i < 10; i++) console.log(ida().toString(16))
console.log('idg\n')
for (let i = 0; i < 10; i++) console.log(idg().toString(16))
console.log('ids\n')
for (let i = 0; i < 10; i++) console.log(ids().toString(16))
*/

/* caches des codes existants des avatars en contacts pour déterminer les disparus ???
{ ida, codes }
*/
export const cachescontacts = { }

/* caches des codes existants des avatars membres des groupes pour déterminer les disparus ???
{ idg, codes }
*/
export const cachesmembres = { }

export class Compte {
  /*
    { name: 'id', type: 'int' },
    { name: 'v', type: 'int' },
    { name: 'dpbh', type: 'int' },
    { name: 'pcbsh', type: 'int' },
    { name: 'k', type: 'bytes' },
    { name: 'mmc', type: 'bytes' },
    { name: 'mavc', type: 'bytes' }
  */

  fromSqlCompte (arg) { // arg : JSON sérialisé
    const sql = types.sqlCompte.fromBuffer(arg)
    this.id = sql.id
    this.cleidb = crypt.id2s(this.id)
    this.v = sql.v
    this.dpbh = sql.dpbh
    this.pcbsh = sql.pcbsh
    this.k = crypt.decrypter(session.clex, sql.k)
    session.clek = this.k
    this.mmc = types.mmc.fromBuffer(crypt.decrypter(session.clek, sql.mmc))
    this.mavc = types.mavc.fromBuffer(crypt.decrypter(session.clek, sql.mavc))
    return this
  }

  toSqlCompte () {
    const x = {
      id: this.id,
      v: this.v,
      dpbh: this.dpbh,
      pcbsh: this.pcbsh,
      k: crypt.crypter(session.clex, this.k),
      mmc: crypt.crypter(session.clek, types.mmc.toBuffer(this.mmc)),
      mavc: crypt.crypter(session.clek, types.mavc.toBuffer(this.mavc))
    }
    return types.sqlCompte.toBuffer(x)
  }

  async toIdbCompte () {
    const buf = types.idbCompte.toBuffer(this)
    const data = crypt.crypter(session.clek, buf)
    await db.transaction('rw', db.compte, async () => {
      await db.compte.put({ cleidb: this.cleidb, data: data })
      console.log('put cleidb: ' + this.cleidb + ' ' + data.length)
    })
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
