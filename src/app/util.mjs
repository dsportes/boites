import axios from 'axios'
import { data } from './modele.mjs'
import { AppExc, version, E_BRO, E_SRV } from './api.mjs'
import { EXBRK } from './operations.mjs'
import { u8ToB64, crypt, b64ToU8 } from './crypto.mjs'
import { encode, decode } from '@msgpack/msgpack'

const headers = { 'x-api-version': version }

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
const extensions = {}

export function setup (gp, appconfig, router, store) {
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

let jourJ // nombre de jours écoulés depuis le 1/1/2020. Recalculé toutes les heures.
const j0 = Math.floor(new Date('2020-01-01T00:00:00').getTime() / 86400000)
setInterval(() => { jourJ = Math.floor(new Date().getTime() / 86400000) - j0 }, 60000)

export function getJourJ () { return jourJ }

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
      // 402 : inattendue, récuprée sur le serveur
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
      this.mapc = data.getCompte().mmc
      this.fusion(this.mapc)
      if (this.mode === 1) this.src = this.mapc
    }
    if (this.mode === 2 || (this.mode === 3 && this.idg)) {
      const gr = data.getGroupe(this.idg)
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
