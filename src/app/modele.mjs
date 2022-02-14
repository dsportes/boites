import { schemas } from './schemas.mjs'
import { crypt } from './crypto.mjs'
import { openIDB, closeIDB, putPj, getPjdata } from './db.mjs'
import { openWS, closeWS } from './ws.mjs'
import {
  store, appexc, serial, deserial, dlvDepassee, NomAvatar, gzip, ungzip, dhstring,
  getJourJ, cfg, ungzipT, normpath, getpj, nomEd, titreEd, post
} from './util.mjs'
import { remplacePage } from './page.mjs'
import { SIZEAV, SIZEGR, EXPS, Compteurs } from './api.mjs'

export async function traitInvitGr (row) {
  const cpriv = data.avc(row.id).cpriv
  const nomc = deserial(await crypt.decrypterRSA(cpriv, row.datap))
  return { id: row.id, ni: row.ni, nomck: crypt.crypter(data.clek, nomc) }
}

/** Invitgr **********************************/
/*
- `id` : id du membre invité.
- `ni` : hash du numéro d'invitation.
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
    this.datak = await crypt.crypter(data.clek, x)
    return this
  }
}
/*
  Retourne une map avec une entrée pour chaque table et en valeur,
  - pour compte : LE DERNIER objet reçu, pas la liste historique
  - pour les autres, l'array des objets
*/
export function estSingleton (t) { return ['compte', 'compta', 'prefs', 'ardoise'].indexOf(t) !== -1 }

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
    case 'ardoise' : return new Ardoise()
    case 'avatar' : return new Avatar()
    case 'contact' : return new Contact()
    case 'invitgr' : return new Invitgr()
    case 'parrain' : return new Parrain()
    case 'rencontre' : return new Rencontre()
    case 'groupe' : return new Groupe()
    case 'membre' : return new Membre()
    case 'secret' : return new Secret()
    case 'cv' : return new Cv()
  }
}

/* mapObj : clé par table, valeur : array des objets **************************************/
/*
- ne traite ni les singletons ('compte compta prefs ardoise'), ni 'invitgr'
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
    data.setGroupes(mapObj.groupe)
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

  deconnexion (avantreconnexion) { // Depuis un bouton
    store().commit('db/raz')
    store().commit('ui/deconnexion')
    closeWS()
    closeIDB()
    this.raz()
    this.statut = 0
    if (!avantreconnexion) {
      this.nbreconnexion = 0
      this.ps = null
      remplacePage(store().state.ui.org ? 'Login' : 'Org')
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
  - un avatar / groupe
  - un contact d'un avatar : ida, ic
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

  /* retourne le na d'un avatar, groupe, OU d'un contact ou membre (icm présent) */
  getNa (id, ix) {
    const sid = typeof id === 'string' ? id : crypt.idToSid(id)
    return !ix ? this.naId[sid] : this.naIdIx[sid + '/' + ix]
  }

  setClec (id, ic, cc) {
    this.clec[crypt.idToSid(typeof id === 'string' ? id : crypt.idToSid(id)) + '/' + ic] = cc
  }

  getClec (id, ic) {
    return this.clec[crypt.idToSid(typeof id === 'string' ? id : crypt.idToSid(id)) + '/' + ic]
  }

  /* Getters / Setters ****************************************/
  get setIdsAvatarsUtiles () { return this.getCompte().allAvId() }

  get setIdsGroupesUtiles () {
    const s = new Set()
    const avs = this.setIdsAvatarsUtiles
    // un compte peut avoir un avatar référencé dans mac mais qui n'a jamais encore été chargé en IDB
    // à ce stade ses groupes sont donc inconnus
    avs.forEach(id => { const a = this.getAvatar(id); if (a) a.allGrId(s) })
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

  getArdoise () { return store().state.db.ardoise }

  setArdoise (ardoise) { store().commit('db/setArdoise', ardoise) }

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

  getRencontre (prh) { return store().getters['db/rencontre'](prh) }

  setRencontres (lobj, hls) {
    if (lobj.length) {
      if (hls) lobj.forEach(obj => { if (obj.suppr || obj.horslimite) hls.push(obj) })
      store().commit('db/setObjets', ['rencontre', lobj])
    }
  }

  getParrain (pph) { return store().getters['db/parrain'](pph) }

  setParrains (lobj, hls) {
    if (lobj.length) {
      if (hls) lobj.forEach(obj => { if (obj.suppr || obj.horslimite) hls.push(obj) })
      store().commit('db/setObjets', ['parrain', lobj])
    }
  }

  getCv (id) { return this.repertoire[id] }

  getContact (id, ic) { return store().getters['db/contact'](id, ic) }

  getContactParId (id, idc) { return store().getters['db/contactParId'](id, idc) }

  setContacts (lobj, hls) {
    if (lobj.length) {
      if (hls) lobj.forEach(obj => { if (obj.suppr) hls.push(obj) })
      store().commit('db/setObjets', ['contact', lobj])
    }
  }

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

  /*
  idx = { id, ns, cle } - ns cle peuvent être null
  retourne un array de { id, ns, cle, hv }
  */
  getPjidx (idx) { return store().getters['db/pjidx'](idx) }

  setPjidx (lst) { // lst : array de { id, ns, cle, hv }
    store().commit('db/majpjidx', lst)
  }
}

