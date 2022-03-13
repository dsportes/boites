import { schemas } from './schemas.mjs'
import { crypt } from './crypto.mjs'
import { openIDB, closeIDB, putPj, getFadata } from './db.mjs'
import { openWS, closeWS } from './ws.mjs'
import {
  store, appexc, serial, deserial, dlvDepassee, NomAvatar, gzip, ungzip, dhstring,
  getJourJ, cfg, ungzipT, normpath, getpj, titreEd, post
} from './util.mjs'
import { remplacePage } from './page.mjs'
import { SIZEAV, SIZEGR, SIZECP, EXPS, UNITEV1, UNITEV2, Compteurs } from './api.mjs'

export async function traitInvitGr (row) {
  const cpriv = data.avc(row.id).cpriv
  const x = deserial(await crypt.decrypterRSA(cpriv, row.datap))
  return { id: row.id, ni: row.ni, datak: crypt.crypter(data.clek, x) }
}

/** Invitgr **********************************/
/*
- `id` : id du membre invité.
- `ni` : numéro d'invitation.
- `datap` : crypté par la clé publique du membre invité.
  - `nom rnd im` : nom complet du groupe (donne sa clé).
Jamais stocké en IDB : dès réception, le row avatar correspondant est "régularisé"
*/

export class Invitgr {
  get table () { return 'invitgr' }
  async fromRow (row) {
    this.id = row.id
    this.ni = row.ni
    const cpriv = data.avc(row.id).cpriv
    const x = deserial(await crypt.decrypterRSA(cpriv, row.datap))
    this.idg = new NomAvatar(x[0], x[1]).id
    this.datak = await crypt.crypter(data.clek, serial(x))
    return this
  }

  async toRow (clepub) {
    const datap = await crypt.crypterRSA(clepub, serial(this.data))
    const r = { id: this.id, ni: this.ni, datap }
    return schemas.serialize('rowinvitgr', r)
  }
}
/*
  Retourne une map avec une entrée pour chaque table et en valeur,
  - pour compte : LE DERNIER objet reçu, pas la liste historique
  - pour les autres, l'array des objets
*/
export function estSingleton (t) { return ['compte', 'compta', 'prefs'].indexOf(t) !== -1 }

export async function rowItemsToMapObjets (rowItems) {
  const res = {}
  for (let i = 0; i < rowItems.length; i++) {
    const item = rowItems[i]
    const row = schemas.deserialize('row' + item.table, item.serial)
    if (item.table === 'compte' && row.pcbh !== data.ps.pcbh) throw EXPS // phrase secrète changée => déconnexion
    const obj = newObjet(item.table)
    await obj.fromRow(row)
    if (estSingleton(item.table)) {
      // le dernier quand on en a reçu plusieurs et non la liste
      res[item.table] = obj
    } else {
      if (!res[item.table]) res[item.table] = []
      res[item.table].push(obj)
    }
  }
  return res
}

/* Création des objets selon leur table *******/
function newObjet (table) {
  switch (table) {
    case 'compte' : return new Compte()
    case 'compta' : return new Compta()
    case 'prefs' : return new Prefs()
    case 'avatar' : return new Avatar()
    case 'couple' : return new Couple()
    case 'invitgr' : return new Invitgr()
    case 'contactstd' : return new Contactstd()
    case 'contactphc' : return new Contactphc()
    case 'groupe' : return new Groupe()
    case 'membre' : return new Membre()
    case 'secret' : return new Secret()
    case 'cv' : return new Cv()
  }
}

/* Traitement des groupes supprimés
Il faut les effacer des map lgrk des avatars qui les référencent
*/
async function traitGrSuppr (lst) {
  const mapav = {} // Une entrée par id d'avatar, array des im
  let ok = false
  for (let i = 0; i < lst.length; i++) {
    const idg = lst[i].id
    data.getCompte().allAvId().forEach(avid => {
      const x = data.getAvatar(avid).m2gr[idg]
      if (x) {
        let t = mapav[avid]; if (!t) { t = []; mapav[avid] = t }
        t.push(x[1])
        ok = true
      }
    })
  }
  if (ok) {
    const ret = await post(this, 'm1', 'regulAv', { sessionId: data.sessionId, mapav })
    if (data.dh < ret.dh) data.dh = ret.dh
  }
}

/* mapObj : clé par table, valeur : array des objets **************************************/
/*
- ne traite ni les singletons ('compte compta prefs'), ni 'invitgr'
- inscrit en store OU les supprime du store s'il y était
- objets : array remplie par tous les objets à mettre en IDB
Retourne vcv : version de la plus CV trouvée
*/
export async function commitMapObjets (objets, mapObj) { // SAUF mapObj.compte et mapObj.prefs
  let vcv = 0

  function push (n) { mapObj[n].forEach((x) => { objets.push(x) }) }

  if (mapObj.avatar) {
    data.setAvatars(mapObj.avatar)
    push('avatar')
  }

  if (mapObj.groupe) {
    const grSuppr = [] // liste des groupes supprimés
    data.setGroupes(mapObj.groupe, grSuppr)
    if (grSuppr.length) traitGrSuppr(grSuppr)
    push('groupe')
  }

  if (mapObj.contact) {
    /* Pour chaque contact, gestion de sa CV dans le répertoire :
    - soit création (fake)
    - soit suppression
    - soit mise à jour de la liste des contacts dans la CV
    Régularisation éventuelle (s'il y avait un datap)
    */
    for (let i = 0; i < mapObj.contact.length; i++) {
      const x = mapObj.contact[i]
      if (x.suppr) {
        const avant = data.getContact(x.id, x.ic)
        if (avant && !avant.suppr) {
          data.repertoire.getCv(avant.na.sid).moinsCtc(x.id)
        }
      } else {
        data.repertoire.getCv(x.na.sid).plusCtc(x.id)
        if (x.datap === true) { // regularisation à faire
          const datak = await crypt.crypter(data.clek, serial(x.data))
          const ret = await post(this, 'm1', 'regulCt', { sessionId: data.sessionId, id: x.id, ic: x.ic, datak: datak })
          if (data.dh < ret.dh) data.dh = ret.dh
          delete x.datap
        }
      }
    }
    data.setContacts(mapObj.contact)
    push('contact')
  }

  if (mapObj.parrain) {
    data.setParrains(mapObj.parrain)
    push('parrain')
  }

  if (mapObj.rencontre) {
    data.setRencontres(mapObj.rencontre)
    push('rencontre')
  }

  if (mapObj.membre) {
    // Gérer la CV comme pour un contact
    mapObj.membre.forEach((x) => {
      if (x.suppr) {
        const avant = data.getMembre(x.id, x.im)
        if (avant && !avant.suppr) {
          data.repertoire.getCv(avant.namb.sid).moinsMbr(x.id)
        }
      } else {
        data.repertoire.getCv(x.namb.sid).plusMbr(x.id)
      }
    })
    data.setMembres(mapObj.membre)
    push('membre')
  }

  if (mapObj.secret) {
    data.setSecrets(mapObj.secret)
    /* il peut y avoir des secrets ayant un changement de PJ */
    const lst = []
    const st = store().state.db.pjidx
    for (let i = 0; i < mapObj.secret.length; i++) {
      const secret = mapObj.secret[i]
      for (const cle in secret.mpj) {
        const pj = secret.mpj[cle]
        const x = st ? st[secret.sidpj(cle)] : null
        if (x && pj.hv !== x.hv) { // pj locale pas à jour
          try {
            const data = await getpj(secret.sid + '@' + secret.sid2, x.cle) // rechargement du contenu du serveur
            x.hv = pj.hv
            putPj(x, data) // store en IDB
            lst.push(x)
          } catch (e) {
            console.log(e.toString())
            x.hv = null
            lst.push(x)
            data.setPjPerdues(x)
          }
        }
      }
    }
    if (lst.length) data.setPjidx(lst)
    push('secret')
  }

  if (mapObj.cv) {
    mapObj.cv.forEach((x) => {
      if (!x.suppr) {
        const cv = data.repertoire.getCv(x.sid)
        if (cv) {
          const f = cv.fusionCV(x)
          data.repertoire.setCv(f)
        } else {
          data.repertoire.setCv(x)
        }
        if (x.vcv > vcv) vcv = x.vcv
      }
    })
    push('cv')
  }

  /* Il peut y avoir des PJ non référencées, avatar / groupe disparu, PJ disparue */
  {
    const lst = []
    const st = store().state.db.pjidx
    for (const k in st) {
      const x = st[k]
      const secret = data.getSecret(x.id, x.ns)
      if (secret && secret.nbpj) {
        const pj = secret.mpj[x.cle]
        if (!pj) { x.hv = null; lst.push(x) }
      } else { x.hv = null; lst.push(x) }
    }
    if (lst.length) data.setPjidx(lst)
  }

  data.repertoire.commit() // un seul à la fin
  return vcv
}

