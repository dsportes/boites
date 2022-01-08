import axios from 'axios'
import { data } from './modele.mjs'
import { AppExc, version, E_BRO, E_SRV, EXBRK } from './api.mjs'
import { u8ToB64, crypt } from './crypto.mjs'
import { encode, decode } from '@msgpack/msgpack'

const headers = { 'x-api-version': version }
// const u8vide = new Uint8Array([])

const decoder = new TextDecoder('utf-8')
const encoder = new TextEncoder('utf-8')

export function u8ToString (u8) { return decoder.decode(u8) }
export function stringToU8 (str) { return encoder.encode(str) }

let $cfg
let globalProperties
let cancelSourceGET
let cancelSourcePOST
let $store
let $router
let dtf
let idbalerte
let pako
const extensions = {}

export function setup (gp, appconfig, router, store, pako1) {
  pako = pako1
  $cfg = appconfig
  idbalerte = $cfg.idb
  globalProperties = gp
  $store = store
  $router = router
  dtf = new Intl.DateTimeFormat($cfg.locale, $cfg.datetimeformat)
  for (const m in cfg.mimes) {
    const ext = m.extensions
    if (ext) {
      ext.forEach(x => {
        let e = extensions[x]
        if (!e) {
          e = []
          extensions[x] = e
        }
        e.push(m)
      })
    }
  }
  // testgz()
}

/*
function testgz () {
  const t1 = 'toto est beau'
  let t2 = []
  for (let i = 0; i < 200; i++) t2.push(t1)
  t2 = t2.join(' ')
  let gz = gzip(t1)
  let ugz = ungzip(gz)
  gz = gzip(t2)
  ugz = ungzip(gz)
  let u8 = encoder.encode(t2)
  gz = gzip(u8)
  ugz = ungzip(gz)
  u8 = decoder.decode(ugz)
}
*/

export function equ8 (a, b) {
  if (!a && !b) return true
  if ((a && !b) || (b && !a) || (a.length !== b.length)) return false
  if (!a.length) return true
  const xa = []; a.forEach(i => xa.push(i)); xa.sort()
  const xb = []; b.forEach(i => xb.push(i)); xb.sort()
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false
  return true
}

export function deselect (u8, idx) {
  if (!u8) return null
  const l = []
  u8.forEach(x => { if (x !== idx) l.push(x) })
  return l.length ? new Uint8Array(l.sort()) : null
}

export function select (u8, idx) {
  if (!u8) return new Uint8Array([idx])
  const l = []
  u8.forEach(x => { if (x !== idx) l.push(x) })
  l.push(idx)
  return new Uint8Array(l.sort())
}

export function gzip (arg) {
  if (!arg) return null
  // t: 0:binaire, 1:texte zippé, 2:texte non zippé
  const t = typeof arg === 'string' ? (arg.length > 1024 ? 1 : 2) : 0
  let u8 = t ? encoder.encode(arg) : arg
  if (t < 2) u8 = pako.deflate(u8)
  return crypt.concat([new Uint8Array([t]), u8])
}

export function ungzip (arg) {
  if (!arg || arg.length < 1) return null
  const t = arg[0]
  const c = arg.slice(1)
  const res = t < 2 ? pako.inflate(c) : c
  return t ? decoder.decode(crypt.arrayBuffer(res)) : res
}

export function difference (setA, setB) { // element de A pas dans B
  const diff = new Set(setA)
  for (const elem of setB) diff.delete(elem)
  return diff
}

export function intersection (setA, setB) { // element de A aussi dans B
  const inter = new Set()
  for (const elem of setA) if (setB.has(elem)) inter.add(elem)
  return inter
}

export function mimesDeExt (n) {
  if (!n) return null
  const i = n.lastIndexOf('.')
  const ext = i === -1 ? n : n.substring(i)
  return extensions[ext]
}

export function extDeMime (m) {
  const mt = cfg.mimes[m]
  return mt ? mt.extensions : null
}

export function affidbmsg (msg) {
  if (!idbalerte) {
    affichermessage(msg, true)
    idbalerte = true
  }
}