export const data = new Session()

/** Compte **********************************/

schemas.forSchema({
  name: 'idbCompte',
  cols: ['id', 'v', 'dds', 'dpbh', 'pcbh', 'k', 'mac', 'vsh']
})
/*
- `id` : id du compte.
- `v` :
- `dds` : date (jour) de dernière signature.
- `dpbh` : hashBin (53 bits) du PBKFD du début de la phrase secrète (32 bytes). Pour la connexion, l'id du compte n'étant pas connu de l'utilisateur.
- `pcbh` : hashBin (53 bits) du PBKFD de la phrase complète pour quasi-authentifier une connexion avant un éventuel échec de décryptage de `kx`.
- `kx` : clé K du compte, crypté par la X (phrase secrète courante).
- `mack` {} : map des avatars du compte cryptée par la clé K. Clé: id, valeur: `[nom, rnd, cpriv]`
  - `nom rnd` : nom complet.
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

  allAvId () {
    const s = new Set()
    for (const sid in this.mac) s.add(this.mac[sid].na.id)
    return s
  }

  nouveau (nomAvatar, cprivav, cpriv) {
    this.id = crypt.rnd6()
    this.v = 0
    this.dds = 0
    this.dpbh = data.ps.dpbh
    this.pcbh = data.ps.pcbh
    this.k = crypt.random(32)
    data.clek = this.k
    this.cpriv = cpriv
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
    this.dds = row.dds
    this.dpbh = row.dpbh
    this.k = await crypt.decrypter(data.ps.pcb, row.kx)
    this.cpriv = await crypt.decrypter(this.k, row.cprivk)
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
    r.cprivk = await crypt.crypter(data.clek, this.cpriv)
    r.mack = await crypt.crypter(data.clek, serial(m))
    r.kx = await crypt.crypter(data.ps.pcb, this.k)
    return schemas.serialize('rowcompte', r)
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
    this.map = { mp: '', mc: {}, fs: {} }
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
    this.map.fs = deserial(await crypt.decrypter(data.clek, m.fs))
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
    m.fs = await this.sectionToRow('fs')
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
- `vsh` :
*/

schemas.forSchema({
  name: 'idbCompta',
  cols: ['id', 'idp', 'v', 'dds', 'st', 'dst', 'data', 'vsh']
})

export class Compta {
  get table () { return 'compta' }

  get sid () { return crypt.idToSid(this.id) }

  get sid2 () { return null }

  get pk () { return this.sid }

  get suppr () { return false }

  get horsLimite () { return false }

  nouveau (id, idp) {
    this.id = id
    this.idp = idp
    this.v = 0
    this.vsh = 0
    this.st = 0
    this.dst = 0
    this.compteurs = new Compteurs()
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
    return this
  }