export const MODES = ['inconnu', 'synchronisé', 'incognito', 'avion', 'visio']

/* Répertoire des CV **********************************************************/
class Repertoire {
  constructor () {
    this.rep = {}
    this.modif = false
  }

  setCv (cv) {
    if (cv.suppr || (cv.fake && !cv.lctc.length && !cv.lmbr.length)) {
      // cv inutile : on l'efface du répertoire
      delete this.rep[cv.sid]
    } else {
      // On clone Cv pour que le store détecte un changement d'objet
      this.rep[cv.sid] = cv.clone()
    }
    this.modif = true
  }

  getCv (id) {
    const sid = typeof id === 'string' ? id : crypt.idToSid(id)
    const idn = typeof id === 'string' ? crypt.sidToId(id) : id
    let cv = this.rep[sid]
    if (!cv) {
      cv = new Cv(true)
      cv.id = idn
      this.rep[sid] = cv
      this.modif = true
    }
    return cv
  }

  purge (cvi) {
    if (!cvi) cvi = this.setCvsInutiles
    if (cvi.size) {
      cvi.forEach((sid) => { delete this.rep[sid] })
      this.modif = true
    }
  }

  commit () {
    if (this.modif) {
      store().commit('db/commitRepertoire', this)
      this.modif = false
    }
  }

  get setCvsUtiles () {
    const s = new Set()
    for (const sid in this.rep) {
      const cv = this.rep[sid]
      if (cv.lctc.length || cv.lmbr.length) s.add(crypt.sidToId(sid))
    }
    return s
  }

  get setCvsManquantes () {
    const s = new Set()
    for (const sid in this.rep) {
      const cv = this.rep[sid]
      if (cv.fake && (cv.lctc.length || cv.lmbr.length)) s.add(crypt.sidToId(sid))
    }
    return s
  }

  get setCvsInutiles () {
    const s = new Set()
    for (const sid in this.rep) {
      const cv = this.rep[sid]
      if (!cv.lctc.length && !cv.lmbr.length) s.add(sid)
    }
    return s
  }
}

/* Versions AvGr **************************************************************/
class VAG {
  constructor () {
    this.verAv = new Map()
    this.verGr = new Map()
    this.verCp = new Map()
  }

  setVerAv (id, idt, v) { // idt : Index de la table
    const sid = typeof id === 'string' ? id : crypt.idToSid(id)
    let t
    if (!this.verAv.has(sid)) {
      t = new Array(SIZEAV).fill(0)
      this.verAv.set(sid, t)
    } else t = this.verAv.get(sid)
    if (v > t[idt]) t[idt] = v
  }

  delVerAv (id) {
    const sid = typeof id === 'string' ? id : crypt.idToSid(id)
    if (this.verAv.has(sid)) this.verAv.set(sid, new Array(SIZEAV).fill(0))
  }

  getVerAv (id) {
    const sid = typeof id === 'string' ? id : crypt.idToSid(id)
    return this.verAv.has(sid) ? this.verAv.get(sid) : new Array(SIZEAV).fill(0)
  }

  setVerGr (id, idt, v) { // idt : Index de la table
    const sid = typeof id === 'string' ? id : crypt.idToSid(id)
    let t
    if (!this.verGr.has(sid)) {
      t = new Array(SIZEGR).fill(0)
      this.verGr.set(sid, t)
    } else t = this.verGr.get(sid)
    if (v > t[idt]) t[idt] = v
  }

  getVerGr (id) {
    const sid = typeof id === 'string' ? id : crypt.idToSid(id)
    return this.verGr.has(sid) ? this.verGr.get(sid) : new Array(SIZEGR).fill(0)
  }

  delVerGr (id) {
    const sid = typeof id === 'string' ? id : crypt.idToSid(id)
    if (this.verGr.has(sid)) this.verGr(sid, new Array(SIZEGR).fill(0))
  }

  setVerCp (id, idt, v) { // idt : Index de la table
    const sid = typeof id === 'string' ? id : crypt.idToSid(id)
    let t
    if (!this.verCp.has(sid)) {
      t = new Array(SIZECP).fill(0)
      this.verCp.set(sid, t)
    } else t = this.verCp.get(sid)
    if (v > t[idt]) t[idt] = v
  }

  getVerCp (id) {
    const sid = typeof id === 'string' ? id : crypt.idToSid(id)
    return this.verCp.has(sid) ? this.verCp.get(sid) : new Array(SIZECP).fill(0)
  }

  delVerCp (id) {
    const sid = typeof id === 'string' ? id : crypt.idToSid(id)
    if (this.verCp.has(sid)) this.verCp(sid, new Array(SIZECP).fill(0))
  }
}

/* état de session ************************************************************/
class Session {
  constructor () {
    this.raz(true)
    this.nbreconnexion = 0
    this.ps = null
  }

  /* statut de la session
    0: fantôme : la session n'a pas encore été ouverte par une opération de login / création compte
    ou cette opération s'est interrompue. En attente de décision déconnexion / reconnexion OU opération en cours
    1: session en partie chargée, utilisable en mode visio
    2: session totalement chargée / synchronisée et cohérente
  */
  get statut () { return store().state.ui.statutsession }

  set statut (val) { store().commit('ui/majstatutsession', val) }

  get mode () { return store().state.ui.mode }

  set mode (val) { store().commit('ui/majmode', val) }

  get modeInitial () { return store().state.ui.modeinitial }

  set modeInitial (val) { store().commit('ui/majmodeinitial', val) }

  get statutnet () { return store().state.ui.statutnet }

  set statutnet (val) { store().commit('ui/majstatutnet', val) }

  get statutidb () { return store().state.ui.statutidb }

  set statutidb (val) { store().commit('ui/majstatutidb', val) }

  get sessionId () { return store().state.ui.sessionid }

  set sessionId (val) { store().commit('ui/majsessionid', val) }

  async connexion (sansidb) { // Depuis l'opération de connexion
    store().commit('ui/majconnexionencours', true)
    this.raz()
    store().commit('db/raz')
    remplacePage('Synchro')
    if (this.nbreconnexion === 0) {
      this.modeInitial = this.mode
    }
    this.sessionId = crypt.idToSid(crypt.random(6))
    if (!sansidb && (this.mode === 1 || this.mode === 3)) await openIDB()
    if (this.mode === 1 || this.mode === 2) await openWS()
    console.log('Ouverture de session : ' + this.sessionId)
  }

  async deconnexion (avantreconnexion) { // Depuis un bouton
    store().commit('ui/majconnexionencours', false)
    this.ps = null
    store().commit('db/raz')
    closeWS()
    closeIDB()
    this.raz()
    this.statut = 0
    if (!avantreconnexion) {
      this.nbreconnexion = 0
      await remplacePage(store().state.ui.org ? 'Login' : 'Org')
    } else {
      this.nbreconnexion++
    }
  }

  degraderMode () {
    if (this.statut === 0) return
    let nm = this.mode
    switch (this.modeInitial) {
      case 1 : { // synchronisé
        // IDB KO, peut passer en mode incognito si toutes les données sont chargées, sinon visio
        if (this.statutidb === 2 && this.statutnet !== 2) { nm = this.statut === 2 ? 2 : 4; break }

        // NET KO, peut passer en mode avion si toutes les données sont chargées, sinon visio
        if (this.statutidb !== 2 && this.statutnet === 2) { nm = this.statut === 2 ? 3 : 4; break }

        // NET et IDB KO : mode visio
        if (this.statutidb !== 2 && this.statutnet !== 2) { nm = 4; break }
        break
      }
      case 2 : { // incognito
        if (this.statutnet === 2) { nm = 4; break }
        break
      }
      case 3 : { // avion
        if (this.statutidb === 2) { nm = 4; break }
        break
      }
    }
    if (nm === this.mode) return null // pas de dégradation
    this.mode = nm
    return 'Le mode a été dégradé de "' + MODES[this.modeInitial] + '" à "' + MODES[this.mode] + '".'
  }

  setErDB (e) {
    const ex = appexc(e)
    ex.idb = true
    this.statutidb = 2
    if (this.db) {
      this.db.close()
    }
    return ex
  }

  setErWS (e) {
    const ex = appexc(e)
    ex.net = true
    this.statutnet = 2
    if (this.ws) {
      this.ws.close()
    }
    return ex
  }

  stopOp () {
    if (this.opUI) {
      this.opUI.stop()
    }
  }