export function store () { return $store }

export function cfg () { return $cfg }

export function gp () { return globalProperties }

export function router () { return $router }

export function dhstring (date) {
  return dtf.format(date)
}

export function sleep (delai) {
  if (delai <= 0) return
  return new Promise((resolve) => { setTimeout(() => resolve(), delai) })
}

const j0 = Math.floor(new Date('2020-01-01T00:00:00').getTime() / 86400000)
function cjourj () {
  return Math.floor(new Date().getTime() / 86400000) - j0
}
let jourJ // nombre de jours écoulés depuis le 1/1/2020. Recalculé toutes les heures.
setInterval(() => { jourJ = cjourj() }, 60000)
export function getJourJ () {
  if (!jourJ) jourJ = cjourj()
  return jourJ
}

/* `dlv` : date limite de validité, en nombre de jours depuis le 1/1/2021. */
export function dlvDepassee (dlv) { return dlv < jourJ }

export async function readFile (file) {
  return new Promise((resolve, reject) => {
    const image = { size: file.size, name: file.name, type: file.type }
    const reader = new FileReader()
    reader.addEventListener('load', (event) => {
      image.b64 = event.target.result
      resolve(image)
    })
    reader.onerror = (error) => reject(error)
    reader.readAsDataURL(file)
  })
}

export function edvol (vol) {
  const v = vol || 0
  if (v <= 999) return v + 'o'
  let s = '' + Math.round(v / 10)
  if (v <= 9999) return s.substring(0, 1) + ',' + s.substring(1, 3) + 'Ko'
  s = '' + Math.round(v / 100)
  if (v <= 99999) return s.substring(0, 2) + ',' + s.substring(2, 4) + 'Ko'
  s = '' + Math.round(v / 1000)
  if (v <= 999999) return s + 'Ko'
  s = '' + Math.round(v / 10000)
  if (v <= 9999999) return s.substring(0, 1) + ',' + s.substring(1, 3) + 'Mo'
  s = '' + Math.round(v / 100000)
  if (v <= 99999999) return s.substring(0, 2) + ',' + s.substring(2, 4) + 'Mo'
  s = '' + Math.round(v / 1000000)
  if (v <= 999999999) return s + 'Mo'
  s = '' + Math.round(v / 10000000)
  if (v <= 9999999999) return s.substring(0, 1) + ',' + s.substring(1, 3) + 'Go'
  s = '' + Math.round(v / 100000000)
  if (v <= 99999999999) return s.substring(0, 2) + ',' + s.substring(2, 4) + 'Go'
  return Math.round(v / 1000000000) + 'Go'
}

/*
console.log(edvol(6))
console.log(edvol(67))
console.log(edvol(675))
console.log(edvol(6757))
console.log(edvol(67578))
console.log(edvol(675789))
console.log(edvol(6757892))
console.log(edvol(67578920))
console.log(edvol(675789200))
console.log(edvol(6757892000))
console.log(edvol(67578920000))
console.log(edvol(675789200000))
*/

export function serial (obj) {
  return new Uint8Array(encode(obj))
}

export function deserial (u8) {
  return decode(u8)
}

export function appexc (e) {
  return !e ? null : (e instanceof AppExc ? e : new AppExc(E_BRO, 'Exception inattendue', e.message + (e.stack ? '\n' + e.stack : '')))
}

export function affichererreur (appexc, options, conseil) {
  return new Promise((resolve) => {
    appexc.options = options || ['J\'ai lu']
    if (conseil) appexc.conseil = conseil
    appexc.resolve = resolve
    $store.commit('ui/majerreur', appexc)
    $store.commit('ui/majdialogueerreur', true)
  })
}

export function affichermessage (texte, important) {
  $store.dispatch('ui/affichermessage', { texte, important })
}

export function razmessage () {
  $store.commit('ui/razmessage')
}

export function afficherdiagnostic (texte) {
  $store.commit('ui/majdiagnostic', texte)
}

export function cancelRequest () {
  if (cancelSourcePOST) cancelSourcePOST.cancel('Operation interrompue par l\'utilisateur.')
}

