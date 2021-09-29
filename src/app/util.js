import axios from 'axios'
const api = require('./api')
const headers = { 'x-api-version': api.version }
// import * as CONST from '../store/constantes'

let $cfg
let globalProperties
let cancelSource
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

export function sleep (delai) { return new Promise((resolve) => { setTimeout(() => resolve(), delai) }) }

export function affichermessage (texte, important) {
  $store.dispatch('ui/affichermessage', { texte, important })
}

export function razmessage () {
  $store.commit('ui/razmessage')
}

export function cancelRequest () {
  if (cancelSource) cancelSource.cancel('Operation interrompue par l\'utilisateur.')
  $store.commit('ui/finreq', '')
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
  try {
    if (!info) info = 'Requête'
    const at = api.argTypes[fonction]
    const type = at ? at[0] : null
    const typeResp = at ? at[1] : null
    let data
    if (type) {
      const buf = type.toBuffer(args)
      data = buf.buffer
    } else {
      data = Buffer.from(JSON.stringify(args))
    }
    const u = $cfg.urlserveur + '/' + $store.state.ui.org + '/' + module + '/' + fonction
    $store.commit('ui/debutreq')
    affichermessage(info + ' - ' + u, false)
    cancelSource = axios.CancelToken.source()
    const r = await axios({
      method: 'post',
      url: u,
      data: data,
      headers: headers,
      responseType: 'arraybuffer',
      cancelToken: cancelSource.token
    })
    $store.commit('ui/finreq')
    razmessage()
    $store.commit('ui/majstatushttp', r.status)
    const buf = Buffer.from(r.data)
    if (r.status === 200 && typeResp) {
      return typeResp.fromBuffer(buf)
    }
    try {
      return JSON.parse(buf.toString())
    } catch (e) {
      return { code: -1, message: 'Retour de la requête mal formé', detail: 'JSON parse : ' + e.message }
    }
  } catch (e) {
    err(e, true)
  }
}

export async function ping () {
  try {
    const u = $cfg.urlserveur + '/ping'
    $store.commit('ui/debutreq')
    affichermessage('ping - ' + u, false)
    cancelSource = axios.CancelToken.source()
    const r = await axios({ method: 'get', url: u, responseType: 'text', cancelToken: cancelSource.token })
    $store.commit('ui/finreq')
    affichermessage(r.data)
    $store.commit('ui/majstatushttp', r.status)
    return r.data
  } catch (e) {
    err(e)
  }
}

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

function err (e, isPost) {
  $store.commit('ui/finreq')
  razmessage()
  const status = (e.response && e.response.status) || 0
  $store.commit('ui/majstatushttp', status)
  let ex
  if (axios.isCancel(e)) {
    ex = { majeur: "Interruption de l'opération", code: 0, message: e.message }
  } else {
    if (status === 400 || status === 401) {
      let x
      if (!isPost) {
        x = e.response.data
      } else {
        try {
          x = JSON.parse(Buffer.from(e.response.data).toString())
        } catch (e2) {
          x = { c: -1, m: 'Retour en erreur de la requête mal formé', d: 'JSON parse : ' + e2.message }
        }
      }
      x = x.apperror || x
      ex = { majeur: "Echec de l'opération", code: x.c, message: x.m, detail: x.d, stack: x.s }
    } else {
      ex = { majeur: "Echec de l'opération : BUG ou incident technique", code: 0, message: e.message, stack: e.stack }
    }
  }
  if (status !== 400) {
    $store.commit('ui/majerreur', ex)
  }
  throw ex
}

// Volume entier approximatif rendu sur un byte
export function log10 (v) { return Math.round(Math.log10(v) * 20) }

// Volume entier retourné depuis un byte
export function pow10 (v) { return Math.round(Math.pow(10, v / 20)) }