  raz (init) { // init : l'objet data (Session) est créé à un moment où le store vuex n'est pas prêt
    this.db = null // IDB quand elle est ouverte
    this.nombase = null
    this.erDB = 0 // 0:OK 1:IDB en erreur NON traitée 2:IDB en erreur traitée
    this.exIDB = null // exception sur IDB
    this.ws = null // WebSocket quand il est ouvert
    this.erWS = 0 // 0:OK 1:WS en erreur NON traitée 2:WS en erreur traitée
    this.exNET = null // exception sur NET
    this.repertoire = new Repertoire()

    if (!init) {
      this.statutnet = 0 // 0: net pas ouvert, 1:net OK, 2: net KO
      this.statutidb = 0 // 0: idb pas ouvert, 1:idb OK, 2: idb KO
      /* statut de la session
      0: fantôme : la session n'a pas encore été ouverte par une opération de login / création compte
      1: session en partie chargée, utilisable en mode visio
      2: session totalement chargée / synchronisée et cohérente
      */
      this.statut = 0
      this.sessionId = null
      store().commit('ui/razidblec')
      store().commit('ui/razsynclec')
    }

    this.dh = 0 // plus haute date-heure retournée par un POST au serveur
    this.vcv = 0 // version des cartes de visite détenues
    this.clek = null // clé K du compte authentifié
    this.estComptable = false

    this.naIdIx = {} // na par id ic/im
    this.naId = {} // na par id
    this.clec = {} // clés C des contacts id, ic
    this.pjPerdues = [] // PJ accessibles en mode avion qui n'ont pas pu être récupérées et NE SONT PLUS ACCESSIBLES en avion

    this.opWS = null // opération WS en cours
    this.opUI = null // opération UI en cours

    this.syncqueue = [] // notifications reçues sur WS et en attente de traitement

    this.vag = new VAG()
  }

  setPjPerdues (x) { this.pjPerdues.push(x) }

  /* Enregistre le nom d'avatar pour :
  - un avatar / groupe / couple
  - un contact d'un couple : idc, ic (0 ou 1)
  - un membre d'un groupe : idg, im
  Ce n'est PAS dans le store, l'information étant immutable
  Permet aussi d'obtenir l'id d'un contact / memebre depuis leur avatar/ic ou groupe/im
  */
  setNa (nom, rnd, id, ix) {
    const na = new NomAvatar(nom, rnd)
    this.naId[na.sid] = na
    if (id) this.naIdIx[crypt.idToSid(id) + '/' + ix] = na
    return na
  }

  /* retourne le na d'un avatar, groupe, couple OU d'un contact ou membre (icm présent) */
  getNa (id, ix) {
    const sid = typeof id === 'string' ? id : crypt.idToSid(id)
    return !ix ? this.naId[sid] : this.naIdIx[sid + '/' + ix]
  }

  setClec (id, cc) { // clé d'un couple
    this.clec[crypt.idToSid(typeof id === 'string' ? id : crypt.idToSid(id))] = cc
  }

  getClec (id) { // clé d'un couple
    return this.clec[crypt.idToSid(typeof id === 'string' ? id : crypt.idToSid(id))]
  }

  /* Getters / Setters ****************************************/
  get setIdsAvatarsUtiles () { return this.getCompte().allAvId() }

  get setIdsGroupesUtiles () {
    const s = new Set()
    const avs = this.setIdsAvatarsUtiles
    // un compte peut avoir un avatar référencé dans mac mais qui n'a jamais encore été chargé en IDB
    // à ce stade ses groupes sont donc inconnus
    avs.forEach(id => {
      const a = this.getAvatar(id)
      if (a) a.allGrId(s)
    })
    return s
  }

  get setIdsAvatarsStore () {
    const s = new Set()
    const avs = this.getAvatar()
    for (const sid in avs) s.add(this.getAvatar(sid).id)
    return s
  }

  get setIdsGroupesStore () {
    const s = new Set()
    const grs = this.getGroupe()
    for (const sid in grs) s.add(this.getGroupe(sid).id)
    return s
  }

  getCompte () { return store().state.db.compte }

  setCompte (compte) { store().commit('db/setCompte', compte) }

  getCompta () { return store().state.db.compta }

  setCompta (compta) { store().commit('db/setCompta', compta) }

  getPrefs () { return store().state.db.prefs }

  setPrefs (prefs) { store().commit('db/setPrefs', prefs) }

  avc (id) { return this.getCompte().av(id) }

  getAvatar (id) { return store().getters['db/avatar'](id) }

  setAvatars (lobj, hls) {
    if (lobj.length) {
      if (hls) lobj.forEach(obj => { if (obj.suppr) hls.push(obj) })
      store().commit('db/setObjets', ['avatar', lobj])
    }
  }

  getGroupe (id) { return store().getters['db/groupe'](id) }

  setGroupes (lobj, hls) {
    if (lobj.length) {
      if (hls) lobj.forEach(obj => { if (obj.suppr) hls.push(obj) })
      store().commit('db/setObjets', ['groupe', lobj])
    }
  }

  getCouple (id) { return store().getters['db/couple'](id) }

  setCouples (lobj, hls) {
    if (lobj.length) {
      if (hls) lobj.forEach(obj => { if (obj.suppr) hls.push(obj) })
      store().commit('db/setObjets', ['couple', lobj])
    }
  }

  getContactstd (prh) { return store().getters['db/contactstd'](prh) }

  setContactstds (lobj, hls) {
    if (lobj.length) {
      if (hls) lobj.forEach(obj => { if (obj.suppr || obj.horslimite) hls.push(obj) })
      store().commit('db/setObjets', ['contactstd', lobj])
    }
  }

  getContactphc (phch) { return store().getters['db/contactphc'](phch) }

  setContactphcs (lobj, hls) {
    if (lobj.length) {
      if (hls) lobj.forEach(obj => { if (obj.suppr || obj.horslimite) hls.push(obj) })
      store().commit('db/setObjets', ['contactphc', lobj])
    }
  }

  getCv (id) { return this.repertoire[id] }

  getMembre (idg, im) { return store().getters['db/membre'](idg, im) }

  // objet membre du groupe idg dont l'id est idm
  getMembreParId (idg, idm) { return store().getters['db/membreParId'](idg, idm) }

  setMembres (lobj, hls) {
    if (lobj.length) {
      if (hls) lobj.forEach(obj => { if (obj.suppr || obj.horslimite) hls.push(obj) })
      store().commit('db/setObjets', ['membre', lobj])
    }
  }

  getSecret (sid, sid2) { return store().getters['db/secret'](sid, sid2) }

  setSecrets (lobj, hls) {
    if (lobj.length) {
      if (hls) lobj.forEach(obj => { if (obj.suppr || obj.horslimite) hls.push(obj) })
      store().commit('db/setObjets', ['secret', lobj])
    }
  }

  purgeAvatars (lav) { if (lav.size) return store().commit('db/purgeAvatars', lav) }

  purgeGroupes (lgr) { if (lgr.size) return store().commit('db/purgeGroupes', lgr) }

  purgeCouples (lgr) { if (lgr.size) return store().commit('db/purgeCouples', lgr) }

  /*
  idx = { id, ns, cle } - ns cle peuvent être null
  retourne un array de { id, ns, cle, hv }
  */
  getFaidx (idx) { return store().getters['db/faidx'](idx) }

  setFaidx (lst) { // lst : array de { id, ns, cle, hv }
    store().commit('db/majfaidx', lst)
  }
}

export const data = new Session()

/** Compte **********************************/

schemas.forSchema({
  name: 'idbCompte',
  cols: ['id', 'v', 'dpbh', 'pcbh', 'k', 'mac', 'vsh']
})
/*
- `id` : id du compte.
- `v` :
- `dpbh` : hashBin (53 bits) du PBKFD du début de la phrase secrète (32 bytes). Pour la connexion, l'id du compte n'étant pas connu de l'utilisateur.
- `pcbh` : hashBin (53 bits) du PBKFD de la phrase complète pour quasi-authentifier une connexion avant un éventuel échec de décryptage de `kx`.
- `kx` : clé K du compte, cryptée par la X (phrase secrète courante).
- `mack` {} : map des avatars du compte cryptée par la clé K. Clé: id, valeur: `[nom, rnd, cpriv]`
  - `nom rnd` : nom et clé de l'avatar.
  - `cpriv` : clé privée asymétrique.
- `vsh`
*/

export class Compte {
  get table () { return 'compte' }

  get sid () { return crypt.idToSid(this.id) }

  get sid2 () { return null }

  get pk () { return '1' }

  get suppr () { return false }

  get horsLimite () { return false }

  get estComptable () { return data.estComptable }

  get titre () { return data.getPrefs(this.id).titre }

  allAvId () {
    const s = new Set()
    for (const sid in this.mac) s.add(this.mac[sid].na.id)
    return s
  }