export function cancelAllRequests () {
  if (cancelSourcePOST) cancelSourcePOST.cancel('Operation interrompue par l\'utilisateur.')
  if (cancelSourceGET) cancelSourceGET.cancel('Operation interrompue par l\'utilisateur.')
}

export function dhtToString (dht) {
  return new Date(Math.floor(dht / 1000)).toISOString() + ' (' + (dht % 1000) + ')'
}

/*
Envoi une requête POST :
- op : opération émettrice. Requise si interruptible, sinon facultative
- module : module invoqué
- fonction : code la fonction du module
- args : objet avec les arguments qui seront transmis dans le body de la requête. Encodé par avro ou JSONStringify
Retour :
- OK : l'objet retourné par la fonction demandée - HTTP 400 : le résultat est un AppExc
Exception : un AppExc avec les propriétés code, message, stack
*/
export async function post (op, module, fonction, args) {
  let buf
  try {
    if (op) op.BRK()
    const data = serial(args)
    const u = $cfg.urlserveur + '/' + $store.state.ui.org + '/' + module + '/' + fonction
    if (op) op.cancelToken = axios.CancelToken.source()
    const par = { method: 'post', url: u, data: data, headers: headers, responseType: 'arraybuffer' }
    if (op) par.cancelToken = op.cancelToken.token
    const r = await axios(par)
    if (op) op.cancelToken = null
    if (op) op.BRK()
    // buf = new Uint8Array(r.data)
    buf = r.data
  } catch (e) {
    // Exceptions jetées par le this.BRK au-dessus)
    if (e === data.EXBRK) throw e
    if (axios.isCancel(e)) throw EXBRK

    const status = (e.response && e.response.status) || 0
    let appexc
    if (status >= 400 && status <= 402) {
      try {
        const x = JSON.parse(decoder.decode(e.response.data))
        appexc = new AppExc(x.code, x.message)
        if (status === 402 && x.stack) appexc.stack = x.stack
      } catch (e2) {
        throw new AppExc(E_BRO, 'Retour de la requête mal formé : JSON parse. ' + (op ? 'Opération: ' + op.nom : '') + ' Message: ' + e.message)
      }
      // 400 : anomalie fonctionnelle à traiter par l'application (pas en exception)
      if (status === 400) return appexc
      // 401 : anomalie fonctionnelle à afficher et traiter comme exception
      // 402 : inattendue, récupérée sur le serveur
      throw appexc
    } else throw new AppExc(E_SRV, e.message, e.stack) // inattendue, pas mise en forme
  }

  // les status HTTP non 2xx sont tombés en exception
  try {
    return deserial(buf)
  } catch (e) { // Résultat mal formé
    throw new AppExc(E_BRO, 'Retour de la requête mal formé : désérialisation de la réponse. ' + (op ? 'Opération: ' + op.nom : ''), e.message)
  }
}

export async function ping () {
  const u = $cfg.urlserveur + '/ping'
  affichermessage('ping - ' + u)
  const r = await axios({ method: 'get', url: u, responseType: 'text', timeout: $cfg.debug ? 50000000 : 5000 })
  affichermessage(r.data)
  return r.data
}

/*
Envoi une requête GET :
- module : module invoqué
- fonction : code la fonction du module
- args : objet avec les arguments qui seront transmis en query string
Retour :
- OK : les bytes demandés
- KO : null
*/
export async function get (module, fonction, args) {
  try {
    const u = $cfg.urlserveur + '/' + $store.state.ui.org + '/' + module + '/' + fonction
    const r = await axios({
      method: 'get',
      url: u,
      params: args,
      headers: headers,
      responseType: 'arraybuffer',
      timeout: $cfg.debug ? 50000000 : 5000
    })
    return r.status === 200 ? r.data : null
  } catch (e) {
    return null
  }
}

export async function testEcho (to) { // to : timeout
  try {
    const r = await post(null, 'm1', 'echo', { a: 1, b: 'toto', to: to || 0 })
    console.log('test echo OK : ' + JSON.stringify(r))
  } catch (e) {
    console.log('test echo KO : ' + JSON.stringify(e))
  }
}

