import axios from 'axios'
const api = require('./api')
import { SCID } from './ws'
const AppExc = require('./api').AppExc

const headers = { 'x-api-version': api.version }
// import * as CONST from '../store/constantes'

let $cfg
let globalProperties
let cancelSourceGET
let cancelSourcePOST
let $store

export function setup (gp, appconfig) {
  $cfg = appconfig
  globalProperties = gp
}

export function setstore (store) {
  $store = store
}

export function cfg () { return $cfg }

export function store () { return $store }

export function gp () { return globalProperties }

export function router () { return globalProperties.$router }

export function sleep (delai) {
  if (delai <= 0) return
  return new Promise((resolve) => { setTimeout(() => resolve(), delai) })
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
- module : module invoqué
- fonction : code la fonction du module
- args : objet avec les arguments qui seront transmis dans le body de la requête. Encodé par avro ou JSONStringify
- info : message d'information affiché
Retour :
- OK : l'objet retourné par la fonction demandée
- KO : un objet ayant une propriété error : {c:..., m:..., d:..., s:...}
c : code numétique
m : message textuel
d : détail (fac)
s : stack (fac)
l'erreur a déjà été affichée : le catch dans l'appel sert à différencier la suite du traitement.
*/
export async function post (module, fonction, args, info) {
  const scid = SCID()
  try {
    if (!info) info = 'Requête'
    const at = api.argTypes[fonction]
    const type = at && at.length > 0 ? at[0] : null
    const typeResp = at && at.length > 1 ? at[1] : null
    const data = type ? type.toBuffer(args).buffer : Buffer.from(JSON.stringify(args))
    const u = $cfg.urlserveur + '/' + $store.state.ui.org + '/' + module + '/' + fonction
    $store.commit('ui/debutreq')
    affichermessage(info + ' - ' + u, false)
    cancelSourcePOST = axios.CancelToken.source()
    // console.log('Avant post : ' + scid)
    const r = await axios({ method: 'post', url: u, data: data, headers: headers, responseType: 'arraybuffer', cancelToken: cancelSourcePOST.token })
    cancelSourcePOST = null
    // console.log('Après post : ' + SCID())
    if (SCID() !== scid) throw Error('RUPTURESESSION')
    $store.commit('ui/finreq')
    $store.commit('ui/majstatushttp', r.status)
    razmessage()
    const buf = Buffer.from(r.data)
    // les status HTTP non 2xx tombent en exception
    if (typeResp) { // résultat normal sérialisé
      try {
        return typeResp.fromBuffer(buf)
      } catch (e) { // Résultat mal formé
        throw new AppExc(-1020, 'Retour de la requête mal formé', 'Désérialisation de la réponse à ' + fonction + ' : ' + e.message)
      }
    }
    // sérialisé en JSON
    try {
      return JSON.parse(buf.toString())
    } catch (e) { // Résultat mal formé
      throw new AppExc(-1021, 'Retour de la requête mal formé', 'JSON parse : ' + e.message)
    }
  } catch (e) {
    $store.commit('ui/finreq')
    razmessage()
    if (e.message === 'RUPTURESESSION') throw e
    if (SCID() !== scid) throw Error('RUPTURESESSION')
    const status = (e.response && e.response.status) || 0
    $store.commit('ui/majstatushttp', status)
    if (axios.isCancel(e)) throw new AppExc(-1000, "Interruption de l'opération par l'utilisateur")
    let x
    if (status === 400 || status === 401) {
      try {
        x = JSON.parse(Buffer.from(e.response.data).toString())
      } catch (e2) {
        x = new AppExc(-1001, 'Retour en exception de la requête mal formé', 'JSON parse : ' + e2.message)
      }
      if (status === 400) return x // 400 : anomalie fonctionnelle à traiter par l'application
      $store.commit('ui/majerreur', x) // 401 : anomalie fonctionnelle à afficher et traiter comme exception
      throw x
    }
    // Erreurs réseau / serveur inattendues
    errNetSrv(e)
  }
}

function errNetSrv (e) {
  const m = e.message === 'Network Error' ? 'Probable erreur de réseau' : e.message
  const x = new AppExc(-1002, 'Echec de l\'opération : BUG ou incident technique', m)
  throwAppExc(x) // Autres statuts : anomalie / bug / incident à afficher et traiter comme exception
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
    cancelSourceGET = axios.CancelToken.source()
    const scid = SCID()
    const r = await axios({
      method: 'get',
      url: u,
      params: args,
      headers: headers,
      responseType: 'arraybuffer',
      cancelToken: cancelSourceGET.token,
      timeout: $cfg.debug ? 500000 : 5000
    })
    cancelSourceGET = null
    if (SCID() !== scid) throw Error('RUPTURESESSION')
    return r.status === 200 ? r.data : null
  } catch (e) {
    if (e.message !== 'RUPTURESESSION') throw e
    console.log(e)
    return null
  }
}

export async function ping () {
  try {
    const u = $cfg.urlserveur + '/ping'
    $store.commit('ui/debutreq')
    affichermessage('ping - ' + u, false)
    cancelSourceGET = axios.CancelToken.source()
    const scid = SCID()
    const r = await axios({ method: 'get', url: u, responseType: 'text', cancelToken: cancelSourceGET.token })
    cancelSourceGET = null
    if (SCID() !== scid) throw Error('RUPTURESESSION')
    $store.commit('ui/finreq')
    affichermessage(r.data)
    $store.commit('ui/majstatushttp', r.status)
    return r.data
  } catch (e) {
    $store.commit('ui/finreq')
    if (e.message !== 'RUPTURESESSION') errNetSrv(e)
    return null
  }
}

export function throwAppExc (appExc, nothrow) {
  razmessage()
  store().commit('ui/majerreur', appExc)
  console.log('test echo : ' + JSON.stringify(appExc))
  if (!nothrow) throw appExc
}

export async function testEcho (to) {
  const r = await post('m1', 'echo', { a: 1, b: 'toto', to: to || 0 })
  console.log('test echo : ' + JSON.stringify(r))
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
    return 'data:image/' + (type || 'png') + ';base64,' + Buffer.from(x).toString('base64')
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

/*
export async function orgicon (org) {
  try {
    const u = $cfg.urlserveur + '/icon/' + org
    $store.commit('ui/debutreq')
    affichermessage('Recherche de l\'icône de ' + org, false)
    cancelSource = axios.CancelToken.source()
    const r = await axios({ method: 'get', url: u, responseType: 'text', cancelToken: cancelSource.token })
    $store.commit('ui/finreq')
    razmessage()
    $store.commit('ui/majstatushttp', r.status)
    return r.data
  } catch (e) {
    $store.commit('ui/finreq')
    err(e)
  }
}
*/

/*
// generation de key pair sur le serveur
export async function genkeypair () {
  try {
    const u = $cfg.urlserveur + '/genkeypair'
    const r = await axios({ method: 'get', url: u, responseType: 'json' })
    return { publicKey: r.data[0], privateKey: r.data[1] }
  } catch (e) {
    err(e)
  }
}
*/