  async toRow () {
    const r = { ...this }
    r.data = this.compteurs.calculauj().serial
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

/** Ardoise *********************************
- `id` : du compte.
- `dh` : date-heure de dernière mise à jour.
- `data`: contenu sérialisé _crypté soft_ de l'ardoise.
- `vsh`:
*/

schemas.forSchema({
  name: 'idbArdoise',
  cols: ['id', 'dh', 'data', 'vsh']
})

export class Ardoise {
  get table () { return 'ardoise' }

  get sid () { return crypt.idToSid(this.id) }

  get sid2 () { return null }

  get pk () { return this.sid }

  get suppr () { return false }

  get horsLimite () { return false }

  async fromRow (row) {
    this.vsh = row.vsh || 0
    this.id = row.id
    this.dh = row.dh
    this.data = deserial(await crypt.decryptersoft(row.data))
    return this
  }

  async toRow () {
    const r = { ...this }
    r.data = await crypt.cryptersoft(serial(this.data))
    return schemas.serialize('rowardoise', r)
  }

  get toIdb () {
    return schemas.serialize('idbArdoise', this)
  }

  fromIdb (idb) {
    schemas.deserialize('idbArdoise', idb, this)
    return this
  }

  get clone () {
    return schemas.clone('idbArdoise', this, new Ardoise())
  }
}

/** Avatar **********************************/
/*
- `id` : id de l'avatar
- `v` :
- `st` :
  - négatif : l'avatar est supprimé / disparu (les autres colonnes sont à null).
  - 0 : OK
  - N : alerte.
    - 1 : détecté par le GC, _l'avatar_ est resté plusieurs mois sans connexion.
    - J : auto-détruit le jour J: c'est un délai de remord. Quand un compte détruit un de ses avatars, il a N jours depuis la date courante pour se rétracter et le réactiver.
- `vcv` : version de la carte de visite (séquence 0).
- `dds` :
- `cva` : carte de visite de l'avatar cryptée par la clé de l'avatar `[photo, info]`.
- `lgrk` : map :
  - _clé_ : `ni`, numéro d'invitation (aléatoire 4 bytes) obtenue sur `invitgr`.
  - _valeur_ : cryptée par la clé K du compte de `[nom, rnd, im]` reçu sur `invitgr` et
  inscrit à l'acceptation de l'invitation.
  Une entrée de lgrk est effacée par la résiliation du membre au groupe ou sur refus de l'invitation
  (ce qui lui empêche de continuer à utiliser la clé du groupe).
- `vsh`
*/

schemas.forSchema({
  name: 'idbAvatar',
  cols: ['id', 'v', 'st', 'vcv', 'dds', 'photo', 'info', 'lgr', 'vsh']
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

  get nom () { return nomEd(this.na.nom, this.info) }

  constructor () {
    this.m1gr = new Map() // clé:ni val: { na du groupe, im de l'avatar dans le groupe }
    this.m2gr = new Map() // clé:idg (id du groupe), val:im
  }

  allGrId (s) {
    if (!s) s = new Set()
    this.m1gr.forEach(val => { s.add(val.na.id) })
    return s
  }

  async nouveau (id) {
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

  async compileLists (lgr, brut) {
    this.m1gr.clear()
    if (lgr) {
      for (const ni in lgr) {
        const y = lgr[ni]
        const x = deserial(brut ? y : await crypt.decrypter(data.clek, y))
        const na = data.setNa(x[0], x[1])
        this.m1gr.set(ni, { na: na, im: x[2] })
        this.m2gr.set(na.id, x[2])
      }
    }
  }

  async decompileLists () {
    const lgr = {}
    for (const [ni, x] of this.m1gr) {
      lgr[ni] = await crypt.crypter(data.clek, serial([x.na.nom, x.na.rnd, x.im]))
    }
    return lgr
  }

  decompileListsBrut () {
    const lgr = {}
    for (const [ni, x] of this.m1gr) lgr[ni] = serial([x.na.nom, x.na.rnd, x.im])
    return lgr
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
    await this.compileLists(row.lgrk ? deserial(row.lgrk) : null)
    return this
  }

  async cvToRow (photo, info) {
    return await crypt.crypter(this.na.cle, serial([photo, info]))
  }

  async toRow () {
    const r = { ...this }
    const lgr = await this.decompileLists()
    r.cva = await this.cvToRow(this.photo, this.info)
    r.lgrk = serial(lgr)
    return schemas.serialize('rowavatar', r)
  }

  get toIdb () {
    const r = { ...this }
    const lgr = this.decompileListsBrut()
    r.lgr = lgr
    return schemas.serialize('idbAvatar', r)
  }

  fromIdb (idb) {
    schemas.deserialize('idbAvatar', idb, this)
    this.compileLists(this.lgr, true)
    delete this.lgr
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
  - lctc : liste des ids des avatars du compte ayant l'avatar de la CV comme contact
  - lmbr : liste des ids des groupes ayant l'avatar de la CV comme membre
  - fake : normalement temporaire. Un membre ou un contact est déclaré AVANT que sa vraie CV n'ait été enregistrée.
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
    this.st = row.cv
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

/** contact **********************************/

schemas.forSchema({
  name: 'idbContact',
  cols: ['id', 'ic', 'v', 'st', 'dlv', 'q1', 'q2', 'qm1', 'qm2', 'ard', 'icb', 'data', 'mc', 'info', 'ard', 'dh', 'vsh']
})
/*
- `id` : id de l'avatar A
- `ic` : indice de contact de B pour A.
- `v` :
- `st` : statut entier de 2 chiffres, `x y` : **les valeurs < 0 indiquent un row supprimé (les champs après sont null)**. `xy` dans le contact de A est `yx` dans le contact de B.
  - `x` :
    - 0 : n'accepte pas le partage de secrets.
    - 1 : accepte le partage de secrets.
    - 2 : présumé disparu
- `q1 q2 qm1 qm2` : balance des quotas donnés / reçus par l'avatar A à l'avatar B.
- `ardc` : **ardoise** partagée entre A et B cryptée par la clé `cc` associée au contact _fort_ avec un avatar B. Couple `[dh, texte]`.
- `datak` : information cryptée par la clé K de A.
  - `nom rnd` : nom complet du contact (B).
  - `cc` : 32 bytes aléatoires donnant la clé `cc` d'un contact _plus_ avec B (en attente ou accepté).
  - `icb` : indice de A dans les contacts de B
- `datap` : mêmes données que `datak` mais cryptées par la clé publique de A.
- `mc` : mots clés à propos du contact.
- `infok` : commentaire à propos du contact crypté par la clé K du membre.
- `vsh`
*/

export class Contact {
  get table () { return 'contact' }

  get sid () { return crypt.idToSid(this.id) }

  get sid2 () { return '' + this.ic }

  get pk () { return this.sid + '/' + this.sid2 }

  get pkv () { const cv = this.cv; return this.sid + '/' + this.sid2 + '/' + this.v + '/' + (cv ? cv.vcv : 0) }

  get suppr () { return this.st < 0 }

  get horsLimite () { return false }

  get sidav () { return this.sid }

  get na () { return data.getNa(this.id, this.ic) } // na DU CONTACT

  get id2 () { return this.na.id }

  get ic2 () { return this.data.ic }

  get cle () { return this.data.cc }

  get cv () { return data.repertoire.getCv(this.na.id) } // cv DU CONTACT

  get ph () { const cv = this.cv; return cv.photo ? cv.photo : cfg().personne.default }

  get nom () { return nomEd(this.data.nom, this.cv ? this.cv.info : '') }

  get stx () { return this.st > 0 ? Math.floor(this.st / 10) : 0 }

  get sty () { return this.st > 0 ? this.st % 10 : 0 }

  get accepteNouveauSecret () { return this.st !== 0 }

  get dhed () { return dhstring(this.dh) }

  majCc () {
    if (this.data.cc) data.setClec(this.id, this.ic, this.data.cc)
    data.setNa(this.data.nom, this.data.rnd, this.id, this.ic)
  }

  async fromRow (row) {
    this.vsh = row.vsh || 0
    this.id = row.id
    this.ic = row.ic
    this.v = row.v
    this.st = row.st
    if (!this.suppr) {
      this.q1 = row.q1
      this.q2 = row.q2
      this.qm1 = row.qm1
      this.qm2 = row.qm2
      if (row.datap) {
        const cpriv = data.avc(row.id).cpriv
        this.data = deserial(await crypt.decrypterRSA(cpriv, row.datap))
        this.datap = true
      } else {
        this.data = deserial(await crypt.decrypter(data.clek, row.datak))
      }
      this.majCc()
      const [d, t] = row.ardc ? deserial(await crypt.decrypter(this.data.cc, row.ardc)) : [0, '']
      this.ard = t
      this.dh = d
      this.mc = row.mc || null
      this.info = row.infok ? await crypt.decrypter(data.clek, row.infok) : ''
    }
    return this
  }

  toRowP (datak, ardc) { // datak est fourni crypté pour un parrainage (contact du parrain par le filleul)
    const r = { ...this }
    r.datak = datak
    r.infok = null
    r.ardc = ardc
    return schemas.serialize('rowcontact', r)
  }

  async toRow () { // datak est fourni crypté pour un parrainage (contact du parrain par le filleul)
    const r = { ...this }
    r.datak = await crypt.crypter(data.clek, serial(r.data))
    r.infok = r.info ? await crypt.crypter(data.clek, r.info) : null
    r.ardc = r.ard ? await crypt.crypter(this.data.cc, serial([r.dh, r.ard])) : null
    return schemas.serialize('rowcontact', r)
  }

  get toIdb () {
    return schemas.serialize('idbContact', this)
  }

  fromIdb (idb) {
    schemas.deserialize('idbContact', idb, this)
    this.majCc()
    return this
  }
}

/** Groupe ***********************************/
/*
- `id` : id du groupe.
- `v` :
- `dds` :
- `st` : statut
  - négatif : l'avatar est supprimé / disparu (les autres colonnes sont à null).
  - 0 : OK
  - N : alerte.
    - 1 : détecté par le GC, _le groupe_ est resté plusieurs mois sans connexion.
    - J : auto-détruit le jour J: c'est un délai de remord. Quand un compte détruit un groupe, il a N jours depuis la date courante pour se rétracter et le réactiver.
- `stxy` : Deux chiffres `x y`
  - `x` : 1-ouvert, 2-fermé, 3-ré-ouverture en vote
  - `y` : 0-en écriture, 1-archivé
- `cvg` : carte de visite du groupe `[photo, info]` cryptée par la clé G du groupe.
- `mcg` : liste des mots clés définis pour le groupe cryptée par la clé du groupe cryptée par la clé G du groupe.
- `vsh`
*/

schemas.forSchema({
  name: 'idbGroupe',
  cols: ['id', 'v', 'dds', 'st', 'stxy', 'cv', 'mc', 'vsh']
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

  get stx () { return this.st < 0 ? -1 : Math.floor(this.st / 10) }

  get sty () { return this.st < 0 ? -1 : this.st % 10 }

  get nom () { return nomEd(this.na.nom, this.cv.info) }

  imDeId (id) {
    const i = this.lmb.indexOf(id)
    return i !== -1 ? i : 0
  }

  motcle (n) {
    const s = this.mc[n]
    if (!s) return ''
    const i = s.indexOf('/')
    return i === -1 ? s : s.substring(i + 1)
  }

  maxStp () {
    // plus haut statut lecteur / auteur / animateur pour tous les avatars du compte: -1 si non accédant
    let stp = -1
    for (const idm in data.getCompte().allAvId()) {
      const m = data.getMembreParId(this.id, idm)
      if (m.stp > stp) stp = m.stp
      if (stp === 2) break
    }
    return stp
  }

  async fromRow (row) {
    this.vsh = row.vsh || 0
    this.id = row.id
    this.v = row.v
    this.dds = row.dds
    this.st = row.st
    if (!this.suppr) {
      this.stxy = row.stxy
      const cv = row.cvg ? deserial(await crypt.decrypter(this.cleg, row.cvg)) : ['', '']
      this.photo = cv[0]
      this.info = cv[1]
      this.mc = row.mcg ? deserial(await crypt.decrypter(this.cleg, row.mcg)) : {}
    }
    return this
  }

  async toRow () {
    const r = { ...this }
    r.cvg = await crypt.crypter(this.cleg, serial([this.photo, this.info]))
    r.mcg = r.mc.length ? await crypt.crypter(this.cleg, serial(this.mc)) : null
    return schemas.serialize('rowgroupe', r)
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
- `id` : id du groupe.
- `im` : numéro du membre dans le groupe.
- `v` :
- `st` : statut. `xp` : < 0 signifie supprimé.
  - `x` : 0:pressenti, 1:invité, 2:actif (invitation acceptée), 3: inactif (invitation refusée), 4: inactif (résilié), 5: inactif (disparu).
  - `p` : 0:lecteur, 1:auteur, 2:administrateur.
- `vote` : vote de réouverture.
- `q1 q2` : balance des quotas donnés / reçus par le membre au groupe.
- `mc` : mots clés du membre à propos du groupe.
- `infok` : commentaire du membre à propos du groupe crypté par la clé K du membre.
- `datag` : données cryptées par la clé du groupe. (immuable)
  - `nom, rnd` : nom complet de l'avatar.
  - `ni` : numéro d'invitation du membre dans `invitgr`. Permet de supprimer l'invitation et d'effacer le groupe dans son avatar (clé de `lmbk`).
  - `idi` : id du premier membre qui l'a pressenti / invité.
- `ardg` : ardoise du membre vis à vis du groupe. Couple `[dh, texte]` crypté par la clé du groupe. Contient le texte d'invitation puis la réponse de l'invité cryptée par la clé du groupe. Ensuite l'ardoise peut être écrite par le membre (actif) et les animateurs.
- `vsh`
*/

schemas.forSchema({
  name: 'idbMembre',
  cols: ['id', 'im', 'v', 'st', 'vote', 'q1', 'q2', 'mc', 'info', 'data', 'ard', 'vsh']
})

export class Membre {
  get table () { return 'membre' }

  get sid () { return crypt.idToSid(this.id) }

  get sid2 () { return '' + this.im }

  get pk () { return this.sid + '/' + this.sid2 }

  get suppr () { return this.st < 0 }

  get horsLimite () { return false }

  get sidgr () { return this.sid }

  get stx () { return this.st < 0 ? -1 : Math.floor(this.st / 10) }

  get stp () { return this.st < 0 ? -1 : this.st % 10 }

  get namb () { return data.getNa(this.id, this.im) }

  get cleg () { return data.getNa(this.id).cle }

  get nom () {
    const cv = data.getCv(this.namb.id)
    return nomEd(this.data.nom, cv ? cv.info : '')
  }

  async fromRow (row) {
    this.vsh = row.vsh || 0
    this.id = row.id
    this.im = row.im
    this.v = row.v
    this.st = row.st
    if (!this.suppr) {
      this.data = deserial(await crypt.decrypter(this.cleg, row.datag))
      data.setNa(this.data.nom, this.data.rnd, this.id, this.im)
      const [d, t] = row.ardg ? await crypt.decrypterStr(this.cleg, row.ardg) : [0, '']
      this.ard = t
      this.dh = d
      this.info = row.infok ? deserial(await crypt.decrypter(data.clek, row.infok)) : ''
      this.mc = row.mc
    }
    return this
  }

  async toRow () {
    const r = { ...this }
    r.datag = await crypt.crypter(this.cleg, serial(this.data))
    r.ardg = await crypt.crypter(this.cleg, serial([this.dh, this.ard]))
    r.infok = await crypt.crypter(data.clek, this.info)
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

/** Parrain **********************************/
/*
- `pph` : hash du PBKFD de la phrase de parrainage.
- `id` : id du parrain.
- `v`
- `dlv` : la date limite de validité permettant de purger les parrainages (quels qu'en soient les statuts).
- `st` : < 0: supprimé,
  - 0: en attente de décision de F
  - 1 : accepté
  - 2 : refusé
- `q1 q2 qm1 qm2` : quotas donnés par P à F en cas d'acceptation.
- `datak` : cryptée par la clé K du parrain, **phrase de parrainage et clé X** (PBKFD de la phrase). La clé X figure afin de ne pas avoir à recalculer un PBKFD en session du parrain pour qu'il puisse afficher `datax`.
- `datax` : données de l'invitation cryptées par le PBKFD de la phrase de parrainage.
  - `nomp, rndp` : nom complet de l'avatar P.
  - `nomf, rndf` : nom complet du filleul F (donné par P).
  - `cc` : clé `cc` générée par P pour le couple P / F.
  - `ic` : numéro de contact du filleul chez le parrain.
- `datak2` : c'est le `datak` du futur contact créé en cas d'acceptation.
  - `nom rnd` : nom complet du contact (B).
  - `cc` : 32 bytes aléatoires donnant la clé `cc` d'un contact avec B (en attente ou accepté).
  - `icb` : indice de A dans les contacts de B
- `ardc` : ardoise (couple `[dh, texte]` cryptée par la clé `cc`).
  - du parrain, mot de bienvenue écrit par le parrain (cryptée par la clé `cc`).
  - du filleul, explication du refus par le filleul (cryptée par la clé `cc`) quand il décline l'offre. Quand il accepte, ceci est inscrit sur l'ardoise de leur contact afin de ne pas disparaître.
- `vsh`
*/

schemas.forSchema({
  name: 'idbParrain',
  cols: ['pph', 'id', 'v', 'ic', 'st', 'dlv', 'q1', 'q2', 'qm1', 'qm2', 'ph', 'cx', 'data', 'datak2', 'ard', 'dh', 'vsh']
})

export class Parrain {
  get table () { return 'parrain' }

  get sid () { return crypt.idToSid(this.pph) }

  get sid2 () { return crypt.idToSid(this.id) }

  get pk () { return this.sid }

  get suppr () { return this.st < 0 }

  get stx () { return Math.floor(this.st / 10) }

  get aps () { return this.st % 10 === 1 }

  get horsLimite () { return !this.suppr ? dlvDepassee(this.dlv) : false }

  get sidav () { return crypt.idToSid(this.id) }

  async fromRow (row, ph, clex) { // ph clex : donnés seulement à la création d'un compte parrainé
    this.vsh = row.vsh || 0
    this.pph = row.pph
    this.id = row.id
    this.st = row.st
    this.v = row.v
    if (!this.suppr) {
      this.dlv = row.dlv
      this.q1 = row.q1
      this.q2 = row.q2
      this.qm1 = row.qm1
      this.qm2 = row.qm2
      if (!clex) { // data.clek null à la création d'un compte parrainé !
        const x = deserial(await crypt.decrypter(data.clek, row.datak))
        this.ph = x[0]
        this.cx = x[1]
      } else {
        this.ph = ph
        this.cx = clex
      }
      this.data = deserial(await crypt.decrypter(this.cx, row.datax))
      this.data2k = row.data2k
      const [d, t] = row.ardc ? deserial(await crypt.decrypter(this.data.cc, row.ardc)) : [0, '']
      this.ard = t
      this.dh = d
      this.nap = new NomAvatar(this.data.nomp, this.data.rndp)
      this.naf = new NomAvatar(this.data.nomf, this.data.rndf)
    }
    return this
  }

  async toRow () {
    const r = { ...this }
    r.datak = await crypt.crypter(data.clek, serial([this.ph, this.cx]))
    r.datax = await crypt.crypter(this.cx, serial(this.data))
    r.ardc = await crypt.crypter(this.data.cc, serial([this.dh, this.ard]))
    return schemas.serialize('rowparrain', r)
  }

  get toIdb () {
    return schemas.serialize('idbParrain', this)
  }

  fromIdb (idb) {
    schemas.deserialize('idbParrain', idb, this)
    this.nap = new NomAvatar(this.data.nomp, this.data.rndp)
    this.naf = new NomAvatar(this.data.nomf, this.data.rndf)
    return this
  }
}

/** Rencontre **********************************/
/*
- `prh` : hash du PBKFD de la phrase de rencontre.
- `id` : id de l'avatar A ayant initié la rencontre.
- `v` :
- `dlv` : date limite de validité permettant de purger les rencontres.
- `st` : < 0:annulée, 0:en attente
- `datak` : **phrase de rencontre et son PBKFD** (clé X) cryptée par la clé K du compte A pour que A puisse retrouver les rencontres qu'il a initiées avec leur phrase.
- `nomax` : nom complet `[nom, rnd]` de A crypté par la clé X.
- `nombx` : nom complet de B nom rnd quand B a lu la rencontre.
- `ardx` : ardoise de A (mot de bienvenue). Couple `[dh, texte]` crypté par la clé X.
- `vsh`
*/

schemas.forSchema({
  name: 'idbRencontre',
  cols: ['prh', 'id', 'v', 'st', 'dlv', 'ph', 'cx', 'naa', 'nab', 'ard', 'dh', 'vsh']
})

export class Rencontre {
  get table () { return 'rencontre' }

  get sid () { return crypt.idToSid(this.prh) }

  get sid2 () { return crypt.idToSid(this.id) }

  get pk () { return this.sid }

  get sidav () { return crypt.idToSid(this.id) }

  get horsLimite () { return !this.suppr ? dlvDepassee(this.dlv) : false }

  get na () { return data.getNa(this.id) }

  async fromRow (row) {
    this.vsh = row.vsh || 0
    this.prh = row.prh
    this.id = row.id
    this.st = row.st
    this.v = row.v
    if (!this.suppr) {
      this.dlv = row.dlv
      const x = deserial(await crypt.decrypter(data.clek, row.datak)) // ['phrase', Uint8Array(32)]
      this.ph = x[0]
      this.cx = x[1]
      const [noma, rnda] = deserial(await crypt.decrypter(this.cx, row.nomax))
      this.naa = new NomAvatar(noma, rnda)
      if (row.nombx) {
        const [nomb, rndb] = deserial(await crypt.decrypter(this.cx, row.nombx))
        this.nab = new NomAvatar(nomb, rndb)
      } else this.nab = null
      const [d, t] = row.ardc ? deserial(await crypt.decrypter(this.data.cc, row.ardc)) : [0, '']
      this.ard = t
      this.dh = d
    }
    return this
  }

  async toRow () {
    const r = { ...this }
    r.datak = await crypt.crypter(data.clek, serial([this.ph, this.cx]))
    r.nomax = await crypt.crypter(this.cx, serial([this.naa.nom, this.naa.rnd]))
    r.nombx = this.nab ? await crypt.crypter(this.cx, serial([this.nab.nom, this.nab.rnd])) : null
    r.ardc = await crypt.crypter(this.data.cc, serial([this.dh, this.ard]))
    return schemas.serialize('rowrencontre', r)
  }

  get toIdb () {
    return schemas.serialize('idbRencontre', this)
  }

  fromIdb (idb) {
    schemas.deserialize('idbRencontre', idb, this)
    return this
  }
}

/** Secret **********************************/
/*
- `id` : id du groupe ou de l'avatar.
- `ns` : numéro du secret.
- `ic` : indice du contact pour un secret de couple, sinon 0.
- `v` :
- `st` :
  - < 0 pour un secret _supprimé_.
  - `99999` pour un *permanent*.
  - `dlv` pour un _temporaire_.
- `ora` : _xxxxx..xp_ (`p` reste de la division par 10)
  - `p` : 0: pas protégé, 1: protégé en écriture.
  - `xxxxx` : exclusivité : l'écriture et la gestion de la protection d'écriture sont restreintes au membre du groupe dont `im` est `x` (un animateur a toujours le droit de gestion de protection et de changement du `x`). Pour un secret de couple : 1 désigne celui des deux contacts du couple ayant l'id le plus bas, 2 désigne l'autre.
- `v1` : volume du texte
- `v2` : volume de la pièce jointe
- `mc` :
  - secret personnel ou de couple : vecteur des index de mots clés.
  - secret de groupe : map sérialisée,
    - _clé_ : `im` de l'auteur (0 pour les mots clés du groupe),
    - _valeur_ : vecteur des index des mots clés attribués par le membre.
- `txts` : crypté par la clé du secret.
  - `d` : date-heure de dernière modification du texte
  - `l` : liste des auteurs (pour un secret de couple ou de groupe).
  - `t` : texte gzippé ou non
- `mpjs` : sérialisation de la map des pièces jointes.
- `dups` : couple `[id, ns]` crypté par la clé du secret de l'autre exemplaire pour un secret de couple A/B.
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
  cols: ['id', 'ns', 'ic', 'v', 'st', 'ora', 'v1', 'v2', 'mc', 'txt', 'mpj', 'dup', 'ref', 'vsh']
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

  get nasrc () { return this.ts === 1 ? data.getNa(this.id, this.ic) : data.getNa(this.id) }

  get cles () {
    return this.ts ? (this.ts === 1 ? data.getClec(this.id, this.ic) : data.getNa(this.id).cle) : data.clek
  }

  get nomf () {
    const i = this.txt.t.indexOf('\n')
    const t = this.txt.t.substring(0, (i === -1 ? 16 : (i < 16 ? i : 16)))
    return normpath(t) + '@' + this.sid2
  }

  get path () { return this.nasrc.nomf + '/' + this.nomf }

  get contact () {
    if (this.ts !== 1) return null
    return data.getContact(this.id, this.ic)
  }

  get groupe () {
    if (this.ts !== 2) return null
    return data.getGroupe(this.id)
  }

  get partage () {
    if (this.ts === 0) return 'Secret personnel'
    return 'Partagé avec ' + (this.groupe || this.contact).nom
  }

  nouveauP (id, ref) {
    this.id = id
    this.v = 0
    this.ns = (Math.floor(crypt.rnd4() / 3) * 3)
    this.ic = 0
    this.st = getJourJ() + cfg().limitesjour.secrettemp
    this.ora = 0
    this.mc = new Uint8Array([])
    this.txt = { t: '', d: Math.floor(new Date().getTime() / 1000) }
    this.ref = ref || null
    return this
  }

  nouveauC (id, contact, ref) {
    this.id = id
    this.ns = (Math.floor(crypt.rnd4() / 3) * 3) + 1
    this.v = 0
    this.ic = contact.ic
    this.st = getJourJ() + cfg().limitesjour.secrettemp
    this.ora = 0
    this.mc = new Uint8Array([])
    this.id2 = contact.id2
    this.ns2 = (Math.floor(crypt.rnd4() / 3) * 3) + 1
    this.ic2 = contact.ic2
    this.txt = { t: '', l: new Uint8Array([]), d: Math.floor(new Date().getTime() / 1000) }
    this.ref = ref || null
    return this
  }

  nouveauG (id, groupe, ref) {
    this.id = groupe.id
    this.ns = (Math.floor(crypt.rnd4() / 3) * 3) + 2
    this.ic = groupe.imDeId(id)
    this.v = 0
    this.ora = 0
    this.mc = { 0: new Uint8Array([]) }
    this.mc[this.ic] = new Uint8Array([])
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
    this.ic = row.ic
    this.st = row.st
    this.ora = row.ora
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
      this.mpj = {}
      this.nbpj = 0
      if (this.v2) {
        const map = row.mpjs ? deserial(row.mpjs) : {}
        for (const cpj in map) {
          const x = map[cpj]
          let nomc = await crypt.decrypterStr(cles, crypt.b64ToU8(x[0]))
          let gz = false
          if (nomc.endsWith('$')) {
            gz = true
            nomc = nomc.substring(0, nomc.length - 1)
          }
          const i = nomc.indexOf('|')
          const j = nomc.lastIndexOf('|')
          this.nbpj++
          const pj = { cle: cpj, nom: nomc.substring(0, i), type: nomc.substring(i + 1, j), dh: parseInt(nomc.substring(j + 1)), size: x[1], gz: gz }
          pj.hv = this.hv(pj)
          this.mpj[cpj] = pj
        }
      }
      if (this.ts === 1) {
        const x = deserial(await crypt.decrypter(cles, row.dups))
        this.id2 = x[0]
        this.ns2 = x[1]
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
    this.nbpj = 0
    if (this.v2) {
      // eslint-disable-next-line no-unused-vars
      for (const cpj in this.mpj) {
        const pj = this.mpj[cpj]
        pj.hv = this.hv(pj)
        this.nbpj++
      }
    }
    return this
  }

  hv (pj) { return crypt.hash(this.nomc(pj), false, true) }

  nomc (pj) { return pj.nom + '|' + pj.type + '|' + pj.dh + (pj.gz ? '$' : '') }

  cle (pj) { return crypt.hash(pj.nom, false, true) }

  sidpj (cle) { return this.secidpj + '@' + cle }

  get secidpj () { const [a, b] = this.secidpjA; return crypt.idToSid(a) + '@' + crypt.idToSid(b) }

  get secidpjA () { const b = this.ts === 1 && this.id2 < this.id; return [b ? this.id2 : this.id, b ? this.ns2 : this.ns] }

  async idc (pj) { return crypt.u8ToB64(await crypt.crypter(this.cles, this.nomc(pj), 1), true) }

  async datapj (pj, raw) {
    const [a, b] = this.secidpjA
    const y = data.getPjidx({ id: a, ns: b, cle: pj.cle })
    let buf = null
    if (y.length) buf = await getPjdata({ id: a, ns: b, cle: pj.cle })
    if (!buf) buf = await getpj(this.secidpj, pj.cle + '@' + (await this.idc(pj)))
    if (!buf) return null
    if (raw) return buf
    const buf2 = await crypt.decrypter(this.cles, buf)
    const buf3 = pj.gz ? ungzipT(buf2) : buf2
    return buf3
  }
}
