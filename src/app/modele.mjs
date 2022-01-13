import { schemas } from './schemas.mjs'
import { crypt } from './crypto.mjs'
import { openIDB, closeIDB } from './db.mjs'
import { openWS, closeWS } from './ws.mjs'
import { store, appexc, serial, deserial, dlvDepassee, NomAvatar, gzip, ungzip, dhstring, getJourJ, cfg } from './util.mjs'
import { remplacePage } from './page.mjs'

/* mapObj : clé par table, valeur : array des objets
- ne traite pas 'compte'
- inscrit en store OU les supprime du store s'il y était
- objets : array remplie par tous les objets à mettre en IDB
Retourne vcv : version de la plus CV trouvée
*/
export function commitMapObjets (objets, mapObj) { // SAUF mapObj.compte et mapObj.prefs
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

  if (mapObj.invitgr) {
    data.setInvitGrs(mapObj.invitgr)
    push('invitgr')
  }

  if (mapObj.contact) {
    /* Pour chaque contact, gestion de sa CV dans le répertoire :
    - soit création (fake)
    - soit suppression
    - soit mise à jour de la liste des contacts dans la CV
    */
    mapObj.contact.forEach((x) => {
      if (x.suppr) {
        const avant = data.getContact(x.id, x.ic)
        if (avant && !avant.suppr) {
          data.repertoire.getCv(avant.na.sid).moinsCtc(x.id)
        }
      } else {
        data.repertoire.getCv(x.na.sid).plusCtc(x.id)
      }
    })
    data.setContacts(mapObj.contact)
    push('contact')
  }

  if (mapObj.invitct) {
    data.setInvitCts(mapObj.invitct)
    push('invitct')
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
    push('secret')
  }

  if (mapObj.cv) {
    mapObj.cv.forEach((x) => {
      if (!x.suppr) {
        const cv = data.repertoire.getCv(x.sid)
        if (cv) {
          const xok = cv.fusionCV(x)
          if (!xok) data.repertoire.setCv(cv) // cv est la nouvelle à intégrer
        } else {
          data.repertoire.setCv(x.sid)
        }
        if (x.vcv > vcv) vcv = x.vcv
      }
    })
    push('cv')
  }

  data.repertoire.commit() // un seul à la fin
  return vcv
}

export const SIZEAV = 7
export const SIZEGR = 3
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
    let cv = this.rep[sid]
    if (!cv) {
      cv = new Cv(true)
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
      if (cv.lctc.length || cv.lmbr.length) s.add(sid)
    }
    return s
  }

  get setCvsManquantes () {
    const s = new Set()
    for (const sid in this.rep) {
      const cv = this.rep[sid]
      if (cv.fake && (cv.lctc.length || cv.lmbr.length)) s.add(sid)
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

    this.opWS = null // opération WS en cours
    this.opUI = null // opération UI en cours

    this.syncqueue = [] // notifications reçues sur WS et en attente de traitement

    this.vag = new VAG()
  }

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

  getInvitct (id, ni) { return store().getters['db/invitct'](id, ni) }

  setInvitcts (lobj, hls) {
    if (lobj.length) {
      if (hls) lobj.forEach(obj => { if (obj.suppr || obj.horslimite) hls.push(obj) })
      store().commit('db/setObjets', ['invitct', lobj])
    }
  }

  getInvitgr (id, ni) { return store().getters['db/invitgr'](id, ni) }

  setInvitgrs (lobj, hls) {
    if (lobj.length) {
      if (hls) lobj.forEach(obj => { if (obj.suppr || obj.horslimite) hls.push(obj) })
      store().commit('db/setObjets', ['invitgr', lobj])
    }
  }

  getMembre (sid, sid2) { return store().getters['db/membre'](sid, sid2) }

  getMembreParId (sidg, sidm) { return store().getters['db/membreParId'](sidg, sidm) }

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
}
export const data = new Session()

