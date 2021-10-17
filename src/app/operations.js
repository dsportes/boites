import { store, post /*, cfg */ } from './util'
import { newSession } from './ws'
import { Idb, deleteIDB } from './db.js'

import * as CONST from '../store/constantes'
import { NomAvatar, Compte, Avatar, data, Cv } from './modele'

const crypt = require('./crypto')
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
  let compte = new Compte().initCreate(nomAvatar, kp.privateKey)
  let rowCompte = rowTypes.rowSchemas.compte.toBuffer(compte)
  let avatar = new Avatar().initCreate(nomAvatar, data.clek)
  let rowAvatar = rowTypes.rowSchemas.avatar.toBuffer(avatar)

  let ret
  try {
    const args = { sessionId: s.sessionId, mdp64: mdp.mdp64, q1: quotas.q1, q2: quotas.q2, qm1: quotas.qm1, qm2: quotas.qm2, clePub: kp.publicKey, rowCompte: rowCompte, rowAvatar }
    ret = await post('m1', 'creationCompte', args, 'creation de compte sans parrain ...', 'respBase1')
  } catch (e) {
    store().commit('ui/majstatuslogin', false)
    data.clek = null
    data.ps = null
    data.dh = 0
    s.close()
    throw e
  }

  // maj du modèle en mémoire
  if (data.dh < ret.dh) data.dh = ret.dh

  // obtenir d'abord le compte PUIS l'avatar
  ret.rowItems.forEach(item => {
    if (item.table === 'compte') {
      rowCompte = rowTypes.fromBuffer('compte', item.serial)
      compte = new Compte().fromRow(rowCompte)
    }
  })
  store().commit('db/setCompte', compte)

  // PUIS l'avatar une fois le compte en vuex
  ret.rowItems.forEach(item => {
    if (item.table === 'avatar') {
      rowAvatar = rowTypes.fromBuffer('avatar', item.serial)
      avatar = new Avatar().fromRow(rowAvatar)
    }
  })
  store().commit('db/setAvatars', [avatar])

  const cv = new Cv().fromAvatar(avatar)
  store().commit('db/setCvs', [cv])

  // maj IDB
  if (store().getters['ui/modesync']) {
    const org = store().state.ui.org
    const nombase = org + '-' + compte.sid
    const lstk = org + '-' + ps.dpbh
    try {
      deleteIDB(nombase)
      localStorage.setItem(lstk, compte.sid)
      const db = new Idb(nombase)
      await db.open()
      await db.commitRows([
        { table: 'compte', row: compte, serial: rowCompte },
        { table: 'avatar', row: avatar, serial: rowAvatar },
        { table: 'cv', row: cv, serial: cv.serialIdb() }
      ])
    } catch (e) {
      console.log(e.toString())
      deleteIDB(nombase)
      localStorage.removeItem(lstk)
      throw e
    }
  }
  store().commit('ui/majstatuslogin', true)
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
