import { schemas, serial, deserial } from './schemas.mjs'
import { crypt } from './crypto.mjs'
import { openIDB, closeIDB, debutSessionSync, saveSessionSync, getFichier } from './db.mjs'
import { openWS, closeWS } from './ws.mjs'
import {
  store, appexc, dlvDepassee, NomAvatar, gzip, ungzip, dhstring,
  getJourJ, cfg, ungzipT, normpath, titreEd, titreCompte, PhraseContact
} from './util.mjs'
import { remplacePage } from './page.mjs'
import { EXPS, UNITEV1, UNITEV2, Compteurs, t0n } from './api.mjs'
import { DownloadFichier } from './operations.mjs'

export const MODES = ['inconnu', 'synchronisé', 'incognito', 'avion', 'visio']

/* Compile en objet tous les rows de la structure de rows désérialisée mr
La structure de sortie mapObj est identique. Elle peut être fourni en entrée
ce qui provoque une mise à jour par les versions postérieures de chaque objet
*/
export async function compileToObject (mr, mapObj) {
  if (!mapObj) mapObj = {}
  for (const table in mr) {
    if (t0n.has(table)) {
      const row = mr[table]
      const av = mapObj[table]
      if (!av || av.v < row.v) {
        const obj = newObjet(table)
        mapObj[table] = await obj.fromRow(row)
      }
    } else {
      const m1 = mr[table]
      for (const pk in m1) {
        const row = m1[pk]
        if (!mapObj[table]) mapObj[table] = {}
        const e = mapObj[table]
        const av = e[pk]
        if (!av || av.v < row.v) {
          const obj = newObjet(table)
          e[pk] = await obj.fromRow(row)
        }
      }
    }
  }
  return mapObj
}

export function pk (table, row) {
  const id = '' + row.id
  if (table === 'membre') return id + '/' + row.im
  if (table === 'secret') return id + '/' + row.ns
  return id
}

