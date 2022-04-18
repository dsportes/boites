/* eslint-disable func-call-spacing */
import Dexie from 'dexie'
import { Avatar, Compte, Prefs, Compta, Couple, Groupe, Membre, Secret, ListeCvIds, SessionSync, data, Cv } from './modele.mjs'
import { store, Sid, difference } from './util.mjs'
import { schemas } from './schemas.mjs'
import { crypt } from './crypto.mjs'
import { AppExc, E_DB, t0n } from './api.mjs'

const STORES = {
  sessionsync: 'id',
  listecvids: 'id',
  compte: 'id',
  compta: 'id',
  prefs: 'id',
  avatar: 'id',
  couple: 'id',
  groupe: 'id',
  membre: '[id+id2]', // im
  secret: '[id+id2]', // ns
  avsecret: '[id+id2]', // ns
  cv: 'id',
  fetat: 'id',
  fdata: 'id'
}

const TABLES = []
for (const x in STORES) TABLES.push(x)

function EX1 (e) {
  return new AppExc(E_DB, 'Ouverture de la base locale impossible', e.message + (e.stack ? '\n' + e.stack : ''))
}

function EX2 (e) {
  return new AppExc(E_DB, 'Erreur en lecture / écriture sur la base locale', e.message + '\n' + e.stack)
}

function go () {
  if (data.erDB) throw data.exIDB
}

export function idbSidCompte () {
  const k = store().state.ui.org + '-' + data.ps.dpbh
  return localStorage.getItem(k)
}

export function enregLScompte (sid) {
  const k = store().state.ui.org + '-' + data.ps.dpbh
  localStorage.setItem(k, sid)
}

export function nombase () {
  const idc = idbSidCompte()
  return idc ? store().state.ui.org + '-' + idc : null
}

export async function openIDB () {
  // eslint-disable-next-line no-unused-vars
  const d = data
  if (data.db) return
  try {
    data.nombase = nombase()
    const db = new Dexie(data.nombase, { autoOpen: true })
    db.version(2).stores(STORES)
    await db.open()
    data.ouvertureDB(db)
  } catch (e) {
    throw data.setErDB(EX1(e))
  }
}

export function closeIDB () {
  if (data.db && data.db.isOpen()) {
    try { data.db.close() } catch (e) {}
  }
  data.fermetureDB()
}

export async function deleteIDB (lsKey) {
  try {
    if (lsKey) {
      localStorage.removeItem(store().state.ui.org + '-' + data.ps.dpbh)
    }
    const nb = nombase()
    if (nb) await Dexie.delete(nb)
  } catch (e) {
    console.log(e.toString())
  }
}

export async function saveListeCvIds (v, setIds) {
  try {
    const row = new ListeCvIds().init(v, setIds).toIdb()
    await data.db.listecvids.put({ id: '1', data: await crypt.crypter(data.clek, row) })
  } catch (e) {
    throw data.setErDB(EX2(e))
  }
}

export async function getVIdCvs () {
  try {
    const idb = await data.db.listecvids.get('1')
    const x = new ListeCvIds()
    if (idb) x.fromIdb(await crypt.decrypter(data.clek, idb.data))
    return [x.v, new Set(x.ids)]
  } catch (e) {
    throw data.setErDB(EX2(e))
  }
}

export async function saveSessionSync (idb, s) {
  try {
    await data.db.sessionsync.put({ id: '1', data: await crypt.crypter(data.clek, idb) })
    store().commit('ui/setsessionsync', s)
  } catch (e) {
    throw data.setErDB(EX2(e))
  }
}

export async function debutSessionSync (ex) {
  try {
    const s = new SessionSync()
    const r = ex ? await data.db.sessionsync.get('1') : null
    const idb = r ? await crypt.decrypter(data.clek, r.data) : null
    s.fromIdb(idb)
    store().commit('ui/setsessionsync', s)
    return s
  } catch (e) {
    throw data.setErDB(EX2(e))
  }
}

export async function getCompte () {
  go()
  try {
    const idb = await data.db.compte.get('1')
    return idb ? new Compte().fromIdb(await crypt.decrypter(data.ps.pcb, idb.data)) : null
  } catch (e) {
    throw data.setErDB(EX2(e))
  }
}

export async function getPrefs () {
  go()
  try {
    const idb = await data.db.prefs.get('1')
    return idb ? new Prefs().fromIdb(await crypt.decrypter(data.clek, idb.data)) : null
  } catch (e) {
    throw data.setErDB(EX2(e))
  }
}

export async function getCompta () {
  go()
  try {
    const idb = await data.db.compta.get('1')
    return idb ? new Compta().fromIdb(await crypt.decrypter(data.clek, idb.data)) : null
  } catch (e) {
    throw data.setErDB(EX2(e))
  }
}