  nouveau (nomAvatar, cprivav, id) {
    this.id = id || crypt.rnd6()
    this.v = 0
    this.dpbh = data.ps.dpbh
    this.pcbh = data.ps.pcbh
    this.k = crypt.random(32)
    data.clek = this.k
    this.mac = { }
    this.mac[nomAvatar.sid] = { na: nomAvatar, cpriv: cprivav }
    data.setNa(nomAvatar.nom, nomAvatar.rnd)
    this.vsh = 0
    return this
  }

  get avatars () { // array des na triés par nom
    const l = []
    for (const avsid in this.mac) l.push(this.mac[avsid].na)
    if (l.length > 1) l.sort((a, b) => a.nom > b.nom ? 1 : (a.nom === b.nom ? 0 : -1))
    return l
  }

  async fromRow (row) {
    this.vsh = row.vsh || 0
    this.id = row.id
    this.v = row.v
    this.dpbh = row.dpbh
    this.k = await crypt.decrypter(data.ps.pcb, row.kx)
    this.pcbh = row.pcbh
    data.clek = this.k
    this.mac = {}
    const m = deserial(await crypt.decrypter(this.k, row.mack))
    for (const sid in m) {
      const [nom, rnd, cpriv] = m[sid]
      this.mac[sid] = { na: new NomAvatar(nom, rnd), cpriv: cpriv }
      data.setNa(nom, rnd)
    }
    return this
  }

  async toRow () {
    const r = { ...this }
    const m = {}
    for (const sid in this.mac) {
      const x = this.mac[sid]
      m[sid] = [x.na.nom, x.na.rnd, x.cpriv]
    }
    r.mack = await crypt.crypter(data.clek, serial(m))
    r.kx = await crypt.crypter(data.ps.pcb, this.k)
    return schemas.serialize('rowcompte', r)
  }

  async ajoutAvatar (na, kpav) {
    const m = {}
    for (const sid in this.mac) {
      const x = this.mac[sid]
      m[sid] = [x.na.nom, x.na.rnd, x.cpriv]
    }
    m[na.sid] = [na.nom, na.rnd, kpav.privateKey]
    data.setNa(na.nom, na.rnd)
    return await crypt.crypter(data.clek, serial(m))
  }

  get toIdb () { return schemas.serialize('idbCompte', this) }

  fromIdb (idb) {
    schemas.deserialize('idbCompte', idb, this)
    data.clek = this.k
    for (const sid in this.mac) {
      const na = this.mac[sid].na
      data.setNa(na.nom, na.rnd)
    }
    return this
  }

  get clone () {
    return schemas.clone('idbCompte', this, new Compte())
  }

  av (id) { // retourne { na: , cpriv: }
    return this.mac[crypt.idToSid(id)]
  }
}

/** Prefs *********************************
- `id` : id du compte.
- `v` :
- `mapk` {} : map des préférences.
  - _clé_ : code court (`mp, mc ...`)
  - _valeur_ : sérialisation cryptée par la clé K du compte de l'objet JSON correspondant.
- `vsh`
*/

schemas.forSchema({
  name: 'idbPrefs',
  cols: ['id', 'v', 'map', 'vsh']
})

export class Prefs {
  get table () { return 'prefs' }

  get sid () { return crypt.idToSid(this.id) }

  get sid2 () { return null }

  get pk () { return this.sid }

  get suppr () { return false }

  get horsLimite () { return false }

  get memo () { return this.map.mp }

  get titre () { return titreEd(this.sid, this.map.mp) }

  get mc () { return this.map.mc }

  nouveau (id) {
    this.id = id
    this.v = 0
    this.vsh = 0
    this.map = { mp: '', mc: {} }
    return this
  }

  async fromRow (row) {
    this.vsh = row.vsh || 0
    this.id = row.id
    this.v = row.v
    const m = deserial(row.mapk)
    this.map = {}
    this.map.mp = deserial(await crypt.decrypter(data.clek, m.mp))
    this.map.mc = deserial(await crypt.decrypter(data.clek, m.mc))
    return this
  }

  async sectionToRow (code) {
    const x = this.map[code] || null
    return await crypt.crypter(data.clek, serial(x))
  }

  async toRow () {
    const m = { }
    m.mp = await this.sectionToRow('mp')
    m.mc = await this.sectionToRow('mc')
    const r = { id: this.id, v: this.v, vsh: this.vsh, mapk: serial(m) }
    return schemas.serialize('rowprefs', r)
  }

  get toIdb () {
    return schemas.serialize('idbPrefs', this)
  }

  fromIdb (idb) {
    schemas.deserialize('idbPrefs', idb, this)
    return this
  }

  get clone () {
    return schemas.clone('idbPrefs', this, new Prefs())
  }
}

/** Compta *********************************
- `id` : du compte.
- `idp` : pour un filleul, id du parrain (null pour un parrain).
- `v` :
- `dds` : date de dernière signature du compte (dernière connexion). Un compte en sursis ou bloqué ne signe plus, sa disparition physique est déjà programmée.
- `st` :
  - 0 : normal.
  - 1 : en sursis 1.
  - 2 : en sursis 2.
  - 3 : bloqué.
- `dst` : date du dernier changement de st.
- `data`: compteurs sérialisés (non cryptés)
- `dh` : date-heure de dernière écriture sur l'ardoise.
- `ard` : texte de l'ardoise _crypté soft_.
- `vsh` :
*/

schemas.forSchema({
  name: 'idbCompta',
  cols: ['id', 'idp', 'v', 'dds', 'st', 'dst', 'data', 'dh', 'ard', 'vsh']
})

export class Compta {
  get table () { return 'compta' }

  get sid () { return crypt.idToSid(this.id) }

  get sid2 () { return null }

  get pk () { return this.sid }

  get suppr () { return false }

  get horsLimite () { return false }

  get estParrain () { return this.idp === null }

  nouveau (id, idp) {
    this.id = id
    this.idp = idp
    this.v = 0
    this.vsh = 0
    this.st = 0
    this.dst = 0
    this.compteurs = new Compteurs()
    this.dh = 0
    this.ard = null
    return this
  }

  async fromRow (row) {
    this.vsh = row.vsh || 0
    this.id = row.id
    this.idp = row.idp
    this.v = row.v
    this.dds = row.dds
    this.st = row.st
    this.compteurs = new Compteurs(row.data).calculauj()
    this.dh = row.dh
    this.ard = row.ard ? crypt.decryptersoftStr(row.ard) : null
    return this
  }

  async toRow () {
    const r = { ...this }
    r.data = this.compteurs.calculauj().serial
    r.ard = this.ard ? crypt.cryptersoft(this.ard) : null
    return schemas.serialize('rowcompta', r)
  }

  get toIdb () {
    this.data = serial(this.compteurs.calculauj())
    const x = schemas.serialize('idbCompta', this)
    delete this.data
    return x
  }

  fromIdb (idb) {
    schemas.deserialize('idbCompta', idb, this)
    this.compteurs = new Compteurs(this.data).calculauj()
    delete this.data
    return this
  }

  get clone () {
    this.compteurs.calculauj()
    return schemas.clone('idbCompta', this, new Compta())
  }
}

/** Avatar **********************************/
/*
- `id` : id de l'avatar
- `v` :
- `st` : négatif : l'avatar est supprimé / disparu (les autres colonnes sont à null).
- `vcv` : version de la carte de visite (séquence 0).
- `dds` :
- `cva` : carte de visite de l'avatar cryptée par la clé de l'avatar `[photo, info]`.
- `lgrk` : map :
  - _clé_ : `ni`, numéro d'invitation (aléatoire 4 bytes) obtenue sur `invitgr`.
  - _valeur_ : cryptée par la clé K du compte de `[nom, rnd, im]` reçu sur `invitgr`.
  - une entrée est effacée par la résiliation du membre au groupe ou sur refus de l'invitation
  (ce qui lui empêche de continuer à utiliser la clé du groupe).
- `lcck` : liste cryptée par la clé K des clés `cc` des couples dont l'avatar fait partie.
  Le hash d'une clé d'un couple donne son id.
- `vsh`
*/

schemas.forSchema({
  name: 'idbAvatar',
  cols: ['id', 'v', 'st', 'vcv', 'dds', 'photo', 'info', 'lgr', 'lcc', 'vsh']
})

export class Avatar {
  get table () { return 'avatar' }

  get sid () { return crypt.idToSid(this.id) }

  get sid2 () { return null }

  get sidav () { return crypt.idToSid(this.id) }

  get pk () { return this.sid }

  get suppr () { return this.st < 0 }

  get horsLimite () { return false }

  get icone () { return this.photo || '' }

  get na () { return data.getNa(this.id) }

  get nom () { return titreEd(this.na.nom, this.info, true) }

  get groupes () { return this.m2gr.keys() }

