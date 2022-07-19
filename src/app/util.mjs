import axios from 'axios'
import { data } from './modele.mjs'
import { AppExc, version, E_BRO, E_SRV, EXBRK, IDCOMPTABLE } from './api.mjs'
import { serial, deserial } from './schemas.mjs'
import { u8ToB64, crypt } from './crypto.mjs'

const headers = { 'x-api-version': version }

const decoder = new TextDecoder('utf-8')
const encoder = new TextEncoder('utf-8')

export function u8ToString (u8) { return decoder.decode(u8) }
export function stringToU8 (str) { return encoder.encode(str) }
export function Sid (id) { return id ? (typeof id === 'string' ? id : crypt.idToSid(id)) : '' }

let $cfg
let globalProperties
let cancelSourceGET
let cancelSourcePOST
let $store
let $router
let dtf
let dtf1
let dtf2
let idbalerte
let pako
let lgnom
let lgtitre
let auj
let hier

export function setup (gp, appconfig, router, store, pako1) {
  pako = pako1
  $cfg = appconfig
  lgtitre = $cfg.lgtitre || 50
  lgnom = $cfg.lgnom || 16
  idbalerte = $cfg.idb
  globalProperties = gp
  $store = store
  $router = router
  dtf = new Intl.DateTimeFormat($cfg.locale, $cfg.datetimeformat)
  dtf1 = new Intl.DateTimeFormat($cfg.locale, $cfg.datetimeformat1)
  dtf2 = new Intl.DateTimeFormat($cfg.locale, $cfg.datetimeformat2)
  // testgz()
}

export function copier (na) {
  affichermessage(na.nom + ' copié')
  $store.commit('ui/majclipboard', na)
}

export function dhstring (date) { return dtf.format(date) }

export function aujhier () {
  const now = new Date()
  if (auj && now.getFullYear() === auj.getFullYear() && now.getMonth() === auj.getMonth() && now.getDate() === auj.getDate()) return [auj, hier]
  auj = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  hier = new Date(auj.getTime() - 86400000)
  return [auj, hier]
}

