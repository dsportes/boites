import axios from 'axios'
import { data } from './modele.mjs'
import { AppExc, version, E_BRO, E_SRV } from './api.mjs'
import { EXBRK } from './operations.mjs'
import { u8ToB64 } from './crypto.mjs'
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