  get cv () { return this }

  get ph () { return this.photo } // alias

  constructor () {
    this.m1gr = new Map() // clé:ni val: { na du groupe, im de l'avatar dans le groupe }
    this.m2gr = new Map() // clé:idg (id du groupe), val:[im, ni]
    this.mcc = new Map() // clé: id du couple, val: clé cc
  }

  allGrId (s) {
    if (!s) s = new Set()
    this.m1gr.forEach(val => { s.add(val.na.id) })
    return s
  }

  allCpId (s) {
    if (!s) s = new Set()
    this.mcc.forEach((val, id) => { s.add(id) })
    return s
  }

  nouveau (id) {
    this.id = id
    this.v = 0
    this.st = 0
    this.vcv = 0
    this.dds = 0
    this.photo = ''
    this.info = ''
    this.vsh = 0
    return this
  }

  async compileLists (lgr, lcc, brut) {
    this.mcc.clear()
    if (lcc) {
      lcc.forEach(cc => {
        const id = crypt.hashBin(this.rnd)
        data.setClec(id, cc)
        this.mcc.set(id, cc)
      })
    }
    this.m1gr.clear()
    if (lgr) {
      for (const ni in lgr) {
        const y = lgr[ni]
        const x = deserial(brut ? y : await crypt.decrypter(data.clek, y))
        const na = data.setNa(x[0], x[1])
        this.m1gr.set(ni, { na: na, im: x[2] })
        this.m2gr.set(na.id, [x[2], ni])
      }
    }
  }

  async decompileLists () {
    const lgr = {}
    for (const [ni, x] of this.m1gr) {
      lgr[ni] = await crypt.crypter(data.clek, serial([x.na.nom, x.na.rnd, x.im]))
    }
    const lcc = []
    if (this.mcc.size) this.mcc.forEach(val => { lcc.push(val) })
    return [lgr, lcc]
  }

  decompileListsBrut () {
    const lgr = {}
    for (const [ni, x] of this.m1gr) lgr[ni] = serial([x.na.nom, x.na.rnd, x.im])
    const lcc = []
    if (this.mcc.size) this.mcc.forEach(val => { lcc.push(val) })
    return [lgr, lcc]
  }

  async fromRow (row) {
    this.vsh = row.vsh || 0
    this.id = row.id
    this.v = row.v
    this.st = row.st
    this.vcv = row.vcv
    this.dds = row.dds
    const x = row.cva ? deserial(await crypt.decrypter(this.na.cle, row.cva)) : null
    this.photo = x ? x[0] : ''
    this.info = x ? x[1] : ''
    const lcc = row.lcck ? deserial(await crypt.decrypter(data.clek, row.lcck)) : null
    await this.compileLists(row.lgrk ? deserial(row.lgrk) : null, lcc)
    return this
  }

  async cvToRow (photo, info) {
    return await crypt.crypter(this.na.cle, serial([photo, info]))
  }

  async toRow () {
    const r = { ...this }
    const [lgr, lcc] = await this.decompileLists()
    r.cva = await this.cvToRow(this.photo, this.info)
    r.lgrk = serial(lgr)
    r.lcck = lcc && lcc.length ? await crypt.crypter(serial(lcc)) : null
    return schemas.serialize('rowavatar', r)
  }

  get toIdb () {
    const r = { ...this }
    const [lgr, lcc] = this.decompileListsBrut()
    r.lgr = lgr
    r.lcc = lcc
    return schemas.serialize('idbAvatar', r)
  }

  fromIdb (idb) {
    schemas.deserialize('idbAvatar', idb, this)
    this.compileLists(this.lgr, this.lcc, true)
    delete this.lgr
    delete this.lcc
    return this
  }

  get clone () {
    return schemas.clone('idbAvatar', this, new Avatar())
  }
}

/** Cv ************************************/
schemas.forSchema({
  name: 'idbCv',
  cols: ['id', 'vcv', 'st', 'photo', 'info']
})
/*
  name: 'rowcv',
  cols: ['id', 'vcv', 'st', 'cva']

  Trois propriétés sont maintenues à jour EN MEMOIRE (ni sur le serveur, ni sur idb)
  - lctc : liste des ids des avatars du compte ayant l'avatar de la CV comme "l'autre" contact d'un couple
    Bref du ou des avatars du compte avec qui il est en couple (0 ou 1 le plus souvent)
  - lmbr : liste des ids des groupes ayant l'avatar de la CV comme membre (0 ou 1 le plus souvent)
  - fake : normalement temporaire. Un membre ou un contact d'un couple est déclaré AVANT que sa vraie CV n'ait été enregistrée.
    Dans ce cas l'attribut 'fake' indique que la CV a été fabriquée par défaut avec juste le nom complet.
  Un objet CV est conservé dans la map data.repertoire
  Le store/db conserve l'image de data.repertoire à chaque changement
*/

export class Cv {
  get table () { return 'cv' }

  get sid () { return crypt.idToSid(this.id) }

  get sid2 () { return null }

  get pk () { return this.sid }

  get suppr () { return this.st < 0 }

  get horsLimite () { return false }

  get na () { return data.getNa(this.id) }

  get titre () {
    if (!this.info) return ''
  }

  constructor (fake) {
    this.lctc = []
    this.lmbr = []
    this.fake = fake
    this.vcv = 0
    this.st = 0
    this.photo = ''
    this.info = ''
  }

  clone () {
    const cl = new Cv()
    cl.id = this.id
    cl.vcv = this.vcv
    cl.st = this.st
    cl.photo = this.photo
    cl.info = this.info
    this.lctc.forEach((x) => cl.lctc.push(x))
    this.lmbr.forEach((x) => cl.lmbr.push(x))
    return cl
  }

  async fromRow (row) { // row : rowCv - item retour de sync
    this.id = row.id
    this.vcv = row.vcv
    this.st = row.st
    if (!this.suppr) {
      const x = row.cva ? deserial(await crypt.decrypter(this.na.cle, row.cva)) : null
      this.photo = x ? x[0] : ''
      this.info = x ? x[1] : ''
    }
    return this
  }

  get toIdb () {
    return schemas.serialize('idbCv', this)
  }

  fromIdb (idb) {
    schemas.deserialize('idbCv', idb, this)
    return this
  }

  moinsCtc (id) { // id de l'avatar du compte dont this N'EST PLUS contact
    const idx = this.lctc.indexOf(id)
    if (idx !== -1) {
      this.lctc.splice(idx, 1)
      // Dans le répertoire la CV origine est remplacée par son clone
      data.repertoire.setCv(this)
    } // sinon il n'y était déjà plus
  }

  plusCtc (id) { // id de l'avatar du compte dont this est contact
    if (this.lctc.indexOf(id) !== -1) return // y était déja
    this.lctc.push(id)
    data.repertoire.setCv(this)
  }

  moinsMbr (id) { // id du groupe dont this N'EST PLUS membre
    const idx = this.lmbr.indexOf(id)
    if (idx !== -1) {
      this.lmbr.splice(idx, 1)
      // Dans le répertoire la CV origine est remplacée par son clone
      data.repertoire.setCv(this)
    } // sinon il n'y était déjà plus
  }

  plusMbr (id) { // id du groupe dont this est membre
    if (this.lmbr.indexOf(id) !== -1) return // y était déja
    this.lmbr.push(id)
    data.repertoire.setCv(this)
  }

  fusionCV (x) {
    if (!this.fake && this.vcv > x.vcv) return this // existante plus récente
    x.lctc = this.lctc
    x.lmbr = this.lmbr
    return x
  }
}

/** couple **********************************/

schemas.forSchema({
  name: 'idbCouple',
  cols: ['id', 'v', 'st', 'dds', 'v1', 'v2', 'mx10', 'mx20', 'mx11', 'mx21', 'dlv', 'data', 'info0', 'info1', 'mc0', 'mc1', 'dh', 'ard', 'vsh']
})
/*
- `id` : id du couple
- `v` :
- `st` :
  - _négatif_ : suppression logique au jour J par le GC.
  - _positif_ : deux chiffres `phase / état`
- `dds` : dernière date de signature de A0 ou A1 (maintient le couple en vie).
- `v1 v2` : volumes actuels des secrets.
- `mx10 mx20` : maximum des volumes autorisés pour A0
- `mx11 mx21` : maximum des volumes autorisés pour A1
- `dlv` : date limite de validité éventuelle de la phase 1.
- `datac` : données cryptées par la clé `cc` du couple :
  - x: `[idc, nom, rnd], [idc, nom, rnd]` : id du compte, nom et clé d'accès à la carte de visite
    respectivement de A0 et A1. Quand l'un des deux est inconnu, le triplet est `null`.
  - `phrase` : phrase de contact en phases 1-2 et 1-3 (qui nécessitent une phrase).
  - `f1 f2` : en phase 1-2 (parrainage), forfaits attribués par le parrain A0 à son filleul A1.
- `infok0 infok1` : commentaires cryptés par leur clé K, respectivement de A0 et A1.
- `mc0 mc1` : mots clé définis respectivement par A0 et A1.
- `ardc` : ardoise commune cryptée par la clé cc. [dh, texte]
- `vsh` :
*/