export function dhcool (timems) {
  aujhier()
  const d = new Date(timems)
  const mm = auj.getFullYear() === d.getFullYear() && auj.getMonth() === d.getMonth()
  if (mm && auj.getDate() === d.getDate()) {
    return 'aujourd\'hui à ' + dtf2.format(d)
  }
  if (hier.getFullYear() === d.getFullYear() && hier.getMonth() === d.getMonth() && hier.getDate() === d.getDate()) {
    return 'hier à ' + dtf2.format(d)
  }
  if (mm) { return 'le ' + d.getDay() + ' à ' + dtf2.format(d) }
  return dtf1.format(d)
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

export function unpk (pk) {
  const i = pk.indexOf('/')
  return { id: crypt.sidToId(pk.substring(0, i)), ns: parseInt(pk.substring(i + 1)) }
}

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

export function gzipT (data) {
  return pako.gzip(data)
}

export function ungzipT (data) {
  return pako.ungzip(data)
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

export function sleep (delai) {
  if (delai <= 0) return
  return new Promise((resolve) => { setTimeout(() => resolve(), delai) })
}

const j0 = Math.floor(new Date('2020-01-01T00:00:00').getTime() / 86400000)
export function getJourJ () {
  return Math.floor(new Date().getTime() / 86400000) - j0
}

/* `dlv` : date limite de validité, en nombre de jours depuis le 1/1/2020. */
export function dlvDepassee (dlv) { return dlv !== 0 && dlv < getJourJ() }

// Mots clés en string ('245/232/21' en Uint8Array)
export function mcsToU8 (s) {
  const a = []
  if (s) {
    const x = s.substring(1, s.length - 1).split('/')
    x.forEach(n => a.push(parseInt(n)))
  }
  return new Uint8Array(a)
}

export function u8ToMcs (u8) {
  return u8 && u8.length ? '/' + u8.join('/') + '/' : null
}

export async function readFile (file, bin) {
  return new Promise((resolve, reject) => {
    const image = { size: file.size, name: file.name }
    if (!file.type) {
      image.type = file.name.endsWith('.md') || file.name.endsWith('.markdown') ? 'text/markdown' : 'application/octet-stream'
    } else image.type = file.type

    const reader = new FileReader()
    reader.addEventListener('load', (event) => {
      if (!bin) {
        image.b64 = event.target.result
      } else {
        image.u8 = new Uint8Array(event.target.result)
      }
      resolve(image)
    })
    reader.onerror = (error) => reject(error)
    if (!bin) {
      reader.readAsDataURL(file)
    } else {
      reader.readAsArrayBuffer(file)
    }
  })
}

// eslint-disable-next-line no-control-regex
const regex = /[.<>:"/\\|?* \x00-\x1F]/g
// eslint-disable-next-line no-control-regex
const regexdot = /[<>:"/\\|?* \x00-\x1F]/g
export function normpath (s, dot) { return s.replace(dot ? regexdot : regex, '_') }

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

function procEx (e) {
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
      throw new AppExc(E_BRO, 'Retour de la requête mal formé : JSON parse. Message: ' + e.message)
    }
    throw appexc
  } else throw new AppExc(E_SRV, e.message, e.stack) // inattendue, pas mise en forme
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
    if (r.status === 200) return new Uint8Array(r.data)
    throw new AppExc(E_SRV, r.statusText)
  } catch (e) {
    procEx(e)
  }
}

export async function getfa (secid, faid) {
  try {
    const u = $cfg.urlserveur + '/www/' + $store.state.ui.org + '/' + secid + '/' + faid
    const r = await axios({
      method: 'get',
      url: u,
      headers: headers,
      responseType: 'arraybuffer',
      timeout: $cfg.debug ? 50000000 : 5000
    })
    return r.status === 200 ? new Uint8Array(r.data) : null
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

/*
export async function getBinPub (path) {
  try {
    return (await axios.get('./' + path, { responseType: 'arraybuffer' })).data
  } catch (e) {
    return null
  }
}
*/

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

export async function upload (port, path, data) {
  try {
    const u = 'http://localhost:' + port + '/upload/' + $store.state.ui.org + '/' + path
    const par = { method: 'post', url: u, data: data }
    await axios(par)
  } catch (e) {
    throw e.toString()
  }
}

export async function putData (url, data) {
  try {
    const r = await axios({ method: 'put', url, data: data })
    return r.status
  } catch (e) {
    throw e.toString()
  }
}

export async function getData (url) {
  try {
    const r = await axios({ method: 'get', url, responseType: 'arraybuffer' })
    return new Uint8Array(r.data)
  } catch (e) {
    if (e.response && e.response.status === 404) {
      const txt = decoder.decode(e.response.data)
      throw new AppExc(E_SRV, txt)
    }
    throw appexc(e)
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

  edit (u8, court, groupeId) {
    if (!u8 || !u8.length) return ''
    const gr = groupeId ? data.getGroupe(groupeId) : null
    const l = []
    for (let i = 0; i < u8.length; i++) {
      const n = u8[i]
      const x = n >= 100 && n < 200 && gr ? gr.motcle(n) : this.mapAll.get(n)
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
      const cpt = data.getPrefs()
      this.mapc = cpt ? cpt.mc : {}
      this.fusion(this.mapc)
      if (this.mode === 1) this.src = this.mapc
    }
    if (this.mode === 2 || (this.mode === 3 && this.idg)) {
      const gr = data.getGroupe(this.idg)
      this.mapg = gr ? gr.mc : {}
      if (this.mode === 2) this.src = this.mapg
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

/** classes Phrase, MdpAdmin, PhraseContact ****************/
export class Phrase {
  async init (debut, fin) {
    this.pcb = await crypt.pbkfd(debut + '\n' + fin)
    this.pcb64 = u8ToB64(this.pcb)
    this.pcbh = crypt.hashBin(this.pcb)
    this.dpbh = crypt.hashBin(await crypt.pbkfd(debut))
    this.debut = debut
    this.fin = fin
  }

  razDebutFin () {
    this.debut = ''
    this.fin = ''
  }
}

export class PhraseContact {
  async init (texte) {
    this.phrase = texte
    this.clex = await crypt.pbkfd(texte)
    let hx = ''
    for (let i = 0; i < this.phrase.length; i = i + 2) hx += this.phrase.charAt(i)
    this.phch = crypt.hash(hx)
    return this
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
/************************************************/
export function titreCompte (sid, info) {
  if (!info) return sid
  if (!lgnom) lgnom = cfg().lgnom || 16
  const l = info.substring(0, lgnom)
  const i = l.indexOf('\n')
  return i === -1 ? l : l.substring(0, i)
}

export function titreGroupe (sid, info) {
  if (!info) return sid
  if (!lgnom) lgnom = cfg().lgnom || 16
  const l = info.substring(0, lgnom)
  const i = l.indexOf('\n')
  return i === -1 ? l : l.substring(0, i)
}

export function titreSecret (info, court) {
  const lg = !court ? lgtitre : lgnom
  if (!info) info = ''
  const i = info.indexOf('\n')
  const t1 = i === -1 ? info : info.substring(0, i)
  return t1.length <= lg ? t1 : t1.substring(0, lg - 3) + '...'
}

export function titreMembre (nom, info, court) { // membre et groupe
  const lg = !court ? lgtitre : lgnom
  if (!info) info = ''
  const i = info.indexOf('\n')
  const t1 = i === -1 ? info : info.substring(0, i)
  const t = t1.length <= lg ? t1 : t1.substring(0, lg - 3) + '...'
  if (!nom) return t
  const j = nom.indexOf('\n')
  const n1 = j === -1 ? nom : nom.substring(0, j)
  const n = n1.length <= lgnom ? n1 : n1.substring(0, lgnom - 3) + '...'
  return t ? t + ' (' + n + ')' : n
}

export function nomCv (id, court) {
  const cv = data.getCv(id)
  if (!cv || !cv[1]) return ''
  const lg = !court ? lgtitre : lgnom
  const i = cv[1].indexOf('\n')
  const t1 = i === -1 ? cv[1] : cv[1].substring(0, i)
  return t1.length <= lg ? t1 : t1.substring(0, lg - 3) + '...'
}

/** NomAvatar **********************************/
export class NomAvatar {
  constructor (nom, rnd) {
    this.nom = nom
    this.rnd = rnd || crypt.random(32)
    this.id = nom !== 'Comptable' ? crypt.hashBin(this.rnd) : IDCOMPTABLE
  }

  clone () {
    return new NomAvatar(this.nom, this.rnd)
  }

  get t () { return this.id % 4 }
  get nomc () { return this.nom + '#' + this.sfx }
  get nomf () { return normpath(this.nomc) }
  get sid () { return crypt.idToSid(this.id) }
  get disparu () { return data.repertoire.disparu(this.id) }
  get sfx () { return this.sid.substring(this.sid.length - 3, this.sid.length) + (this.disparu ? '[DISPARU]' : '') }
  get cle () { return this.rnd }
  get photo () {
    if (this.disparu) return ''
    const cv = data.getCv(this.id)
    return !cv || !cv[0] ? '' : cv[0]
  }

  get photoDef () {
    if (this.id === IDCOMPTABLE) return $cfg.superman
    if (this.disparu) return $cfg.disparu
    const cv = data.getCv(this.id)
    return !cv || !cv[0] ? $cfg.avatar : cv[0]
  }

  get info () {
    if (this.disparu) return 'DISPARU'
    const cv = data.getCv(this.id)
    return !cv || !cv[1] ? '' : cv[1]
  }

  get noml () {
    if (this.id === IDCOMPTABLE) return this.nom
    const cv = data.getCv(this.id)
    if (!cv) return this.nomc
    const info = cv[1]
    if (!info) return this.nomc
    if (!lgnom) lgnom = cfg().lgnom || 16
    const l = info.substring(0, lgnom)
    const i = l.indexOf('\n')
    return i === -1 ? l : l.substring(0, i)
  }
}

export class NomContact extends NomAvatar {
  constructor (nom, rnd) {
    super(nom, rnd)
    this.id += 1
  }

  get photoDef () {
    if (this.disparu) return $cfg.disparu
    const cv = data.getCv(this.id)
    return !cv || !cv[0] ? $cfg.couple : cv[0]
  }

  clone () {
    return new NomContact(this.nom, this.rnd)
  }
}

export class NomGroupe extends NomAvatar {
  constructor (nom, rnd) {
    super(nom, rnd)
    this.id += 2
  }

  get photoDef () {
    if (this.disparu) return $cfg.disparu
    const cv = data.getCv(this.id)
    return !cv || !cv[0] ? $cfg.groupe : cv[0]
  }

  clone () {
    return new NomContact(this.nom, this.rnd)
  }
}

export class NomTribu extends NomAvatar {
  constructor (nom, rnd) {
    super(nom, rnd)
    this.id += 3
  }

  clone () {
    return new NomTribu(this.nom, this.rnd)
  }
}

/** Filtre des couples *************************************/
export class FiltreCp {
  constructor () {
    this.m1 = new Uint8Array([])
    this.m2 = new Uint8Array([])
    this.phase = 0 // 0:toutes phases, sinon numéro de phase (stp)
    this.texte = '' // couples dont le nom contient ce texte
    this.corps = false // true: rechercher le texte dans l'ardoise et l'info aussi
    /*
    2 : par date de dernière modification de l'ardoise
    1 : par ordre alphabétique du nom
    */
    this.tri = 3
    this.asc = true // ascendant, descendant
  }

  etat () {
    const f = this
    const a = {
      mc1: f.m1,
      mc2: f.m2,
      phase: f.phase,
      texte: f.texte,
      corps: f.corps,
      tri: f.asc ? f.tri : -f.tri
    }
    return a
  }

  depuisEtat (a) {
    const f = this
    f.m1 = a.mc1
    f.m2 = a.mc2
    f.phase = a.phase
    f.texte = a.texte
    f.corps = a.corps
    f.asc = a.tri >= 0
    f.tri = a.tri >= 0 ? a.tri : -a.tri
    return f
  }

  equal (f) {
    return this.changement(f) === 0
  }

  debutFiltre () {
    this.f1 = new Set(this.m1)
    this.f2 = new Set(this.m2)
  }

  filtre (c) {
    const sx = new Set(c.mc0)
    if (difference(this.f1, sx).size) return false
    if (intersection(this.f2, sx).size) return false

    if (this.phase && c.stp !== this.phase) return false

    if (this.texte && c.nomE.indexOf(this.texte) === -1) {
      if (!this.corps) return false
      if (c.ard.indexOf(this.texte) === -1 && c.info.indexOf(this.texte) === -1) return false
    }
    return true
  }

  tri1 (a, b) {
    if (this.asc) {
      return a.nomE < b.nomE ? -1 : (a.nomE > b.nomE ? 1 : 0)
    } else {
      return a.nomE < b.nomE ? 1 : (a.nomE > b.nomE ? -1 : 0)
    }
  }

  tri2 (a, b) { return this.asc ? (a.dh < b.dh ? -1 : (a.dh > b.dh ? 1 : 0)) : (a.dh < b.dh ? 1 : (a.dh > b.dh ? -1 : 0)) }

  fntri (a, b) {
    return this.tri === 1 ? this.tri1(a, b) : this.tri2(a, b)
  }

  changement (f) {
    // niveau de changement avec le filtre précédemment employé.
    // 0: aucun, 1:tri seulement, 2:filtre
    if (!f) return 2
    if (!equ8(this.m1, f.m1) || !equ8(this.m2, f.m2) || this.phase !== f.phase || this.texte !== f.texte || this.corps !== f.corps) return 2
    if (this.tri !== f.tri || this.asc !== f.asc) return 1
    return 0
  }
}

/** Filtre *************************************/
export class Filtre {
  constructor (avId) {
    this.avId = avId
    this.perso = true
    this.coupleId = 0 // 0: pas de secrets de couple, -1:tous les secrets de couples, n:secrets partagés seulement avec le couple d'id N
    this.groupeId = 0 // 0:pas de secrets de groupe, -1: secrets partagés avec tous les groupes, n: secrets partagés seulement avec le groupe N
    this.m1 = new Uint8Array([])
    this.m2 = new Uint8Array([244])
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

  clone () {
    const f = new Filtre(this.avId)
    f.perso = this.perso
    f.coupleId = this.coupleId
    f.groupeId = this.groupeId
    f.m1 = this.m1
    f.m2 = this.m2
    f.perm = this.perm
    f.temp = this.temp
    f.texte = this.texte
    f.corps = this.corps
    f.modif = this.modif
    f.tri = this.tri
    f.as = this.asc
    return f
  }

  etat () {
    const f = this
    const a = {
      perso: f.perso,
      cp: f.coupleId,
      gr: f.groupeId,
      mc1: f.m1,
      mc2: f.m2,
      perm: f.perm,
      temp: f.temp,
      texte: f.texte,
      corps: f.corps,
      modif: f.modif,
      tri: f.asc ? f.tri : -f.tri
    }
    return a
  }

  depuisEtat (a) {
    const f = this
    f.perso = a.perso
    f.coupleId = a.cp
    f.groupeId = a.gr
    f.m1 = a.mc1
    f.m2 = a.mc2
    f.perm = a.perm
    f.temp = a.temp
    f.texte = a.texte
    f.corps = a.corps
    f.modif = a.modif
    f.asc = a.tri >= 0
    f.tri = a.tri >= 0 ? a.tri : -a.tri
    return f
  }

  equal (f) {
    const c = this.changement(f)
    // console.log('Changement : ' + c)
    return this.avId === f.avId && c === 0
  }

  debutFiltre () {
    if (this.modif) this.auj = Math.floor(new Date().getTime() / 86400000)
    this.f1 = new Set(this.m1)
    this.f2 = new Set(this.m2)
    this.jourj = getJourJ()
  }

  filtre (s) {
    const im = s.im(this.avId)
    if (s.ts === 0 && !this.perso) return false
    if (s.ts === 1 && (this.coupleId === 0 || (this.coupleId !== -1 && this.coupleId !== s.id))) return false
    if (s.ts === 2 && (this.groupeId === 0 || (this.groupeId !== -1 && this.groupeId !== s.id))) return false
    let mcs
    if (s.mc) {
      if (s.ts === 2) {
        mcs = s.mc[im] || s.mc[0] || new Uint8Array([])
      } else if (s.ts === 1) {
        mcs = s.mc[im] || new Uint8Array([])
      } else {
        mcs = s.mc || new Uint8Array([])
      }
    } else mcs = new Uint8Array([])
    const sx = new Set(mcs)
    if (difference(this.f1, sx).size) return false
    if (intersection(this.f2, sx).size) return false
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
    // niveau de changement avec le filtre précédemment employé.
    // 0: aucun, 1:tri seulement, 2:filtre seulement, 3: base changée
    if (!f) return 3
    if (this.perso !== f.perso || this.coupleId !== f.coupleId || this.groupeId !== f.groupeId) return 3
    if (!equ8(this.m1, f.m1) || !equ8(this.m2, f.m2) || this.perm !== f.perm ||
      this.temp !== f.temp || this.modif !== f.modif || this.texte !== f.texte || this.corps !== f.corps) return 2
    if (this.tri !== f.tri || this.asc !== f.asc) return 1
    return 0
  }
}

/** Filtre des groupes *************************************/
export class FiltreGrp {
  constructor () {
    this.m1 = new Uint8Array([])
    this.m2 = new Uint8Array([])
    this.texte = '' // contacts dont le nom / carte de visite contient ce texte
    this.info = false // true: rechercher le texte aussi dans l'ardoise et le commentaire personnel
    /*
    2 : par date de dernière modification de l'ardoise de l'avatar membre
    1 : par ordre alphabétique du nom
    */
    this.tri = 1
    this.asc = true // ascendant, descendant
  }

  etat () {
    const f = this
    const a = {
      mc1: f.m1,
      mc2: f.m2,
      texte: f.texte,
      info: f.info,
      tri: f.asc ? f.tri : -f.tri
    }
    return a
  }

  depuisEtat (a) {
    const f = this
    f.m1 = a.mc1
    f.m2 = a.mc2
    f.texte = a.texte
    f.info = a.info
    f.asc = a.tri >= 0
    f.tri = a.tri >= 0 ? a.tri : -a.tri
    return f
  }

  equal (f) {
    return this.changement(f) === 0
  }

  debutFiltre () {
    this.f1 = new Set(this.m1)
    this.f2 = new Set(this.m2)
  }

  filtre (g, m) {
    const sx = new Set(m ? m.mc : [])
    if (difference(this.f1, sx).size) return false
    if (intersection(this.f2, sx).size) return false

    if (this.texte && g.nom.indexOf(this.texte) === -1) {
      if (!this.info) return false
      if (m.ard.indexOf(this.texte) === -1 && m.info.indexOf(this.texte) === -1) return false
    }
    return true
  }

  tri1 (a, b) {
    if (this.asc) {
      return a.g.nom < b.g.nom ? -1 : (a.g.nom > b.g.nom ? 1 : 0)
    } else {
      return a.g.nom < b.g.nom ? 1 : (a.g.nom > b.g.nom ? -1 : 0)
    }
  }

  tri2 (a, b) { return this.asc ? (a.m.dh < b.m.dh ? -1 : (a.m.dh > b.m.dh ? 1 : 0)) : (a.m.dh < b.m.dh ? 1 : (a.m.dh > b.m.dh ? -1 : 0)) }

  fntri (a, b) {
    return this.tri === 1 ? this.tri1(a, b) : this.tri2(a, b)
  }

  changement (f) {
    // niveau de changement avec le filtre précédemment employé.
    // 0: aucun, 1:tri seulement, 2:filtre
    if (!f) return 2
    if (!equ8(this.m1, f.m1) || !equ8(this.m2, f.m2) || this.texte !== f.texte || this.info !== f.info) return 2
    if (this.tri !== f.tri || this.asc !== f.asc) return 1
    return 0
  }
}

/** Filtre des membres *************************************/
const etats = ['Tous', 'Pressentis', 'Invités', 'Actifs', 'Inactivés', 'Refusés', 'Résiliés', 'Disparus']
// stx : 0:pressenti, 1:invité, 2:actif (invitation acceptée), 3: inactif (invitation refusée), 4: inactif (résilié), 5: inactif (disparu).
const istx = [1, 2, 3, 5, 6, 7]
export class FiltreMbr {
  constructor () {
    this.lstEtats = [etats[0]]
    /*
    2 : par date de dernière modification de l'ardoise
    1 : par ordre alphabétique du nom
    */
    this.tri = 1
    this.asc = true // ascendant, descendant
  }

  etats () { return etats }

  etat () {
    const f = this
    const a = {
      lstEtats: f.lstEtats,
      tri: f.asc ? f.tri : -f.tri
    }
    return a
  }

  depuisEtat (a) {
    const f = this
    f.lstEtats = a.lstEtats
    f.asc = a.tri >= 0
    f.tri = a.tri >= 0 ? a.tri : -a.tri
    return f
  }

  equal (f) {
    return this.changement(f) === 0
  }

  debutFiltre () {
  }

  filtre (m) {
    if (m.estAc) return true
    if (this.lstEtats.indexOf(etats[0]) !== -1) return true
    if (this.lstEtats.indexOf(etats[4]) !== -1 && m.stp > 2) return true
    if (this.lstEtats.indexOf(etats[istx[m.stx]]) !== -1) return true
    return false
  }

  tri1 (a, b) {
    if (this.asc) {
      return a.nom < b.nom ? -1 : (a.nom > b.nom ? 1 : 0)
    } else {
      return a.nom < b.nom ? 1 : (a.nom > b.nom ? -1 : 0)
    }
  }

  tri2 (a, b) { return this.asc ? (a.dh < b.dh ? -1 : (a.dh > b.dh ? 1 : 0)) : (a.dh < b.dh ? 1 : (a.dh > b.dh ? -1 : 0)) }

  fntri (a, b) {
    if (a.estAc) return -1
    if (b.estAc) return 1
    return this.tri === 1 ? this.tri1(a, b) : this.tri2(a, b)
  }

  changement (f) {
    // niveau de changement avec le filtre précédemment employé.
    // 0: aucun, 1:tri seulement, 2:filtre
    if (!f) return 2
    const l1 = []; this.lstEtats.forEach(x => { l1.push(x) }); l1.sort()
    const l2 = []; f.forEach(x => { l2.push(x) }); l2.sort()
    if (l2.join('/') !== l1.join('/')) return 2
    if (this.tri !== f.tri || this.asc !== f.asc) return 1
    return 0
  }
}
