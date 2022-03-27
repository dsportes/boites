import { schemas, serial, deserial } from './schemas.mjs'
import { crypt } from './crypto.mjs'
import { openIDB, closeIDB, getFadata, debutSessionSync, saveSessionSync } from './db.mjs'
import { openWS, closeWS } from './ws.mjs'
import {
  store, appexc, dlvDepassee, NomAvatar, gzip, ungzip, dhstring,
  getJourJ, cfg, ungzipT, normpath, getfa, titreEd, titreCompte
} from './util.mjs'
import { remplacePage } from './page.mjs'
import { EXPS, UNITEV1, UNITEV2, Compteurs, t0n } from './api.mjs'

export const MODES = ['inconnu', 'synchronisé', 'incognito', 'avion', 'visio']

export async function traitInvitGr (row) {
  const cpriv = data.avc(row.id).cpriv
  const x = deserial(await crypt.decrypterRSA(cpriv, row.datap))
  return { id: row.id, ni: row.ni, datak: crypt.crypter(data.clek, x) }
}

/* Compile en objet tous les rows de la structure de rows désérialisée mr
La structure de sortie mapObj est identique. Elle peut être fourni en entrée
ce qui provoque une mise à jour par les versions postérieures de chaque objet
*/
export async function compileToObject (mr, mapObj) {
  if (!mapObj) mapObj = {}
  for (const table in mr) {
    if (t0n.has(table)) {
      const row = mr[table]
      if (!mapObj[table]) mapObj[table] = {}
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

  setXX (na, x) {
    const id = na.id
    const obj = { na: na }
    if (x) obj.x = true
    this.rep[id] = obj
    return id
  }

  setAc (na, x) { this.idac.add(this.setXX(na, x)) }
  setGr (na, x) { this.idgr.add(this.setXX(na, x)) }
  setCp (na, x) { this.idcp.add(this.setXX(na, x)) }
  setAx (na, x) { this.idax.add(this.setXX(na, x)) }
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

  getCompta () { return store().state.db.compta }
  setCompta (compta) { store().commit('db/setCompta', compta) }

  getPrefs () { return store().state.db.prefs }
  setPrefs (prefs) { store().commit('db/setPrefs', prefs) }

  getAvatar (id) { return store().getters['db/avatar'](id) }
  setAvatars (lobj) { store().commit('db/setObjets', lobj) }

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
  get pk () { return '1' }
  get estComptable () { return data.estComptable }

  avatars (s) {
    const s1 = new Set()
    for (const sid in this.mac) if (s) s.add(this.mac[sid].na); else s1.add(this.mac[sid].na)
    return s || s1
  }

  avatarIds (s) {
    const s1 = new Set()
    for (const sid in this.mac) if (s) s.add(this.mac[sid].na.id); else s1.add(this.mac[sid].na.id)
    return s || s1
  }

  repAvatars () { this.avatars().forEach(na => { data.repertoire.setAc(na) }) }

  nouveau (nomAvatar, cprivav, id) {
    this.id = id || crypt.rnd6()
    this.v = 0
    this.dpbh = data.ps.dpbh
    this.pcbh = data.ps.pcbh
    this.k = crypt.random(32)
    data.clek = this.k
    this.mac = { }
    this.mac[nomAvatar.sid] = { na: nomAvatar, cpriv: cprivav }
    data.repertoire.setAc(nomAvatar)
    this.vsh = 0
    return this
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

  get toIdb () { return schemas.serialize('idbCompte', this) }

  fromIdb (idb) {
    schemas.deserialize('idbCompte', idb, this)
    data.clek = this.k
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
  get pk () { return '1' }
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
    this.mcc = new Map() // clé: id du couple, val: clé cc
  }

  groupeIds (s) {
    const s1 = new Set()
    this.m1gr.forEach(e => {
      if (s) s.add(e.na.id); else s1.add(e.na.id)
    })
    return s || s1
  }

  groupes (s) {
    const s1 = new Set()
    this.m1gr.forEach(e => {
      const x = { id: e.na.id, nom: e.na.nom, cle: e.na.cle }
      if (s) s.add(x); else s1.add(x)
    })
    return s || s1
  }

  repGroupes () { this.groupes().forEach(x => { data.repertoire.setGr(x.nom, x.cle) }) }

  coupleIds (s) {
    const s1 = new Set()
    this.mcc.forEach(cc => {
      if (s) s.add(crypt.hashBin(cc)); else s1.add(crypt.hashBin(cc))
    })
    return s || s1
  }

  couples (s) {
    const s1 = new Set()
    this.mcc.forEach(cc => {
      const x = { id: crypt.hashBin(cc), nom: 'x', cle: cc }
      if (s) s.add(x); else s1.add(x)
    })
    return s || s1
  }

  repCouples () { this.groupes().forEach(x => { data.repertoire.setCp(x.na) }) }

  nouveau (id) {
    this.id = id
    this.v = 0
    this.vsh = 0
    return this
  }

  async compileLists (lgr, lcc, brut) {
    this.mcc.clear()
    if (lcc) {
      for (const ni in lcc) {
        const y = lcc[ni]
        const cc = brut ? y : await crypt.decrypter(data.clek, y)
        const id = crypt.hashBin(cc)
        this.mcc.set(id, cc)
      }
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

  decompileListsBrut () {
    const lgr = {}
    for (const [ni, x] of this.m1gr) lgr[ni] = serial([x.na.nom, x.na.rnd, x.im])
    const lcc = {}
    for (const [ni, x] of this.mcc) lcc[ni] = x
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
    const r = { id: this.id, v: this.v, lgrk: null, lcck: null, vsh: 0 }
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

  constructor () {
    this.id = 0
    this.v = 0
    this.x = 0
    this.dds = 0
    this.cv = null
    this.vsh = 0
  }

  init (id, v, cv) {
    this.id = id
    this.cv = cv
    this.v = v
  }

  async fromRow (row) { // row : rowCv - item retour de sync
    this.id = row.id
    this.v = row.v
    this.x = row.x
    this.dds = row.dds
    const cle = data.repertoire.cle(this.id)
    this.cv = row.cv && cle ? deserial(await crypt.decrypter(cle, row.cv)) : null
    return this
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
  - `x` : `[idc, nom, rnd], [idc, nom, rnd]` : id du compte, nom et clé d'accès à la carte de visite respectivement de A0 et A1. Quand l'un des deux est inconnu, le triplet est `null`.
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
  get pk () { return this.sid }
  get pkv () { return this.sid + '/' + this.v }

  get stp () { return Math.floor(this.st / 1000) }
  get ste () { return Math.floor(this.st / 100) % 10 }
  get st0 () { return Math.floor(this.st / 10) % 10 }
  get st1 () { return this.st % 10 }

  get cv () { return data.getCv(this.id) }
  get photo () { const cv = this.cv; return cv ? cv.photo : '' }
  get info () { const cv = this.cv; return cv ? cv.info : '' }

  get cle () { return data.repertoire.cle(this.id) }
  get nom () { const x = this.data.x; return x[0][1] + '__' + x[1][1] }
  get nomEd () { return titreEd(this.nom, this.info) }

  get nomf () { return normpath(this.nom) }

  setRepE () { data.repertoire.setAx(this.naE) }

  setIdIE (x) {
    const id0 = this.st0 ? crypt.hashBin(x[0][2]) : 0
    const id1 = this.st1 ? crypt.hashBin(x[1][2]) : 0
    if (data.repertoire.estAvc(id0)) {
      this.idI = id0
      this.idE = id1
      this.naE = this.idE ? new NomAvatar(x[1][1], x[1][2]) : null
      this.naI = new NomAvatar(x[0][1], x[0][2])
      this.avc = 0
    } else {
      this.idI = id1
      this.idE = id0
      this.naE = this.idE ? new NomAvatar(x[0][1], x[0][2]) : null
      this.naI = new NomAvatar(x[1][1], x[1][2])
      this.avc = 1
    }
    this.na = new NomAvatar(this.nom, this.cle)
  }

  // cols: ['id', 'v', 'st', 'dds', 'v1', 'v2', 'mx10', 'mx20', 'mx11', 'mx21', 'dlv', 'data', 'info0', 'info1', 'mc0', 'mc1', 'dh', 'ard', 'vsh']
  async fromRow (row) {
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
    this.data = deserial(await crypt.decrypter(this.cle, row.datac))
    this.setIdIE(this.data.x)
    const x = row.ardc ? deserial(await crypt.decrypter(this.cle, row.ardc)) : [0, '']
    this.dh = x[0]
    this.ard = x[1]
    if (this.avc === 0) {
      this.mc = row.mc0 || new Uint8Array([])
      this.info = row.info0k ? await crypt.decrypterStr(data.clek, row.info0k) : ''
    } else {
      this.mc = row.mc1 || new Uint8Array([])
      this.info = row.info1k ? await crypt.decrypterStr(data.clek, row.info1k) : ''
    }
    return this
  }

  async toRow (datak, cc) { // TODO ???
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
    this.ccx = await crypt.crypter(clex, serial([cc || await crypt.random(32), nom]))
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
    const [cc, nom] = deserial(await crypt.crypter(clex, this.ccx))
    const id = crypt.hashBin(cc)
    return [cc, id, nom]
  }

  async toRow () {
    return schemas.serialize('rowcontact', this)
  }
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
    this.idg = crypt.hashBin(x[1]) // utilité ???
    this.datak = await crypt.crypter(data.clek, serial(x))
    return this
  }

  async toRow (clepub) {
    const datap = await crypt.crypterRSA(clepub, serial(this.data))
    const r = { id: this.id, ni: this.ni, datap }
    return schemas.serialize('rowinvitgr', r)
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
- `idhg` : id du compte hébergeur crypté par la clé G du groupe.
- `imh` : indice `im` du membre dont le compte est hébergeur.
- `v1 v2` : volumes courants des secrets du groupe.
- `f1 f2` : forfaits attribués par le compte hébergeur.
- `mcg` : liste des mots clés définis pour le groupe cryptée par la clé du groupe cryptée par la clé G du groupe.
- `vsh`
*/

schemas.forSchema({
  name: 'idbGroupe',
  cols: ['id', 'v', 'dfh', 'st', 'mxin', 'idh', 'imh', 'v1', 'v2', 'f1', 'f2', 'mc', 'vsh']
})

export class Groupe {
  get table () { return 'groupe' }
  get sid () { return crypt.idToSid(this.id) }
  get pk () { return this.sid }

  get cv () { return data.getCv(this.id) }
  get photo () { const cv = this.cv; return cv ? cv.photo : '' }
  get info () { const cv = this.cv; return cv ? cv.info : '' }

  get cle () { return data.repertoire.cle(this.id) }
  get na () { return data.repertoire.na(this.id) }
  get nomEd () { return titreEd(this.na.nom || '', this.info) }

  get nomf () { return normpath(this.na.nom) }

  get stx () { return Math.floor(this.st / 10) }
  get sty () { return this.st % 10 }

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
    this.dfh = 0
    this.st = 10
    this.mxim = 1
    this.idh = data.getCompte().id
    this.imh = imh
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
    this.st = row.st
    this.mxim = row.mxim
    this.mc = row.mcg ? deserial(await crypt.decrypter(this.cle, row.mcg)) : {}
    this.idh = row.idhg ? parseInt(await crypt.decrypterStr(this.cle, row.idhg)) : 0
    this.imh = row.imh
    this.v1 = row.v1
    this.v2 = row.v2
    this.f1 = row.f1
    this.f2 = row.f2
    return this
  }

  async toRow () {
    const r = { ...this }
    r.mcg = Object.keys(r.mc).length ? await crypt.crypter(this.cle, serial(this.mc)) : null
    r.idhg = this.idh ? await crypt.crypter(this.cle, '' + this.idh) : 0
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
  get estAvc () { return data.repertoire.estAc(this.namb.id) }
  get cv () { return data.getCv(this.namb.id) }
  get photo () { const cv = this.cv; return cv ? cv.photo : '' }
  get info () { const cv = this.cv; return cv ? cv.info : '' }

  get rep () { return data.repertoire.get(this.namb.id) }
  get cle () { return this.rep.cle }
  get nom () { return this.rep.nom }
  get nomEd () { return titreEd(this.nom || '', this.info) }

  get titre () {
    const i = this.info.indexOf('\n')
    const t1 = i === -1 ? this.info : this.info.substring(0, i)
    const t = t1.length <= 16 ? t1 : t1.substring(0, 13) + '...'
    return t ? t + ' [' + this.namb.titre + ']' : this.namb.titre
  }

  // Du groupe
  get cvg () { return data.getCv(this.id) }
  get photog () { const cv = this.cv; return cv ? cv.photo : '' }
  get infog () { const cv = this.cv; return cv ? cv.info : '' }
  get repg () { return data.repertoire.get(this.namb.id) }
  get cleg () { return this.repg.cle }
  get nomg () { return this.repg.nom }
  get nomEdg () { return titreEd(this.nomg || '', this.infog) }

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
    this.namb = new NomAvatar(this.data.nom, this.data.rnd)
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
    this.info = row.infok && this.estAvc ? await crypt.decrypterStr(data.clek, row.infok) : ''
    this.mc = row.mc
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
- `refs` : couple `[id, ns]` crypté par la clé du secret référençant un autre secret (référence de voisinage qui par principe, lui, n'aura pas de `refs`).
- `vsh`

**Map des fichiers attachés :**
- _clé_ : hash (court) de `nom.ext` en base64 URL. Permet d'effectuer des remplacements par une version ultérieure.
- _valeur_ : `[idc, taille]`
  - `idc` : id complète du fichier (`nom.ext|type|dh$`), cryptée par la clé du secret et en base64 URL.
  - `taille` : en bytes, avant gzip éventuel.
*/

schemas.forSchema({
  name: 'idbSecret',
  cols: ['id', 'ns', 'v', 'st', 'xp', 'v1', 'v2', 'mc', 'txt', 'mfa', 'ref', 'vsh']
})

export class Secret {
  get table () { return 'secret' }
  get sid () { return crypt.idToSid(this.id) }
  get id2 () { return this.ns }
  get pk () { return this.sid + '/' + this.ns }
  get pkref () { return !this.ref ? '' : (crypt.idToSid(this.ref[0]) + '/' + this.ref[1]) }

  get vk () { return this.pk + '@' + this.v }

  get suppr () { return this.st < 0 }
  get horsLimite () { return this.st < 0 || this.st >= 99999 ? false : dlvDepassee(this.st) }

  get ts () { return this.ns % 3 } // 0:personnel 1:couple 2:groupe
  get titre () { return titreEd(null, this.txt.t) }
  get nbj () { return this.st <= 0 || this.st === 99999 ? 0 : (this.st - getJourJ()) }
  get dh () { return dhstring(new Date(this.txt.d * 1000)) }

  get cle () { return this.ts ? data.repertoire.cle(this.id) : data.clek }

  get nomf () {
    const i = this.txt.t.indexOf('\n')
    const t = this.txt.t.substring(0, (i === -1 ? 16 : (i < 16 ? i : 16)))
    return normpath(t) + '@' + this.sid2
  }

  get avatar () { return this.ts !== 0 ? null : data.getAvatar(this.id) }
  get couple () { return this.ts !== 1 ? null : data.getCouple(this.id) }
  get groupe () { return this.ts !== 2 ? null : data.getGroupe(this.id) }

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
      const cle = this.cle
      try {
        this.txt = deserial(await crypt.decrypter(cle, row.txts))
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
          let nomc = await crypt.decrypterStr(cle, crypt.b64ToU8(x[0]))
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
      this.ref = row.refs ? deserial(await crypt.decrypter(cle, row.refs)) : null
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

  clefa (fa) { return crypt.hash(fa.nom, false, true) }

  sidfa (cle) { return this.secidfa + '@' + cle }

  get secidfa () { return crypt.idToSid(this.id) + '@' + crypt.idToSid(this.ns) }

  async idc (fa) { return crypt.u8ToB64(await crypt.crypter(this.cles, this.nomc(fa), 1), true) }

  async datafa (fa, raw) {
    const y = data.getFaidx({ id: this.id, ns: this.ns, cle: fa.cle })
    let buf = null
    if (y.length) buf = await getFadata({ id: this.id, ns: this.ns, cle: fa.cle })
    if (!buf) buf = await getfa(this.secidpj, fa.cle + '@' + (await this.idc(fa)))
    if (!buf) return null
    if (raw) return buf
    const buf2 = await crypt.decrypter(this.cles, buf)
    const buf3 = fa.gz ? ungzipT(buf2) : buf2
    return buf3
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