export class Couple {
  get table () { return 'couple' }

  get sid () { return crypt.idToSid(this.id) }

  get sid2 () { return null }

  get pk () { return this.sid }

  get pkv () { return this.sid + '/' + this.v }

  get suppr () { return this.st < 0 }

  get horsLimite () { return false }

  get cle () { return data.getClec(this.id) }

  get stp () { return this.st > 0 ? Math.floor(this.st / 10) : 0 }

  get ste () { return this.st > 0 ? this.st % 10 : 0 }

  get nomf () {
    const nomf0 = this.na0 ? this.na0.nomf : 'inconnu'
    const nomf1 = this.na1 ? this.na1.nomf : 'inconnu'
    return '(' + nomf0 + ')(' + nomf1 + ')'
  }

  compData () { // x: `[idc, nom, rnd], [idc, nom, rnd]` : id du compte, nom et clé d'accès à la carte de visite
    const x0 = this.data.x[0]
    const x1 = this.data.x[1]
    this.na0 = x0 ? new NomAvatar(x0[1], x0[2]) : null
    this.na1 = x1 ? new NomAvatar(x0[1], x0[2]) : null
    this.avc0 = x0 && data.avc(this.na0.id)
    this.avc1 = x0 && data.avc(this.na1.id)
  }

  // cols: ['id', 'v', 'st', 'dds', 'v1', 'v2', 'mx10', 'mx20', 'mx11', 'mx21', 'dlv', 'data', 'info0', 'info1', 'mc0', 'mc1', 'dh', 'ard', 'vsh']
  async fromRow (row) {
    this.vsh = row.vsh || 0
    this.id = row.id
    this.v = row.v
    this.st = row.st
    if (!this.suppr) {
      this.dds = row.dds
      this.v1 = row.v1
      this.v2 = row.v2
      this.mx10 = row.mx10
      this.mx20 = row.mx20
      this.mx11 = row.mx11
      this.mx21 = row.mx21
      this.dlv = row.dlv
      this.data = deserial(await crypt.decrypter(this.cle, row.datac))
      const x = row.ardc ? deserial(await crypt.decrypter(this.cle, row.ardc)) : [0, '']
      this.dh = x[0]
      this.ard = x[1]
      this.mc0 = row.mc0 || new Uint8Array([])
      this.mc1 = row.mc1 || new Uint8Array([])
      this.compData()
      this.info0 = this.avc0 && row.info0k ? await crypt.decrypterStr(data.clek, row.info0k) : ''
      this.info1 = this.avc1 && row.info1k ? await crypt.decrypterStr(data.clek, row.info1k) : ''
    }
    return this
  }

  async toRow (datak, cc) { // TODO
    const r = { ...this }
    r.datac = await crypt.crypter(this.cle, serial(r.data))
    r.ardc = await crypt.crypter(this.cle, serial([r.dh, r.ard]))
    return schemas.serialize('rowcouple', r)
  }

  get toIdb () {
    return schemas.serialize('idbCouple', this)
  }

  fromIdb (idb) {
    schemas.deserialize('idbCouple', idb, this)
    this.compData()
    return this
  }
}

/** contactstd **********************************/
/*
- `id` : id de A1
- `ni` : numéro aléatoire en complément de `id`
- `v` :
- `dlv`
- `ccp` : clé du couple (donne son id) cryptée par la clé publique de A1
- `vsh` :
*/

schemas.forSchema({
  name: 'idbContactstd',
  cols: ['id', 'ni', 'v', 'dlv', 'idc', 'cc', 'vsh'] // idc : id du couple, cc: clé du couple
})

export class Contactstd {
  get table () { return 'contactstd' }

  get sid () { return crypt.idToSid(this.id) }

  get sid2 () { return '' + this.ni }

  get pk () { return this.sid + '/' + this.ni }

  get suppr () { return false }

  get horsLimite () { return dlvDepassee(this.dlv) }

  get sidav () { return this.sid }

  async fromRow (row) {
    this.vsh = row.vsh || 0
    this.id = row.id
    this.ni = row.ni
    this.v = row.v
    this.dlv = row.dlv
    const x = data.avc(this.id)
    this.cc = x ? await crypt.decrypterRSA(x.cpriv, row.ccp) : null
    this.idc = crypt.hashBin(this.rnd)
    data.setClec(this.idc, this.cc)
    return this
  }

  async toRow (dlv) { // TODO : utilité ???
  }

  get toIdb () {
    return schemas.serialize('idbContactstd', this)
  }

  fromIdb (idb) {
    schemas.deserialize('idbContactstd', idb, this)
    data.setClec(this.idc, this.cc)
    return this
  }
}

/** Contactphc **********************************/
/*
- `phch` : hash de la phrase de contact convenue entre le parrain A0 et son filleul A1 (s'il accepte)
- `dlv`
- `ccx` : clé du couple (donne son id) cryptée par le PBKFD de la phrase de contact.
- `vsh` :
*/

schemas.forSchema({
  name: 'idbContactphc',
  cols: ['phch', 'dlv', 'ccx', 'vsh']
})

export class Contactphc {
  get table () { return 'contactphc' }

  get sid () { return crypt.idToSid(this.prh) }

  get sid2 () { return crypt.idToSid(this.id) }

  get pk () { return this.sid }

  get horsLimite () { return !this.suppr ? dlvDepassee(this.dlv) : false }

  async nouveau (phch, clex, dlv, cc) {
    this.vsh = 0
    this.phcs = phch
    this.ccx = await crypt.crypter(clex, cc || await crypt.random(32))
    this.dlv = dlv
    return this
  }

  async fromRow (row) {
    this.vsh = row.vsh || 0
    this.phch = row.phch
    this.ccx = row.ccx
    this.dlv = row.dlv
    return this
  }

  async getCcId (clex) {
    const cc = await crypt.crypter(clex, this.ccx)
    const id = crypt.hashBin(this.rnd)
    data.setClec(id, cc)
    return [cc, id]
  }

  async toRow () {
    return schemas.serialize('rowcontactphc', this)
  }

  get toIdb () {
    return schemas.serialize('idbContactphc', this)
  }

  fromIdb (idb) {
    schemas.deserialize('idbContactphc', idb, this)
    return this
  }
}

/** Groupe ***********************************/
/*
- `id` : id du groupe.
- `v` :
- `dds` :
- `dfh` : date (jour) de fin d'hébergement du groupe par son hébergeur
- `st` : statut
  - _négatif_ : le groupe est supprimé logiquement (c'est le numéro du jour de sa suppression).
  - _positif_ `x y`
    - `x` : 1-ouvert (accepte de nouveaux membres), 2-fermé (ré-ouverture en vote)
    - `y` : 0-en écriture, 1-protégé contre la mise à jour, création, suppression de secrets.
- `cvg` : carte de visite du groupe `[photo, info]` cryptée par la clé G du groupe.
- `idhg` : id du compte hébergeur crypté par la clé G du groupe.
- `imh` : indice `im` du membre dont le compte est hébergeur.
- `v1 v2` : volumes courants des secrets du groupe.
- `f1 f2` : forfaits attribués par le compte hébergeur.
- `mcg` : liste des mots clés définis pour le groupe cryptée par la clé du groupe cryptée par la clé G du groupe.
- `vsh`
*/

schemas.forSchema({
  name: 'idbGroupe',
  cols: ['id', 'v', 'dds', 'dfh', 'st', 'mxin', 'photo', 'info', 'idh', 'imh', 'v1', 'v2', 'f1', 'f2', 'mc', 'vsh']
})

export class Groupe {
  get table () { return 'groupe' }

  get sid () { return crypt.idToSid(this.id) }

  get sid2 () { return null }

  get pk () { return this.sid }

  get suppr () { return this.st < 0 }

  get horsLimite () { return false }

  get sidgr () { return this.sid }

  get icone () { return this.photo || '' }

  get cleg () { return this.na.cle }

  get na () { return data.getNa(this.id) }

  get stx () { return Math.floor(this.st / 10) }

  get sty () { return this.st % 10 }

  get nom () { return titreEd(this.na.nom || '', this.info) }

  get pc1 () { return Math.round(this.v1 / UNITEV1 / this.f1) }

  get pc2 () { return Math.round(this.v2 / UNITEV2 / this.f2) }

  get estHeb () { return this.idh && !this.dfh && this.idh === data.getCompte().id }