/* Désérialise un array de rowItems dans une map ayant une entrée par table :
- pour les singletons (compte / compta / prefs), la valeur est directement le row
- pour les collections la valeur est une map dont la clé est la "primary key" du row (id ou id/im ou id/ns)
et la valeur est le row désérialisé.
Seule la version la plus récente pour chaque row est conservée (d'où le stockage par pk)
*/
export function deserialRowItems (rowItems) {
  const res = {}
  for (let i = 0; i < rowItems.length; i++) {
    const item = rowItems[i]
    const row = schemas.deserialize('row' + item.table, item.serial)
    if (item.table === 'compte' && row.pcbh !== data.ps.pcbh) throw EXPS // phrase secrète changée => déconnexion
    if (t0n.has(item.table)) {
      res[item.table] = row
    } else {
      let e = res[item.table]; if (!e) { e = {}; res[item.table] = e }
      const k = pk(item.table, row)
      const ex = e[k]
      if (!ex) e[k] = row; else { if (ex.v < row.v) e[k] = row }
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
    case 'invitcp' : return new Invitcp()
    case 'contact' : return new Contact()
    case 'groupe' : return new Groupe()
    case 'membre' : return new Membre()
    case 'secret' : return new Secret()
    case 'cv' : return new Cv()
  }
}

/* Répertoire des CV *******************************************************
Le répertoire a une entrée pour :
- 1-chaque avatar du compte,
- 2-chaque groupe dont un avatar du compte est membre
- 3-chaque couple dont un avatar du compte est conjoint interne
- 4-chaque avatar externe,
  - membre d'un des groupes ci-dessus,
  - conjoint externe d'un des couples ci-dessus
Chaque entrée a les propriétés :
- id
- nom : pour un couple c'est 'x'
- cle
- x : si absent, l'objet est vivant, si true objet disparu
Une entrée de répertoire est quasi immuable :
- la seule valeur qui peut changer est x mais elle est inscrite à la connexion du compte
et n'est mise à jour (au plus une fois) que par le GC de nuit.
Le répertoire grossit en cours de session mais ne réduit jamais. Il contient des objets "obsolètes"
- avatar du compte détruit
- groupe n'ayant plus d'avatars du compte membre
- couple quitté par leur conjoint interne
- avatar externe n'étant plus membre d'aucun groupe ni conjoint externe d'aucun couple
*/
class Repertoire {
  constructor () { this.raz() }

  raz () {
    this.idac = new Set()
    this.idax = new Set()
    this.idgr = new Set()
    this.idcp = new Set()
    this.rep = {}
  }

  cle (id) { const e = this.rep[id]; return e ? e.na.rnd : null }
  na (id) { const e = this.rep[id]; return e ? e.na : null }
  disparu (id) { const e = this.rep[id]; return !e || e.x }
  estAc (id) { return this.idac.has(id) }
  estAx (id) { return this.idax.has(id) }
  estGr (id) { return this.idgr.has(id) }
  estCp (id) { return this.idcp.has(id) }

  disparition (id) { const e = this.rep[id]; if (e) e.x = true }

  setXX (na) {
    const id = na.id
    let obj = this.rep[id]; if (!obj) { obj = { }; this.rep[id] = obj }
    obj.na = na
    return id
  }

  setAc (na) { this.idac.add(this.setXX(na)) }
  setGr (na) { this.idgr.add(this.setXX(na)) }
  setCp (na) { this.idcp.add(this.setXX(na)) }
  setAx (na) { this.idax.add(this.setXX(na)) }
}

/* état de session ************************************************************/
class Session {
  constructor () {
    this.raz(true)
    this.nbreconnexion = 0
    this.ps = null
  }

  /* statut de la session : permet de bloquer la synchro jusqu'à ce que la connexion ait été complète
    0: fantôme : la session n'a pas encore été ouverte par une opération de login / création compte
      ou cette opération s'est interrompue.
    1: opération de connexion / login en cours : ce temps est généralement court et se termine en 0 (échec) ou 2 (succès)
    2: session totalement chargée / synchronisée et cohérente : se test / watch par store().state.ui.sessionok
  */
  get statutsession () { return store().state.ui.statutsession }
  set statutsession (val) { store().commit('ui/majstatutsession', val) }
  get sessionsync () { const s = store().state.ui.sessionsync; return s ? s.clone() : null }
  async setDhSync (dh) { if (this.dbok && this.netok) this.sessionsync.setDhSync(dh) }
  async setDhPong (dh) { if (this.dbok && this.netok) this.sessionsync.setDhPong(dh) }

  get mode () { return store().state.ui.mode }
  set mode (val) { store().commit('ui/majmode', val) }

  get modeInitial () { return store().state.ui.modeinitial }
  set modeInitial (val) { store().commit('ui/majmodeinitial', val) }

  // 0: net pas ouvert, 1:net OK, 2: net KO
  get statutnet () { return store().state.ui.statutnet }
  set statutnet (val) { store().commit('ui/majstatutnet', val) }
  get netok () { return this.statutnet === 1 }

  ouvertureDB (db) { this.db = db; this.statutidb = 1 }
  fermetureDB () { this.db = null; this.statutidb = 0 }

  ouvertureWS (ws) { this.ws = ws }
  fermetureWS () { this.ws = null }
  get wsok () { return this.ws !== null }

  // 0:inconnu 1:idb accessible 2:idb inaccessible (a rencontré une erreur)
  get statutidb () { return store().state.ui.statutidb }
  set statutidb (val) { store().commit('ui/majstatutidb', val) }
  get dbok () { return this.statutidb === 1 }

  get sessionId () { return store().state.ui.sessionid }
  set sessionId (val) { store().commit('ui/majsessionid', val) }

  async connexion (sansidb) { // Depuis l'opération de connexion
    this.statutsession = 1
    this.raz()
    store().commit('db/raz')
    remplacePage('Synchro')
    if (this.nbreconnexion === 0) this.modeInitial = this.mode
    this.sessionId = crypt.idToSid(crypt.random(6))
    if (!sansidb && (this.mode === 1 || this.mode === 3)) await openIDB()
    if (this.mode === 1 || this.mode === 2) await openWS()
    console.log('Ouverture de session : ' + this.sessionId)
  }

  async deconnexion (avantreconnexion) { // Depuis un bouton
    this.statutsession = 0
    store().commit('ui/resetsessionsync')
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

  async debutConnexion () {
    this.statutsession = 1
    return await debutSessionSync(this.dbok && this.netok)
  }

  async finConnexion (dh) {
    this.statutsession = 2
    const s = this.sessionsync
    if (this.dbok && this.netok && s) await s.setConnexion(dh)
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
    if (this.db) this.db.close()
    return ex
  }

  setErWS (e) {
    const ex = appexc(e)
    ex.net = true
    this.statutnet = 2
    if (this.ws) this.ws.close()
    return ex
  }

  stopOp () { if (this.opUI) this.opUI.stop() }

  resetPhase012 () {
    store().commit('ui/razsyncitems')
    store().commit('db/raz')
  }

  raz (init) { // init : l'objet data (Session) est créé à un moment où le store vuex n'est pas prêt
    this.db = null // IDB quand elle est ouverte
    this.nombase = null
    this.erDB = 0 // 0:OK 1:IDB en erreur NON traitée 2:IDB en erreur traitée
    this.exIDB = null // exception sur IDB
    this.ws = null // WebSocket quand il est ouvert
    this.erWS = 0 // 0:OK 1:WS en erreur NON traitée 2:WS en erreur traitée
    this.exNET = null // exception sur NET

    if (!init) {
      this.statutnet = 0 // 0: net pas ouvert, 1:net OK, 2: net KO
      this.statutidb = 0 // 0: idb pas ouvert, 1:idb OK, 2: idb KO
      this.statutsession = 0
      this.sessionId = null
    }

    this.ws = null // websocket de la session
    this.opWS = null // opération WS en cours
    this.opUI = null // opération UI en cours
    this.clek = null // clé K du compte authentifié
    this.estComptable = false
    this.pjPerdues = [] // PJ accessibles en mode avion qui n'ont pas pu être récupérées et NE SONT PLUS ACCESSIBLES en avion
    this.syncqueue = [] // notifications reçues sur WS et en attente de traitement
    this.repertoire = new Repertoire()
  }

  setFaPerdues (x) { this.faPerdues.push(x) }

  setSyncItem (k, st, label) { store().commit('ui/setsyncitem', { k, st, label }) }

  /* Getters / Setters ****************************************/

  getCompte () { return store().state.db.compte }
  setCompte (compte) { store().commit('db/setCompte', compte) }

  getPrefs () { return store().state.db.prefs }
  setPrefs (prefs) { store().commit('db/setPrefs', prefs) }

  getAvatar (id) { return store().getters['db/avatar'](id) }
  setAvatars (lobj) { store().commit('db/setObjets', lobj) }

  getCompta (id) { return store().getters['db/compta'](id) }
  setComptas (lobj) { store().commit('db/setObjets', lobj) }
  getComptaPrimitif () {
    const m = this.getCompta()
    for (const avid in m) { const c = m[avid]; if (c.idp !== null) return c }
  }

  getGroupe (id) { return store().getters['db/groupe'](id) }
  setGroupes (lobj) { store().commit('db/setObjets', lobj) }

  getCouple (id) { return store().getters['db/couple'](id) }
  setCouples (lobj) { store().commit('db/setObjets', lobj) }

  getCv (id) { return store().getters['db/cv'](id) }
  setCvs (lobj) { store().commit('db/setCvs', lobj) }

  getMembre (idg, im) { return store().getters['db/membre'](idg, im) }
  setMembres (lobj) { store().commit('db/setObjets', lobj) }
  // objet membre du groupe idg dont l'id est idm
  getMembreParId (idg, idm) { return store().getters['db/membreParId'](idg, idm) }

  getSecret (id, ns) { return store().getters['db/secret'](id, ns) }
  setSecrets (lobj) { store().commit('db/setObjets', lobj) }

  getFetat (idf) { return store().getters['db/fetat'](idf) }
  setFetats (lobj) { store().commit('db/setObjets', lobj) }

  getAvSecret (id, ns) { return store().getters['db/avsecret'](id, ns) }
  setAvSecrets (lobj) { store().commit('db/setObjets', lobj) }

  setObjets (lobj) { store().commit('db/setObjets', lobj) }

  purgeAvatars (lav) { if (lav.size) return store().commit('db/purgeAvatars', lav) }

  purgeGroupes (lgr) { if (lgr.size) return store().commit('db/purgeGroupes', lgr) }

  purgeCouples (lgr) { if (lgr.size) return store().commit('db/purgeCouples', lgr) }

  /* Recalcul la liste des avatars externes avaec pour chacun :
  - na : son na
  - x : si true, c'est un disparu
  - c : set des ids des couples dont il est avatar externe
  - m : set des [id, im] des membres dont il est avatar externe
  */
  setTousAx (disparus) { store().commit('db/setTousAx', disparus); return store().state.db.tousAx }
  getTousAx () { return store().state.db.tousAx }

  /*
  idx = { id, ns, cle } - ns cle peuvent être null
  retourne un array de { id, ns, cle, hv }
  */
  getFaidx (idx) { return store().getters['db/faidx'](idx) }

  setFaidx (lst) { store().commit('db/majfaidx', lst) }// lst : array de { id, ns, cle, hv }
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
- `dpbh` : hashBin (53 bits) du PBKFD du début de la phrase secrète (32 bytes). Pour la connexion, l'id du compte n'étant pas connu de l'utilisateur.
- `pcbh` : hashBin (53 bits) du PBKFD de la phrase complète pour quasi-authentifier une connexion avant un éventuel échec de décryptage de `kx`.
- `kx` : clé K du compte, cryptée par la X (phrase secrète courante).
- `mack` {} : map des avatars du compte cryptée par la clé K. Clé: sid, valeur: `{ na:, cpriv: }`
  - `na` : nom et clé de l'avatar.
  - `cpriv` : clé privée asymétrique.
- `vsh`
*/

export class Compte {
  get table () { return 'compte' }
  get sid () { return crypt.idToSid(this.id) }
  get pk () { return '1' }
  get estComptable () { return data.estComptable }

  avatarNas (s) {
    const s1 = new Set()
    for (const sid in this.mac) if (s) s.add(this.mac[sid].na); else s1.add(this.mac[sid].na)
    return s || s1
  }

  avatarIds (s) {
    const s1 = new Set()
    for (const sid in this.mac) if (s) s.add(this.mac[sid].na.id); else s1.add(this.mac[sid].na.id)
    return s || s1
  }

  repAvatars () { this.avatarNas().forEach(na => { data.repertoire.setAc(na, na.id) }) }

  avatarDeNom (n) {
    for (const sid in this.mac) if (this.mac[sid].na.nom === n) return crypt.sidToId(sid)
    return 0
  }

  avatars () {
    const l = []
    for (const sid in this.mac) l.push(this.mac[sid].na.nom)
    return l
  }

  cpriv (avid) {
    const e = this.mac[crypt.idToSid(avid)]
    return e ? e.cpriv : null
  }

  nouveau (nomAvatar, cprivav, id) { // id : du compte lui-même
    this.id = id || crypt.rnd6()
    this.v = 0
    this.dds = 0
    this.dpbh = data.ps.dpbh
    this.pcbh = data.ps.pcbh
    this.k = crypt.random(32)
    data.clek = this.k
    this.mac = { }
    this.mac[nomAvatar.sid] = { na: nomAvatar, cpriv: cprivav }
    data.repertoire.setAc(nomAvatar, id)
    this.vsh = 0
    return this
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
    data.repertoire.setAc(na)
    return await crypt.crypter(data.clek, serial(m))
  }

  get toIdb () {
    const r = { ...this }
    r.mac = {}
    for (const sid in this.mac) {
      const x = this.mac[sid]
      r.mac[sid] = [x.na.nom, x.na.rnd, x.cpriv]
    }
    return schemas.serialize('idbCompte', r)
  }

  fromIdb (idb) {
    schemas.deserialize('idbCompte', idb, this)
    data.clek = this.k
    const m = {}
    for (const sid in this.mac) {
      const [nom, rnd, cpriv] = this.mac[sid]
      m[sid] = { na: new NomAvatar(nom, rnd), cpriv: cpriv }
    }
    this.mac = m
    // TODO utilité à vérifier
    for (const sid in this.mac) data.repertoire.setAc(this.mac[sid].na)
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
  get pk () { return '1' }
  get memo () { return this.map.mp }
  get titre () { return titreCompte(this.sid, this.map.mp) }
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
- `idp` : pour un filleul (avatar primitif), id de l'avatar parrain :
  - par convention 0 pour un parrain.
  - `null` pour un avatar secondaire.
- `v` :
- `st` :
  - 0 : normal.
  - 1 : en sursis 1.
  - 2 : en sursis 2.
  - 3 : bloqué.
- `dst` : date du dernier changement de st.
- `data`: compteurs sérialisés (non cryptés)
- `dh` : date-heure de dernière écriture sur l'ardoise.
- `flag` : problème résolu 0 ou à résoudre 1.
- `ard` : texte de l'ardoise _crypté soft_.
- `vsh` :
*/

schemas.forSchema({
  name: 'idbCompta',
  cols: ['id', 'idp', 'v', 'st', 'dst', 'data', 'dh', 'flag', 'ard', 'vsh']
})

export class Compta {
  get table () { return 'compta' }
  get sid () { return crypt.idToSid(this.id) }
  get pk () { return this.sid }
  get estParrain () { return this.idp === null } // Pour un avatar primitif de compte idp est l'id de son avatar parrain
  get estPrimtif () { return this.idp !== null } // Est le premier avatar du compte

  nouveau (id, idp) {
    this.id = id
    this.idp = idp
    this.v = 0
    this.vsh = 0
    this.st = 0
    this.dst = 0
    this.compteurs = new Compteurs()
    this.dh = 0
    this.flag = 0
    this.ard = null
    return this
  }

  async fromRow (row) {
    this.vsh = row.vsh || 0
    this.id = row.id
    this.idp = row.idp
    this.v = row.v
    this.flag = row.flag
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

/** Avatar **********************************
- `id` : id de l'avatar
- `v` :
- `lgrk` : map :
  - _clé_ : `ni`, numéro d'invitation (aléatoire 4 bytes) obtenue sur `invitgr`.
  - _valeur_ : cryptée par la clé K du compte de `[nom, rnd, im]` reçu sur `invitgr`.
  - une entrée est effacée par la résiliation du membre au groupe ou sur refus de l'invitation (ce qui lui empêche de continuer à utiliser la clé du groupe).
- `lcck` : map :
  - _clé_ : `ni`, numéro pseudo aléatoire. Hash de (`cc` en hexa suivi de `0` ou `1`).
  - _valeur_ : clé `cc` cryptée par la clé K de l'avatar cible. Le hash d'une clé d'un couple donne son id.
- `vsh`
*/

schemas.forSchema({
  name: 'idbAvatar',
  cols: ['id', 'v', 'lgr', 'lcc', 'vsh']
})

export class Avatar {
  get table () { return 'avatar' }
  get sid () { return crypt.idToSid(this.id) }
  get pk () { return this.sid }

  get na () { return data.repertoire.na(this.id) }
  get cle () { return this.na.cle }

  constructor () {
    this.m1gr = new Map() // clé:ni val: { na du groupe, im de l'avatar dans le groupe }
    this.m2gr = new Map() // clé:idg (id du groupe), val:[im, ni]
    this.mcc = new Map() // clé: ni, val: clé cc
  }

  /* Retourne LE membre de l'avatar du compte pour un groupe d'id donné */
  membre (idg) {
    const x = this.m2gr.get(idg)
    return x ? data.getMembre(idg, x[0]) : null
  }

  im (idg) {
    const x = this.m2gr.get(idg)
    if (!x) return 0
    return typeof x[0] === 'string' ? parseInt(x[0]) : x[0]
  }

  ni (idg) {
    const x = this.m2gr.get(idg)
    if (!x) return 0
    return typeof x[1] === 'string' ? parseInt(x[1]) : x[1]
  }

  groupeIds (s) {
    const s1 = new Set()
    this.m1gr.forEach(e => { if (s) s.add(e.na.id); else s1.add(e.na.id) })
    return s || s1
  }

  groupeNas (s) {
    const s1 = new Set()
    this.m1gr.forEach(e => { if (s) s.add(e.na); else s1.add(e.na) })
    return s || s1
  }

  repGroupes () { this.m1gr.forEach(e => { data.repertoire.setGr(e.na) }) }

  coupleIds (s) {
    const s1 = new Set()
    this.mcc.forEach(na => { if (s) s.add(na.id); else s1.add(na.id) })
    return s || s1
  }

  coupleNas (s) {
    const s1 = new Set()
    this.mcc.forEach(na => { if (s) s.add(na); else s1.add(na) })
    return s || s1
  }

  repCouples () { this.mcc.forEach(na => { data.repertoire.setCp(na) }) }

  nouveau (id, niCouple, naCouple) { // naCouple : création lors d'une acceptation de parrainage
    this.id = id
    this.v = 0
    this.vsh = 0
    if (naCouple) this.mcc.set(niCouple, naCouple)
    return this
  }

  async compileLists (lgr, lcc, brut) {
    this.mcc.clear()
    if (lcc) {
      for (const ni in lcc) {
        const y = lcc[ni]
        const cc = brut ? y : await crypt.decrypter(data.clek, y)
        const na = new NomAvatar('x', cc)
        this.mcc.set(ni, na)
      }
    }
    this.m1gr.clear()
    if (lgr) {
      for (const nis in lgr) {
        const ni = parseInt(nis)
        const y = lgr[ni]
        const x = deserial(brut ? y : await crypt.decrypter(data.clek, y))
        const na = new NomAvatar(x[0], x[1])
        const id = na.id
        this.m1gr.set(ni, { na: na, im: x[2] })
        this.m2gr.set(id, [x[2], ni])
      }
    }
  }

  decompileListsBrut () {
    const lgr = this.m1gr.size ? {} : null
    if (this.m1gr.size) for (const [ni, x] of this.m1gr) lgr[ni] = serial([x.na.nom, x.na.rnd, x.im])
    const lcc = this.mcc.size ? {} : null
    if (this.mcc.size) for (const [ni, na] of this.mcc) lcc[ni] = na.rnd
    return [lgr, lcc]
  }

  async decompileLists () {
    const lgr = this.m1gr.size ? {} : null
    if (this.m1gr.size) {
      for (const [ni, x] of this.m1gr) {
        lgr[ni] = await crypt.crypter(data.clek, serial([x.na.nom, x.na.rnd, x.im]))
      }
    }
    const lcc = this.mcc.size ? {} : null
    if (this.mcc.size) {
      for (const [ni, na] of this.mcc) {
        lcc[ni] = await crypt.crypter(data.clek, na.rnd)
      }
    }
    return [lgr, lcc]
  }

  async fromRow (row) { // ['id', 'v', 'lgr', 'lcc', 'vsh']
    this.vsh = row.vsh || 0
    this.id = row.id
    this.v = row.v
    await this.compileLists(row.lgrk ? deserial(row.lgrk) : null, row.lcck ? deserial(row.lcck) : null)
    return this
  }

  async toRow () { // pour un nouvel avatar seulement
    const [lgr, lcc] = await this.decompileLists()
    const r = { id: this.id, v: this.v, lgrk: serial(lgr), lcck: serial(lcc), vsh: 0 }
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
// cols: ['id', 'v', 'x', 'dds', 'cv', 'vsh']
export class Cv {
  get table () { return 'cv' }
  get cle () { return data.repertoire.cle(this.id) }

  constructor () {
    this.id = 0
    this.v = 0
    this.x = 0
    this.dds = 0
    this.cv = null
    this.vsh = 0
  }

  init (id, photo, info) {
    this.id = id
    this.cv = [photo, info]
    return this
  }

  async fromRow (row) { // row : rowCv - item retour de sync
    this.id = row.id
    this.v = row.v
    this.x = row.x
    this.dds = row.dds
    this.cv = row.cv ? deserial(await crypt.decrypter(this.cle, row.cv)) : null
    return this
  }

  async toRow (_photo, _info) { // seulement la cv (photo, info)
    return await crypt.crypter(this.cle, serial(this.cv))
  }

  get toIdb () {
    return schemas.serialize('idbCv', this)
  }

  fromIdb (idb) {
    schemas.deserialize('idbCv', idb, this)
    return this
  }
}

/** couple **********************************/

schemas.forSchema({
  name: 'idbCouple',
  cols: ['id', 'v', 'st', 'v1', 'v2', 'mx10', 'mx20', 'mx11', 'mx21', 'dlv', 'data', 'idI', 'idE', 'info', 'mc', 'dh', 'ard', 'vsh']
})
/*
- `id` : id du couple
- `v` :
- `st` : quatre chiffres `pe` : phase / état / 0 présent / 1 présent
- `v1 v2` : volumes actuels des secrets.
- `mx10 mx20` : maximum des volumes autorisés pour A0
- `mx11 mx21` : maximum des volumes autorisés pour A1
- `dlv` : date limite de validité éventuelle de (re)prise de contact.
- `datac` : données cryptées par la clé `cc` du couple :
  - `x` : `[nom, rnd], [nom, rnd]` : nom et clé d'accès à la carte de visite respectivement de A0 et A1.
  - `phrase` : phrase de contact en phases 1/4-7 (qui nécessitent une phrase).
  - `f1 f2` : en phase 1/4 (parrainage), forfaits attribués par le parrain A0 à son filleul A1.
  - 'r1 r2' : en phase 1/4 (parrainage) et si le compte filleul est lui-même parrain, ressources attribuées.
- `infok0 infok1` : commentaires cryptés par leur clé K, respectivement de A0 et A1.
- `mc0 mc1` : mots clé définis respectivement par A0 et A1.
- `ardc` : ardoise commune cryptée par la clé cc. [dh, texte]
- `vsh` :

#### Phases de vie d'un couple
- **(1) prise de contact par A0**. Etats : 147
- **(2) fin de vie de A0 seul après refus de A1**. Etats : 235689
- **(3) vie à deux**. Etat : 0
- **(4) vie de A0 OU A1 seul après _départ_ de l'autre**. Etats: 0 (pas de relance), 123
- **(5) vie de A0 OU A1 seul après _disparition_ de l'autre**. Etat : 0

Dans certaines de ces phases il y a des **états** significatifs (sinon 0).
- (re)prise de contact standard
  - (1) en attente de réponse
  - (2) hors délai
  - (3) refusée
- parrainage
  - (4) en attente de réponse
  - (5) hors délai
  - (6) refusée
- rencontre
  - (7) en attente de réponse
  - (8) hors délai
  - (9) refusée
*/

export class Couple {
  get table () { return 'couple' }
  get sid () { return crypt.idToSid(this.id) }
  get pk () { return this.sid }
  get pkv () { return this.sid + '/' + this.v }

  get stp () { return Math.floor(this.st / 1000) }
  get ste () { return Math.floor(this.st / 100) % 10 }
  get st0 () { return Math.floor(this.st / 10) % 10 }
  get st1 () { return this.st % 10 }

  get cle () { return data.repertoire.cle(this.id) }
  get na () { return data.repertoire.na(this.id) }
  get nom () { const x = this.data.x; return x[0][0] + '_' + x[1][0] }
  get nomE () { const x = this.data.x; return x[1][0] }
  get nomI () { const x = this.data.x; return x[0][0] }

  naDeIm (im) { return new NomAvatar(this.data.x[im - 1][0], this.data.x[im - 1][1]) }

  // origine du couple : 0) proposition standard à un contact connu, 1) parainage, 2) rencontre
  get orig () { return !this.data.phrase ? 0 : (this.data.f1 || this.data.f2 ? 1 : 2) }

  get nomf () { return normpath(this.nom) }

  async phraseContact () {
    if (!this.data.phrase) return null
    const pc = new PhraseContact()
    await pc.init(this.data.phrase)
    return pc
  }

  setRepE () { if (this.naE) data.repertoire.setAx(this.naE) }

  setIdIE (x, cle) { // cle : non null pour réception d'un couple HORS session (accepatation / refus parrainage)
    const id0 = x[0][1] ? crypt.hashBin(x[0][1]) : 0
    const id1 = x[1][1] ? crypt.hashBin(x[1][1]) : 0
    if (!cle && data.repertoire.estAc(id0)) {
      this.idI = id0
      this.idE = id1
      this.naE = this.idE ? new NomAvatar(x[1][0], x[1][1]) : null
      this.naI = new NomAvatar(x[0][0], x[0][1])
      this.avc = 0
    } else {
      this.idI = id1
      this.idE = id0
      this.naE = this.idE ? new NomAvatar(x[0][0], x[0][1]) : null
      this.naI = new NomAvatar(x[1][0], x[1][1])
      this.avc = 1
    }
    const na = new NomAvatar(this.nom, cle || this.cle)
    if (!cle) data.repertoire.setCp(na); else this.naTemp = na
  }

  nouveauR (naI, nomf, cc, dlv, mot, pp, forfaits) {
    this.v = 0
    this.vsh = 0
    this.st = 1710
    this.naI = naI
    this.idI = naI.id
    this.naE = null
    this.idE = 0
    this.avc = 0
    const na = new NomAvatar(naI.nom + '_' + nomf, cc)
    this.id = na.id
    data.repertoire.setCp(na)
    this.v1 = 0
    this.v2 = 0
    this.mx10 = 1
    this.mx20 = 1
    this.mx11 = 0
    this.mx21 = 0
    this.dlv = dlv
    this.mc0 = null
    this.mc1 = null
    this.info = null
    this.ard = mot
    this.dh = new Date().getTime()
    this.data = {
      x: [[naI.nom, naI.rnd], [nomf, null]],
      phrase: pp,
      f1: forfaits[0],
      f2: forfaits[1],
      r1: 0,
      r2: 0
    }
    return this
  }

  nouveauP (naI, naE, cc, dlv, mot, pp, forfaits, ressources) {
    this.v = 0
    this.vsh = 0
    this.st = 1410
    this.naI = naI
    this.idI = naI.id
    this.naE = naE
    this.idE = naE.id
    this.avc = 0
    data.repertoire.setAx(naE)
    const na = new NomAvatar(naI.nom + '_' + naE.nom, cc)
    this.id = na.id
    data.repertoire.setCp(na)
    this.v1 = 0
    this.v2 = 0
    this.mx10 = 1
    this.mx20 = 1
    this.mx11 = 0
    this.mx21 = 0
    this.dlv = dlv
    this.mc0 = null
    this.mc1 = null
    this.info = null
    this.ard = mot
    this.dh = new Date().getTime()
    this.data = {
      x: [[naI.nom, naI.rnd], [naE.nom, naE.rnd]],
      phrase: pp,
      f1: forfaits[0],
      f2: forfaits[1],
      r1: ressources ? ressources[0] : 0,
      r2: ressources ? ressources[1] : 0
    }
    return this
  }

  nouveauC (naI, naE, cc, dlv, mot, max) {
    this.v = 0
    this.vsh = 0
    this.st = 1110
    this.naI = naI
    this.idI = naI.id
    this.naE = naE
    this.idE = naE.id
    this.avc = 0
    const na = new NomAvatar(naI.nom + '_' + naE.nom, cc)
    this.id = na.id
    data.repertoire.setCp(na)
    this.v1 = 0
    this.v2 = 0
    this.mx10 = max[0]
    this.mx20 = max[1]
    this.mx11 = 0
    this.mx21 = 0
    this.dlv = dlv
    this.mc0 = null
    this.mc1 = null
    this.info = null
    this.ard = mot
    this.dh = new Date().getTime()
    this.data = {
      x: [[naI.nom, naI.rnd], [naE.nom, naE.rnd]],
      phrase: null,
      f1: 0,
      f2: 0,
      r1: 0,
      r2: 0
    }
    return this
  }

  dlvEtat () {
    if (this.dlv && dlvDepassee(this.dlv)) {
      if (this.stp === 1) { this.st += 1100; return } // si attente, passe en phase 2 et états hors délai
      if (this.stp === 4 && this.ste === 1) this.st += 100 // si attente, passe en hors délai
    }
  }

  // cols: ['id', 'v', 'st', 'dds', 'v1', 'v2', 'mx10', 'mx20', 'mx11', 'mx21', 'dlv', 'data', 'info0', 'info1', 'mc0', 'mc1', 'dh', 'ard', 'vsh']
  async fromRow (row, cle) { // cle : non null pour réception d'un couple HORS session (accepatation / refus parrainage)
    if (cle) this.cc = cle // NON persistante, utile pour acceptation de parrainage
    this.vsh = row.vsh || 0
    this.id = row.id
    this.v = row.v
    this.st = row.st
    this.v1 = row.v1
    this.v2 = row.v2
    this.mx10 = row.mx10
    this.mx20 = row.mx20
    this.mx11 = row.mx11
    this.mx21 = row.mx21
    this.dlv = row.dlv
    this.data = deserial(await crypt.decrypter(this.cc || this.cle, row.datac))
    this.setIdIE(this.data.x, cle)
    const x = row.ardc ? deserial(await crypt.decrypter(this.cc || this.cle, row.ardc)) : [0, '']
    this.dh = x[0]
    this.ard = x[1]
    if (this.avc === 0) {
      this.mc = row.mc0 || new Uint8Array([])
      this.info = row.infok0 && data.clek ? await crypt.decrypterStr(data.clek, row.infok0) : ''
    } else {
      this.mc = row.mc1 || new Uint8Array([])
      this.info = row.infok1 && data.clek ? await crypt.decrypterStr(data.clek, row.infok1) : ''
    }
    this.dlvEtat()
    return this
  }

  async toRow () { // pour création de couple
    const r = { ...this }
    r.datac = await crypt.crypter(this.cle, serial(r.data))
    r.ardc = await crypt.crypter(this.cle, serial([r.dh, r.ard]))
    r.infok0 = null
    r.infok1 = null
    return schemas.serialize('rowcouple', r)
  }

  async datacRenc (avatar) {
    const data = { x: this.data.x, phrase: this.data.phrase, f1: 0, f2: 0, r1: 0, r2: 0 }
    data.x[1][1] = avatar.na.rnd
    return await crypt.crypter(this.cc || this.cle, serial(data))
  }

  async toArdc (ard, cc) {
    return await crypt.crypter(this.cc || cc || this.cle, serial([new Date().getTime(), ard]))
  }

  get toIdb () {
    return schemas.serialize('idbCouple', this)
  }

  fromIdb (idb) {
    schemas.deserialize('idbCouple', idb, this)
    this.dlvEtat()
    this.setIdIE(this.data.x)
    return this
  }
}

/** Contact **********************************/
/*
- `phch` : hash de la phrase de contact convenue entre le parrain A0 et son filleul A1 (s'il accepte)
- `dlv`
- `ccx` : [cle nom] cryptée par le PBKFD de la phrase de contact:
  - `cle` : clé du couple (donne son id).
  - `nom` : nom de A1 pour première vérification immédiate en session que la phrase est a priori bien destinée à cet avatar. Le nom de A1 figure dans le nom du couple après celui de A1.
- `vsh` :
*/

schemas.forSchema({
  name: 'idbContact',
  cols: ['phch', 'dlv', 'ccx', 'vsh']
})

export class Contact {
  get table () { return 'contact' }
  get sid () { return crypt.idToSid(this.phch) }
  get pk () { return this.sid }

  get horsLimite () { return dlvDepassee(this.dlv) }

  async nouveau (phch, clex, dlv, cc, nom) { // clex : PBKFD de la phrase de contact
    this.vsh = 0
    this.phch = phch
    if (!cc) cc = crypt.random(32)
    this.ccx = await crypt.crypter(clex, serial([cc, nom]))
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
    const [cc, nom] = deserial(await crypt.decrypter(clex, this.ccx))
    const id = crypt.hashBin(cc)
    return [cc, id, nom]
  }

  toRow () {
    return schemas.serialize('rowcontact', this)
  }
}

/** Invitgr **********************************/
/*
- `id` : id du membre invité.
- `ni` : numéro d'invitation.
- `datap` : crypté par la clé publique du membre invité (recrypté en datak par la clé k)
  - `nom rnd im` : nom complet du groupe (donne sa clé).
Jamais stocké en IDB : dès réception, le row avatar correspondant est "régularisé"
*/

export class Invitgr {
  get table () { return 'invitgr' }

  async fromRow (row) {
    this.id = row.id
    this.ni = row.ni
    const cpriv = data.getCompte().av(row.id).cpriv
    const x = deserial(await crypt.decrypterRSA(cpriv, row.datap))
    this.idg = crypt.hashBin(x[1]) // pour le traitement de régularisation (abonnement au groupe)
    this.datak = await crypt.crypter(data.clek, serial(x))
    return this
  }

  async toRow (clepub) {
    const datap = await crypt.crypterRSA(clepub, serial(this.data))
    const r = { id: this.id, ni: this.ni, datap }
    return schemas.serialize('rowinvitgr', r)
  }
}

/** Invitcp **********************************/
/*
- `id` : id du membre invité.
- `ni` : numéro d'invitation.
- `datap` : clé cc du couple cryptée par la clé publique du membre invité (recrypté en datak par la clé k)
Jamais stocké en IDB : dès réception, le row avatar correspondant est "régularisé"
*/

export class Invitcp {
  get table () { return 'invitcp' }

  async fromRow (row) {
    this.id = row.id
    this.ni = row.ni
    const cpriv = data.getCompte().av(row.id).cpriv
    const x = await crypt.decrypterRSA(cpriv, row.datap)
    this.idc = crypt.hashBin(x) // pour le traitement de régularisation (abonnement au groupe)
    this.datak = await crypt.crypter(data.clek, x)
    return this
  }

  async toRow (id, ni, cc, clepub) {
    const datap = await crypt.crypterRSA(clepub, cc)
    const r = { id, ni, datap }
    return schemas.serialize('rowinvitcp', r)
  }
}

/** Groupe ***********************************/
/*
- `id` : id du groupe.
- `v` :
- `dds` :
- `dfh` : date (jour) de fin d'hébergement du groupe par son hébergeur
- `st` : `x y`
    - `x` : 1-ouvert (accepte de nouveaux membres), 2-fermé (ré-ouverture en vote)
    - `y` : 0-en écriture, 1-protégé contre la mise à jour, création, suppression de secrets.
- `mxim` : dernier `im` de membre attribué.
- `imh` : indice `im` du membre dont le compte est hébergeur.
- `v1 v2` : volumes courants des secrets du groupe.
- `f1 f2` : forfaits attribués par le compte hébergeur.
- `mcg` : liste des mots clés définis pour le groupe cryptée par la clé du groupe cryptée par la clé G du groupe.
- `vsh`
*/

schemas.forSchema({
  name: 'idbGroupe',
  cols: ['id', 'v', 'dfh', 'st', 'mxim', 'imh', 'v1', 'v2', 'f1', 'f2', 'mc', 'vsh']
})

export class Groupe {
  get table () { return 'groupe' }
  get sid () { return crypt.idToSid(this.id) }
  get pk () { return this.sid }
  get estZombi () { return this.dfh === 99999 }

  get cv () { return data.getCv(this.id) }
  get photo () { const cv = this.cv; return cv ? cv[0] : '' }
  get info () { const cv = this.cv; return cv ? cv[1] : '' }

  get cle () { return data.repertoire.cle(this.id) }
  get na () { return data.repertoire.na(this.id) }
  get nom () { return this.na.nom }
  get nomEd () { return titreEd(this.na.nom || '', this.info) }
  nomEdMb (m) { const t = m.titre; return t ? (t + ' [' + this.nomEd + ']') : this.nomEd }

  get nomf () { return normpath(this.na.nom) }

  get stx () { return Math.floor(this.st / 10) }
  get sty () { return this.st % 10 }

  get pc1 () { return Math.round(this.v1 / UNITEV1 / this.f1) }
  get pc2 () { return Math.round(this.v2 / UNITEV2 / this.f2) }

  estHeb (avid) { const na = this.naHeb; return na && !this.dfh && na.id === avid }

  get naHeb () {
    if (this.dfh) return null
    const m = data.getMembre(this.id, this.imh)
    return m ? m.namb : null
  }

  imDeId (id) {
    for (const im in data.getMembre(this.id)) {
      const m = data.getMembre(this.id, im)
      if (m.namb.id === id) return parseInt(im)
    }
    return 0
  }

  auteurs () {
    const l = []
    for (const im in data.getMembre(this.id)) {
      const m = data.getMembre(this.id, im)
      if (m.stp) l.push(im + '-' + m.nomEd)
    }
    return l
  }

  nbActifsInvites () { // actif et invité
    let n = 0
    for (const im in data.getMembre(this.id)) {
      const m = data.getMembre(this.id, im)
      if (m.stx === 1 || m.stx === 2) n++
    }
    return n
  }

  membreParId (id) {
    for (const im in data.getMembre(this.id)) {
      const m = data.getMembre(this.id, im)
      if (m.namb.id === id) return m
    }
    return null
  }

  maxStp () {
    let mx = 0
    for (const im in data.getMembre(this.id)) {
      const m = data.getMembre(this.id, im)
      if (m.estAc && m.stp > mx) mx = m.stp
    }
    return mx
  }

  motcle (n) { // utilisé par util / Motscles
    const s = this.mc[n]
    if (!s) return ''
    const i = s.indexOf('/')
    return i === -1 ? { c: '', n: s } : { c: s.substring(0, i), n: s.substring(i + 1) }
  }

  nouveau (id, forfaits) {
    this.id = id
    this.v = 0
    this.dfh = 0
    this.st = 10
    this.mxim = 1
    this.imh = 1
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
    this.dfh = row.dfh
    if (!this.estZombi) {
      this.st = row.st
      this.mxim = row.mxim
      this.mc = row.mcg ? deserial(await crypt.decrypter(this.cle, row.mcg)) : {}
      this.imh = row.imh
      this.v1 = row.v1
      this.v2 = row.v2
      this.f1 = row.f1
      this.f2 = row.f2
    } else { // utilité ? a du être fait par le GC
      this.st = 0
      this.mxim = 0
      this.mc = null
      this.imh = 0
      this.v1 = 0
      this.v2 = 0
      this.f1 = 0
      this.f2 = 0
    }
    return this
  }

  async toRow () {
    const r = { ...this }
    r.mcg = Object.keys(r.mc).length ? await crypt.crypter(this.cle, serial(this.mc)) : null
    return schemas.serialize('rowgroupe', r)
  }

  async toIdhg (idc) {
    return await crypt.crypter(this.cle, '' + idc)
  }

  async toCvg (cv) {
    return await crypt.crypter(this.cle, serial([cv.ph, cv.info]))
  }

  async toMcg (mc) {
    return Object.keys(mc).length ? await crypt.crypter(this.cle, serial(mc)) : null
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
  - `idi` : id du membre qui l'a _envisagé_.
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
  get id2 () { return '' + this.im }
  get pk () { return this.sid + '/' + this.id2 }
  get pkv () { return this.sid + '/' + this.id2 + '/' + this.v }

  get stx () { return this.st < 0 ? -1 : Math.floor(this.st / 10) }
  get stp () { return this.st < 0 ? -1 : this.st % 10 }

  // De l'avatar membre
  get estAc () { return data.repertoire.estAc(this.namb.id) }
  get cvm () { return data.getCv(this.namb.id) }
  get photom () { const cv = this.cvm; return cv ? cv[0] : '' }
  get infom () { const cv = this.cvm; return cv ? cv[1] : '' }
  get clem () { return data.repertoire.cle(this.namb.id) }
  get nomEd () { return titreEd(this.namb.nom || '', this.info) }

  get titre () {
    if (!this.info) return ''
    const i = this.info.indexOf('\n')
    const t1 = i === -1 ? this.info : this.info.substring(0, i)
    return t1.length <= 20 ? t1 : t1.substring(0, 20) + '...'
  }

  // Du groupe
  get cvg () { return data.getCv(this.id) }
  get photog () { const cv = this.cv; return cv ? cv.photo : '' }
  get infog () { const cv = this.cv; return cv ? cv.info : '' }
  get cleg () { return data.repertoire.cle(this.id) }
  get na () { return data.repertoire.na(this.id) }
  get nomEdg () { return titreEd(this.na.nom || '', this.infog) }

  get dhed () { return dhstring(this.dh) }

  setRepE () {
    if (!this.estAc) {
      data.repertoire.setAx(this.namb)
    }
  }

  nouveau (id, st, im, na, idi) {
    /* id du groupe, statut, indice membre,
    NomAvatar du membre, id de l'invitant (fac, sinon c'est le membre lui-même */
    this.id = id
    this.im = im
    this.v = 0
    this.st = st
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
    this.namb = na
    this.vsh = 0
    return this
  }

  async fromRow (row) {
    this.vsh = row.vsh || 0
    this.id = row.id
    this.im = row.im
    this.v = row.v
    this.st = row.st
    this.vote = row.vote
    this.data = deserial(await crypt.decrypter(this.cleg, row.datag))
    this.namb = new NomAvatar(this.data.nom, this.data.rnd)
    const [d, t] = row.ardg ? deserial(await crypt.decrypter(this.cleg, row.ardg)) : [0, '']
    this.ard = t
    this.dh = d
    this.info = row.infok && this.estAc ? await crypt.decrypterStr(data.clek, row.infok) : ''
    this.mc = row.mc
    return this
  }

  async toArdg (ard) {
    return ard ? await crypt.crypter(this.cleg, serial([new Date().getTime(), ard])) : null
  }

  async toRow () {
    const r = { ...this }
    r.datag = await crypt.crypter(this.cleg, serial(this.data))
    r.ardg = this.ard ? await crypt.crypter(this.cleg, serial([this.dh, this.ard])) : null
    r.infok = this.estAc && this.info ? await crypt.crypter(data.clek, this.info) : null
    return schemas.serialize('rowmembre', r)
  }

  get toIdb () {
    return schemas.serialize('idbMembre', this)
  }

  fromIdb (idb) {
    schemas.deserialize('idbMembre', idb, this)
    this.namb = new NomAvatar(this.data.nom, this.data.rnd)
    return this
  }
}

/** Secret **********************************/
/*
- `id` : id du groupe ou de l'avatar.
- `ns` : numéro du secret.
- `x` : jour de suppression (0 si existant).
- `v` :
- `st` :
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
- `refs` : couple `[id, ns]` crypté par la clé du secret référençant un autre secret
(référence de voisinage qui par principe, lui, n'aura pas de `refs`).
- `vsh`

**Map `mfas` des fichiers attachés dans un secret:**
- _clé_ `idf`: identifiant du fichier en base64.
- _valeur_ : couple `[lg, data]`
  - `lg` : taille du fichier, en clair afin que le serveur puisse toujours recalculer la taille totale v2 d'un secret.
  - `data` : sérialisation cryptée par la clé S du secret de : `{ nom, info, dh, type, gz, lg, sha }`.
*/

schemas.forSchema({
  name: 'idbSecret',
  cols: ['id', 'ns', 'v', 'x', 'st', 'xp', 'v1', 'v2', 'mc', 'txt', 'mfa', 'ref', 'vsh']
})

export class Secret {
  get table () { return 'secret' }
  get sid () { return crypt.idToSid(this.id) }
  get id2 () { return this.ns }
  get sid2 () { return crypt.idToSid(this.ns) }
  get pk () { return this.sid + '/' + this.ns }
  get pkref () { return !this.ref ? '' : (crypt.idToSid(this.ref[0]) + '/' + this.ref[1]) }

  get vk () { return this.pk + '@' + this.v }

  get suppr () { return this.x > 0 }

  get horsLimite () { return this.st < 0 || this.st >= 99999 ? false : dlvDepassee(this.st) }
  get ts () { return this.ns % 3 } // 0:personnel 1:couple 2:groupe
  get exclu () { return Math.floor(this.xp / 10) }
  get protect () { return this.xp % 10 }
  get titre () { return this.suppr ? 'SUPPRIMÉ' : titreEd(null, this.txt.t) }
  get nbj () { return this.st <= 0 || this.st === 99999 ? 0 : (this.st - getJourJ()) }
  get dh () { return this.suppr ? '?' : dhstring(new Date(this.txt.d * 1000)) }

  get cle () { return this.ts ? data.repertoire.cle(this.id) : data.clek }

  get nomf () {
    if (this.suppr) return 'SUPPRIMÉ@' + this.sid2
    const i = this.txt.t.indexOf('\n')
    const t = this.txt.t.substring(0, (i === -1 ? 16 : (i < 16 ? i : 16)))
    return normpath(t) + '@' + this.sid2
  }

  get avatar () { return this.ts !== 0 ? null : data.getAvatar(this.id) }
  get couple () { return this.ts !== 1 ? null : data.getCouple(this.id) }
  get groupe () { return this.ts !== 2 ? null : data.getGroupe(this.id) }

  get partage () {
    if (this.ts === 0) return 'Secret personnel'
    if (this.ts === 1) return 'Secret du couple ' + this.couple.nom
    return 'Secret du groupe ' + this.groupe.nom
  }

  get mcg () { return this.ts === 2 && this.mc ? this.mc[0] || new Uint8Array([]) : new Uint8Array([]) }

  im (avid) { return this.ts === 0 ? 0 : (this.ts === 1 ? this.couple.avc + 1 : this.groupe.imDeId(avid)) }
  membre (avid) { return this.ts === 2 ? data.getMembre(this.groupe.id, this.im(avid)) : null }
  mcl (avid) {
    if (this.ts >= 1) return (this.mc ? this.mc[this.im(avid)] : new Uint8Array([])) || new Uint8Array([])
    return this.mc || new Uint8Array([])
  }

  auteurs () {
    const l = []
    if (this.txt && this.txt.l) {
      if (this.ts === 1) this.txt.l.forEach(im => { l.push(this.couple.naDeIm(im).nom) })
      if (this.ts === 2) this.txt.l.forEach(im => { const m = data.getMembre(this.id, im); if (m) l.push(m.namb.nom) })
    }
    return l
  }

  cloneSuppr () {
    const s = new Secret()
    s.id = this.id
    s.ns = this.ns
    s.x = 1
    s.v = 0
    s.ref = this.ref
    return s
  }

  nouveau (id, ref) {
    this.id = id
    this.v = 0
    this.x = 0
    this.st = getJourJ() + cfg().limitesjour.secrettemp
    this.xp = 0
    this.txt = { t: '', d: Math.floor(new Date().getTime() / 1000) }
    this.ref = ref || null
  }

  nouveauP (id, ref) {
    this.nouveau(id, ref)
    this.ns = (Math.floor(crypt.rnd4() / 3) * 3)
    this.mc = new Uint8Array([])
    return this
  }

  nouveauC (id, ref) { // im : 0 ou 1 (couple.avc)
    this.nouveau(id, ref)
    this.ns = (Math.floor(crypt.rnd4() / 3) * 3) + 1
    this.mc = { 1: new Uint8Array([]), 2: new Uint8Array([]) }
    return this
  }

  nouveauG (id, ref, im) {
    this.nouveau(id, ref)
    this.ns = (Math.floor(crypt.rnd4() / 3) * 3) + 2
    this.mc = { 0: new Uint8Array([]), im: new Uint8Array([]) }
    return this
  }

  async toRowTxt (txt, im) {
    const x = { d: Math.floor(new Date().getTime() / 1000), t: gzip(txt) }
    if (this.ts) {
      const nl = [im]
      if (this.txt.l) this.txt.l.forEach(t => { if (t !== im) nl.push(t) })
      x.l = new Uint8Array(nl)
    }
    return await crypt.crypter(this.cle, serial(x))
  }

  async toRowRef () {
    return this.ref ? await crypt.crypter(this.cle, serial(this.ref)) : null
  }

  async toRowMfa (fic) {
    const x = await crypt.crypter(this.cle, serial(fic))
    return [fic.lg, x]
  }

  async fromRow (row) {
    this.vsh = row.vsh || 0
    this.id = row.id
    this.ns = row.ns
    this.x = row.x || 0
    this.v = row.v
    const cle = this.cle
    this.ref = row.refs ? deserial(await crypt.decrypter(cle, row.refs)) : null
    if (!this.suppr) {
      this.st = row.st
      this.xp = row.xp
      this.v1 = row.v1
      this.v2 = row.v2
      try {
        this.txt = deserial(await crypt.decrypter(cle, row.txts))
        this.txt.t = ungzip(this.txt.t)
      } catch (e) {
        console.log(e.toString())
        this.txt = { t: '!!! texte illisible, corrompu !!!', d: Math.floor(new Date().getTime() / 1000) }
      }
      if (this.ts === 0) {
        this.mc = row.mc || new Uint8Array([])
      } else {
        this.mc = row.mc ? deserial(row.mc) : {}
      }
      this.mfa = {}
      this.nbfa = 0
      if (this.v2) {
        const map = row.mfas ? deserial(row.mfas) : {}
        for (const idf in map) {
          this.mfa[idf] = deserial(await crypt.decrypter(cle, map[idf][1]))
          this.mfa[idf].idf = parseInt(idf)
          this.nbfa++
        }
      }
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
    // eslint-disable-next-line no-unused-vars
    if (this.v2) for (const idf in this.mfa) this.nbfa++
    return this
  }

  // fichier le plus récent portant le nom donné
  dfDeNom (nom) {
    let f = null
    for (const idf in this.mfa) {
      const x = this.mfa[idf]
      if (x.nom !== nom) continue
      if (!f || f.dh < x.dh) f = x
    }
    return f
  }

  nomDeIdf (idf) {
    const x = this.mfa[idf]
    return x ? x.nom : null
  }

  /* argument arg pour la gestion des volumes v1 et v2 lors de la création
  et maj des secrets (texte et fichier attaché):
  - id : id de l'avatar / couple / groupe
  - ts : type de secret 0 1 2
  - dv1 dv2 : delta de volume v1 et v2 (preset à 0)
  - vt : volume transféré (fichiers). Si vt est non 0, il est imputé à idc. Utiliser en download (opération getUrl)
  - idc : id de l'avatar hébergeur du secret (avatar, couple (de l'avatar du compte), groupe)
  - idc2 : pour un couple seulement, id du second avatar hébergeur du secret pour un couple (de l'avatar externe -s'il existe-))
  - im : pour un couple seulement, 0 ou 1 (position de l'avatar du compte dans le couple)
  */
  volarg () {
    const a = { id: this.id, ts: this.ts, dv1: 0, dv2: 0, vt: 0, idc2: null }
    if (this.ts === 0) {
      a.idc = this.id
    } else if (this.ts === 1) {
      a.idc = this.couple.idI
      a.idc2 = this.couple.idE
      a.im = this.couple.avc
    } else {
      const na = this.groupe.naHeb
      a.idc = na ? na.id : 0
    }
    return a
  }

  async downloadFichier (idf, ida) { // fichier décrypté mais pas dézippé
    const buf = await new DownloadFichier().run(this, idf, ida)
    if (!buf) return null
    return await crypt.decrypter(this.cle, buf)
  }

  async getFichier (idf, ida) { // Obtenu localement ou par download. Fichier décrypté ET dézippé
    const fetat = data.getFetat(idf)
    let buf
    if (fetat && fetat.estCharge) {
      const b = await getFichier(idf)
      buf = await crypt.decrypter(this.cle, b)
    } else {
      buf = await this.downloadFichier(idf, ida)
    }
    if (!buf) return null
    const f = this.mfa[idf]
    const buf2 = f.gz ? ungzipT(buf) : buf
    return buf2
  }

  nomFichier (idf) {
    const f = this.mfa[idf]
    if (!f) return idf
    const i = f.nom.lastIndexOf('.')
    const ext = i === -1 ? '' : f.nom.substring(i)
    return f.nom + '#' + f.info + '@' + crypt.idToSid(idf) + ext
  }
}

/*****************************************************/
schemas.forSchema({
  name: 'idbListeCvIds',
  cols: ['v', 'lids']
})

export class ListeCvIds {
  constructor () {
    this.v = 0
    this.ids = []
  }

  init (v, setIds) {
    this.v = v
    this.lids = Array.from(setIds)
    return this
  }

  fromIdb (idb) {
    if (!idb) {
      this.v = 0
      this.ids = new Set()
    } else {
      schemas.deserialize('idbListeCvIds', idb, this)
      this.ids = new Set(this.lids)
      delete this.lids
    }
    return this
  }

  toIdb () {
    return schemas.serialize('idbListeCvIds', this)
  }
}

/*****************************************************/

/* Dernier état de session synchronisé
- dhdebutp : dh de début de la dernière session sync terminée
- dhfinp : dh de fin de la dernière session sync terminée
- dhdebut: dh de début de la session sync en cours
- dhsync: dh du dernier traitement de synchronisation
- dhpong: dh du dernier pong reçu
*/
schemas.forSchema({
  name: 'idbSessionSync',
  cols: ['dhdebutp', 'dhfinp', 'dhdebut', 'dhsync', 'dhpong']
})

function max (a) { let m = 0; a.forEach(x => { if (x > m) m = x }); return m }

export class SessionSync {
  fromIdb (idb) {
    if (!idb) {
      this.dhdebutp = 0
      this.dhfinp = 0
      this.dhdebut = 0
      this.dhsync = 0
      this.dhpong = 0
    } else {
      schemas.deserialize('idbSessionSync', idb, this)
      this.dhdebutp = this.dhdebut
      this.dhfinp = max([this.dhdebut, this.dhsync, this.dhpong])
      this.dhdebut = 0
      this.dhsync = 0
      this.dhpong = 0
    }
    return this
  }

  async setConnexion (dh) {
    this.dhdebut = dh
    await this.save()
  }

  async setDhSync (dh) {
    if (data.statutsession !== 2) return
    this.dhsync = dh
    await this.save()
  }

  async setDhPong (dh) {
    if (data.statutsession !== 2) return
    this.dhpong = dh
    await this.save()
  }

  clone () {
    const c = new SessionSync()
    c.dhdebutp = this.dhdebutp
    c.dhfinp = this.dhfinp
    c.dhdebut = this.dhdebut
    c.dhsync = this.dhsync
    c.dhpong = this.dhpong
    return c
  }

  async save () {
    const r = schemas.serialize('idbSessionSync', this)
    await saveSessionSync(r, this)
  }
}