// Retourne une map : clé: id de l'avatar, valeur: son objet Avatar
export async function getAvatars () {
  go()
  try {
    const r = {}
    await data.db.avatar.each(async (idb) => {
      const x = new Avatar().fromIdb(await crypt.decrypter(data.clek, idb.data))
      r[x.id] = x
    })
    return r
  } catch (e) {
    throw data.setErDB(EX2(e))
  }
}

export async function getGroupes () {
  go()
  try {
    const r = {}
    await data.db.groupe.each(async (idb) => {
      const x = new Groupe().fromIdb(await crypt.decrypter(data.clek, idb.data))
      r[x.id] = x
    })
    return r
  } catch (e) {
    throw data.setErDB(EX2(e))
  }
}

export async function getCouples () {
  go()
  try {
    const r = {}
    await data.db.couple.each(async (idb) => {
      const x = new Couple().fromIdb(await crypt.decrypter(data.clek, idb.data))
      r[x.id] = x
    })
    return r
  } catch (e) {
    throw data.setErDB(EX2(e))
  }
}

export async function getMembres () {
  go()
  try {
    const r = {}
    const v = {}
    await data.db.membre.each(async (idb) => {
      const x = new Membre().fromIdb(await crypt.decrypter(data.clek, idb.data))
      let e = r[x.id]; if (!e) { e = {}; r[x.id] = e }
      e[x.im] = x
      const v1 = v[x.id]
      if (!v1 || v1 < x.v) v[x.id] = x.v
    })
    return [r, v]
  } catch (e) {
    throw data.setErDB(EX2(e))
  }
}

export async function getSecrets () {
  go()
  try {
    const r = {}
    const v = {}
    await data.db.secret.each(async (idb) => {
      const x = new Secret().fromIdb(await crypt.decrypter(data.clek, idb.data))
      let e = r[x.id]; if (!e) { e = {}; r[x.id] = e }
      e[x.ns] = x
      const v1 = v[x.id]
      if (!v1 || v1 < x.v) v[x.id] = x.v
    })
    return [r, v]
  } catch (e) {
    throw data.setErDB(EX2(e))
  }
}

export async function getCvs (cvIds, buf) {
  go()
  try {
    const r = {}
    await data.db.cv.each(async (row) => {
      const idb = await crypt.decrypter(data.clek, row.data)
      const cv = new Cv().fromIdb(idb)
      if (cvIds.has(cv.id)) {
        r[cv.id] = cv
      } else {
        buf.supprIDB({ table: 'cv', id: cv.id })
      }
    })
    return r
  } catch (e) {
    throw data.setErDB(EX2(e))
  }
}

/*
Mise à jour / suppression de listes d'objets et purges globales par avatar / couple / groupe
*/
export async function commitRows (opBuf) {
  go()
  try {
    const lidb = []
    if (opBuf.lmaj && opBuf.lmaj.length) {
      for (let i = 0; i < opBuf.lmaj.length; i++) {
        const obj = opBuf.lmaj[i]
        const x = { table: obj.table, row: {} }
        x.row.id = t0n.has(obj.table) ? '1' : crypt.u8ToB64(await crypt.crypter(data.clek, Sid(obj.id), 1), true)
        if (obj.id2) x.row.id2 = crypt.u8ToB64(await crypt.crypter(data.clek, Sid(obj.id2), 1), true)
        if (obj.table === 'compte') {
          x.row.data = await crypt.crypter(data.ps.pcb, obj.toIdb)
        } else {
          x.row.data = await crypt.crypter(data.clek, obj.toIdb)
        }
        lidb.push(x)
      }
    }

    const lidbs = []
    if (opBuf.lsuppr && opBuf.lsuppr.length) {
      for (let i = 0; i < opBuf.lsuppr.length; i++) {
        const obj = opBuf.lsuppr[i]
        const x = { ...obj }
        x.id = t0n.has(obj.table) ? '1' : crypt.u8ToB64(await crypt.crypter(data.clek, Sid(obj.id), 1), true)
        if (obj.id2) x.id2 = crypt.u8ToB64(await crypt.crypter(data.clek, Sid(obj.id2), 1), true)
        lidbs.push(x)
        if (obj.table === 'compte') {
          lidbs.push({ table: 'prefs', id: '1' })
          lidbs.push({ table: 'compta', id: '1' })
        }
      }
    }

    const idcc = []
    if (opBuf.lcc && opBuf.lcc.size) {
      for (const i of opBuf.lcc) idcc.push(crypt.u8ToB64(await crypt.crypter(data.clek, crypt.idToSid(i), 1), true))
    }

    const idac = []
    if (opBuf.lav && opBuf.lav.size) {
      for (const i of opBuf.lav) idac.push(crypt.u8ToB64(await crypt.crypter(data.clek, crypt.idToSid(i), 1), true))
    }

    const idgc = []
    if (opBuf.lgr && opBuf.lgr.size) {
      for (const i of opBuf.lgr) idgc.push(crypt.u8ToB64(await crypt.crypter(data.clek, crypt.idToSid(i), 1), true))
    }

    await data.db.transaction('rw', TABLES, async () => {
      for (let i = 0; i < lidb.length; i++) {
        const x = lidb[i]
        await data.db[x.table].put(x.row)
      }

      for (let i = 0; i < lidbs.length; i++) {
        const x = lidbs[i]
        if (x.id2) {
          await data.db[x.table].where({ id: x.id, id2: x.id2 }).delete()
        } else {
          await data.db[x.table].where({ id: x.id }).delete()
        }
      }

      for (let i = 0; i < idcc.length; i++) {
        const id = { id: idcc[i] }
        await data.db.couple.where(id).delete()
        await data.db.secret.where(id).delete()
      }

      for (let i = 0; i < idac.length; i++) {
        const id = { id: idac[i] }
        await data.db.avatar.where(id).delete()
        await data.db.secret.where(id).delete()
      }

      for (let i = 0; i < idgc.length; i++) {
        const id = { id: idgc[i] }
        await data.db.groupe.where(id).delete()
        await data.db.membre.where(id).delete()
        await data.db.secret.where(id).delete()
      }
    })
  } catch (e) {
    throw data.setErDB(EX2(e))
  }
}