/* Création des objets selon leur table *******/
export function newObjet (table) {
  switch (table) {
    case 'compte' : return new Compte()
    case 'avatar' : return new Avatar()
    case 'contact' : return new Contact()
    case 'invitct' : return new Invitct()
    case 'invitgr' : return new Invitgr()
    case 'parrain' : return new Parrain()
    case 'rencontre' : return new Rencontre()
    case 'groupe' : return new Groupe()
    case 'membre' : return new Membre()
    case 'secret' : return new Secret()
    case 'cv' : return new Cv()
  }
}

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

  nouveau (nomAvatar, cpriv) {
    this.id = crypt.rnd6()
    this.v = 0
    this.dds = 0
    this.dpbh = data.ps.dpbh
    this.pcbh = data.ps.pcbh
    this.k = crypt.random(32)
    data.clek = this.k
    this.mac = { }
    this.mac[nomAvatar.sid] = { na: nomAvatar, cpriv: cpriv }
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

/** Prefs **********************************/

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

  get titre () {
    const m = this.map.mp
    if (!m) return this.sid
    let i = m.indexOf('\n')
    if (i === -1) i = m.length
    return this.sid + ' [' + m.substring(0, i) + ']'
  }

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
/** Avatar **********************************/
/*
- `id` : id de l'avatar
- `v` :
- `st` : si négatif, l'avatar est supprimé / disparu (les autres colonnes sont à null). 0:OK, 1:alerte
- `vcv` : version de la carte de visite (séquence 0).
- `dds` :
- `cva` : carte de visite de l'avatar cryptée par la clé de l'avatar `[photo, info]`.
- `lctk` : liste, cryptée par la clé K du compte, des couples `[id, ic]` des contacts de l'avatar afin de garantir l'unicité de ceux-ci.
- `lgrk` : map :
  - _clé_ : `ni`, numéro d'invitation (aléatoire 4 bytes) obtenue sur invitgr.
  - _valeur_ : cryptée par la clé K du compte du triplet `[nom, rnd, im]` reçu sur `invitgr` et inscrit à l'acceptation de l'invitation.
  - une entrée est effacée par la résiliation du membre au groupe, sur refus de l'invitation et dépassement de la `dlv` (ce qui lui empêche de continuer à utiliser la clé du groupe).
- `vsh`
*/

schemas.forSchema({
  name: 'idbAvatar',
  cols: ['id', 'v', 'st', 'vcv', 'dds', 'photo', 'info', 'lct', 'lgr', 'vsh']
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

  constructor () {
    this.m1ct = new Map() // clé:idc val:ic
    this.m2ct = new Map() // clé:ic val:idc
    this.m1gr = new Map() // clé:ni val: na, im
    this.m2gr = new Map() // clé:idg, val:im
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

  async compileLists (lct, lgr, brut) {
    this.m1ct.clear()
    this.m2ct.clear()
    this.m1gr.clear()
    if (lct) lct.forEach(x => { this.m1ct.set(x[0], x[1]); this.m2ct.set(x[1], x[0]) })
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
    const lct = []
    const lgr = {}
    this.m1ct.forEach((v, k) => { lct.push([k, v]) })
    for (const [ni, x] of this.m1gr) {
      lgr[ni] = await crypt.crypter(data.clek, serial([x.na.nom, x.na.rnd, x.im]))
    }
    return [lct, lgr]
  }

  decompileListsBrut () {
    const lct = []
    const lgr = {}
    this.m1ct.forEach((v, k) => { lct.push([k, v]) })
    for (const [ni, x] of this.m1gr) lgr[ni] = serial([x.na.nom, x.na.rnd, x.im])
    return [lct, lgr]
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
    const lct = deserial(await crypt.decrypter(data.clek, row.lctk))
    await this.compileLists(lct, row.lgrk ? deserial(row.lgrk) : null)
    return this
  }

  async cvToRow (photo, info) {
    return await crypt.crypter(this.na.cle, serial([photo, info]))
  }

  async toRow () {
    const r = { ...this }
    const [lct, lgr] = await this.decompileLists()
    r.cva = await this.cvToRow(this.photo, this.info)
    r.lctk = await crypt.crypter(data.clek, serial(lct))
    r.lgrk = serial(lgr)
    return schemas.serialize('rowavatar', r)
  }

  get toIdb () {
    const r = { ...this }
    const [lct, lgr] = this.decompileListsBrut()
    r.lct = lct
    r.lgr = lgr
    return schemas.serialize('idbAvatar', r)
  }

  fromIdb (idb) {
    schemas.deserialize('idbAvatar', idb, this)
    this.compileLists(this.lct, this.lgr, true)
    delete this.lct
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
  cols: ['id', 'vcv', 'st', 'phinf']

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

  /*
  nouveau (id, vcv, st, photo, info) {
    this.id = id
    this.vcv = vcv
    this.st = st
    this.photo = photo
    this.info = info
    return this
  }

  fromAvatar (av) { // av : objet Avatar
    this.id = av.id
    this.vcv = av.vcv
    this.st = av.st
    this.photo = av.photo
    this.info = av.info
    return this
  }
  */

  async fromRow (row) { // row : rowCv - item retour de sync
    this.id = row.id
    this.vcv = row.vcv
    this.st = row.cv
    if (!this.suppr) {
      const x = row.phinf ? deserial(await crypt.decrypter(this.na.cle, row.phinf)) : null
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

  fusionCV (cv) {
    if (!this.fake && this.vcv > cv.vcv) return true // existante plus récente
    cv.lctc = this.lctc
    cv.lmbr = this.lmbr
    return false
  }
}

/** contact **********************************/

schemas.forSchema({
  name: 'idbContact',
  cols: ['id', 'ic', 'v', 'st', 'q1', 'q2', 'qm1', 'qm2', 'ard', 'icb', 'data', 'mc', 'info', 'vsh']
})
/*
- `id` : id de l'avatar A
- `ic` : indice de contact de B pour A.
- `v` :
- `st` : statut entier de 3 chiffres, `x y z` : **les valeurs < 0 indiquent un row supprimé (les champs après sont null)**.
  - `x` : 0: contact présumé actif, 2:disparu
  - `y` : A accepte 1 (ou non 0) les partages de B.
  - `z` : B accepte 1 (ou non 0) les partages de A.
- `q1 q2 qm1 qm2` : balance des quotas donnés / reçus par l'avatar A à l'avatar B (contact _fort_).
- `ardc` : **ardoise** partagée entre A et B cryptée par la clé `cc` associée au contact _fort_ avec un avatar B.
- `icbc` : pour un contact fort _accepté_, indice de A chez B (communiqué lors de l'acceptation par B) pour mise à jour dédoublée de l'ardoise et du statut, crypté par la clé `cc`.
- `datak` : information cryptée par la clé K de A.
  - `nom rnd` : nom complet de l'avatar.
  - `cc` : 32 bytes aléatoires donnant la clé `cc` d'un contact _fort_ avec B (en attente ou accepté). Le hash de `cc` est **le numéro d'invitation** `ni` retrouvé en clé de invitct correspondant.
  - `dlv` : date limite de validité de l'invitation à être contact _fort_ ou du parrainage.
  - `pph` : hash du PBKFD de la phrase de parrainage.
- `mc` : mots clés
- `infok` : commentaire (personnel) de A sur B crypté par la clé K du membre
- `vsh`
*/

export class Contact {
  get table () { return 'contact' }

  get sid () { return crypt.idToSid(this.id) }

  get sid2 () { return '' + this.ic }

  get pk () { return this.sid + '/' + this.sid2 }

  get suppr () { return this.st < 0 }

  get horsLimite () { return false }

  get sidav () { return this.sid }

  get na () { return data.getNa(this.id, this.ic) } // na DU CONTACT

  get cv () { return data.repertoire.getCv(this.na.id) } // cv DU CONTACT

  get nom () {
    const cv = this.cv
    return this.data.nom + (!cv || !cv.info ? '' : ' [' + cv.info + ']')
  }

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
      this.data = deserial(await crypt.decrypter(data.clek, row.datak))
      this.majCc()
      this.ard = row.ardc ? await crypt.decrypterStr(this.data.cc, row.ardc) : ''
      this.icb = row.icbc ? crypt.u8ToInt(await crypt.decrypter(this.data.cc, row.icbc)) : 0
      this.mc = row.mc || null
      this.info = row.infok ? await crypt.decrypter(data.clek, row.infok) : ''
    }
    return this
  }

  async toRow () { // pas de toRow pour un supprimé
    const r = { ...this }
    r.datak = await crypt.crypter(data.clek, serial(r.data))
    r.infok = r.info ? await crypt.crypter(data.clek, r.info) : null
    r.ardc = r.ard ? await crypt.crypter(this.data.cc, r.ard) : null
    r.icbc = r.icb ? await crypt.crypter(this.data.cc, crypt.intTou8(r.icb)) : 0
    return schemas.serialize('rowcontact', this)
  }

  get toIdb () { // Un supprimé n'est pas écrit en IDB
    return schemas.serialize('idbContact', this)
  }

  fromIdb (idb) { // Jamais de supprimé en IDB
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
- `st` : statut : < 0-supprimé - Deux chiffres `x y`
  - `x` : 1-ouvert, 2-fermé, 3-ré-ouverture en vote
  - `y` : 0-en écriture, 1-archivé
- `cvg` : carte de visite du groupe `[photo, info]` cryptée par la clé G du groupe.
- `mcg` : liste des mots clés définis pour le groupe cryptée par la clé du groupe cryptée par la clé G du groupe.
- `lmbg` : liste des ids des membres (possiblement seulement pressentis / invités) du groupe.
          L'indice dans la liste est leur `im`.
- `vsh`
*/

schemas.forSchema({
  name: 'idbGroupe',
  cols: ['id', 'v', 'dds', 'st', 'cv', 'mc', 'lmb', 'vsh']
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

  get nom () {
    if (this.cv.info) {
      const s = this.cv.info
      const i = s.indexOf('\n')
      return (i === -1 ? s : s.substring(0, i)).substring(0, 16)
    } else return this.na.nom
  }

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

  /*
  Map ayant pour clé les sid des avatars du compte
  et pour valeur le couple [invitgr, membre] de l'avatar correspondant dans le groupe
  */
  mapInvitgrMembre () {
    const mapmembres = data.membre(this.id)
    const res = {}
    for (const im in mapmembres) {
      const membre = mapmembres[im]
      const na = new NomAvatar(membre.nomc)
      const avid = na.id
      if (data.avec(avid)) { // c'est un avatar du compte
        const invitgr = data.getInvitgr(na.sid, im) // peut retourner null si résilié
        res[na.sid] = [invitgr, membre]
      }
    }
    return res
  }

  maxSty () {
    // plus haut statut lecteur / auteur / animateur : -1 si non accédant
    let sty = -1
    const m = this.mapInvitgrMembre()
    for (const avsid in m) {
      const [invitgr] = m[avsid]
      if (invitgr.st > 0) {
        if (invitgr.stx === 3) {
          const y = invitgr.sty
          if (y >= 0 && y > sty) sty = y
        }
      }
    }
    return sty
  }

  async fromRow (row) {
    this.vsh = row.vsh || 0
    this.id = row.id
    this.v = row.v
    this.dds = row.dds
    this.st = row.st
    if (!this.suppr) {
      const cv = row.cvg ? deserial(await crypt.decrypter(this.cleg, row.cvg)) : ['', '']
      this.photo = cv[0]
      this.info = cv[1]
      this.mc = row.mcg ? deserial(await crypt.decrypter(this.cleg, row.mcg)) : {}
      this.lmb = deserial(await crypt.decrypter(this.cleg, row.lmbg))
    }
    return this
  }

  async toRow () {
    const r = { ...this }
    r.cvg = await crypt.crypter(this.cleg, serial([this.photo, this.info]))
    r.mcg = r.mc.length ? await crypt.crypter(this.cleg, serial(this.mc)) : null
    r.lmbg = await crypt.crypter(this.cleg, serial(this.lmb))
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

/** Invitct reçue par A de B **********************************/
/*
- `id` : id de A.
- `ni` : numéro aléatoire d'invitation en complément de `id` (généré par B).
- `v` :
- `dlv` : la date limite de validité permettant de purger les rencontres (quels qu'en soient les statuts).
- `st` : <= 0: annulée, 0: en attente
- `datap` : données cryptées par la clé publique de B.
  - `nom rnd` : nom complet de B.
  - `ic` : index de A dans la liste des contacts de B (pour que A puisse écrire le statut et l'ardoise dans `contact` de B).
  - `cc` : clé `cc` du contact *fort* A / B, définie par B.
- `vsh`
*/

schemas.forSchema({
  name: 'idbInvitct',
  cols: ['id', 'ni', 'v', 'dlv', 'st', 'data', 'vsh']
})

export class Invitct {
  get table () { return 'invitct' }

  get sid () { return crypt.idToSid(this.id) }

  get sid2 () { return crypt.idToSid(this.ni) }

  get pk () { return this.sid + '/' + this.sid2 }

  get suppr () { return this.st < 0 }

  get horsLimite () { return !this.suppr ? dlvDepassee(this.dlv) : false }

  get sidav () { return this.sid }

  get clec () { return this.data.cc }

  async fromRow (row) {
    this.vsh = row.vsh
    this.id = row.id
    this.ni = row.ni
    this.v = row.v
    this.dlv = row.dlv
    this.st = row.st
    if (!this.suppr) {
      const cpriv = data.avc(this.id).cpriv
      this.data = deserial(await crypt.decrypterRSA(cpriv, row.datap))
      this.nab = data.setNa(this.data.nom, this.data.rnd)
    }
    return this
  }

  async toRow (clepub) {
    const r = { ...this }
    r.datap = await crypt.crypterRSA(clepub, serial(this.data))
    return schemas.serialize('rowinvitct', this)
  }

  get toIdb () {
    return schemas.serialize('idbInvitct', this)
  }

  fromIdb (idb) {
    schemas.deserialize('idbInvitct', idb, this)
    this.nab = data.setNa(this.data.nom, this.data.rnd)
    return this
  }
}

/** Invitgr **********************************/
/*
- `id` : id du membre invité.
- `ni` : numéro d'invitation.
- `v` :
- `dlv` :
- `st` : statut.  < 0 signifie supprimé. 0: invité.
- `datap` : crypté par la clé publique du membre invité.
  - `nom rnd` : nom complet du groupe (donne sa clé).
  - `im` : indice de membre de l'invité dans le groupe.
  - `idi` : id du membre invitant.
  - `p` : 0:lecteur, 1:auteur, 2:administrateur.
- `vsh`
*/

schemas.forSchema({
  name: 'idbInvitgr',
  cols: ['id', 'ni', 'v', 'dlv', 'st', 'data', 'vsh']
})

export class Invitgr {
  get table () { return 'invitgr' }

  get sid () { return crypt.idToSid(this.id) }

  get sid2 () { return crypt.idToSid(this.ni) }

  get pk () { return this.sid + '/' + this.sid2 }

  get suppr () { return this.st < 0 }

  get horsLimite () { return !this.suppr ? dlvDepassee(this.dlv) : false }

  get sidav () { return this.sid }

  get stx () { return this.st < 0 ? -1 : Math.floor(this.st / 10) }

  get sty () { return this.st < 0 ? -1 : this.st % 10 }

  // retourne le membre correspondant si cet invitgr est invité ou actif sinon null, et le groupe
  membreGroupe () {
    const x = this.stx
    if (x !== 2 && x !== 3) return null
    const m = data.membre(this.idg, this.data.im)
    const g = data.getGroupe(this.idg)
    return [m, g]
  }

  async fromRow (row) {
    this.vsh = row.vsh || 0
    this.id = row.id
    this.ni = row.ni
    this.v = row.v
    this.dlv = row.dlv
    this.st = row.st
    if (!this.suppr) {
      const cpriv = data.avc(this.id).cpriv
      this.data = deserial(await crypt.decrypterRSA(cpriv, row.datap))
      this.nag = data.setNa(this.data.nom, this.data.rnd)
      this.nam = data.setNa(this.data.nom, this.data.rnd, this.id, data.im)
    }
    return this
  }

  async toRow (clepub) {
    const r = { ...this }
    r.datap = await crypt.crypter(clepub, serial(this.data))
    return schemas.serialize('rowinvitgr', r)
  }

  get toIdb () {
    return schemas.serialize('idbInvitgr', this)
  }

  fromIdb (idb) {
    schemas.deserialize('idbInvitgr', idb, this)
    this.nag = data.setNa(this.data.nom, this.data.rnd)
    this.nam = data.setNa(this.data.nom, this.data.rnd, this.id, data.im)
    return this
  }
}

/** Membre ***********************************/
/*
- `id` : id du groupe.
- `im` : numéro du membre dans le groupe.
- `v` :
- `st` : statut. `xp` : < 0 signifie supprimé.
  - `x` : 1:pressenti, 2:invité, 3:ayant refusé, 3:actif (invitation acceptée), 8: résilié.
  - `p` : 0:lecteur, 1:auteur, 2:administrateur.
- `vote` : vote de réouverture.
- `q1 q2` : balance des quotas donnés / reçus par le membre au groupe.
- `mc` : mots clés du membre à propos du groupe.
- `infok` : commentaire du membre à propos du groupe crypté par la clé K du membre.
- `datag` : données cryptées par la clé du groupe.
  - `nom, rnd` : nom complet de l'avatar.
  - `ni` : numéro d'invitation du membre dans `invitgr`. Permet de supprimer supprimer l'invitation et d'effacer le groupe dans son avatar (`lmbk`).
  - `dlv` : date limite de validité de l'invitation. N'est significative qu'en statut _invité_.
  - `idi` : id du premier membre qui l'a pressenti / invité.
- `ardg` : ardoise du membre vis à vis du groupe. Contient le texte d'invitation puis la réponse de l'invité cryptée par la clé du groupe. Ensuite l'ardoise peut être écrite par le membre (actif) et les animateurs.
- `vsh`
*/

schemas.forSchema({
  name: 'idbMembre',
  cols: ['id', 'im', 'v', 'st', 'vote', 'dlv', 'q1', 'q2', 'mc', 'info', 'data', 'ard', 'vsh']
})

export class Membre {
  get table () { return 'membre' }

  get sid () { return crypt.idToSid(this.id) }

  get sid2 () { return '' + this.im }

  get pk () { return this.sid + '/' + this.sid2 }

  get suppr () { return this.st < 0 }

  get horsLimite () { return !this.suppr ? (this.stx === 2 && dlvDepassee(this.dlv)) : false }

  get sidgr () { return this.sid }

  get stx () { return this.st < 0 ? -1 : Math.floor(this.st / 10) }

  get stp () { return this.st < 0 ? -1 : this.st % 10 }

  get namb () { return data.getNa(this.id, this.im) }

  get cleg () { return data.getNa(this.id).cle }

  /* retourne l'invitgr correspondant
  - si le membre est un avatar du groupe,
  - si cet invitgr existe et est invité ou actif,
  sinon null
  */
  invitgr () {
    const na = this.na
    if (!na) return null
    const x = this.stx
    return (x === 2 || x === 3) && data.avc(na.id) ? data.getInvitgr(na.sid, crypt.idToSid(this.data.ni)) : null
  }

  async fromRow (row) {
    this.vsh = row.vsh || 0
    this.id = row.id
    this.im = row.im
    this.v = row.v
    this.st = row.st
    if (!this.suppr) {
      this.dlv = row.dlv
      this.data = deserial(await crypt.decrypter(this.cleg, row.datag))
      data.setNa(this.data.nom, this.data.rnd, this.id, this.im)
      this.ard = row.ardg ? await crypt.decrypterStr(this.cleg, row.ardg) : ''
      this.info = row.infok ? deserial(await crypt.decrypter(data.clek, row.infok)) : ''
      this.mc = row.mc
    }
    return this
  }

  async toRow () {
    const r = { ...this }
    r.datag = await crypt.crypter(this.cleg, serial(this.data))
    r.ardg = await crypt.crypter(this.cleg, this.ard)
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
- `st` : <0: annulé par P, 0: en attente de décision de F
- `q1 q2 qm1 qm2` : quotas donnés par P à F en cas d'acceptation.
- `datak` : cryptée par la clé K du parrain, **phrase de parrainage et clé X** (PBKFD de la phrase). La clé X figure afin de ne pas avoir à recalculer un PBKFD en session du parrain pour qu'il puisse afficher `datax`.
- `datax` : données de l'invitation cryptées par le PBKFD de la phrase de parrainage.
  - `nomp, rndp` : nom complet de l'avatar P.
  - `nomf, rndf` : nom complet du filleul F (donné par P).
  - `cc` : clé `cc` générée par P pour le couple P / F.
  - `ic` : numéro de contact du filleul chez le parrain.
- `vsh`
*/

schemas.forSchema({
  name: 'idbParrain',
  cols: ['pph', 'id', 'v', 'ic', 'dlv', 'st', 'q1', 'q2', 'qm1', 'qm2', 'ph', 'cx', 'data', 'vsh']
})

export class Parrain {
  get table () { return 'parrain' }

  get sid () { return crypt.idToSid(this.pph) }

  get sid2 () { return null }

  get pk () { return this.sid }

  get suppr () { return this.st < 0 }

  get horsLimite () { return !this.suppr ? dlvDepassee(this.dlv) : false }

  get sidav () { return crypt.idToSid(this.id) }

  async fromRow (row) {
    this.vsh = row.vsh || 0
    this.pph = row.pph
    this.id = row.id
    this.dlv = row.dlv
    this.st = row.st
    this.v = row.v
    if (!this.suppr) {
      this.q1 = row.q1
      this.q2 = row.q2
      this.qm1 = row.qm1
      this.qm2 = row.qm2
      const x = deserial(await crypt.decrypter(data.clek, row.datak))
      this.ph = x[0]
      this.cx = x[1]
      this.data = deserial(await crypt.decrypter(this.clex, row.datax))
      this.nap = new NomAvatar(this.data.nomp, this.data.rndp)
      this.naf = new NomAvatar(this.data.nomp, this.data.rndp)
    }
    return this
  }

  async toRow () {
    const r = { ...this }
    r.datak = await crypt.crypter(data.clek, serial([this.ph, this.cx]))
    r.datax = await crypt.crypter(this.clex, serial(this.data))
    return schemas.serialize('rowparrain', r)
  }

  get toIdb () {
    return schemas.serialize('idbParrain', this)
  }

  fromIdb (idb) {
    schemas.deserialize('idbParrain', idb, this)
    this.nap = new NomAvatar(this.data.nomp, this.data.rndp)
    this.naf = new NomAvatar(this.data.nomp, this.data.rndp)
    return this
  }
}

/** Rencontre **********************************/
/*
- `prh` : hash du PBKFD de la phrase de rencontre.
- `id` : id de l'avatar A ayant initié la rencontre.
- `v` :
- `dlv` : date limite de validité permettant de purger les rencontres.
- `st` : < 0:annulée, 0:en attente, 1:contact simple récupéré par B, 2:contact refusé
- `datak` : **phrase de rencontre et son PBKFD** (clé X) cryptée par la clé K du compte A pour que A puisse retrouver les rencontres qu'il a initiées avec leur phrase.
- `nomcx` : nom complet `[nom, rnd]` de A (pas de B, son nom complet n'est justement pas connu de A) crypté par la clé X.
- `vsh`
*/

schemas.forSchema({
  name: 'idbRencontre',
  cols: ['prh', 'id', 'v', 'dlv', 'st', 'ph', 'cx', 'nom', 'rnd', 'vsh']
})

export class Rencontre {
  get table () { return 'rencontre' }

  get sid () { return crypt.idToSid(this.prh) }

  get sid2 () { return null }

  get pk () { return this.sid }

  get sidav () { return crypt.idToSid(this.id) }

  get horsLimite () { return !this.suppr ? dlvDepassee(this.dlv) : false }

  get na () { return data.getNa(this.id) }

  async fromRow (row) {
    this.vsh = row.vsh || 0
    this.prh = row.prh
    this.id = row.id
    this.dlv = row.dlv
    this.st = row.st
    this.v = row.v
    if (!this.suppr) {
      const x = deserial(await crypt.decrypter(data.clek, row.datak)) // ['phrase', Uint8Array(32)]
      this.ph = x[0]
      this.cx = x[1]
      this.nomcx = row.nomcx
    }
    return this
  }

  async toRow () {
    const r = { ...this }
    r.datak = await crypt.crypter(data.clek, serial([this.ph, this.cx]))
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
  - 99999 pour un *permanent*.
  - `dlv` pour un _temporaire_.
- `ora` : 0:ouvert, 1:restreint, 2:archivé
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
- `refs` : référence vers un autre secret cryptée par la clé du secret.
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

  get vk () { return this.pk + '@' + this.v }

  get suppr () { return this.st < 0 }

  get horsLimite () { return this.st < 0 || this.st >= 99999 ? false : dlvDepassee(this.st) }

  get sidavgr () { return this.sid }

  get ts () { return this.ns % 3 } // 0:personnel 1:couple 2:groupe

  get titre () {
    const i = this.txt.t.indexOf('\n')
    return i === -1 ? this.txt.t.substring(0, 100) : this.txt.t.substring(0, (i < 100 ? i : 100))
  }

  get nbj () { return this.st <= 0 || this.st === 99999 ? 0 : (this.st - getJourJ()) }

  get dh () { return dhstring(new Date(this.txt.d * 1000)) }

  get cles () {
    return this.ts ? (this.ts === 1 ? data.getNa(this.id, this.ic) : data.getNa(this.id).cle) : data.clek
  }

  get contact () {
    if (this.ts !== 1) return null
    return data.getContact(this.id, this.ic)
  }

  nouveauP (id, ref) {
    this.id = id
    this.ns = (Math.floor(crypt.rnd4() / 3) * 3)
    this.ic = 0
    this.st = getJourJ() + cfg().limitesjour[0]
    this.ora = 999
    this.mc = new Uint8Array([])
    this.txt = { t: '', d: Math.floor(new Date().getTime() / 1000) }
    this.ref = ref || null
    return this
  }

  nouveauC (id, contact, ref) {
    this.id = id
    this.ns = (Math.floor(crypt.rnd4() / 3) * 3) + 1
    this.ic = contact.ic
    this.st = getJourJ() + cfg().limitesjour[0]
    this.ora = 999
    this.mc = new Uint8Array([])
    this.id2 = contact.na.id
    this.ns2 = (Math.floor(crypt.rnd4() / 3) * 3) + 1
    this.ic2 = contact.icb
    this.txt = { t: '', l: new Uint8Array([]), d: Math.floor(new Date().getTime() / 1000) }
    this.ref = ref || null
    return this
  }

  nouveauG (id, groupe, ref) {
    this.id = groupe.id
    this.ns = (Math.floor(crypt.rnd4() / 3) * 3) + 2
    this.ic = groupe.imDeId(id)
    this.ora = 999
    this.mc = { 0: new Uint8Array([]) }
    this.mc[this.ic] = new Uint8Array([])
    this.st = getJourJ() + cfg().limitesjour[0]
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
        const map = deserial(this.mpjs)
        for (const cpj in map) {
          const x = map[cpj]
          const nomc = await crypt.decrypterStr(cles, crypt.b64ToU8(x[0]))
          const i = nomc.indexOf('/')
          this.nbpj++
          this.mpj[cpj] = { n: nomc.substring(0, i), dh: nomc.substring(i + 1), t: x[1] }
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
    return this
  }
}
