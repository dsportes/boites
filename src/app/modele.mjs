import { schemas } from './schemas.mjs'
import { crypt } from './crypto.mjs'
const u8ToB64 = crypt.u8ToB64
const b64ToU8 = crypt.b64ToU8
import { openIDB, closeIDB } from './db.mjs'
import { openWS, closeWS } from './ws.mjs'
import { cfg, store, appexc, serial, deserial } from './util.mjs'
import { ConnexionCompteAvion, ConnexionCompte } from './operations.mjs'

import { useRouter, useRoute } from 'vue-router'

let bootfait = false
let $router

export function onBoot () {
  if (bootfait) return
  bootfait = true
  $router = useRouter()
  $router.beforeEach((to, from) => {
    const $store = store()
    const org = $store.state.ui.org
    const compte = $store.state.db.compte
    const avatar = $store.state.db.avatar
    const groupe = $store.state.db.groupe
    const neworg = to.params.org

    if (!neworg) {
      // il faut aller sur Org
      if (org && compte) return false // pas déconnecté : refusé
      $store.commit('ui/majorg', null)
      $store.commit('ui/majpage', 'Org')
      if (to.name === 'Org') return true // devrait toujours être vrai
      return '/'
    }

    if (!cfg().orgs[neworg]) return false

    if (!org) {
      // définition de l'organisation, il n'y en avait pas
      $store.commit('ui/majorg', neworg)
      $store.commit('ui/majpage', 'Login')
      if (to.name === 'Login') return true
      return '/' + org // vers Login
    }

    if (org !== neworg) {
      // changement d'organisation
      if (compte) return false // pas déconnecté : refusé
      $store.commit('ui/majorg', neworg)
      $store.commit('ui/majpage', 'Login')
      if (to.name === 'Login') return true
      return '/' + neworg
    }

    // l'organisation était définie et elle est inchangée
    if (!compte) {
      // on peut aller sur Login ou Synvhro
      if (to.name === 'Login') {
        $store.commit('ui/majpage', 'Login')
        return true
      }
      if (to.name === 'Synchro') {
        $store.commit('ui/majpage', 'Synchro')
        return true
      }
      return '/' + org
    }

    // org inchangée, compte existant : on peut aller sur synchro / compte / avatar / groupe
    if (to.name === 'Synchro') {
      $store.commit('ui/majpage', 'Synchro')
      return true // condition à ajouter
    }
    if (to.name === 'Compte') {
      $store.commit('ui/majpage', 'Compte')
      return true
    }
    if (to.name === 'Avatar') {
      if (avatar) {
        $store.commit('ui/majpage', 'Avatar')
        return true
      }
      return false
    }
    if (to.name === 'Groupe') {
      if (groupe) {
        $store.commit('ui/majpage', 'Groupe')
        return true
      }
      return false
    }
    return false
  })
  // Traitement de la route au boot
  const $route = useRoute()
  const urlorg = $route.params.org
  console.log('URL org : ' + urlorg + ' Boot page : ' + $route.name)
  store().commit('ui/majorg', (urlorg && cfg().orgs[urlorg]) ? urlorg : null)
  const org = store().state.ui.org
  if (!org && $route.name === 'Org') {
    store().commit('ui/majpage', 'Org')
    return
  }
  if (!org) {
    remplacePage('Org')
    return
  }
  if ($route.name === 'Login') {
    store().commit('ui/majpage', 'Login')
    return
  }
  remplacePage('Login')
}

export async function remplacePage (page) {
  const x = { name: page }
  if (page !== 'Org') x.params = { org: store().state.ui.org }
  await $router.replace(x)
}

export async function objetDeItem (item) {
  const row = schemas.deserialize('row' + item.table, item.serial)
  let x
  switch (item.table) {
    case 'compte' : return row
    case 'avatar' : { x = new Avatar(); return await x.fromRow(row) }
    case 'contact' : { x = new Contact(); return await x.fromRow(row) }
    case 'invitct' : { x = new Invitct(); return await x.fromRow(row) }
    case 'invitgr' : { x = new Invitgr(); return await x.fromRow(row) }
    case 'parrain' : { x = new Parrain(); return await x.fromRow(row) }
    case 'rencontre' : { x = new Rencontre(); return await x.fromRow(row) }
    case 'groupe' : { x = new Groupe(); return await x.fromRow(row) }
    case 'membre' : { x = new Membre(); return await x.fromRow(row) }
    case 'secret' : { x = new Secret(); return await x.fromRow(row) }
    case 'cv' : { x = new Cv(); return await x.fromRow(row) }
  }
}

/*
Retourne une map avec une entrée pour chaque table et en valeur,
- pour compte : LE dernier ROW (pas objet) reçu en notification
- pour les autres, l'array des objets
*/
export async function rowItemsToMapObjets (rowItems) {
  const res = {}
  for (let i = 0; i < rowItems.length; i++) {
    const item = rowItems[i]
    if (item.table === 'compte') {
      // le dernier quand on en a reçu plusieurs et non la liste
      res.compte = await objetDeItem(item)
    } else {
      if (!res[item.table]) res[item.table] = []
      const obj = await objetDeItem(item)
      res[item.table].push(obj)
    }
  }
  return res
}

