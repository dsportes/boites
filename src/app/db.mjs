/* eslint-disable func-call-spacing */
import Dexie from 'dexie'
import { Avatar, Compte, Prefs, Compta, Couple, Groupe, Membre, Secret, ListeCvIds, SessionSync, data, Cv } from './modele.mjs'
import { store, Sid, difference, dhstring, get, getData, afficherdiagnostic } from './util.mjs'
import { schemas } from './schemas.mjs'
import { crypt } from './crypto.mjs'
import { AppExc, E_DB, E_BRO, t0n } from './api.mjs'

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

export async function getComptas () {
  go()
  try {
    const r = {}
    await data.db.compta.each(async (idb) => {
      const x = new Compta().fromIdb(await crypt.decrypter(data.clek, idb.data))
      r[x.id] = x
    })
    return r
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
    const sidms = new Set()
    await data.db.secret.each(async (idb) => {
      const x = new Secret().fromIdb(await crypt.decrypter(data.clek, idb.data))
      let e = r[x.id]; if (!e) { e = {}; r[x.id] = e }
      e[x.ns] = x
      const v1 = v[x.id]
      sidms.add(x.id)
      if (!v1 || v1 < x.v) v[x.id] = x.v
    })
    return [r, v, sidms]
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
        const x = { }
        x.id = t0n.has(obj.table) ? '1' : crypt.u8ToB64(await crypt.crypter(data.clek, Sid(obj.id), 1), true)
        if (obj.id2) x.id2 = crypt.u8ToB64(await crypt.crypter(data.clek, Sid(obj.id2), 1), true)
        x.table = obj.table
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

    const idcc2 = []
    if (opBuf.lcc2 && opBuf.lcc2.size) {
      for (const i of opBuf.lcc2) idcc.push(crypt.u8ToB64(await crypt.crypter(data.clek, crypt.idToSid(i), 1), true))
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

      for (let i = 0; i < idcc2.length; i++) {
        const id = { id: idcc2[i] }
        await data.db.secret.where(id).delete()
      }

      for (let i = 0; i < idac.length; i++) {
        const id = { id: idac[i] }
        await data.db.avatar.where(id).delete()
        await data.db.compta.where(id).delete()
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
  try {
    await data.db.fetat.each(async (idb) => {
      const x = new Fetat().fromIdb(await crypt.decrypter(data.clek, idb.data))
      map[x.id] = x
    })
  } catch (e) {
    throw data.setErDB(EX2(e))
  }
}

export async function getFichier (idf) {
  try {
    const id = crypt.u8ToB64(await crypt.crypter(data.clek, Sid(idf), 1), true)
    const idb = await data.db.fdata.where({ id: id }).first()
    return !idb ? null : idb.data
  } catch (e) {
    throw data.setErDB(EX2(e))
  }
}

async function getAvSecrets (map) {
  go()
  try {
    await data.db.avsecret.each(async (idb) => {
      const x = new AvSecret().fromIdb(await crypt.decrypter(data.clek, idb.data))
      map[x.pk] = x
    })
  } catch (e) {
    throw data.setErDB(EX2(e))
  }
}

/* Fin de synchronisation : liste des secrets notifiés */
export async function gestionFichierSync (lst) {
  const nvFa = []
  const nvAvs = []
  for (const pk in lst) {
    const s = lst[pk]
    const avs = data.getAvSecret(s.id, s.ns)
    if (!avs || avs.v >= s.v) continue // pas d'avsecret associé ou déjà à jour (??)
    const [nv, nvf] = avs.diff(s) // nouvel AvSecret compte tenu du nouveau s
    nvAvs.push(nv) // changé, au moins la version : il y a peut-être, des idfs en plus et en moins
    if (nvf) for (const x of nvf) nvFa.push(x)
  }
  // Mise en db/store des fetat créés / supprimés
  data.setFetats(nvFa)

  // Mise en db/store des AvSecret créés / modifiés / supprimés
  data.setAvSecrets(nvAvs)

  // Mise à jour de IDB (fetat / fdata et avsecret)
  if (nvFa.length || nvAvs.length) await commitFic(nvAvs, nvFa)
  if (nvFa.length) store().commit('ui/ajoutchargements', nvFa)
  startDemon()
}

/* Fin de connexion en mode synchronisé : secrets, map par pk de tous les secrets existants */
export async function gestionFichierCnx (secrets) {
  const fetats = {}
  await getFetats(fetats)
  const avsecrets = {}
  await getAvSecrets(avsecrets)

  const nvFa = [] // les fetat créés ou supprimés
  const lavs = [] //  Tous les AvSecret (existant et conservé, ou créé, ou modifié)
  const nvAvs = [] // Les AvSecrets créés / modifiés / supprimés
  /* Parcours des AvSecret existants : ils peuvent,
  - soit être détruits : le secret correspondant n'existe plus ou n'a plus de fichiers
  - soit être inchangés : le secret correspondant a la même version
  - soit être "mis à jour"" : des fichiers sont à supprimer, d'autres (cités dans mnom) ont une nouvelle version
  voire le cas échéant réduits au point de disparaître.
  */
  for (const pk in avsecrets) {
    const avs = avsecrets[pk]
    const s = secrets[pk]
    if (s && s.v === avs.v) { lavs.push(avs); continue } // inchangé
    const [nv, nvf] = avs.diff(s) // nouvel AVS compte tenu du nouveau s ou de son absence (peut-être à supprimer)
    if (!nv.suppr) lavs.push(nv) // ceux utiles seulement, pas les supprimés
    nvAvs.push(nv) // changé, au moins la version : il y a peut-être, des idfs en plus et en moins
    if (nvf) for (const x of nvf) nvFa.push(x)
  }

  // Liste des fetat utiles et mise en db/store ou delete
  for (const fetat of nvFa) {
    // fetat.dhc = new Date().getTime()
    if (fetat.suppr) delete fetats[fetat.idf]; else fetats[fetat.idf] = fetat
  }
  data.setFetats(Object.values(fetats))

  // Mise en db/store des AvSecret
  data.setAvSecrets(lavs)

  // Mise à jour de IDB (fetat / fdata et avsecret)
  if (nvFa.length || nvAvs.length) await commitFic(nvAvs, nvFa)

  // liste des chargements à effectuer et lancement du démon
  const chec = []
  for (const idf in fetats) {
    const e = fetats[idf]
    if (e.enAttente) chec.push([e.dhd, e.idf])
  }
  chec.sort((a, b) => { return a[0] < b[0] ? -1 : (a[0] > b[0] ? 1 : 0) })
  const lidf = []; chec.forEach(x => { lidf.push(x[1]) })
  store().commit('ui/initchargements', lidf)
  store().commit('ui/majdlencours', 0)
  startDemon()
}

/* Session UI : MAJ des fichiers off-line pour un secret */
export async function gestionFichierMaj (secret, plus, idf, nom) {
  const avs = data.getAvSecret(secret.id, secret.ns) || new AvSecret().nouveau(secret)
  const [nvAvs, nvFa] = avs.maj(secret, plus, idf, nom)

  // Mise en db/store des fetat créés / supprimés
  if (nvFa.length) data.setFetats(nvFa)

  // Mise en db/store des AvSecret créés / modifiés / supprimés
  if (nvAvs) data.setAvSecrets([nvAvs])

  // Mise à jour de IDB (fetat / fdata et avsecret)
  if (nvFa.length || nvAvs) await commitFic(nvAvs ? [nvAvs] : [], nvFa)
  if (nvFa.length) store().commit('ui/ajoutchargements', nvFa)
  startDemon()
}

class Fetat {
  get table () { return 'fetat' }
  get sid () { return crypt.idToSid(this.id) }
  get estCharge () { return this.dhc !== 0 }
  get enAttente () { return this.dhc === 0 && !this.dhx }
  get enEchec () { return this.dhc === 0 && this.dhx }

  nouveauSuppr (idf) { this.id = idf; this.suppr = true; return this }

  nouveau (s, f) {
    this.id = f.idf
    this.dhd = new Date().getTime()
    this.dhc = 0
    this.dhx = 0
    this.lg = f.lg
    this.nom = f.nom
    this.info = f.info
    this.ids = s.id
    this.ns = s.ns
    this.err = ''
    return this
  }

  get toIdb () {
    return schemas.serialize('idbFetat', this)
  }

  fromIdb (idb) {
    schemas.deserialize('idbFetat', idb, this)
    return this
  }

  async finChargement (buf) {
    const e = new Fetat().fromIdb(this.toIdb)
    e.dhc = new Date().getTime()
    data.setFetats([e])
    await setFa(e, buf)
    store().commit('ui/okchargement')
    console.log(`OK chargement : ${Sid(e.idf)} ${e.nom}#${e.info}`)
  }

  echecChargement (err) {
    const e = new Fetat().fromIdb(this.toIdb)
    e.dhx = new Date().getTime()
    e.err = err ? err.message : '?'
    data.setFetats([e])
    store().commit('ui/kochargement')
    const msg = `Echec de chargement : ${Sid(e.idf)} ${e.nom}#${e.info} ${dhstring(e.dhx)} ${e.err}` +
      '<br>Cliquer sur l\'icône rouge de téléchargement dans la barre du haut'
    afficherdiagnostic(msg)
  }

  async retry () {
    store().commit('ui/razechec', this.id)
    const e = new Fetat().fromIdb(this.toIdb)
    e.dhx = 0
    e.err = ''
    const nvFa = [e]
    data.setFetats(nvFa)
    await commitFic([], nvFa)
    store().commit('ui/ajoutchargements', nvFa)
    startDemon()
  }

  async abandon () {
    store().commit('ui/razechec', this.id)
    const s = data.getSecret(this.ids, this.ns)
    if (!s) return
    const nom = s.nomDeIdf(this.id)
    await gestionFichierMaj(s, false, this.id, nom)
  }
}

class AvSecret {
  constructor () { this.lidf = []; this.mnom = {}; this.v = 0 }
  get table () { return 'avsecret' }
  get sid () { return crypt.idToSid(this.id) }
  get id2 () { return this.ns }
  get pk () { return this.sid + '/' + this.ns }
  nouveau (secret) { this.id = secret.id; this.ns = secret.ns; this.v = 0; return this }

  get estVide () { return !this.lidf.length && !Object.keys(this.mnom).length }

  get toIdb () {
    return schemas.serialize('idbAvSecret', this)
  }

  fromIdb (idb) {
    schemas.deserialize('idbAvSecret', idb, this)
    return this
  }

  setNvFa (s, idfs, idfs2) { // calcul des fetat en plus et en moins
    // difference (setA, setB) { // element de A pas dans B
    const x1 = difference(idfs, idfs2) // idf disparus
    const x2 = difference(idfs2, idfs) // nouveaux, version de nom plus récente
    const nvFa = []
    if (x1.size) {
      for (const idf of x1) {
        const e = new Fetat().nouveauSuppr(idf)
        nvFa.push(e)
      }
    }
    if (x2.size && s) {
      for (const idf of x2) {
        const f = s.mfa[idf]
        nvFa.push(new Fetat().nouveau(s, f))
      }
    }
    return nvFa
  }

  /* s est la mise à jour du secret. diff retourne :
  - nv.suppr : si avsecret est à supprimer
  - nv : le nouvel avsecret de même id/ns qui remplace l'ancien. Dans ce cas obj a 2 propriétés :
    - nv.nvFa : la liste des nouveaux Fetat (ou null)
    SI PAS de s : idfs à enlever (les fetat / fdata associés)
  */
  diff (s) {
    const idfs = new Set(this.lidf) // set des idf actuels
    const idfs2 = new Set() // nouvelle liste des idf
    let n = 0
    const nv = new AvSecret().nouveau(this) // clone minimal de this

    if (s) {
      nv.v = s.v
      for (const idf of this.lidf) {
        if (s.mfa[idf]) { nv.lidf.push(idf); idfs2.add(idf) }
      }
      for (const nx in this.mnom) {
        idfs.add(this.mnom[nx])
        const idf = this.mnom[nx]
        const f = s.dfDeNom(nx)
        if (f) { nv.mnom[nx] = idf; idfs2.add(idf); n++ }
      }
    }
    if (!n && !nv.lidf.length) nv.suppr = true // AvSecret à détruire (plus aucun idf n'existe dans s, s'il y a un s)

    const nvFa = this.setNvFa(s, idfs, idfs2)
    return [nv, nvFa]
  }

  lstIdf () {
    const idfs = new Set(this.lidf)
    for (const nx in this.mnom) idfs.add(this.mnom[nx])
    return idfs
  }

  maj (s, plus, idf, nom) {
    /* plus : true: ajout de idf ou d'un nom, false: enlève un idf ou un nom */
    const idfs = new Set(this.lidf) // set des idf actuels
    const idfs2 = new Set() // nouvelle liste des idf
    let n = 0
    const nv = new AvSecret().nouveau(this) // clone minimal de this
    nv.v = s.v

    for (const i of this.lidf) { // reconduction de la liste précédente
      if (i === idf && !plus) continue // sauf si idf doit être enlevé
      if (s.mfa[i]) { nv.lidf.push(i); idfs2.add(i) }
    }
    if (plus && idf && !idfs2.has(idf) && s.mfa[idf]) { nv.lidf.push(idf); idfs2.add(idf) }

    for (const nx in this.mnom) {
      idfs.add(this.mnom[nx]) // complète la liste des idf (avant)
      if (nx === nom && !plus) continue // on ne reconduit pas le nom s'il est enlevé
      const f = s.dfDeNom(nx)
      if (f) { idfs2.add(f.idf); nv.mnom[nx] = f.idf; n++ }
    }
    if (plus && nom && !nv.mnom[nom]) {
      const f = s.dfDeNom(nom)
      if (f) { idfs2.add(f.idf); nv.mnom[nom] = f.idf; n++ }
    }
    if (!n && !nv.lidf.length) nv.suppr = true // AvSecret à détruire (plus aucun idf n'existe dans s, s'il y a un s)

    const nvFa = this.setNvFa(s, idfs, idfs2)
    return [nv, nvFa]
  }
}

/* Fin de chargement d'un fichier : maj conjointe de fetat (pour dhc) et insertion de fdata */
async function setFa (fetat, buf) { // buf : contenu du fichier non crypté
  try {
    const row1 = {}
    row1.id = crypt.u8ToB64(await crypt.crypter(data.clek, Sid(fetat.id), 1), true)
    row1.data = await crypt.crypter(data.clek, fetat.toIdb)
    const row2 = { id: row1.id, data: buf }
    await data.db.transaction('rw', TABLES, async () => {
      await data.db.fetat.put(row1)
      await data.db.fdata.put(row2)
    })
    console.log('IDB fetat to PUT', fetat.id, fetat.dhc)
    console.log('IDB fdata to PUT', fetat.id)
  } catch (e) {
    throw data.setErDB(EX2(e))
  }
}

/* Commit des MAJ de fetat et avsecret */
async function commitFic (lstAvSecrets, lstFetats) { // lst : array / set d'idfs
  try {
    const x = []
    const y = []
    for (const obj of lstAvSecrets) {
      const row = {}
      row.id = crypt.u8ToB64(await crypt.crypter(data.clek, Sid(obj.id), 1), true)
      row.id2 = crypt.u8ToB64(await crypt.crypter(data.clek, Sid(obj.id2), 1), true)
      row.data = obj.suppr ? null : await crypt.crypter(data.clek, obj.toIdb)
      x.push(row)
      console.log('IDB avsecret to ', obj.suppr ? 'DEL' : 'PUT', obj.pk)
    }

    for (const obj of lstFetats) {
      const row = {}
      row.id = crypt.u8ToB64(await crypt.crypter(data.clek, Sid(obj.id), 1), true)
      row.data = obj.suppr ? null : await crypt.crypter(data.clek, obj.toIdb)
      y.push(row)
      console.log('IDB fetat to ', obj.suppr ? 'DEL' : 'PUT', obj.id, obj.dhc)
      if (obj.suppr) console.log('IDB fdata to DEL', obj.id)
    }

    await data.db.transaction('rw', TABLES, async () => {
      for (const row of x) {
        if (row.data) {
          await data.db.avsecret.put(row)
        } else {
          await data.db.avsecret.where({ id: row.id, id2: row.id2 }).delete()
        }
      }
      for (const row of y) {
        if (row.data) {
          await data.db.fetat.put(row)
        } else {
          await data.db.fetat.where({ id: row.id }).delete()
          await data.db.fdata.where({ id: row.id }).delete()
        }
      }
    })
  } catch (e) {
    throw data.setErDB(EX2(e))
  }
}

const dec = new TextDecoder()

function startDemon () {
  if (!store().state.ui.dlencours) {
    let id = store().state.ui.chargements[0] || 0
    store().commit('ui/majdlencours', id)
    setTimeout(async () => {
      while (id) {
        const e = data.getFetat(id)
        try {
          const a = store().state.db.avatar
          const ida = a ? a.id : data.getCompte().unAvatarId()
          const args = { sessionId: data.sessionId, id: e.ids, ts: e.ns % 3, idf: e.id, ida, vt: e.lg }
          const r = await get('m1', 'getUrl', args)
          if (!r) throw new AppExc(E_BRO, `Fichier ${Sid(e.id)} non accessible sur le serveur`)
          const url = dec.decode(r)
          const buf = await getData(url)
          await e.finChargement(buf)
        } catch (ex) {
          e.echecChargement(ex)
        }
        id = store().state.ui.chargements[0] || 0
        store().commit('ui/majdlencours', id)
      }
    }, 10)
  }
}
