import { schemas } from './schemas.mjs'
import { crypt } from './crypto.mjs'
import { openIDB, closeIDB } from './db.mjs'
import { openWS, closeWS } from './ws.mjs'
import { store, appexc, serial, deserial, dlvDepassee, NomAvatar, gzip, ungzip, dhstring } from './util.mjs'
import { remplacePage } from './page.mjs'

/* mapObj : clé par table, valeur : array des objets
- ne traite pas 'compte'
- inscrit en store OU les supprime du store s'il y était
- objets : array remplie par tous les objets à mettre en IDB
Retourne vcv : version de la plus CV trouvée
*/
export function commitMapObjets (objets, mapObj) { // SAUF mapObj.compte
  let vcv = 0

  function push (n) { mapObj[n].forEach((x) => { objets.push(x) }) }

  if (mapObj.avatar) {
    /* Quand un nouvel avatar apprait en synchro, il a été créé dans une autre session
    après le chargement initial synchronisé : les autres rows mis à jour / créés depuis
    vont donc parvenir en messages de synchro */
    data.setAvatars(mapObj.avatar)
    push('avatar')
  }

  if (mapObj.contact) {
    /* Pour chaque contact, gestion de sa CV dans le répertoire :
    - soit création (fake)
    - soit suppression
    - soit mise à jour de la liste des contacts dans la CV
    */
    mapObj.idbContact.forEach((x) => {
      if (x.suppr) {
        const avant = data.getContact(x.sid, x.sid2)
        if (avant && !avant.suppr) {
          data.repertoire.getCv(avant.nactc).moinsCtc(x.id)
        }
      } else {
        data.repertoire.getCv(x.nactc).plusCtc(x.id)
      }
    })
    data.setContacts(mapObj.contact)
    push('contact')
  }

  if (mapObj.invitct) {
    // Comme contact
    mapObj.invitct.forEach((x) => {
      if (x.suppr) {
        const avant = data.getInvitct(x.sid, x.sid2)
        if (avant && !avant.suppr) {
          data.repertoire.getCv(avant.nactc).moinsCtc(x.id)
        }
      } else {
        data.repertoire.getCv(x.nactc).plusCtc(x.id)
      }
    })
    data.setInvitCts(mapObj.invitct)
    push('invitct')
  }

  if (mapObj.invitgr) {
    /* Les groupes n'ont pas de CV.
    La liste des groupes peut changer par invitgr
    */
    data.setInvitGrs(mapObj.invitgr)
    push('invitgr')
  }

  if (mapObj.parrain) {
    data.setParrains(mapObj.parrain)
    push('parrain')
  }

  if (mapObj.rencontre) {
    data.setRencontres(mapObj.rencontre)
    push('rencontre')
  }

  if (mapObj.groupe) {
    data.setGroupes(mapObj.groupe)
    push('groupe')
  }

  if (mapObj.membre) {
    // Gérer la CV comme pour un contact
    mapObj.membre.forEach((x) => {
      if (x.suppr) {
        const avant = data.getMembre(x.sid, x.sid2)
        if (avant && !avant.suppr) {
          data.repertoire.getCv(avant.namb).moinsMbr(x.id)
        }
      } else {
        data.repertoire.getCv(x.namb).plusMbr(x.id)
      }
      if (x.st < 0) {
        const avant = this.membre(x.id, x.im)
        if (avant) this.cvMoinsMbr(avant.data.na.sid, x.id)
      } else {
        this.cvPlusMbr(x.data.na, x.id)
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
        const cv = data.repertoire.getCvParSid(x.sid)
        if (cv) {
          const xok = cv.fusionCV(x)
          if (!xok) data.repertoire.setCv(cv)
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

  getCv (na) {
    const sid = na.sid
    let cv = this.rep[sid]
    if (!cv) {
      cv = new Cv(na)
      this.rep[sid] = cv
      this.modif = true
    }
    return cv
  }

  getCvParSid (na) {
    const sid = na.sid
    let cv = this.rep[sid]
    if (!cv) {
      cv = new Cv(na)
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
    this.cleg = {} // clés des groupes accédés
    this.clec = {} // clés C des contacts {id, {ic... }}
    this.nomRnd = {} // [nom, rnd] des contacts / membres (ayant CV)

    this.opWS = null // opération WS en cours
    this.opUI = null // opération UI en cours

    this.syncqueue = [] // notifications reçues sur WS et en attente de traitement

    this.verAv = new Map() // versions des tables relatives à chaque Avatar (par sid)
    this.verGr = new Map() // versions des tables relatives à chaque Groupe (par sid)

    // dans chargementIdb seulement
    this.refsAv = null // id des avatars référencés détectées lors du chargement IDB
    this.refsGr = null // id des groupes référencés détectées lors du chargement IDB

    this.idbSetAvatars = null // Set des ids des avatars chargés par IDB
    this.idbSetGroupes = null // Set des ids des avatars chargés par IDB
    this.idbsetCvsUtiles = null // Set des ids des avatars chargés par IDB
  }

  setVerAv (sid, idt, v) { // idt : Index de la table
    let t
    if (!this.verAv.has(sid)) {
      t = new Array(SIZEAV).fill(0)
      this.verAv.set(sid, t)
    } else t = this.verAv.get(sid)
    if (v > t[idt]) t[idt] = v
  }

  setVerGr (sid, idt, v) { // idt : Index de la table
    let t
    if (!this.verGr.has(sid)) {
      t = new Array(SIZEGR).fill(0)
      this.verGr.set(sid, t)
    } else t = this.verGr.get(sid)
    if (v > t[idt]) t[idt] = v
  }

  clegDe (sid) {
    return this.cleg[sid]
  }

  clecDe (sid) { // clé d'un contact
    return this.clec[sid]
  }

  get setDesAvatars () {
    const s = new Set()
    for (const sid in this.getCompte().mac) s.add(this.getCompte().mac[sid].na.id)
    return s
  }

  get setDesGroupes () {
    const s = new Set()
    const l1 = store().state.db.invitgrs
    for (const ids in l1) {
      const l2 = l1[ids]
      for (const nis in l2) {
        const g = l2[nis]
        if (g.st >= 0 && g.data) s.add(g.data.idg)
      }
    }
    return s
  }

  /* Getters / Setters ****************************************/
  getCompte () { return store().state.db.compte }

  setCompte (compte) { store().commit('db/setCompte', compte) }

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

  getContact (sid, sid2) { return store().getters['db/contact'](sid, sid2) }

  getContactParId (sid, sidc) { return store().getters['db/contactParId'](sid, sidc) }

  setContacts (lobj, hls) {
    if (lobj.length) {
      if (hls) lobj.forEach(obj => { if (obj.suppr) hls.push(obj) })
      store().commit('db/setObjets', ['contact', lobj])
    }
  }

  getInvitct (sid, sid2) { return store().getters['db/invitct'](sid, sid2) }

  setInvitcts (lobj, hls) {
    if (lobj.length) {
      if (hls) lobj.forEach(obj => { if (obj.suppr || obj.horslimite) hls.push(obj) })
      store().commit('db/setObjets', ['invitct', lobj])
    }
  }

  getInvitgr (sid, sid2) { return store().getters['db/invitgr'](sid, sid2) }

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

  purgeAvatars (lav) { if (lav.size) store().commit('db/purgeAvatars', lav) }

  purgeGroupes (lgr) { if (lgr.size) store().commit('db/purgeGroupes', lgr) }
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
  cols: ['id', 'v', 'dds', 'dpbh', 'pcbh', 'k', 'mmc', 'mac', 'memo', 'vsh']
})
/*
- `id` : id du compte.
- `v` :
- `dds` : date (jour) de dernière signature.
- `dpbh` : hashBin (53 bits) du PBKFD du début de la phrase secrète (32 bytes). Pour la connexion, l'id du compte n'étant pas connu de l'utilisateur.
- `pcbh` : hashBin (53 bits) du PBKFD de la phrase complète pour quasi-authentifier une connexion avant un éventuel échec de décryptage de `kx`.
- `kx` : clé K du compte, crypté par la X (phrase secrète courante).
- `mmck` {} : cryptées par la clé K, map des mots clés déclarés par le compte.
  - *clé* : id du mot clé de 1 à 99.
  - *valeur* : libellé du mot clé.
- `mack` {} : map des avatars du compte cryptée par la clé K. Clé: id, valeur: `[nom, rnd, cpriv]`
  - `nom rnd` : nom complet.
  - `cpriv` : clé privée asymétrique.
- `memok` : texte court libre (crypté par la clé K) vu par le seul titulaire du compte. Le début de la première ligne s'affiche en haut de l'écran.
- `vsh`
*/

export class Compte {
  get table () { return 'compte' }

  get sid () { return crypt.idToSid(this.id) }

  get pk () { return this.id }

  get suppr () { return false }

  get horsLimite () { return false }

  get titre () {
    if (!this.memo) return this.sid
    const i = this.memo.indexOf('\n')
    return i === -1 ? this.memo : this.memo.substring(0, i)
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
    this.mmc = {}
    this.memo = 'Mémo de ' + nomAvatar.nom + '@' + nomAvatar.sfx
    this.vsh = 0
    return this
  }

  get avatars () {
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
    }

    this.mmc = deserial(await crypt.decrypter(this.k, row.mmck))

    this.memo = await crypt.decrypterStr(this.k, row.memok)

    return this
  }

  async toRow () {
    const r = { ...this }
    r.memok = await crypt.crypter(data.clek, this.memo)

    r.mmck = await crypt.crypter(data.clek, serial(this.mmc))

    const m = {}
    for (const sid in this.mac) {
      const x = this.mac[sid]
      m[sid] = [x.na.nom, x.na.rnd, x.cpriv]
    }
    r.mack = await crypt.crypter(data.clek, serial(m))

    r.kx = await crypt.crypter(data.ps.pcb, this.k)

    return schemas.serialize('rowcompte', r)
  }

  get toIdb () {
    return { id: 1, data: schemas.serialize('idbCompte', this) }
  }

  fromIdb (idb, vs) {
    schemas.deserialize('idbCompte', idb, this)
    data.clek = this.k
    return this
  }

  get clone () {
    return schemas.clone('idbCompte', this, new Compte())
  }

  av (id) { // retourne { na: , cpriv: }
    return this.mac[crypt.idToSid(id)]
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
  - _clé_ : ni, numéro d'invitation (aléatoire 4 bytes) obtenue sur invitgr.
  - _valeur_ : cryptée par la clé K du compte du triplet `[nom, rnd, im]` reçu sur invitgr et inscrit à l'acceptation de l'invitation.
  - une entrée est effacée par la résiliation du membre au groupe (ce qui lui empêche de continuer à utiliser la clé du groupe).
- `vsh`
*/

schemas.forSchema({
  name: 'idbAvatar',
  cols: ['id', 'v', 'st', 'vcv', 'dds', 'photo', 'info', 'lct', 'lmg', 'vsh']
})

export class Avatar {
  get table () { return 'avatar' }

  get sid () { return crypt.idToSid(this.id) }

  get sidav () { return crypt.idToSid(this.id) }

  get pk () { return this.id }

  get suppr () { return this.st < 0 }

  get horsLimite () { return false }

  get label () { return this.na.nom }

  get icone () { return this.photo || '' }

  get nomc () { return this.na.nomc }

  constructor () {
    this.m1ct = new Map() // clé:idc val:ic
    this.m2ct = new Map() // clé:ic val:idc
    this.m1gr = new Map() // clé:idg val: na, im
  }

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
    this.lgr = []
    this.vsh = 0
    return this
  }

  async compileLists (lct, lgr, brut) { // lct: [[id, ic] ...]  lgr: [[id, im] ...]
    this.m1ct.clear()
    this.m2ct.clear()
    this.m1gr.clear()
    lct.forEach(x => { this.m1ct.set(x[0], x[1]); this.m2ct.set(x[1], x[0]) })
    for (const ni in lgr) {
      const y = lgr[ni]
      const x = deserial(brut ? y : await crypt.decrypter(data.clek, y))
      const na = new NomAvatar(x[0], x[1])
      data.cleg[na.sid] = na.cle
      this.m1gr.set(ni, { na: na, im: x[2] })
    }
  }

  async decompileLists (brut) {
    const lct = []
    const lgr = []
    this.m1ct.forEach((v, k) => { lct.push([k, v]) })
    for (const ni in lgr) {
      const x = this.m1gr.get(ni)
      const y = serial([x.na.nom, x.na.rnd, x.im])
      lgr[ni] = brut ? y : await crypt.crypter(data.clek, y)
    }
    return [lct, lgr]
  }

  async fromRow (row) {
    this.vsh = row.vsh || 0
    this.id = row.id
    this.na = data.avc(this.id).na
    this.v = row.v
    this.st = row.st
    this.vcv = row.vcv
    this.dds = row.dds
    const x = deserial(await crypt.decrypter(this.na.cle, row.cva))
    this.photo = x[0]
    this.info = x[1]
    const lct = deserial(await crypt.decrypter(data.clek, row.lctk))
    await this.compileLists(lct, deserial(row.lgrk))
    return this
  }

  async cvToRow (ph, info) {
    return await crypt.crypter(this.na.cle, serial([ph, info]))
  }

  async toRow () {
    const r = { ...this }
    const [lct, lgrk] = await this.decompileLists()
    r.cva = await this.cvToRow(this.photo, this.info)
    r.lctk = await crypt.crypter(data.clek, serial(lct))
    r.lgrk = serial(lgrk)
    return schemas.serialize('rowavatar', r)
  }

  get toIdb () {
    const r = { ...this }
    const [lct, lgr] = this.decompileLists(true)
    r.lct = lct
    r.lgr = lgr
    return { id: this.id, data: schemas.serialize('idbAvatar', r) }
  }

  fromIdb (idb) {
    schemas.deserialize('idbAvatar', idb, this)
    this.compileLists(this.lct, this.lgr, true)
    this.na = data.avc(this.id).na
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
  cols: ['id', 'vcv', 'st', 'nom', 'rnd', 'photo', 'info']
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

  get pk () { return this.id }

  get suppr () { return this.st < 0 }

  get horsLimite () { return false }

  constructor (na) {
    // Si na est présent, c'est un "fake"
    this.lctc = []
    this.lmbr = []
    // eslint-disable-next-line no-unneeded-ternary
    this.fake = na ? true : false
    this.vcv = 0
    this.st = 0
    this.photo = ''
    this.info = na ? na.nomc : ''
  }

  clone () {
    const cl = new Cv()
    cl.id = this.id
    cl.vcv = this.vcv
    cl.st = this.st
    cl.na = this.na
    cl.photo = this.photo
    cl.info = this.info
    this.lctc.forEach((x) => cl.lctc.push(x))
    this.lmbr.forEach((x) => cl.lmbr.push(x))
    return cl
  }

  nouveau (id, vcv, st, nom, rnd, photo, info) {
    this.id = id
    this.vcv = vcv
    this.st = st
    this.na = new NomAvatar(nom, rnd)
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

  fromAvatar (av) { // av : objet Avatar
    this.id = av.id
    this.vcv = av.vcv
    this.st = av.st
    this.na = av.na
    this.photo = av.photo
    this.info = av.info
    return this
  }

  async fromRow (row) { // row : rowCv - item retour de sync
    this.id = row.id
    this.vcv = row.vcv
    this.st = row.cv
    if (!this.suppr) {
      const [nom, rnd] = data.nomRnd[this.sid]
      this.na = new NomAvatar(nom, rnd)
      const x = row.phinf ? deserial(await crypt.decrypter(this.na.cle, row.phinf)) : null
      this.photo = x ? x[0] : ''
      this.info = x ? x[1] : this.na.nomc
    }
    return this
  }

  get toIdb () {
    return { id: this.id, data: schemas.serialize('idbCv', this) }
  }

  fromIdb (idb) {
    schemas.deserialize('idbCv', idb, this)
    this.na = new NomAvatar(this.nom, this.rnd)
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
  cols: ['id', 'ic', 'v', 'st', 'q1', 'q2', 'qm1', 'qm2', 'ard', 'icb', 'data', 'an', 'vsh']
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
- `ank` : annotation cryptée par la clé K du membre
  - `mc` : mots clés
  - `txt` : commentaires (personnel) de A sur B
- `vsh`
*/

export class Contact {
  get table () { return 'contact' }

  get sid () { return crypt.idToSid(this.id) }

  get sid2 () { return '' + this.ic }

  get sidCtc () { return this.sid + '/' + this.sid2 }

  get pk () { return [this.id, this.ic] }

  get suppr () { return this.st < 0 }

  get horsLimite () { return false }

  get sidav () { return this.sid }

  /* NomAvatar de l'avatar contact de l'avatar du compte id */
  get nactc () { return !this.suppr ? new NomAvatar(this.data.nom, this.data.rnd) : null }

  majCc () {
    data.clec[this.sidCtc] = this.data.cc
    data.nomRnd[this.sidCtc] = [this.data.nom, this.data.rnd]
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
      this.an = row.ank ? deserial(await crypt.decrypter(data.clek, row.ank)) : null
    }
    return this
  }

  async toRow () { // pas de toRow pour un supprimé
    const r = { ...this }
    this.datak = await crypt.crypter(data.clek, serial(r.data))
    this.ank = r.an ? await crypt.crypter(data.clek, serial(r.an)) : null
    this.ardc = r.ard ? await crypt.crypter(this.data.cc, r.ard) : null
    this.icbc = r.icb ? await crypt.crypter(this.data.cc, crypt.intTou8(r.icb)) : 0
    return schemas.serialize('rowcontact', this)
  }

  get toIdb () { // Un supprimé n'est pas écrit en IDB
    return { id: this.id, ic: this.ic, data: schemas.serialize('idbContact', this) }
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
- `lmbg` : liste des couples `[idm, im]` des membres (possiblement seulement pressentis / invités) du groupe.
- `vsh`
*/

schemas.forSchema({
  name: 'idbGroupe',
  cols: ['id', 'v', 'dds', 'st', 'cv', 'mc', 'lmb', 'vsh']
})

export class Groupe {
  get table () { return 'groupe' }

  get sid () { return crypt.idToSid(this.id) }

  get pk () { return this.id }

  get suppr () { return this.st < 0 }

  get horsLimite () { return false }

  get sidgr () { return this.sid }

  get label () { return this.info ? this.info : this.sid }

  get icone () { return this.photo || '' }

  constructor () {
    this.m1mb = new Map()
    this.m2mb = new Map()
  }

  compileLists (lmb) { // lmb: [[ida, im] ...]
    this.m1mb.clear()
    this.m2mb.clear()
    lmb.forEach(x => { this.m1mb.set(x[0], x[1]); this.m2mb.set(x[1], x[0]) })
  }

  decompileLists () {
    const lmb = []
    this.m1mb.forEach((v, k) => { lmb.push([k, v]) })
    return lmb
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
      const cleg = data.clegDe(this.sid)
      const cv = row.cvg ? deserial(await crypt.decrypter(cleg, row.cvg)) : ['', '']
      this.photo = cv[0]
      this.info = cv[1]
      this.mc = row.mcg ? deserial(await crypt.decrypter(cleg, row.mcg)) : []
      const lmb = deserial(await crypt.decrypter(cleg, row.lmbg))
      this.compileLists(lmb)
    }
    return this
  }

  async toRow () {
    const r = { ...this }
    const cleg = data.clegDe(this.sid)
    r.cvg = await crypt.crypter(cleg, serial([this.photo, this.info]))
    r.mcg = r.mc.length ? await crypt.crypter(cleg, serial(this.mc)) : null
    const lmb = this.decompileLists()
    r.lmbg = await crypt.crypter(cleg, serial(lmb))
    return schemas.serialize('rowgroupe', r)
  }

  get toIdb () {
    this.lmb = this.decompileLists()
    const idb = { id: this.id, data: schemas.serialize('idbGroupe', this) }
    delete this.lmb
    return idb
  }

  fromIdb (idb) {
    schemas.deserialize('idbGroupe', idb, this)
    this.compileLists(this.lmb)
    delete this.lmb
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

  get sidCtc () { return this.nact.sid + '/' + this.data.ic }

  get pk () { return [this.id, this.ni] }

  get suppr () { return this.st < 0 }

  get horsLimite () { return !this.suppr ? dlvDepassee(this.dlv) : false }

  get sidav () { return this.sid }

  majCc () {
    data.clec[this.sidCtc] = this.data.cc
  }

  async fromRow (row) {
    this.vsh = row.vsh
    this.id = row.id
    this.ni = row.ni
    this.v = row.v
    this.dlv = row.dlv
    this.st = row.st
    if (!this.suppr) {
      const cpriv = data.avc(this.id).cpriv
      const rowData = await crypt.decrypterRSA(cpriv, row.datap)
      this.data = deserial(rowData)
      this.nact = new NomAvatar(this.data.nom, this.data.rnd)
      this.majCc()
      this.ard = row.ardc ? await crypt.decrypter(this.data.cc, row.ardc) : ''
    }
    return this
  }

  async toRow (clepub) {
    const r = { ...this }
    r.datap = await crypt.crypterRSA(clepub, serial(this.data))
    return schemas.serialize('rowinvitct', this)
  }

  get toIdb () {
    return { id: this.id, ni: this.ni, data: schemas.serialize('idbInvitct', this) }
  }

  fromIdb (idb) {
    schemas.deserialize('idbInvitct', idb, this)
    this.nact = new NomAvatar(this.data.nom, this.data.rnd)
    this.majCc()
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

  get pk () { return [this.id, this.ni] }

  get suppr () { return this.st < 0 }

  get horsLimite () { return !this.suppr ? dlvDepassee(this.dlv) : false }

  get sidav () { return this.sid }

  get idg () { return this.data ? this.ng.id : null }

  get sidg () { return this.data ? crypt.idToSid(this.idg) : null }

  get stx () { return this.st < 0 ? -1 : Math.floor(this.st / 10) }

  get sty () { return this.st < 0 ? -1 : this.st % 10 }

  majCg () {
    if (this.data) data.cleg[this.sidg] = this.ng
  }

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
      this.ng = new NomAvatar(this.data.nom, this.data.rnd)
      this.an = null
      this.majCg()
    }
    return this
  }

  async toRow (clepub) {
    const r = { ...this }
    r.datap = await crypt.crypter(clepub, serial(this.data))
    return schemas.serialize('rowinvitgr', r)
  }

  get toIdb () {
    return { id: this.id, ni: this.ni, data: schemas.serialize('idbInvitgr', this) }
  }

  fromIdb (idb) {
    schemas.deserialize('idbInvitgr', idb, this)
    this.majCg()
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
- `datak` : données cryptées par la clé K du membre.
  - `info` : commentaire du membre à propos du groupe.
  - `mc` : mots clés du membre à propos du groupe.
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
  cols: ['id', 'im', 'v', 'st', 'vote', 'dlv', 'q1', 'q2', 'info', 'mc', 'data', 'ard', 'vsh']
})

export class Membre {
  get table () { return 'membre' }

  get sid () { return crypt.idToSid(this.id) }

  get sid2 () { return '' + this.im }

  get pk () { return [this.id, this.im] }

  get suppr () { return this.st < 0 }

  get horsLimite () { return !this.suppr ? (this.stx === 2 && dlvDepassee(this.dlv)) : false }

  get sidgr () { return this.sid }

  get stx () { return this.st < 0 ? -1 : Math.floor(this.st / 10) }

  get sty () { return this.st < 0 ? -1 : this.st % 10 }

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

  majCc () {
    data.nomRnd[this.namb.sid] = [this.namb.nom, this.namb.rnd]
  }

  async fromRow (row) {
    this.vsh = row.vsh || 0
    this.id = row.id
    this.im = row.im
    this.v = row.v
    this.st = row.st
    if (!this.suppr) {
      this.dlv = row.dlv
      const cg = data.cleg(this.id)
      this.data = deserial(await crypt.decrypter(cg, row.datag))
      this.namb = new NomAvatar(this.data.nom, this.data.rnd)
      this.majCc()
      this.ard = row.ardg ? await crypt.decrypterStr(cg, row.ardg) : ''
      const dk = row.datak ? deserial(await crypt.decrypter(data.clek, row.datak)) : null
      this.info = dk ? dk[0] : ''
      this.mc = dk ? dk[1] : null
    }
    return this
  }

  async toRow () {
    const r = { ...this }
    const cg = data.clegDe(this.sid)
    r.datag = await crypt.crypter(cg, serial(this.data))
    r.ardg = await crypt.crypter(cg, this.ard)
    r.datak = await crypt.crypter(data.clek, [this.info, this.mc])
    return schemas.serialize('rowmembre', r)
  }

  get toIdb () {
    return { id: this.id, im: this.im, data: schemas.serialize('idbMembre', this) }
  }

  fromIdb (idb, vs) {
    schemas.deserialize('idbMembre', idb, this)
    this.namb = new NomAvatar(this.data.nom, this.data.rnd)
    this.majCc()
    return this
  }
}

/** Parrain **********************************/
/*
- `pph` : hash du PBKFD2 de la phrase de parrainage.
- `id` : id du parrain. (avatar du compte)
- `v`
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
- `vsh`
*/

schemas.forSchema({
  name: 'idbParrain',
  cols: ['pph', 'id', 'v', 'ic', 'dlv', 'st', 'q1', 'q2', 'qm1', 'qm2', 'phcx', 'data', 'ard', 'vsh']
})

export class Parrain {
  get table () { return 'parrain' }

  get sid () { return crypt.idToSid(this.pph) }

  get pk () { return this.pph }

  get suppr () { return this.st < 0 }

  get horsLimite () { return !this.suppr ? dlvDepassee(this.dlv) : false }

  get sidav () { return crypt.idToSid(this.id) }

  async fromRow (row) {
    this.vsh = row.vsh || 0
    this.pph = row.pph
    this.id = row.id
    this.nc = row.nc
    this.dlv = row.dlv
    this.st = row.st
    this.v = row.v
    if (!this.suppr) {
      this.q1 = row.q1
      this.q2 = row.q2
      this.qm1 = row.qm1
      this.qm2 = row.qm2
      const rowData = await crypt.decrypter(data.clek, row.datak)
      const x = deserial(rowData)
      this.phrase = x[0]
      this.clex = x[1]
      const rowDatax = await crypt.decrypter(this.clex, row.datax)
      this.data = deserial(rowDatax)
      this.ard = row.ardc ? await crypt.decrypter(this.data.cc, row.ardc) : ''
    }
    return this
  }

  async toRow () {
    this.datak = await crypt.crypter(data.clek, serial([this.phrase, this.clex]))
    this.datax = await crypt.crypter(this.clex, serial(this.data))
    this.ardc = await crypt.crypter(this.data.cc, this.ard)
    const buf = schemas.serialize('rowparrain', this)
    delete this.datak
    delete this.ardg
    delete this.datax
    return buf
  }

  get toIdb () {
    return { pph: this.pph, data: schemas.serialize('idbParrain', this) }
  }

  fromIdb (idb) {
    schemas.deserialize('idbParrain', idb, this)
    return this
  }
}

/** Rencontre **********************************/
/*
- `prh` : hash du PBKFD2 de la phrase de rencontre.
- `id` : id de l'avatar du compte ayant initié la rencontre.
- `v` :
- `dlv` : date limite de validité permettant de purger les rencontres.
- `st` : <= 0:annulée, 1:en attente, 2:acceptée, 3:refusée
- `datak` : **phrase de rencontre et son PBKFD (clé X)** [phrase, clex]
  cryptée par la clé K du compte A pour que A puisse retrouver
  les rencontres qu'il a initiées avec leur phrase.
- `nomcx` : nom complet de A (pas de B, son nom complet n'est justement pas connu de A) crypté par la clé X.
- `vsh`
*/

schemas.forSchema({
  name: 'idbRencontre',
  cols: ['prh', 'id', 'v', 'dlv', 'st', 'phcx', 'nomc', 'vsh']
})

export class Rencontre {
  get table () { return 'rencontre' }

  get sid () { return crypt.idToSid(this.prh) }

  get pk () { return this.prh }

  get sidav () { return crypt.idToSid(this.id) }

  get horsLimite () { return !this.suppr ? dlvDepassee(this.dlv) : false }

  async fromRow (row) {
    this.vsh = row.vsh || 0
    this.prh = row.prh
    this.id = row.id
    this.dlv = row.dlv
    this.st = row.st
    this.v = row.v
    if (!this.suppr) {
      const rowData = await crypt.decrypter(data.clek, row.datak)
      const x = deserial(rowData) // ['phrase', Uint8Array(32)]
      this.phrase = x[0]
      this.clex = x[1]
      this.nomc = await crypt.decrypter(this.clex, row.nomcx)
    }
    return this
  }

  async toRow () {
    this.datak = await crypt.crypter(data.clek, serial([this.phrase, this.clex]))
    this.nomcx = await crypt.crypter(this.clex, this.nomc)
    const buf = schemas.serialize('rowrencontre', this)
    delete this.datak
    delete this.nomcx
    return buf
  }

  get toIdb () {
    return { prh: this.prh, data: schemas.serialize('idbRencontre', this) }
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
- `nr` : numéro du secret de référence à propos duquel ce secret se rapporte. Si b est à propos de a, c pourra être à propos de a (pas de b).
- `ic` : indice du contact pour un secret de couple, sinon 0.
- `v` :
- `st` :
  - < 0 pour un secret _supprimé_.
  - 99999 pour un *permanent*.
  - `dlv` pour un _temporaire_.
- `ora` : 0:ouvert, 1:restreint, 2:archivé
- `v1` : volume du texte
- `v2` : volume de la pièce jointe
- `txts` : crypté par la clé du secret.
  - `d` : date-heure de dernière modification du texte
  - `l` : liste des auteurs (pour un secret de couple ou de groupe).
  - `t` : texte gzippé ou non
- `mcs` : liste des mots clés crypté par la clé du secret.
- `mpjs` : sérialisation de la map des pièces jointes.
- `dups` : triplet `[id, ns, nr]` crypté par la clé du secret de l'autre exemplaire pour un secret de couple A/B.
- `vsh`

** liste des auteurs pour un couple**
- 0 est celui des deux dont l'id est le plus fort, l'autre est 1
- successions possibles : 0:0 1:1 2:01 3:10
- quand 0 écrit : 0->0 1->2 2->2 3->2
- quand 1 écrit : 0->3 1->1 2->3 3->3

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
  cols: ['id', 'ns', 'nr', 'ic', 'v', 'st', 'ora', 'v1', 'v2', 'txt', 'mc', 'mpj', 'dup', 'vsh']
})

const trauteurs = [[0, 2, 2, 2], [3, 1, 3, 3]]

export class Secret {
  get table () { return 'secret' }

  get sid () { return crypt.idToSid(this.id) }

  get sid2 () { return crypt.idToSid(this.ns) }

  get pk () { return [this.id, this.ns] }

  get suppr () { return this.st < 0 }

  get horsLimite () { return this.st < 0 || this.st >= 99999 ? false : dlvDepassee(this.st) }

  get sidc () { return crypt.idToSid(this.id) + '/' + this.ic }

  get sidavgr () { return this.sid }

  get ts () { return this.ns % 3 } // 0:personnel 1:couple 2:groupe

  get titre () {
    const i = this.txt.t.indexOf('\n')
    return i === -1 ? this.txt.t.substring(0, 100) : this.txt.t.substring(0, (i < 100 ? i : 100))
  }

  get icpl () {
    // indice de l'avatar dans le couple : 1 ou 2
    return this.ts === 1 ? (this.id > this.dup[0] ? 0 : 1) : 0
  }

  get dh () { return dhstring(new Date(this.txt.d * 1000)) }

  get cles () {
    return this.ts ? (this.ts === 1 ? data.clecDe(this.sidc) : data.clegDe(this.sid)) : data.clek
  }

  nouveauP (id, ref) {
    this.id = id
    this.ns = (Math.floor(crypt.rnd4() / 3) * 3)
    this.ic = 0
    this.txt = { t: '' }
    this.ref = ref || null
    return this
  }

  nouveauC (id, id2, ref) {
    const c = data.contactParId(crypt.idToSid(id), crypt.idToSid(id2))
    this.id = id
    this.ns = (Math.floor(crypt.rnd4() / 3) * 3) + 1
    this.ic = c.ic
    this.txt = { t: '' }
    this.id2 = id2
    this.ns2 = (Math.floor(crypt.rnd4() / 3) * 3) + 1
    this.ic2 = c.icb
    this.ref = ref || null
    return this
  }

  nouveauG (idg, ref) {
    this.id = idg
    this.ns = (Math.floor(crypt.rnd4() / 3) * 3) + 2
    this.ic = 0
    this.txt = { t: '', l: new Uint8Array([]) }
    this.ref = ref || null
    return this
  }

  async toRowTxt (txt, im) {
    const x = { d: Math.floor(new Date().getTime() / 1000), t: gzip(txt) }
    if (this.ts === 2) {
      const nl = [im]
      this.txt.l.forEach(t => { if (t !== im) nl.push(t) })
      x.l = new Uint8Array(nl)
    } else if (this.ts === 1) {
      const ix = this.icpl
      x.l = this.v === 0 ? ix : trauteurs[ix][this.txt.l]
    }
    return await crypt.crypter(this.cles, serial(x))
  }

  /*
  async nouveauToRow (arg) {
    // const arg = { ts, temp, v1, dup, id: s.id, ns: s.ns, mc: mc, mcg: mcg, im: im, ora: this.oralocal, txts: txts }
    this.id = arg.id
    this.ns = (Math.floor(crypt.rnd4() / 3) * 3) + arg.ts
    this.nr = arg.nr
    this.ic = arg.ts === 1 ? arg.im : 0
    this.v = 0
    this.st = !arg.temp ? 99999 : (getJourJ() + cfg().limitesjour[0])
    this.ora = arg.ora
    this.v1 = arg.v1
    this.v2 = 0
    if (this.ts) {
      this.mcs = arg.mc
    } else { // groupe
      const mc = {}
      if (arg.mc) mc[arg.im] = arg.mc
      if (arg.mcg) mc[0] = arg.mcg
      this.mcs = serial(this.mc)
    }
    this.txts = arg.txts
    this.vsh = 0
    if (this.ts === 1) {
      this.dups = await crypt.crypter(this.cles, serial(this.dup))
    } else this.dups = null
    return schemas.serialize('rowsecret', this)
  }
  */

  async fromRow (row) {
    this.vsh = row.vsh || 0
    this.id = row.id
    this.ns = row.ns
    this.ic = row.ic
    this.st = row.st
    this.v = row.v
    if (!this.suppr) {
      this.ora = row.ora
      this.v1 = row.v1
      this.v2 = row.v2
      const cles = this.cles
      this.txt = deserial(await crypt.decrypter(cles, row.txts))
      this.txt.t = ungzip(this.txt.t)
      this.mc = this.ts > 0 ? row.mcs : deserial(row.mcs)
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

  async toRow () {
    const cles = this.cles
    const t = this.txt.t
    this.txt.t = gzip(this.txt.t)
    this.txts = await crypt.crypter(cles, serial(this.txt))
    this.txt.t = t
    this.mcs = t > 0 ? this.mc : serial(this.mc)
    const map = {}
    if (this.v2) {
      for (const cpj in this.mpj) {
        const x = this.mpj[cpj]
        const nomcb64 = crypt.u8ToB64(await crypt.crypter(cles, x.n + '/' + x.dh), true)
        map[cpj] = [nomcb64, x.t]
      }
    }
    this.mpjs = serial(map)
    if (this.ts === 1) {
      this.dups = await crypt.crypter(cles, serial(this.dup))
    } else this.dups = null
    if (this.ref) {
      this.refs = await crypt.crypter(cles, serial(this.ref))
    } else this.refs = null
    const buf = schemas.serialize('rowsecret', this)
    delete this.txts
    delete this.mcs
    delete this.mpjs
    delete this.dups
    delete this.refs
    return buf
  }

  get toIdb () {
    const t = this.txt.t
    this.txt.t = gzip(this.txt.t)
    const idb = { id: this.id, ns: this.ns, data: schemas.serialize('idbSecret', this) }
    this.txt.t = t
    return idb
  }

  fromIdb (idb) {
    schemas.deserialize('idbSecret', idb, this)
    this.txt.t = ungzip(this.txt.t)
    return this
  }
}