export function commitMapObjets (mapObj) { // SAUF mapObj.compte
  const objets = []

  function push (n) {
    mapObj[n].forEach((x) => { objets.push(x) })
  }

  let vcv = 0
  if (mapObj.avatar) {
    store().commit('db/setAvatars', mapObj.avatar)
    push('avatar')
  }

  if (mapObj.contact) {
    mapObj.idbContact.forEach((x) => {
      if (x.st < 0) {
        const avant = this.contact(x.id, x.ic)
        if (avant) this.cvMoinsCtc(avant.data.na.sid, x.id)
      } else {
        this.cvPlusCtc(x.data.na, x.id)
      }
    })
    store().commit('db/setContacts', mapObj.contact)
    push('contact')
  }

  if (mapObj.invitct) {
    mapObj.invitct.forEach((x) => {
      if (x.st < 0) {
        const avant = this.invitct(x.id, x.ic)
        if (avant) this.cvMoinsCtc(avant.data.na.sid, x.id)
      } else {
        this.cvPlusCtc(x.data.na, x.id)
      }
    })
    store().commit('db/setInvitCts', mapObj.invitct)
    push('invitct')
  }

  if (mapObj.invitgr) {
    store().commit('db/setInvitGrs', mapObj.invitgr)
    push('invitgr')
  }

  if (mapObj.parrain) {
    store().commit('db/setParrains', mapObj.parrain)
    push('parrain')
  }

  if (mapObj.rencontre) {
    store().commit('db/setRencontres', mapObj.rencontre)
    push('rencontre')
  }

  if (mapObj.groupe) {
    store().commit('db/setGroupes', mapObj.groupe)
    push('groupe')
  }

  if (mapObj.membre) {
    mapObj.membre.forEach((x) => {
      if (x.st < 0) {
        const avant = this.membre(x.id, x.im)
        if (avant) this.cvMoinsMbr(avant.data.na.sid, x.id)
      } else {
        this.cvPlusMbr(x.data.na, x.id)
      }
    })
    store().commit('db/setMembres', mapObj.membre)
    push('membre')
  }

  if (mapObj.secret) {
    store().commit('db/setSecrets', mapObj.secret)
    push('secret')
  }

  if (mapObj.cv) {
    mapObj.cv.forEach((x) => {
      if (x.st >= 0) {
        this.cvFusionCV(x)
        if (x.vcv > vcv) vcv = x.vcv
      }
    })
    push('cv')
  }
  data.commitRepertoire()
  return [objets, vcv]
}

export const SIZEAV = 7
export const SIZEGR = 3
export const MODES = ['inconnu', 'synchronisé', 'incognito', 'avion', 'visio']

/* Motscles ************************************************************/
const OBS = 'obsolète'

export class Motscles {
  /*
  Mode 1 : chargement des mots clés du compte et l'organisation en vue d'éditer ceux du compte
  Mode 2 : chargement des mots clés du groupe idg et l'organisation en vue d'éditer ceux du groupe
  Mode 3 : chargement des mots clés du compte OU du groupe idg et de l'organisation
  en vue d'afficher une liste de mots clés pour SELECTION
  */
  constructor (mc, mode, idg) {
    this.mode = mode
    this.idg = idg
    this.mc = mc
  }

  debutEdition () {
    if (this.mode === 3 || !this.src) return
    this.premier = this.mode === 1 ? 1 : 100
    this.dernier = this.mode === 1 ? 99 : 199
    this.mc.st.enedition = true
    this.localIdx = {}
    this.localNom = {}
    for (const idx in this.src) {
      const nc = this.src[idx]
      const [categ, nom] = this.split(nc)
      this.localIdx[idx] = nc
      this.localNom[nom] = [idx, categ]
    }
    this.avant = this.flatMap(this.src)
    this.apres = this.avant
  }

  flatMap (map) {
    const a = []
    for (const idx in map) a.push(parseInt(idx))
    a.sort()
    const b = []
    for (let i = 0; i < a.length; i++) {
      const idx = a[i]
      b.push(idx + '/' + map[idx])
    }
    return b.join('&')
  }

  finEdition () {
    if (this.mode === 3) return
    this.mc.st.enedition = false
    this.mc.st.modifie = false
    const r = this.localIdx
    this.recharger()
    return r
  }

  recharger () {
    if (this.mc.st.enedition) return
    delete this.localIdx
    delete this.localNom
    delete this.apres
    delete this.avant
    this.mc.categs.clear()
    this.mc.lcategs.length = 0
    this.fusion(cfg().motscles)
    if (this.mode === 1 || (this.mode === 3 && !this.idg)) {
      this.mapc = data.compte().mmc
      this.fusion(this.mapc)
      if (this.mode === 1) this.src = this.mapc
    }
    if (this.mode === 2 || (this.mode === 3 && this.idg)) {
      const gr = data.groupe(this.idg)
      this.mapg = gr.mc
      if (this.mode === 2 && gr.maxSty === 2) this.src = this.mapg
      this.fusion(this.mapg)
    }
    this.tri()
    return this
  }

  split (nc) {
    const j = nc.indexOf('/')
    const categ = j === -1 ? OBS : nc.substring(0, j)
    const nom = j === -1 ? nc : nc.substring(j + 1)
    return [categ, nom]
  }

  setCateg (categ, idx, nom) {
    let x = this.mc.categs.get(categ)
    if (!x) {
      x = []
      this.mc.categs.set(categ, x)
    }
    let trouve = false
    for (let i = 0; i < x.length; i++) {
      if (x[i][1] === idx) {
        x[i][0] = nom
        trouve = true
        break
      }
    }
    if (!trouve) x.push([nom, idx])
  }

  delCateg (categ, idx) {
    const x = this.mc.categs.get(categ)
    if (!x) return
    let j = -1
    for (let i = 0; i < x.length; i++) {
      if (x[i][1] === idx) {
        j = i
        break
      }
    }
    if (j !== -1) {
      x.splice(j, 1)
      if (!x.length) {
        this.mc.categs.delete(categ)
      }
    }
  }

  fusion (map) {
    for (const i in map) {
      const idx = parseInt(i)
      const nc = map[i]
      const [categ, nom] = this.split(nc)
      this.setCateg(categ, idx, nom)
    }
  }