export async function getBinPub (path) {
  try {
    return (await axios.get('./' + path, { responseType: 'arraybuffer' })).data
  } catch (e) {
    return null
  }
}

export async function getJsonPub (path) {
  try {
    return (await axios.get('./' + path)).data
  } catch (e) {
    return null
  }
}

export async function getImagePub (path, type) {
  try {
    const x = (await axios.get('./' + path, { responseType: 'arraybuffer' })).data
    const s = u8ToB64(new Uint8Array(x))
    return 'data:image/' + (type || 'png') + ';base64,' + s
  } catch (e) {
    return null
  }
}

/*
// Volume entier approximatif exprimé en Ko rendu sur un byte (max 100Mo)
export function log10 (v) { return Math.round(Math.log10(v > 100000 ? 100000 : v) * 50) }

// Volume entier retourné depuis un byte en Ko
export function pow10 (v) { return Math.round(Math.pow(10, v / 50)) }
*/

/* Motscles ************************************************************/
const OBS = 'obsolète'

export class Motscles {
  /*
  Mode 1 : chargement des mots clés du compte et l'organisation en vue d'éditer ceux du compte
  Mode 2 : chargement des mots clés du groupe idg et l'organisation en vue d'éditer ceux du groupe
  Mode 3 : chargement des mots clés du compte OU du groupe idg et de l'organisation pour SELECTION
  */
  constructor (mc, mode, idg) {
    this.mode = mode
    this.idg = idg
    this.mc = mc
    this.mapAll = new Map()
  }

  aMC (idx) {
    return this.mapAll.has(idx) || false
  }

  getMC (idx) {
    return this.mapAll.get(idx)
  }

  edit (u8, court) {
    if (!u8) return ''
    const l = []
    for (let i = 0; i < u8.length; i++) {
      const x = this.mapAll.get(u8[i])
      if (x && x.n && x.n.length) {
        if (court && x.n.charCodeAt(0) > 1000) {
          // commence par un emoji
          l.push(String.fromCodePoint(x.n.codePointAt(0)))
        } else {
          l.push(x.n)
        }
      }
    }
    return l.join(court ? ' ' : ' / ')
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
    this.mapAll.clear()
    delete this.localIdx
    delete this.localNom
    delete this.apres
    delete this.avant
    this.mc.categs.clear()
    this.mc.lcategs.length = 0
    this.fusion(cfg().motscles)
    if (this.mode === 1 || (this.mode === 3 && !this.idg)) {
      const cpt = data.getCompte()
      this.mapc = cpt ? cpt.mmc : {}
      this.fusion(this.mapc)
      if (this.mode === 1) this.src = this.mapc
    }
    if (this.mode === 2 || (this.mode === 3 && this.idg)) {
      const gr = data.getGroupe(this.idg)
      this.mapg = gr ? gr.mc : {}
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
      this.mapAll.set(idx, { n: nom, c: categ })
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
    this.mapAll.delete(idx)
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
    this.mapAll.set(idx, { n: nom, c: categ })
  }
}

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

/** NomAvatar **********************************/
export class NomAvatar {
  constructor (nom, rnd) {
    this.nom = nom
    this.rnd = !rnd ? crypt.random(32) : rnd
    this.id = crypt.hashBin(this.rnd)
  }

  get nomc () { return this.nom + '@' + this.sid }

  get sid () { return crypt.idToSid(this.id) }

  get cle () { return this.rnd }
}

/** Filtre *************************************/
export class Filtre {
  constructor (avId) {
    this.avId = avId
    this.perso = true
    this.contactId = 0 // 0: pas de secrets de contacts, -1:tous les secrets de contacts, n:secrets du contact d'id N seulement (id2 du secret)
    this.groupeId = 0 // 0:pas de secrets de groupe, -1: secrets partagés avec tous les groupes, n: secrets partagés seulement avec le groupe N (id du secret)
    this.m1 = new Uint8Array([])
    this.m2 = new Uint8Array([])
    this.perm = true // sélectionner les permanents
    this.temp = 99998 // 0: ne pas sélectionner les temporaires N: ne sélectionner que les temporaires venant à échéance avant N
    this.texte = '' // secrets dont le titre contient ce texte
    this.corps = false // true: rechercher le texte dans le corps aussi
    /*
    0: pas de filtre sur la date de modification
    >0: modifiés après date D
    <0: modifiés avant date D
    */
    this.modif = 0
    /*
    0 : pas de tri
    1 : par date de dernière modification
    2 : par date de disparition automatique
    3 : par ordre alphabétique du titre
    */
    this.tri = 3
    this.asc = true // ascendant, descendant
  }

