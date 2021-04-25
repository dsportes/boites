import axios from 'axios'
import { cfg } from '../boot/appconfig'
import * as CONST from '../store/constantes'

let globalProperties
let cancelSource
let $store

export function setgp (val) {
  globalProperties = val
  $store = globalProperties.$store
}

export function gp () { return globalProperties }

export function sleep (delai) { return new Promise((resolve) => { setTimeout(() => resolve(), delai) }) }

export async function testreq (delai) {
  $store.commit('ui/debutreq', 'Opération en cours...')
  await sleep(4000)
  $store.commit('ui/finreq', '')
}

export function cancelRequest () {
  if (cancelSource) cancelSource.cancel('Operation interrompue par l\'utilisateur.')
  $store.commit('ui/finreq', '')
}

export function blob2b64 (blob, asText) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onloadend = function () {
      resolve(reader.result)
    }
    reader.onerror = function (e) { reject(e) }
    if (asText) { reader.readAsText(blob) } else { reader.readAsDataURL(blob) }
  })
}

/*
export async function get (u) {
  try {
    global.App.setInfo('')
    cancelSource = axios.CancelToken.source()
    const r = await axios.get(url(u), { responseType: 'blob', cancelToken: cancelSource.token })
    global.App.setInfo('Opération OK')
    return blob2b64(r.data)
  } catch (e) {
    await err(e)
  }
}
*/

/*
Envoi une requête POST à odooproxy :
- u est l'URL de la forme "mod/function" qui est la fonction appelée
- args est un objet avec les arguments qui seront transmis dans le body de la requête
Retour :
- OK : l'objet retourné par la fonction demandée
- KO : un objet ayant une propriété error : {c:..., m:..., d:..., s:...}
c : code numétique
m : message textuel
d : détail (fac)
s : stack (fac)
l'erreur a déjà été affichée : le catch dans l'appel sert à différencier la suite du traitement.
*/
export async function post (module, fonction, args, info, blob) {
  try {
    const u = cfg.app.urlserveur + '/' + $store.state.ui.cfgorg.code + '/' + module + '/' + fonction
    $store.commit('ui/debutreq', info + ' - ' + u)
    if (!args) args = {}
    cancelSource = axios.CancelToken.source()
    const r = await axios({ method: 'post', url: u, data: args, responseType: blob ? 'blob' : 'json', cancelToken: cancelSource.token })
    $store.commit('ui/finreq', '')
    $store.commit('ui/setstatusreseau', r.status === 200 || r.status === 400 || r.status === 401 ? CONST.RESEAU_OK : CONST.RESEAU_KO)
    return r.data
  } catch (e) {
    $store.commit('ui/finreq', '')
    $store.commit('ui/setstatusreseau', CONST.RESEAU_KO)
    await err(e, true)
  }
}

export async function ping () {
  try {
    const u = cfg.app.urlserveur + '/ping'
    $store.commit('ui/debutreq', u)
    cancelSource = axios.CancelToken.source()
    const r = await axios({ method: 'get', url: u, responseType: 'text', cancelToken: cancelSource.token })
    $store.commit('ui/finreq', r.data)
    $store.commit('ui/setstatusreseau', r.status === 200 || r.status === 400 || r.status === 401 ? CONST.RESEAU_OK : CONST.RESEAU_KO)
    return r.data
  } catch (e) {
    $store.commit('ui/finreq', '')
    $store.commit('ui/setstatusreseau', CONST.RESEAU_KO)
    await err(e, true)
  }
}

async function err (e, isPost) {
  let ex
  if (axios.isCancel(e)) {
    ex = { majeur: "Interruption de l'opération", code: 0, message: e.message }
  } else {
    if (e.response && e.response.status === 400) {
      let x
      if (isPost) {
        x = e.response.data
      } else {
        const err = await blob2b64(e.response.data, true)
        try { x = JSON.parse(err) } catch (e2) { x = { c: -1, m: err } }
      }
      x = x.apperror || x
      ex = { majeur: "Echec de l'opération", code: x.c, message: x.m, detail: x.d, stack: x.s }
    } else {
      ex = { majeur: "Echec de l'opération : BUG ou incident technique", code: 0, message: e.message }
    }
  }
  $store.commit('ui/seterreur', ex)
  throw ex
}
