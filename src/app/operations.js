import { store, post /*, cfg */ } from './util'
import { newSession } from './ws'
import { Idb, deleteIDB } from './db.js'

import * as CONST from '../store/constantes'
import { NomAvatar } from './modele'
const crypt = require('./crypto')
const base64url = require('base64url')
// const rowTypes = require('./rowTypes')
// const JSONbig = require('json-bigint')

export async function deconnexion () {
  store().commit('ui/majstatuslogin', false)
}

/* On poste :
- le row Compte, v et dds à 0
- la clé publique de l'avatar pour la table avrsa
- les quotas pour la table avgrvq
- le row Avatar, v et dds à 0
Retour:
- status :
  0: créé et connecté
  1: était déjà créé avec la bonne phrase secrète, transformé en login
  2: début de phrase secrète déjà utilisée - refus
  -1: erreur technique
- dh, sessionId
- rowItems retournés :
  compte
  avatar (1 pour le status 0)
*/
export async function creationCompte (mdp, ps, nom, quotas) {
  const nomAvatar = new NomAvatar().initNom(nom)
  const id = crypt.rnd6()
  const sid = crypt.id2s(id)
  const serial = null

  if (store().getters['ui/modesync']) {
    const org = store().state.ui.org
    const nombase = org + '-' + sid
    deleteIDB(nombase)
    localStorage.setItem(org + '-' + base64url(ps.pcb), sid)
    const db = new Idb(nombase)
    await db.open()
    await db.commitRows([{ table: 'compte', id: '1', serial: serial }])
  }
}

/*
Connexion à un compte par sa phrase secrète
Retour : 0:OK, -1:erreur technique, 1:non authentifié
*/
export async function connexion (ps) {
  const mode = store().state.ui.mode
  try {
    if (mode === CONST.MODE_AVION) {
      console.log('connexion locale')
      return 0
    } else {
      const s = await newSession()
      console.log('connexion distante: ' + s.sessionId)
      const args = { sessionId: s.sessionId, pcbsh: ps.pcbsh, dpbh: ps.dpbh }
      const ret = await post('m1', 'testconnexion', args, 'Connexion ...', 'respBase1')
      if (ret.status === 0) {
        store().commit('ui/majstatuslogin', true)
      } else {
        store().commit('ui/majstatuslogin', false)
      }
      return ret
    }
  } catch (e) {
    return { status: -1, dh: 0, sessionId: '', rows: [] }
  }
}