/* Gestion des fichiers hors-ligne ************************************/

async function getFetats (map) {
  go()
  try {
    await data.db.fetat.each(async (idb) => {
      const x = new Fetat().fromIdb(await crypt.decrypter(data.clek, idb.data))
      map[x.id] = x
    })
  } catch (e) {
    throw data.setErDB(EX2(e))
  }
}

async function getFichier (idf) {
  try {
    const id = crypt.u8ToB64(await crypt.crypter(data.clek, Sid(idf), 1), true)
    const idb = await data.db.fdata.where({ id: id }).first()
    return !idb ? null : await crypt.decrypter(data.clek, idb.data)
  } catch (e) {
    throw data.setErDB(EX2(e))
  }
}

async function getAvSecrets (map) {
  go()
  try {
    await data.db.avsecret.each(async (idb) => {
      const x = new AvSecret().fromIdb(await crypt.decrypter(data.clek, idb.data))
      map[x.id] = x
    })
  } catch (e) {
    throw data.setErDB(EX2(e))
  }
}

/* Fin de synchronisation : liste des secrets notifiés */
export async function gestionFichierSync (lst) {

}

/* Fin de connexion en mode synchronisé : secrets, map par pk de tous les secrets existants */
export async function gestionFichierCnx (secrets) {
  const fetats = {}
  await getFetats(fetats)
  const avsecrets = {}
  await getAvSecrets(avsecrets)
  const faToDel = new Set()
  const nvFa = []
  const nvAVS = []
  const supprAVS = []
  /* Parcours des AvSecret existants : ils peuvent,
  - soit être détruits : le secret correspondant n'existe plusn ou n'a plus de fichiers
  - soit être inchangés : le secret correspondant a la même version ou est complètement compatible
  - soit être "mis à jour"" : des fichiers sont à supprimer, d'autres (cités dans mnom) ont une nouvelle version
  voire le cas échéant réduits au point de disparaître.
  */
  for (const pk in avsecrets) {
    const avs = avsecrets[pk]
    const s = secrets[pk]
    if (s && s.v === avs.v) continue // inchangé
    if (!s) { supprAVS.push(avs); continue }
    const nv = avs.diff(s) // nouvel AVS compte tenu du nouveau s
    if (nv === false) { supprAVS.push(avs); continue } // désormais vide
    nvAVS.push(nv) // changé, au moins la version : il y a peut-être, des idfs en plus et en moins
    if (nv.faToDel) for (const idf of nv.faToDel) faToDel.add(idf)
    if (nv.nvFa) for (const idf of nv.nvFa) nvFa.push(nv.nvFa[idf])
  }
  //
  if (faToDel.size || nvFa.length || nvAVS.length) commitFic(nvAVS, nvFa, faToDel)
  // TODO
  // dans commitFic : liste des AVS à supprimer
  // liste des chargements à effectuer et lancement du démon
}

/* Session UI : MAJ des fichiers off-line pour un secret */
export async function GestionFichierMaj (secret, arg) {

}

class Fetat {
  get table () { return 'fetat' }

  get estCharge () { return this.dhc !== 0 }

  nouveau (id, dhd, lg, nom, info) {
    this.id = id; this.dhd = dhd; this.dhc = 0; this.lg = lg; this.nom = nom; this.info = info
  }

  async toIdb () {
    schemas.serialize('idbFetat', this)
  }

  async fromIdb (idb) {
    schemas.deserialize('idbFetat', idb, this)
    return this
  }