  tri () {
    this.mc.lcategs.length = 0
    const s = new Set()
    this.mc.categs.forEach((v, k) => {
      if (!s.has(k)) {
        this.mc.lcategs.push(k)
        s.add(k)
      }
      if (v.length > 1) v.sort((a, b) => { return a[0] < b[0] ? -1 : a[0] === b[0] ? 0 : 1 })
    })
    if (this.mc.lcategs.length > 1) this.mc.lcategs.sort()
  }

  supprMC (idx) {
    if (!this.mc.enedition || idx < this.premier || idx > this.dernier) return 'Pas en édition ou index incoorect'
    const ancnc = this.localIdx[idx]
    if (!ancnc) return
    const [anccateg, ancnom] = this.split(ancnc)
    delete this.localNom[ancnom]
    delete this.localIdx[idx]
    this.delCateg(anccateg, idx)
    this.apres = this.flatMap(this.localIdx)
    this.mc.st.modifie = this.apres !== this.avant
  }

  changerMC (idx, nc) {
    if (!this.mc.st.enedition || (idx !== 0 && (idx < this.premier || idx > this.dernier))) return 'Pas en édition ou index incoorect'
    if (idx && !nc) return this.supprMC(idx)
    const [categ, nom] = this.split(nc)
    const x = this.localNom[nom]
    if (x && x[0] !== idx) return 'Le nom est déjà attribué à l\'index "' + x[0] + '" (catégorie "' + x[1] + '")'
    if (idx) {
      const ancnc = this.localIdx[idx]
      const [anccateg, ancnom] = this.split(ancnc)
      delete this.localNom[ancnom]
      this.delCateg(anccateg, idx)
    } else {
      for (let i = this.premier; i < this.dernier; i++) {
        if (!this.localIdx[i]) { idx = i; break }
      }
      if (!idx) return 'Plus d\'index libres pour ajouter un mot clé'
    }
    this.localIdx[idx] = nc
    this.localNom[nom] = [idx, categ]
    this.setCateg(categ, idx, nom)
    this.tri()
    this.apres = this.flatMap(this.localIdx)
    this.mc.st.modifie = this.apres !== this.avant
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

  reconnexion () { // Depuis un bouton
    const ps = data.ps
    this.deconnexion(true)
    data.mode = data.modeInitial
    if (data.mode === 3) {
      new ConnexionCompteAvion().run(ps)
    } else {
      new ConnexionCompte().run(ps)
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
    this.repertoire = {}

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
    this.nomc = {} // nomc des contacts / membres (ayant CV)

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
    } else t = this.verAv(sid)
    if (v > t[idt]) t[idt] = v
  }

  setVerGr (sid, idt, v) { // idt : Index de la table
    let t
    if (!this.verGr.has(sid)) {
      t = new Array(SIZEGR).fill(0)
      this.verGr.set(sid, t)
    } else t = this.verGr(sid)
    if (v > t[idt]) t[idt] = v
  }

  clegDe (sid) {
    return this.cleg[sid]
  }

  clecDe (sid) { // clé d'un contact
    return this.clec[sid]
  }

  nomcDe (sid) { // nomc d'une CV (membre ou contact)
    return this.nomc[sid]
  }

  compte () {
    return store().state.db.compte
  }

  setCompte (compte) {
    store().commit('db/setCompte', compte)
  }

  avc (id) {
    return this.compte().av(id)
  }

  get setAvatars () {
    const s = new Set()
    for (const sid in this.compte().mac) s.add(this.compte().mac[sid].na.id)
    return s
  }

  get setGroupes () {
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

  get setCvsUtiles () {
    const s = new Set()
    for (const sid in this.repertoire) {
      const cv = this.repertoire[sid]
      if (cv.lctc.length || cv.lmbr.length) s.add(sid)
    }
    return s
  }

  get setCvsManquantes () {
    const s = new Set()
    for (const sid in this.repertoire) {
      const cv = this.repertoire[sid]
      if (cv.fake && (cv.lctc.length || cv.lmbr.length)) s.add(sid)
    }
    return s
  }

  get setCvsInutiles () {
    const s = new Set()
    for (const sid in this.repertoire) {
      const cv = this.repertoire[sid]
      if (!cv.lctc.length && !cv.lmbr.length) s.add(sid)
    }
    return s
  }

  avatar (id) {
    return store().getters['db/avatar'](id)
  }

  contact (id, ic) {
    return store().getters['db/contact'](id, ic)
  }

  invitct (id, ni) {
    return store().getters['db/invitct'](id, ni)
  }

  invitgr (id, ni) {
    return store().getters['db/invitgr'](id, ni)
  }

  rencontre (prh, id) {
    return store().getters['db/rencontre'](prh, id)
  }

  parrain (pph, id) {
    return store().getters['db/parrain'](pph, id)
  }

  groupe (id) {
    return store().getters['db/groupe'](id)
  }

  membre (id, im) {
    return store().getters['db/membre'](id, im)
  }

  secret (id, ns) {
    return store().getters['db/secret'](id, ns)
  }

  cv (id) {
    return this.repertoire[id]
  }

  commitRepertoire () {
    store().commit('db/commitRepertoire', this.repertoire)
  }

  cvPlusCtc (naCtc, id) { // na du contact, id de l'avatar du compte
    const cv = this.repertoire[naCtc.sid]
    if (cv && cv.lctc.indexOf(id) !== -1) return null // y était déja
    let cl
    if (cv) {
      cl = cv.clone()
    } else {
      cl = new Cv().nouveau(naCtc.id, 0, 0, naCtc.nomc, '', naCtc.nomc)
      cl.fake = true
    }
    cl.lctc.push(naCtc.id)
    this.repertoire[naCtc.sid] = cl
    return cl
  }

  cvMoinsCtc (sid, id) { // sid du contact, id de l'avatar du compte
    const cv = this.repertoire[sid]
    const idx = cv ? cv.lctc.indexOf(id) : -1
    if (idx === -1) return null // n'y était pas
    const cl = cv.clone()
    cl.lctc.splice(idx, 1)
    this.repertoire[sid] = cl
    return cl
  }

  cvPlusMbr (naCtc, id) { // na du membre, id : du groupe
    const cv = this.repertoire[naCtc.sid]
    if (cv && cv.lmbr.indexOf(id) !== -1) return null // y était déja
    let cl
    if (cv) {
      cl = cv.clone()
    } else {
      cl = new Cv().nouveau(naCtc.id, 0, 0, naCtc.nomc, '', naCtc.nomc)
      cl.fake = true
    }
    cl.lmbr.push(naCtc.id)
    this.repertoire[naCtc.sid] = cl
    return cl
  }

  cvMoinsMbr (sid, id) { // sid du membre, id du groupe
    const cv = this.repertoire[sid]
    const idx = cv ? cv.lmbr.indexOf(id) : -1
    if (idx === -1) return null // n'y était pas
    const cl = cv.clone()
    cl.lctc.splice(idx, 1)
    this.repertoire[sid] = cl
    return cl
  }

  cvFusionCV (cv) {
    const c = this.repertoire[cv.sid]
    if (c && !c.fake && c.vcv > cv.vcv) return null // existante plus récente
    if (c) {
      cv.lctc = c.lctc
      cv.lmbr = c.lmbr
    }
    this.repertoire[cv.sid] = cv
    return cv
  }
}
export const data = new Session()

/** classes Phrase, MdpAdmin, Quotas ****************/
export class Phrase {
  async init (debut, fin) {
    this.pcb = await crypt.pbkfd(debut + '\n' + fin)
    this.pcb64 = u8ToB64(this.pcb)
    this.pcbh = crypt.hashBin(this.pcb)
    this.dpbh = crypt.hashBin(await crypt.pbkfd(debut))
  }
}

export class MdpAdmin {
  async init (mdp) {
    this.mdp = mdp
    this.mdpb = await crypt.pbkfd(mdp)
    this.mdp64 = u8ToB64(this.mdpb, true)
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

/** Compte **********************************/

schemas.forSchema({
  name: 'idbCompte',
  cols: ['id', 'v', 'dds', 'dpbh', 'pcbh', 'k', 'mmc', 'mac', 'memo', 'vsh']
})
/*
- `id` : id du compte.
- `v` :
- `dds` : date (jour) de dernière signature.
- `dpbh` : hashBin (53 bits) du PBKFD2 du début de la phrase secrète (32 bytes). Pour la connexion, l'id du compte n'étant pas connu de l'utilisateur.
- `pcbh` : hashBin (53 bits) du PBKFD2 de la phrase complète pour quasi-authentifier une connexion avant un éventuel échec de décryptage de `kx`.
- `kx` : clé K du compte, crypté par la X (phrase secrète courante).
- `mmck` {} : cryptées par la clé K, map des mots clés déclarés par le compte.
  - *clé* : id du mot clé de 1 à 99.
  - *valeur* : libellé du mot clé.
- `mack` {} : map des avatars du compte `[nom@rnd, cpriv]`, cryptée par la clé K
  - `nomc` : `nom@rnd`, nom complet.
  - `cpriv` : clé privée asymétrique.
- `memok` : texte court libre (crypté par la clé K) vu par le seul titulaire du compte. Le début de la première ligne s'affiche en haut de l'écran.
- `vsh`
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
    data.clek = this.k
    this.mac = { }
    this.mac[nomAvatar.sid] = { na: nomAvatar, cpriv: cpriv }
    this.mmc = {}
    this.memo = 'Mémo de ' + nomAvatar.nom
    this.vsh = 0
    return this
  }

  get sid () { return crypt.idToSid(this.id) }

  get pk () { return this.id }

  get titre () {
    if (!this.memo) return this.sid
    const i = this.memo.indexOf('/n')
    return i === -1 ? this.memo : this.memo.substring(0, i)
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
    this.mmc = deserial(await crypt.decrypter(this.k, row.mmck))
    this.mac = deserial(await crypt.decrypter(this.k, row.mack))
    for (const sid in this.mac) {
      const x = this.mac[sid]
      x.na = new NomAvatar(x.nomc)
      delete x.nomc
    }
    this.memo = await crypt.decrypterStr(this.k, row.memok)
    return this
  }

  async toRow () { // après maj éventuelle de mac et / ou mmc
    this.memok = await crypt.crypter(data.clek, this.memo)
    this.mmck = await crypt.crypter(data.clek, serial(this.mmc))
    for (const sid in this.mac) {
      const x = this.mac[sid]
      x.nomc = x.na.nomc
    }
    this.mack = await crypt.crypter(data.clek, serial(this.mac))
    for (const sid in this.mac) {
      const x = this.mac[sid]
      delete x.nomc
    }
    this.kx = await crypt.crypter(data.ps.pcb, this.k)
    const buf = schemas.serialize('rowcompte', this)
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
    const idb = { id: 1, vs: 0, data: schemas.serialize('idbCompte', this) }
    for (const sid in this.mac) delete this.mac[sid].nomc
    return idb
  }

  fromIdb (idb, vs) {
    schemas.deserialize('idbCompte', idb, this)
    data.clek = this.k
    for (const sid in this.mac) {
      const x = this.mac[sid]
      x.na = new NomAvatar(x.nomc)
      delete x.nomc
    }
    return this
  }

  get clone () {
    return schemas.clone('idbCompte', this, new Compte())
  }

  av (id) {
    return this.mac[crypt.idToSid(id)]
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
      this.sfx = n.substring(i + 1)
      this.rndb = b64ToU8(this.sfx)
    }
  }

  get id () { return crypt.hashBin(this.rndb) }

  get nomc () { return this.nom + '@' + u8ToB64(this.rndb, true) }

  get sid () { return crypt.idToSid(this.id) }

  get cle () { return crypt.sha256(this.rndb) }
}

/** Avatar **********************************/
/*
- `id` : id de l'avatar
- `v` :
- `st` : si négatif, l'avatar est supprimé / disparu (les autres colonnes sont à null). 0:OK, 1:alerte
- `vcv` : version de la carte de visite (séquence 0).
- `dds` :
- `cva` : carte de visite de l'avatar cryptée par la clé de l'avatar `[photo, info]`.
- `lctk` : liste, cryptée par la clé K du compte, des ids des contacts de l'avatar afin de garantir l'unicité de ceux-ci. L'indice d'un contact est celui dans cette liste + 1 (la valeur 0 est réservée).
- `vsh`
*/

schemas.forSchema({
  name: 'idbAvatar',
  cols: ['id', 'v', 'st', 'vcv', 'dds', 'photo', 'info', 'lct', 'vsh']
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
    this.vsh = 0
    return this
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
    this.lct = deserial(await crypt.decrypter(data.clek, row.lctk))
    return this
  }

  get sid () { return crypt.idToSid(this.id) }

  get sidav () { return crypt.idToSid(this.id) }

  get pk () { return this.id }

  get label () {
    return this.na.nom
  }

  get icone () {
    return this.photo || ''
  }

  async cvToRow (ph, info) {
    return await crypt.crypter(this.na.cle, serial([ph, info]))
  }

  async toRow () { // après maj éventuelle de cv et / ou lct
    this.cva = await this.cvToRow(this.photo, this.info)
    this.lctk = await crypt.crypter(data.clek, serial(this.lct))
    const buf = schemas.serialize('rowavatar', this)
    delete this.cva
    delete this.lctk
    return buf
  }

  get toIdb () {
    return { id: this.id, data: schemas.serialize('idbAvatar', this) }
  }

  fromIdb (idb) {
    schemas.deserialize('idbAvatar', idb, this)
    this.na = data.avc(this.id).na
    return this
  }

  get clone () {
    return schemas.clone('idbAvatar', this, new Avatar())
  }
}

/** cvIdb ************************************/
schemas.forSchema({
  name: 'cvIdb',
  cols: ['id', 'vcv', 'st', 'nomc', 'photo', 'info']
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

  constructor () {
    this.lctc = []
    this.lmbr = []
    this.fake = false
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

  get sid () { return crypt.idToSid(this.id) }

  get pk () { return this.id }

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
    this.nomc = data.nomcDe(crypt.idToSid(this.id))
    this.na = new NomAvatar(this.nomc)
    const x = row.phinf ? deserial(await crypt.decrypter(this.na.cle, row.phinf)) : null
    this.photo = x ? x[0] : null
    this.info = x ? x[1] : null
    return this
  }

  get toIdb () {
    const idb = { id: this.id, data: schemas.serialize('cvIdb', this) }
    return idb
  }

  fromIdb (idb) {
    schemas.deserialize('cvIdb', idb, this)
    this.na = new NomAvatar(this.nomc)
    return this
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
  - `x` : 0: contact présumé actif, 1:disparu
  - `y` : A accepte 1 (ou non 0) les partages de B.
  - `z` : B accepte 1 (ou non 0) les partages de A.
- `q1 q2 qm1 qm2` : balance des quotas donnés / reçus par l'avatar A à l'avatar B (contact _fort_).
- `ardc` : **ardoise** partagée entre A et B cryptée par la clé `cc` associée au contact _fort_ avec un avatar B.
- `icbc` : pour un contact fort _accepté_, indice de A chez B (communiqué lors de l'acceptation par B) pour mise à jour dédoublée de l'ardoise et du statut, crypté par la clé `cc`.
- `datak` : information cryptée par la clé K de A.
  - `nomc` : nom complet de l'avatar `nom@rnd`.
  - `cc` : 32 bytes aléatoires donnant la clé `cc` d'un contact _fort_ avec B (en attente ou accepté).
  - `dlv` : date limite de validité de l'invitation à être contact _fort_ ou du parrainage.
  - `pph` : hash du PBKFD2 de la phrase de parrainage.
- `ank` : annotation cryptée par la clé K du membre
  - `mc` : mots clés
  - `txt` : commentaires (personnel) de A sur B
- `vsh`
*/

export class Contact {
  get table () { return 'contact' }

  get sid () { return crypt.idToSid(this.id) }

  get sid2 () { return '' + this.id }

  get pk () { return [this.id, this.ic] }

  get sidav () { return this.sid }

  get nact () { return this.data ? new NomAvatar(this.data.nomc) : null }

  majCc () {
    if (this.data) {
      data.clec[this.sid] = this.data.cc
      const na = new NomAvatar(this.data.nomc)
      data.nomc[na.sid] = this.data.nomc
    }
  }

  async fromRow (row) {
    this.vsh = row.vsh || 0
    this.id = row.id
    this.ic = row.ic
    this.v = row.v
    this.st = row.st
    this.q1 = row.q1
    this.q2 = row.q2
    this.qm1 = row.qm1
    this.qm2 = row.qm2
    this.data = row.datak ? deserial(await crypt.decrypter(data.clek, row.datak)) : null
    this.majCc()
    this.ard = await crypt.decrypterStr(this.data.cc, row.ardc)
    this.icb = crypt.u8ToInt(await crypt.decrypter(this.data.cc, row.icbc))
    this.an = row.ank ? deserial(await crypt.decrypter(data.clek, row.ank)) : null
    return this
  }

  async toRow () {
    this.datak = await crypt.crypter(data.clek, serial(this.data))
    this.ank = this.an ? await crypt.crypter(data.clek, serial(this.an)) : null
    this.ardc = await crypt.crypter(this.data.cc, this.ard)
    this.icbc = await crypt.crypter(this.data.cc, crypt.intTou8(this.icb))
    const buf = schemas.serialize('rowcontact', this)
    delete this.datak
    delete this.icbc
    delete this.ardc
    delete this.ank
    return buf
  }

  get toIdb () {
    return { id: this.id, ic: this.ic, data: schemas.serialize('lidbContact', this) }
  }

  fromIdb (idb, vs) {
    schemas.desrialise('lidbContact', idb, this)
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
- `lstmg` : liste des ids des membres du groupe.
- `vsh`
*/

schemas.forSchema({
  name: 'idbGroupe',
  cols: ['id', 'v', 'dds', 'st', 'cv', 'mc', 'lstm', 'vsh']
})

export class Groupe {
  get table () { return 'groupe' }

  get sid () { return crypt.idToSid(this.id) }

  get pk () { return this.id }

  get sidgr () { return this.sid }

  get label () { return this.info ? this.info : this.sid }

  get icone () { return this.photo || '' }

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
        const invitgr = data.invitgr(avid, parseInt(im)) // peut retourner null si résilié
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
    const cleg = data.clegDe(this.sid)
    const cv = row.cvg ? deserial(await crypt.decrypter(cleg, row.cvg)) : null
    this.photo = cv ? (cv[0] || '') : ''
    this.info = cv ? (cv[1] || '') : ''
    this.mc = row.mcg ? deserial(await crypt.decrypter(cleg, row.mcg)) : null
    this.lstm = row.lstmg ? deserial(await crypt.decrypter(cleg, row.lstmg)) : null
    return this
  }

  async toRow () {
    const cleg = data.clegDe(this.sid)
    this.cvg = await crypt.crypter(cleg, serial([this.photo, this.info]))
    this.mcg = this.mcg ? await crypt.crypter(cleg, serial(this.mc)) : null
    this.lstmg = this.lstm ? await crypt.crypter(cleg, serial(this.lstm)) : null
    const buf = schemas.serialize('rowgroupe', this)
    delete this.cvg
    delete this.mcg
    delete this.lstmg
    return buf
  }

  get toIdb () {
    return { id: this.id, data: schemas.serialize('idbGroupe', this) }
  }

  fromIdb (idb) {
    schemas.deserialize('idbGroupe', idb, this)
    return this
  }
}

/** Invitct **********************************/
/*
- `id` : id de B.
- `ni` : numéro aléatoire d'invitation en complément de `id`.
- `v`
- `dlv` : la date limite de validité permettant de purger les rencontres (quels qu'en soient les statuts).
- `st` : <= 0: annulée, 0: en attente, 1: acceptée, 2: refusée
- `datap` : données cryptées par la clé publique de B.
  - `nom@rnd` : nom complet de A.
  - `ic` : numéro du contact de A pour B (pour que B puisse écrire le statut et l'ardoise dans `contact` de A).
  - `cc` : clé `cc` du contact *fort* A / B, définie par A.
- `datak` : même données que `datap` mais cryptées par la clé K de B après acceptation ou refus.
- `ardc` : texte de sollicitation écrit par A pour B et/ou réponse de B (après acceptation ou refus).
- `vsh`
*/

schemas.forSchema({
  name: 'idbInvitct',
  cols: ['id', 'ni', 'v', 'dlv', 'st', 'data', 'ard', 'vsh']
})

export class Invitct {
  get table () { return 'invitct' }

  get sid () { return crypt.idToSid(this.id) }

  get sid2 () { return crypt.idToSid(this.ni) }

  get pk () { return [this.id, this.ni] }

  get sidav () { return this.sid }

  get nact () { return this.data ? new NomAvatar(this.data.nomc) : null }

  majCc () {
    if (this.data) data.clec[this.sid] = this.data.cc
  }

  async fromRow (row) {
    this.vsh = row.vsh
    this.id = row.id
    this.ni = row.ni
    this.v = row.v
    this.dlv = row.dlv
    this.st = row.st
    let rowData = null
    if (row.datak) {
      rowData = await crypt.decrypter(data.clek, row.datak)
    } else if (row.datap) {
      const cpriv = data.avc(this.id).cpriv
      rowData = await crypt.decrypterRSA(cpriv, row.datap)
    }
    this.data = rowData ? deserial(rowData) : null
    this.majCc()
    this.ard = row.ardc ? await crypt.decrypter(this.data.cc, row.ardc) : null
    return this
  }

  async toRow () {
    this.datak = this.data ? await crypt.crypter(data.clek, serial(this.data)) : null
    this.ardc = this.ard ? await crypt.crypter(this.data.cc, this.ard) : null
    const buf = schemas.serialize('rowinvitct', this)
    delete this.datak
    delete this.ardc
    return buf
  }

  get toIdb () {
    return { id: this.id, ni: this.ni, data: schemas.serialize('idbInvitct', this) }
  }

  fromIdb (idb) {
    schemas.desrialise('idbInvitct', idb, this)
    return this
  }
}

/** Invitgr **********************************/
/*
- `id` : id du membre invité.
- `ni` : numéro d'invitation.
- `v` :
- `dlv` :
- `st` : statut. `xy` : < 0 signifie supprimé (redondance de `st` de `membre`)
  - `x` : 2:invité, 3:actif.
  - `y` : 0:lecteur, 1:auteur, 2:administrateur.
- `datap` : pour une invitation _en cours_, crypté par la clé publique du membre invité, référence dans la liste des membres du groupe `[idg, cleg, im]`.
  - `nomc` : nom complet du groupe.
  - `im` : indice de membre de l'invité dans le groupe.
- `datak` : même données que `datap` mais cryptées par la clé K du compte de l'invité, après son acceptation.
- `ank` : annotation cryptée par la clé K de l'invité
  - `mc` : mots clés
  - `txt` : commentaire personnel de l'invité
- `vsh`
*/

schemas.forSchema({
  name: 'idbInvitgr',
  cols: ['id', 'ni', 'v', 'dlv', 'st', 'data', 'an', 'vsh']
})

export class Invitgr {
  get table () { return 'invitgr' }

  get sid () { return crypt.idToSid(this.id) }

  get sid2 () { return crypt.idToSid(this.ni) }

  get pk () { return [this.id, this.ni] }

  get sidav () { return this.sid }

  get idg () { return this.data ? this.ng.id : null }

  get ng () { return this.data ? new NomAvatar(data.nomc) : null }

  get cleg () { return this.data ? this.ng.cle : null }

  get sidg () { return this.data ? crypt.idToSid(this.idg) : null }

  get stx () { return this.st < 0 ? -1 : Math.floor(this.st / 10) }

  get sty () { return this.st < 0 ? -1 : this.st % 10 }

  majCg () {
    if (this.data) data.cleg[crypt.idToSid(this.id)] = this.data.cleg
  }

  // retourne le membre correspondant si cet invitgr est invité ou actif sinon null, et le groupe
  membreGroupe () {
    const x = this.stx
    if (x !== 2 && x !== 3) return null
    const m = data.membre(this.idg, this.data.im)
    const g = data.groupe(this.idg)
    return [m, g]
  }

  async fromRow (row) {
    this.vsh = row.vsh || 0
    this.id = row.id
    this.ni = row.ni
    this.v = row.v
    this.dlv = row.dlv
    this.st = row.st
    let rowData = null
    if (row.datak) {
      rowData = await crypt.decrypter(data.clek, row.datak)
    } else if (row.datap) {
      const cpriv = data.avc(this.id).cpriv
      rowData = await crypt.decrypterRSA(cpriv, row.datap)
    }
    this.data = rowData ? deserial(rowData) : null
    this.annot = null
    if (this.stx === 2 || this.stx === 3) {
      const x = row.ank ? await crypt.decrypter(data.clek, row.ank) : null
      if (x) {
        this.an = deserial(x)
      }
    }
    this.majCg()
    return this
  }

  async toRow () {
    this.datak = this.data ? await crypt.crypter(data.clek, serial(this.data)) : null
    this.ank = this.an ? await crypt.crypter(data.clek, serial(this.an)) : null
    const buf = schemas.serialize('rowinvitgr', this)
    delete this.datak
    delete this.ank
    return buf
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
- `st` : statut. `xy` : < 0 signifie supprimé.
  - `x` : 1:pressenti, 2:invité, 3:ayant refusé, 3:actif, 8: résilié.
  - `y` : 0:lecteur, 1:auteur, 2:administrateur.
- `vote` : vote de réouverture.
- `dlv` : date limite de validité de l'invitation. N'est significative qu'en statut _invité_.
- `q1 q2` : balance des quotas donnés / reçus par le membre au groupe.
- `datag` : données cryptées par la clé du groupe.
  - `nomc` : nom complet de l'avatar `nom@rnd` (donne la clé d'accès à sa carte de visite)
  - `ni` : numéro d'invitation du membre dans `invitgr` relativement à son `id` (issu de `nomc`). Permet de supprimer son accès au groupe (`st < 0, datap / datak null` dans `invitgr`) quand il est résilié / disparu.
  - `idi` : id du premier membre qui l'a pressenti / invité.
- `ardg` : ardoise du membre vis à vis du groupe. Contient le texte d'invitation puis la réponse de l'invité cryptée par la clé du groupe. Ensuite l'ardoise peut être écrite par le membre (actif) et les animateurs.
- `vsh`
*/

schemas.forSchema({
  name: 'idbMembre',
  cols: ['id', 'im', 'v', 'st', 'vote', 'dlv', 'q1', 'q2', 'data', 'ard', 'vsh']
})

export class Membre {
  get table () { return 'membre' }

  get sid () { return crypt.idToSid(this.id) }

  get sid2 () { return '' + this.im }

  get pk () { return [this.id, this.im] }

  get sidgr () { return this.sid }

  get na () { return this.data ? new NomAvatar(this.data.nomc) : null }

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
    const ida = na.id
    const x = this.stx
    return (x === 2 || x === 3) && data.avc(ida) ? data.invitgr(ida, this.data.ni) : null
  }

  majCc () {
    if (this.data) {
      const na = new NomAvatar(this.data.nomc)
      data.nomc[na.sid] = this.data.nomc
    }
  }

  async fromRow (row) {
    this.vsh = row.vsh || 0
    this.id = row.id
    this.im = row.im
    this.v = row.v
    this.st = row.st
    this.dlv = row.dlv
    const cg = row.datag || row.ardg ? data.cleg(this.id) : null
    const rowData = row.datag ? await crypt.decrypter(cg, row.datag) : null
    this.data = rowData ? deserial(rowData) : null
    this.majCc()
    this.ard = row.ardg ? await crypt.decrypterStr(cg, row.ardg) : null
    return this
  }

  async toRow () {
    const cg = this.data || this.ard || this.lmc ? data.clegDe(this.sid) : null
    this.datag = this.data ? await crypt.crypter(cg, serial(this.data)) : null
    this.ardg = this.ard ? await crypt.crypter(cg, this.ard) : null
    const buf = schemas.serialize('rowmembre', this)
    delete this.datag
    delete this.ardg
    return buf
  }

  get toIdb () {
    return { id: this.id, im: this.im, data: schemas.serialize('idbMembre', this) }
  }

  fromIdb (idb, vs) {
    schemas.deserialise('idbMembre', idb, this)
    this.majCc()
    return this
  }
}

/** Parrain **********************************/
/*
- `pph` : hash du PBKFD2 de la phrase de parrainage.
- `id` : id du parrain.
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

  get sidav () { return crypt.idToSid(this.id) }

  async fromRow (row) {
    this.vsh = row.vsh || 0
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
    const rowDatak = row.datak ? await crypt.decrypter(data.clek, row.datak) : null
    this.phcx = rowDatak ? deserial(rowDatak) : null
    const rowDatax = row.datax && this.phcx ? await crypt.decrypter(this.phcx.cx, row.datax) : null
    this.data = rowDatax ? deserial(rowDatax) : null
    this.ard = row.ardc && this.data ? await crypt.decrypter(this.data.cc, row.ardc) : null
    return this
  }

  async toRow () {
    this.datak = this.phcx ? await crypt.crypter(data.clek, serial(this.phcx)) : null
    this.datax = this.phcx && this.data ? await crypt.crypter(this.phcx.cx, serial(this.data)) : null
    this.ardc = this.data && this.ard ? await crypt.crypter(this.data.cc, this.ard) : null
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
- `id` : id de l'avatar A ayant initié la rencontre.
- `v` :
- `dlv` : date limite de validité permettant de purger les rencontres.
- `st` : <= 0:annulée, 1:en attente, 2:acceptée, 3:refusée
- `datak` : **phrase de rencontre et son PBKFD2** (clé X) cryptée par la clé K du compte A pour que A puisse retrouver les rencontres qu'il a initiées avec leur phrase.
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

  async fromRow (row) {
    this.vsh = row.vsh || 0
    this.prh = row.prh
    this.id = row.id
    this.dlv = row.dlv
    this.st = row.st
    this.v = row.v
    const rowDatak = row.datak ? await crypt.decrypter(data.clek, row.datak) : null
    this.phcx = rowDatak ? deserial(rowDatak) : null
    this.nomc = row.nomcx && this.phcx ? await crypt.decrypter(this.phcx.cx, row.nomcx) : null
    return this
  }

  async toRow () {
    this.datak = this.phcx ? await crypt.crypter(data.clek, serial(this.phcx)) : null
    this.nomcx = this.phcx && this.nomc ? await crypt.crypter(this.phcx.cx, this.nomc) : null
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
- `ic` : indice du contact pour un secret de couple, sinon 0.
- `v` :
- `st` : < 0 pour un secret _supprimé_, numéro de semaine de création pour un _temporaire_, 99999 pour un *permanent*.
- `ora` : 0:ouvert, 1:restreint, 2:archivé
- `v1` : volume du texte
- `v2` : volume de la pièce jointe
- `txts` : crypté par la clé du secret.
  - `la` [] : liste des auteurs (pour un secret de couple ou de groupe).
  - `gz` : texte gzippé
  - `ref` : référence à un autre secret.
- `mcs` : liste des mots clés crypté par la clé du secret.
- `mpjs` : sérialisation de la map des pièces jointes { nom: [version, volume] }.
- `dups` : couple `[id, ns]` crypté par la clé du secret de l'autre exemplaire pour un secret de couple A/B.
- `vsh`
*/

schemas.forSchema({
  name: 'idbSecret',
  cols: ['id', 'ns', 'ic', 'v', 'st', 'ora', 'v1', 'v2', 'txt', 'mc', 'mpj', 'dupid', 'dupns', 'vsh']
})

export class Secret {
  get table () { return 'secret' }

  get sid () { return crypt.idToSid(this.id) }

  get sid2 () { return crypt.idToSid(this.ns) }

  get pk () { return [this.id, this.ns] }

  get sidc () { return crypt.idToSid(this.id) + '/' + this.ic }

  get sidavgr () { return this.sid }

  get estAv () { return (this.ns % 2) === 0 }

  get ts () { return this.ic ? 1 : (this.ns % 2 ? 0 : 2) } // 0:avatar 1:couple 2:groupe

  get cles () {
    return this.ts ? (this.ts === 1 ? data.clecDe(this.sidc) : data.clegDe(crypt.idToSid(this.id))) : data.clek
  }

  async fromRow (row) {
    this.vsh = row.vsh || 0
    this.id = row.id
    this.ns = row.ns
    this.ic = row.ic
    this.st = row.st
    this.v = row.v
    this.ora = row.ora
    this.v1 = row.v1
    this.v2 = row.v2
    const cles = this.cles
    this.txt = cles && row.txts ? await crypt.decrypter(cles, row.txts) : null
    this.mc = cles && row.mcs ? deserial(await crypt.decrypter(cles, row.mcs)) : null
    this.mpj = {}
    if (this.v2 && row.mpjs) {
      for (const ns in row.mpjs) {
        const nom = await crypt.decrypter(cles, ns)
        this.mpj[nom] = row.mpjs[ns]
      }
    }
    const dup = cles && row.dups ? deserial(await crypt.decrypter(cles, row.dups)) : [0, 0]
    this.dupid = dup[0]
    this.dupns = dup[1]
    return this
  }

  async toRow () {
    const cles = this.cles
    this.txts = cles && this.txt ? await crypt.crypter(cles, this.txt) : null
    this.mcs = cles && this.mc ? await crypt.crypter(cles, serial(this.mc)) : null
    if (this.v2 && cles && this.mpj) {
      this.mpjs = {}
      for (const ns in this.mpjs) {
        const nom = await crypt.crypter(cles, ns)
        this.mpjs[nom] = this.mpj[ns]
      }
    }
    this.dups = cles && this.dupid && this.dupns ? await crypt.crypter(cles, serial([this.dupid, this.dupns])) : null
    const buf = schemas.serialize('rowsecret', this)
    delete this.txts
    delete this.mcs
    delete this.mpjs
    delete this.dups
    return buf
  }

  get toIdb () {
    return { id: this.id, ns: this.ns, data: schemas.seialise('idbSecret', this) }
  }

  fromIdb (idb, vs) {
    schemas.deserialize('idbSecret', idb, this)
    return this
  }
}