  imDeId (id) {
    for (const im in data.getMembre(this.id)) {
      const m = data.getMembre(this.id, im)
      if (m.namb.id === id) return parseInt(im)
    }
    return 0
  }

  maxStp () {
    let mx = 0
    for (const im in data.getMembre(this.id)) {
      const m = data.getMembre(this.id, im)
      if (m.estAvc && m.stp > mx) mx = m.stp
    }
    return mx
  }

  motcle (n) { // utilisé par util / Motscles
    const s = this.mc[n]
    if (!s) return ''
    const i = s.indexOf('/')
    return i === -1 ? { c: '', n: s } : { c: s.substring(0, i), n: s.substring(i + 1) }
  }

  nouveau (nom, imh, forfaits) {
    const na = data.setNa(nom)
    this.id = na.id
    this.v = 0
    this.dds = 0
    this.dfh = 0
    this.st = 10
    this.mxim = 1
    this.idh = data.getCompte().id
    this.imh = imh
    this.photo = ''
    this.info = ''
    this.v1 = 0
    this.v2 = 0
    this.f1 = forfaits[0]
    this.f2 = forfaits[1]
    this.mc = {}
    this.vsh = 0
    return this
  }

  async fromRow (row) {
    this.vsh = row.vsh || 0
    this.id = row.id
    this.v = row.v
    this.dds = row.dds
    this.dfh = row.dfh
    this.st = row.st
    if (!this.suppr) {
      this.mxim = row.mxim
      const cv = row.cvg ? deserial(await crypt.decrypter(this.cleg, row.cvg)) : ['', '']
      this.photo = cv[0]
      this.info = cv[1]
      this.mc = row.mcg ? deserial(await crypt.decrypter(this.cleg, row.mcg)) : {}
      this.idh = row.idhg ? parseInt(await crypt.decrypterStr(this.cleg, row.idhg)) : 0
      this.imh = row.imh
      this.v1 = row.v1
      this.v2 = row.v2
      this.f1 = row.f1
      this.f2 = row.f2
    }
    return this
  }

  async toRow () {
    const r = { ...this }
    r.cvg = await crypt.crypter(this.cleg, serial([this.photo, this.info]))
    r.mcg = Object.keys(r.mc).length ? await crypt.crypter(this.cleg, serial(this.mc)) : null
    r.idhg = this.idh ? await crypt.crypter(this.cleg, '' + this.idh) : 0
    return schemas.serialize('rowgroupe', r)
  }

  async toIdhg (idc) {
    return await crypt.crypter(this.cleg, '' + idc)
  }

  async toCvg (cv) {
    return await crypt.crypter(this.cleg, serial([cv.ph, cv.info]))
  }

  async toMcg (mc) {
    return Object.keys(mc).length ? await crypt.crypter(this.cleg, serial(mc)) : null
  }

  get toIdb () {
    return schemas.serialize('idbGroupe', this)
  }

  fromIdb (idb) {
    schemas.deserialize('idbGroupe', idb, this)
    return this
  }
}

/** Membre ***********************************/
/*
- `id` : id du **groupe**.
- `im` : indice du membre dans le groupe.
- `v` :
- `st` : `x p`
  - `x` : 0:envisagé, 1:invité, 2:actif (invitation acceptée), 3: inactif (invitation refusée), 4: inactif (résilié), 5: inactif (disparu).
  - `p` : 0:lecteur, 1:auteur, 2:animateur.
- `vote` : vote de réouverture.
- `mc` : mots clés du membre à propos du groupe.
- `infok` : commentaire du membre à propos du groupe crypté par la clé K du membre.
- `datag` : données cryptées par la clé du groupe. (immuable)
  - `nom, rnd` : nom complet de l'avatar.
  - `ni` : numéro d'invitation du membre dans `invitgr`. Permet de supprimer l'invitation et d'effacer le groupe dans son avatar (clé de `lgrk`).
  - `idi` : id du membre qui l'a inscrit en contact.
- `ardg` : ardoise du membre vis à vis du groupe. Couple `[dh, texte]` crypté par la clé du groupe. Contient le texte d'invitation puis la réponse de l'invité cryptée par la clé du groupe. Ensuite l'ardoise peut être écrite par le membre (actif) et les animateurs.
- `vsh`
*/

schemas.forSchema({
  name: 'idbMembre',
  cols: ['id', 'im', 'v', 'st', 'vote', 'mc', 'info', 'data', 'ard', 'vsh']
})

export class Membre {
  get table () { return 'membre' }

  get sid () { return crypt.idToSid(this.id) }

  get sid2 () { return '' + this.im }

  get pk () { return this.sid + '/' + this.sid2 }

  get pkv () { return this.sid + '/' + this.sid2 + '/' + this.v }

  get suppr () { return this.st < 0 }

  get horsLimite () { return false }

  get sidgr () { return this.sid }

  get stx () { return this.st < 0 ? -1 : Math.floor(this.st / 10) }

  get stp () { return this.st < 0 ? -1 : this.st % 10 }

  get namb () { return data.getNa(this.id, this.im) }

  get cleg () { return data.getNa(this.id).cle }

  get cv () { return data.repertoire.getCv(this.namb.id) } // cv du membre

  get ph () { const cv = this.cv; return cv.photo ? cv.photo : '' }

  get nom () { return this.namb.titre }

  get estAvc () { // true si ce membre est un avatar du compte
    return data.avc(this.namb.id) !== undefined
  }

  get titre () {
    const i = this.info.indexOf('\n')
    const t1 = i === -1 ? this.info : this.info.substring(0, i)
    const t = t1.length <= 16 ? t1 : t1.substring(0, 13) + '...'
    return t ? t + ' [' + this.namb.titre + ']' : this.namb.titre
  }

  get dhed () { return dhstring(this.dh) }

  nouveau (id, im, na, idi) {
    this.id = id
    this.im = im
    this.v = 0
    this.st = 22
    this.vote = 0
    this.mc = new Uint8Array([])
    this.info = ''
    this.ard = ''
    this.dh = 0
    this.data = {
      nom: na.nom,
      rnd: na.rnd,
      ni: crypt.rnd6(),
      idi: idi || na.id
    }
    data.setNa(this.data.nom, this.data.rnd, this.id, this.im)
    this.vsh = 0
    return this
  }

  async fromRow (row) {
    this.vsh = row.vsh || 0
    this.id = row.id
    this.im = row.im
    this.v = row.v
    this.st = row.st
    if (!this.suppr) {
      this.vote = row.vote
      this.data = deserial(await crypt.decrypter(this.cleg, row.datag))
      data.setNa(this.data.nom, this.data.rnd, this.id, this.im)
      const [d, t] = row.ardg ? deserial(await crypt.decrypter(this.cleg, row.ardg)) : [0, '']
      this.ard = t
      this.dh = d
      this.info = row.infok && this.estAvc ? await crypt.decrypterStr(data.clek, row.infok) : ''
      this.mc = row.mc
    }
    return this
  }

  async toArdg (ard) {
    return ard ? await crypt.crypter(this.cleg, serial([Math.floor(new Date().getTime() / 1000), ard])) : null
  }

  async toRow () {
    const r = { ...this }
    r.datag = await crypt.crypter(this.cleg, serial(this.data))
    r.ardg = this.ard ? await crypt.crypter(this.cleg, serial([this.dh, this.ard])) : null
    r.infok = this.estAvc && this.info ? await crypt.crypter(data.clek, this.info) : null
    return schemas.serialize('rowmembre', r)
  }

  get toIdb () {
    return schemas.serialize('idbMembre', this)
  }

  fromIdb (idb) {
    schemas.deserialize('idbMembre', idb, this)
    data.setNa(this.data.nom, this.data.rnd, this.id, this.im)
    return this
  }
}