  async finChargement (buf) {
    this.dhc = new Date().getTime()
    await setFa(this, buf)
  }

  async getFichier () { // fichier décrypté mais pas dézippé (s'il l'est)
    return await getFichier(this.id)
  }
}

class AvSecret {
  get table () { return 'avsecret' }

  get id2 () { return this.ns }

  nouveau (secret) {
    this.id = secret.id; this.ns = secret.ns; this.v = secret.v; this.lidf = []; this.mnom = []
  }

  get estVide () { return !this.lidf.length && !Object.keys(this.mnom).length }

  async toIdb () {
    schemas.serialize('idbAvSecret', this)
  }

  async fromIdb (idb) {
    schemas.deserialize('idbAvSecret', idb, this)
    return this
  }

  /* s est la mise à jour du secret. diff retourne :
  - false : si avsecret est à supprimer
  - nv : le nouvel avsecret de même id/ns qui remplace l'ancien. Dans ce cas obj a 2 propriétés :
    - nv.faToDel : le set des idf des Fetat / Fdata qui disparaissent (ou null)
    - nv.nvFa : la liste des nouveaux Fetat (ou null)
  */
  diff (s) {
    const idfs = new Set(this.lidf) // set des idf actuels
    for (const nom in this.mnom) idfs.add(this.mnom[nom])
    // clone
    const nv = new AvSecret().nouveau(s)
    const nvidf = new Set()
    for (const idf of this.lidf) {
      const f = s.mfa[idf]
      if (!f) {
        nv.faToDel.push(idf)
      } else {
        nv.lidf.push(idf)
        nvidf.add(idf)
      }
    }
    let n1 = 0, n2 = 0
    for (const nom in this.mnom) {
      n1++
      const idf = this.mnom[nom]
      const f = s.dfDeNom(nom)
      if (f) { nv.mnom[nom] = idf; n2++ }
    }
    if (!n2 && !nv.lidf.length) return false
    const idfs2 = new Set(nv.lidf)
    for (const nom in this.mnom) idfs2.add(nv.mnom[nom])
    // difference (setA, setB) { // element de A pas dans B
    const x1 = difference(idfs, idfs2) // idf disparus
    const x2 = difference(idfs2, idfs) // nouveaux, version de nom plus récente
    if (!x1.size && !x2.size && n1 === n2) return true // inchangé
    nv.faToDel = x1.size ? Array.from(x1) : null
    nv.nvFa = x2.size ? [] : null
    if (x2.size) {
      for (const idf of x2) {
        const f = s.mfa[idf]
        nv.nvFa.push(new Fetat().nouveau(idf, new Date().getTime(), f.lg, f.nom, f.info))
      }
    }
    return nv
  }
}

/* Fin de chargement d'un fichier : maj conjointe de fetat (pour dhc) et insertion de fdata */
async function setFa (fetat, buf) { // buf : contenu du fichier non crypté
  try {
    const row1 = {}
    row1.id = crypt.u8ToB64(await crypt.crypter(data.clek, Sid(fetat.id), 1), true)
    row1.data = await crypt.crypter(data.clek, fetat.toIdb)
    const row2 = { id: row1.id }
    row2.data = await crypt.crypter(data.clek, buf)
    await data.db.transaction('rw', TABLES, async () => {
      await data.db.fetat.put(row1)
      await data.db.fdata.put(row2)
    })
  } catch (e) {
    throw data.setErDB(EX2(e))
  }
}

/* Commit des MAJ de fetat et avsecret */
async function commitFic (lstAvSecrets, lstFetats, idfsToDel) { // lst : array / set d'idfs
  go()
  try {
    const x = []
    for (const obj of lstFetats) {
      const row = {}
      row.id = crypt.u8ToB64(await crypt.crypter(data.clek, Sid(obj.id), 1), true)
      row.data = await crypt.crypter(data.clek, obj.toIdb)
      x.push(row)
    }

    const y = []
    for (const id of idfsToDel) y.push(crypt.u8ToB64(await crypt.crypter(data.clek, Sid(id), 1), true))

    const z = []
    for (const obj of lstAvSecrets) {
      const row = {}
      row.id = crypt.u8ToB64(await crypt.crypter(data.clek, Sid(obj.id), 1), true)
      row.id2 = crypt.u8ToB64(await crypt.crypter(data.clek, Sid(obj.id2), 1), true)
      row.data = await crypt.crypter(data.clek, obj.toIdb)
      z.push(row)
    }

    await data.db.transaction('rw', TABLES, async () => {
      for (const row of x) {
        await data.db.fetat.put(row)
      }
      for (const id of y) {
        await data.db.fetat.where({ id: id }).delete()
        await data.db.fdata.where({ id: id }).delete()
      }
    })
  } catch (e) {
    throw data.setErDB(EX2(e))
  }
}
