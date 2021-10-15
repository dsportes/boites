import { store, post /*, cfg */ } from './util'
import { newSession } from './ws'
import { Idb, deleteIDB } from './db.js'

import * as CONST from '../store/constantes'
import { NomAvatar, Compte, Avatar, data } from './modele'

const crypt = require('./crypto')
const base64url = require('base64url')
const rowTypes = require('./rowTypes')
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
  avatar
*/
export async function creationCompte (mdp, ps, nom, quotas) {
  const s = await newSession() // store().state.ui.session
  data.ps = ps
  data.clek = crypt.random(32)
  const nomAvatar = new NomAvatar().initNom(nom)
  const kp = await crypt.genKeyPair()
  let compte = new Compte().initCreate(ps, nomAvatar, data.clek, kp.privateKey)
  let rowCompte = rowTypes.compte.toBuffer()
  let avatar = new Avatar().initCreate(nomAvatar, data.clek)
  let rowAvatar = rowTypes.avatar.toBuffer(avatar)

  let ret
  try {
    const args = { sessionId: s.sessionId, mdp: mdp.mdp64, q1: quotas.q1, q2: quotas.q2, qm1: quotas.qm1, qm2: quotas.qm2, clePub: kp.publicKey, rowCompte: rowCompte, rowAvatar }
    ret = await post('m1', 'creationCompte', args, 'creation de compte sans parrain ...', 'respBase1')
    if (ret.status === 0) {
      store().commit('ui/majstatuslogin', true)
    } else {
      store().commit('ui/majstatuslogin', false)
      data.clek = null
      data.ps = null
      data.dh = 0
      s.close()
      return
    }
  } catch (e) {
    data.clek = null
    data.ps = null
    data.dh = 0
    s.close()
    return
  }

  // maj du modèle en mémoire
  if (data.dh < ret.dh) data.dh = ret.dh
  ret.rows.forEach(item => {
    if (item.table === 'compte') {
      rowCompte = rowTypes.compte.fromBuffer(item.row)
      compte = new Compte().fromRow(rowCompte)
    }
    if (item.table === 'avatar') {
      rowAvatar = rowTypes.compte.fromBuffer(item.row)
      avatar = new Avatar().fromRow(rowAvatar)
    }
  })
  store().commit('db/setCompte', compte)
  store().commit('ui/avatars', [avatar])

  // maj IDB
  if (store().getters['ui/modesync']) {
    const org = store().state.ui.org
    const nombase = org + '-' + compte.sid
    deleteIDB(nombase)
    localStorage.setItem(org + '-' + base64url(ps.pcb), compte.sid)
    const db = new Idb(nombase)
    await db.open()
    await db.commitRows([{ table: 'compte', id: '1', serial: rowCompte }, { table: 'avatar', id: '1', serial: rowAvatar }])
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
