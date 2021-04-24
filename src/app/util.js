import axios from 'axios'
import { cfg } from '../boot/appconfig'

let globalProperties
let cancelSource

export function setgp (val) { globalProperties = val }

export function gp () { return globalProperties }

export function sleep (delai) { return new Promise((resolve) => { setTimeout(() => resolve(), delai) }) }

export async function testreq (delai) {
  gp().$store.commit('ui/debutreq', 'Opération en cours...')
  await sleep(4000)
  gp().$store.commit('ui/finreq', '')
}

export function cancelRequest () {
  if (cancelSource) cancelSource.cancel('Operation interrompue par l\'utilisateur.')
  gp().$store.commit('ui/finreq', '')
}

function url (u) { return cfg.app.urlserveur + '/' + u }

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
export async function post (u, args, info, blob) {
  try {
    gp().$store.commit('ui/debutreq', info)
    if (!args) args = {}
    cancelSource = axios.CancelToken.source()
    const r = await axios.post(url(u), args, { responseType: blob ? 'blob' : 'json', cancelToken: cancelSource.token })
    gp().$store.commit('ui/finreq', '')
    return r.data
  } catch (e) {
    gp().$store.commit('ui/finreq', '')
    await err(e, true)
  }
}

async function err (e, isPost) {
  if (axios.isCancel(e)) {
    gp().$store.commit('ui/seterreur', { majeur: "Interruption de l'opération", code: 0, message: e.message })
  } else {
    if (e.response && e.response.status === 400) {
      let x
      if (isPost) {
        x = e.response.data
      } else {
        const err = await this.blob2b64(e.response.data, true)
        try { x = JSON.parse(err) } catch (e2) { x = { c: -1, m: err } }
      }
      x = x.apperror || x
      gp().$store.commit('ui/seterreur', { majeur: "Echec de l'opération", code: x.c, message: x.m, detail: x.d, stack: x.s })
    } else {
      gp().$store.commit('ui/seterreur', { majeur: "Echec de l'opération : BUG ou incident technique", code: 0, message: e.message })
    }
  }
  throw e
}