/** Secret **********************************/
/*
- `id` : id du groupe ou de l'avatar.
- `ns` : numéro du secret.
- `v` :
- `st` :
  - < 0 pour un secret _supprimé_.
  - `99999` pour un *permanent*.
  - `dlv` pour un _temporaire_.
- `xp` : _xxxp_ (`p` reste de la division par 10)
   - `xxx` : exclusivité : l'écriture et la gestion de la protection d'écriture sont restreintes au membre du groupe dont `im` est `x` (un animateur a toujours le droit de gestion de protection et de changement du `x`). Pour un secret de couple : 1 ou 2.
    - `p` : 0: pas protégé, 1: protégé en écriture.
- `v1` : volume du texte
- `v2` : volume total des fichiers attachés
- `mc` :
  - secret personnel ou de couple : vecteur des index de mots clés.
  - secret de groupe : map sérialisée,
    - _clé_ : `im` de l'auteur (0 pour les mots clés du groupe),
    - _valeur_ : vecteur des index des mots clés attribués par le membre.
- `txts` : crypté par la clé du secret.
  - `d` : date-heure de dernière modification du texte
  - `l` : liste des auteurs (pour un secret de couple ou de groupe).
  - `t` : texte gzippé ou non
- `mfas` : sérialisation de la map des fichiers attachés.
- `refs` : couple `[id, ns]` crypté par la clé du secret référençant un autre secret (référence de voisinage qui par principe, lui, n'aura pas de `refs`).
- `vsh`

**Map des pièces jointes :**
Une pièce jointe est identifiée par : `nom.ext/dh`
- le `nom.ext` d'une pièce jointe est un nom de fichier, qui indique donc son type MIME par `ext`, d'où un certain nombre de caractères interdits (dont le `/`).
- `dh` est la date-heure d'écriture UTC (en secondes) : `YYYY-MM-JJThh:mm:ss`.

- _clé_ : hash (court) de nom.ext en base64 URL. Permet d'effectuer des remplacements par une version ultérieure.
- _valeur_ : `[idc, taille]`
  - `idc` : id complète de la pièce jointe, cryptée par la clé du secret et en base64 URL.
  - `taille` : en bytes. Par convention une taille négative indique que la pièce jointe a été gzippée.
*/

schemas.forSchema({
  name: 'idbSecret',
  cols: ['id', 'ns', 'v', 'st', 'xp', 'v1', 'v2', 'mc', 'txt', 'mfa', 'ref', 'vsh']
})

export class Secret {
  get table () { return 'secret' }

  get sid () { return crypt.idToSid(this.id) }

  get sid2 () { return crypt.idToSid(this.ns) }

  get pk () { return this.sid + '/' + this.sid2 }

  get pkref () { return !this.ref ? '' : (crypt.idToSid(this.ref[0]) + '/' + crypt.idToSid(this.ref[1])) }

  get vk () { return this.pk + '@' + this.v }

  get suppr () { return this.st < 0 }

  get horsLimite () { return this.st < 0 || this.st >= 99999 ? false : dlvDepassee(this.st) }

  get sidavgr () { return this.sid }

  get ts () { return this.ns % 3 } // 0:personnel 1:couple 2:groupe

  get titre () { return titreEd(null, this.txt.t) }

  get nbj () { return this.st <= 0 || this.st === 99999 ? 0 : (this.st - getJourJ()) }

  get dh () { return dhstring(new Date(this.txt.d * 1000)) }

  get cles () {
    return this.ts ? (this.ts === 1 ? data.getClec(this.id) : data.getNa(this.id).cle) : data.clek
  }

  get nomf () {
    const i = this.txt.t.indexOf('\n')
    const t = this.txt.t.substring(0, (i === -1 ? 16 : (i < 16 ? i : 16)))
    return normpath(t) + '@' + this.sid2
  }

  get path () { return (this.ts === 1 ? this.id.nomf : data.getNa(this.id)) + '/' + this.nomf }

  get avatar () {
    if (this.ts !== 0) return null
    return data.getAvatar(this.id)
  }

  get couple () {
    if (this.ts !== 1) return null
    return data.getCouple(this.id)
  }

  get groupe () {
    if (this.ts !== 2) return null
    return data.getGroupe(this.id)
  }

  get partage () {
    if (this.ts === 0) return 'Secret personnel'
    if (this.ts === 1) return 'Partagé avec ' + this.couple.nomf
    return 'Partagé avec ' + this.groupe.nom
  }

  nouveauP (id, ref) {
    this.id = id
    this.v = 0
    this.ns = (Math.floor(crypt.rnd4() / 3) * 3)
    this.st = getJourJ() + cfg().limitesjour.secrettemp
    this.xp = 0
    this.mc = new Uint8Array([])
    this.txt = { t: '', d: Math.floor(new Date().getTime() / 1000) }
    this.ref = ref || null
    return this
  }

  nouveauC (id, ref) {
    this.id = id
    this.ns = (Math.floor(crypt.rnd4() / 3) * 3) + 1
    this.v = 0
    this.st = getJourJ() + cfg().limitesjour.secrettemp
    this.xp = 0
    this.mc = new Uint8Array([])
    this.txt = { t: '', l: new Uint8Array([]), d: Math.floor(new Date().getTime() / 1000) }
    this.ref = ref || null
    return this
  }

  nouveauG (id, ref, im) {
    this.id = id
    this.ns = (Math.floor(crypt.rnd4() / 3) * 3) + 2
    this.v = 0
    this.xp = 0
    this.mc = { 0: new Uint8Array([]) }
    this.mc[im] = new Uint8Array([])
    this.st = getJourJ() + cfg().limitesjour.secrettemp
    this.txt = { t: '', l: new Uint8Array([]), d: Math.floor(new Date().getTime() / 1000) }
    this.ref = ref || null
    return this
  }

  async toRowTxt (txt, im) {
    const x = { d: Math.floor(new Date().getTime() / 1000), t: gzip(txt) }
    if (this.ts) {
      const nl = [im]
      this.txt.l.forEach(t => { if (t !== im) nl.push(t) })
      x.l = new Uint8Array(nl)
    }
    return await crypt.crypter(this.cles, serial(x))
  }

  async fromRow (row) {
    this.vsh = row.vsh || 0
    this.id = row.id
    this.ns = row.ns
    this.st = row.st
    this.xp = row.xp
    this.v = row.v
    if (!this.suppr) {
      this.v1 = row.v1
      this.v2 = row.v2
      const cles = this.cles
      try {
        this.txt = deserial(await crypt.decrypter(cles, row.txts))
        this.txt.t = ungzip(this.txt.t)
      } catch (e) {
        console.log(e.toString())
        this.txt = { t: '!!! texte illisible, corrompu !!!', d: Math.floor(new Date().getTime() / 1000) }
      }
      if (row.mc) {
        this.mc = this.ts === 0 || this.ts === 1 ? row.mc : deserial(row.mc)
      } else {
        this.mc = this.ts === 0 || this.ts === 1 ? new Uint8Array([]) : {}
      }
      this.mfa = {}
      this.nbfa = 0
      if (this.v2) {
        const map = row.mpjs ? deserial(row.mfas) : {}
        for (const cfa in map) {
          const x = map[cfa]
          let nomc = await crypt.decrypterStr(cles, crypt.b64ToU8(x[0]))
          let gz = false
          if (nomc.endsWith('$')) {
            gz = true
            nomc = nomc.substring(0, nomc.length - 1)
          }
          const i = nomc.indexOf('|')
          const j = nomc.lastIndexOf('|')
          this.nbfa++
          const fa = { cle: cfa, nom: nomc.substring(0, i), type: nomc.substring(i + 1, j), dh: parseInt(nomc.substring(j + 1)), size: x[1], gz: gz }
          fa.hv = this.hv(fa)
          this.mfa[cfa] = fa
        }
      }
      this.ref = row.refs ? deserial(await crypt.decrypter(cles, row.refs)) : null
    }
    return this
  }

  get toIdb () {
    const t = this.txt.t
    this.txt.t = gzip(this.txt.t)
    const idb = schemas.serialize('idbSecret', this)
    this.txt.t = t
    return idb
  }

  fromIdb (idb) {
    schemas.deserialize('idbSecret', idb, this)
    this.txt.t = ungzip(this.txt.t)
    this.nbfa = 0
    if (this.v2) {
      // eslint-disable-next-line no-unused-vars
      for (const cfa in this.mfa) {
        const fa = this.mpj[cfa]
        fa.hv = this.hv(fa)
        this.nbfa++
      }
    }
    return this
  }

  hv (fa) { return crypt.hash(this.nomc(fa), false, true) }

  nomc (fa) { return fa.nom + '|' + fa.type + '|' + fa.dh + (fa.gz ? '$' : '') }

  cle (fa) { return crypt.hash(fa.nom, false, true) }

  sidfa (cle) { return this.secidfa + '@' + cle }

  get secidfa () { return crypt.idToSid(this.id) + '@' + crypt.idToSid(this.ns) }

  async idc (fa) { return crypt.u8ToB64(await crypt.crypter(this.cles, this.nomc(fa), 1), true) }

  async datafa (fa, raw) {
    const y = data.getFaidx({ id: this.id, ns: this.ns, cle: fa.cle })
    let buf = null
    if (y.length) buf = await getFadata({ id: this.id, ns: this.ns, cle: fa.cle })
    if (!buf) buf = await getpj(this.secidpj, fa.cle + '@' + (await this.idc(fa)))
    if (!buf) return null
    if (raw) return buf
    const buf2 = await crypt.decrypter(this.cles, buf)
    const buf3 = fa.gz ? ungzipT(buf2) : buf2
    return buf3
  }
}