  equal (f) {
    return this.avId === f.avId && this.changement(f) === 0
  }

  debutFiltre () {
    const av = this.avId ? data.getAvatar(this.avId) : null
    this.m2gr = av ? av.mg2r : null
    if (this.modif) this.auj = Math.floor(new Date().getTime() / 86400000)
    this.f1 = new Set(this.m1)
    this.f2 = new Set(this.m2)
    this.jourj = getJourJ()
  }

  filtre (s) {
    if (s.ts === 0 && !this.perso) return false
    if (s.ts === 1 && (this.contactId === 0 || (this.contactId !== -1 && this.contactId !== s.id2))) return false
    if (s.ts === 2 && (this.groupeId === 0 || (this.groupeId !== -1 && this.groupeId !== s.id))) return false
    const im = s.ts !== 2 || !this.m2gr ? 0 : this.m2gr.get(s.id)
    let mcs = im === 0 ? s.mc : s.mc[im]
    if (!mcs && s.ts === 2) mcs = s.mc[0]
    if (!mcs && this.f1.size) return false
    if (mcs) {
      const sx = new Set(mcs)
      if (difference(this.f1, sx).size) return false
      if (intersection(this.f2, sx).size) return false
    }
    if (!this.perm && s.st === 99999) return false
    if (s.st !== 99999) {
      if (!this.temp) return false // ne retenir aucun temporaire
      if (this.temp !== 99998 && s.st > this.temp + this.jourj) return false
    }
    if (this.modif) {
      const j = Math.floor(s.txt.d / 86400000)
      if (this.modif > 0 && j < this.auj) return false
      if (this.modif < 0 && j > this.auj) return false
    }
    if (this.texte) {
      if (this.corps && s.txt.t.indexOf(this.texte) === -1) return false
      if (!this.corps && s.titre.indexOf(this.texte) === -1) return false
    }
    return true
  }

  tri1 (a, b) {
    if (this.asc) {
      return a.txt.d < b.txt.d ? -1 : (a.txt.d > b.txt.d ? 1 : 0)
    } else {
      return a.txt.d < b.txt.d ? 1 : (a.txt.d > b.txt.d ? -1 : 0)
    }
  }

  tri2 (a, b) { return this.asc ? (a.st < b.st ? -1 : (a.st > b.st ? 1 : 0)) : (a.st < b.st ? 1 : (a.st > b.st ? -1 : 0)) }

  tri3 (a, b) { return this.asc ? (a.txt.t < b.txt.t ? -1 : (a.txt.t > b.txt.t ? 1 : 0)) : (a.txt.t < b.txt.t ? 1 : (a.txt.t > b.txt.t ? -1 : 0)) }

  fntri (a, b) {
    return this.tri === 1 ? this.tri1(a, b) : (this.tri === 2 ? this.tri2(a, b) : this.tri3(a, b))
  }

  changement (f) {
    // niveau de changement avec le filtre précemment employé.
    // 0: aucun, 1:tri seulement, 2:filtre seulement, 3: base changée
    if (!f) return 3
    if (this.perso !== f.perso || this.contactId !== f.contactId || this.groupeId !== f.groupeId) return 3
    if (!equ8(this.m1, f.m1) || !equ8(this.m2, f.m2) || this.perm !== f.perm ||
      this.temp !== f.temp || this.modif !== f.modif || this.texte !== f.texte || this.corps !== f.corps) return 2
    if (this.tri !== f.tri || this.asc !== f.asc) return 1
    return 0
  }
}
