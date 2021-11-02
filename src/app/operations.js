import { store, post, affichermessage, throwAppExc /*, cfg */ } from './util'
import { newSession, session } from './ws'
import { getIDB, deleteIDB } from './db.js'

import * as CONST from '../store/constantes'
import { NomAvatar, Compte, Avatar, data, Cv, rowItemsToRows, remplacePage } from './modele'
import { AppExc } from './api'

const crypt = require('./crypto')
const rowTypes = require('./rowTypes')

export async function deconnexion () {
  store().commit('db/raz')
  store().commit('ui/deconnexion')
  data.raz()
  if (session.ws) session.ws.close()
  remplacePage(store().state.ui.org ? 'Login' : 'Org')
}

export async function reconnexion () {
  // TODO
}

function debutsync () {
  store().commit('ui/majsyncencours', true)
}

function finsync () {
  store().commit('ui/majsyncencours', false)
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
  const org = store().state.ui.org
  const s = await newSession() // store().state.ui.session
  data.ps = ps
  const kp = await crypt.genKeyPair()
  const nomAvatar = new NomAvatar(nom, true) // nouveau
  let compte = new Compte().nouveau(nomAvatar, kp.privateKey)
  data.clek = compte.k
  const rowCompte = compte.toRow
  store().commit('db/setCompte', compte)
  let avatar = new Avatar().nouveau(nomAvatar)
  const rowAvatar = avatar.toRow
  debutsync()

  let ret
  try {
    const args = { sessionId: s.sessionId, mdp64: mdp.mdp64, q1: quotas.q1, q2: quotas.q2, qm1: quotas.qm1, qm2: quotas.qm2, clePub: kp.publicKey, rowCompte, rowAvatar }
    ret = await post('m1', 'creationCompte', args, 'creation de compte sans parrain ...')
  } catch (e) {
    finsync()
    deconnexion()
    throw e
  }

  // maj du modèle en mémoire
  if (data.dh < ret.dh) data.dh = ret.dh

  /*
  Le compte vient d'être créé,
  il est déjà dans le modèle et data.clek contient la clé
  On peut désérialiser la liste d'items
  */
  const rows = rowItemsToRows(ret.rowItems)
  for (const t in rows) {
    if (t === 'compte') compte = rows[t][0]
    if (t === 'avatar') avatar = rows[t][0]
  }
  store().commit('db/setCompte', compte)
  store().commit('db/setAvatars', [avatar])

  const cv = new Cv().fromAvatar(avatar)
  store().commit('db/setCvs', [cv])

  // maj IDB
  if (store().getters['ui/modesync']) {
    data.nombase = org + '-' + compte.sid
    const lstk = org + '-' + data.ps.dpbh
    try {
      deleteIDB(data.nombase)
      localStorage.setItem(lstk, compte.sid)
      const db = await getIDB()
      await db.commitRows([compte, avatar, cv])
    } catch (e) {
      console.log(e.toString())
      finsync()
      deleteIDB(data.nombase)
      data.nombase = null
      localStorage.removeItem(lstk)
      throw e
    }
  }
  finsync()
  affichermessage('Compte créé et connecté', false)
  remplacePage('Compte')
}

/*
Connexion à un compte par sa phrase secrète
*/
export async function connexionCompte (ps) {
  data.ps = ps
  const mode = store().state.ui.mode
  if (mode === CONST.MODE_AVION) {
    await connexionCompteAvion(ps)
    return
  }
  const s = await newSession()
  if (!s) {
    throw new AppExc(-101, 'Serveur non joignable ou arrêté', 'Problème technique, soit de réseau, soit sur le site du serveur')
  }
  console.log('connexion distante: ' + s.sessionId)
  let ret
  try {
    const args = { sessionId: s.sessionId, pcbh: ps.pcbh, dpbh: ps.dpbh }
    // eslint-disable-next-line no-unused-vars
    ret = await post('m1', 'connexionCompte', args, 'Connexion compte ...')
  } catch (e) {
    deconnexion()
    throw e
  }

  // PROVISOIRE, pour test simple
  // maj du modèle en mémoire
  if (data.dh < ret.dh) data.dh = ret.dh

  // obtenir le compte
  let compte
  ret.rowItems.forEach(item => {
    if (item.table === 'compte') {
      const rowCompte = rowTypes.fromBuffer('compte', item.serial)
      compte = new Compte().fromRow(rowCompte)
    }
  })
  store().commit('db/setCompte', compte)

  // TODO
  /*
  if (store().getters['ui/modesync']) {
    const org = store().state.ui.org
    const nombase = org + '-' + compte.sid
    const lstk = org + '-' + ps.dpbh
    try {
      localStorage.setItem(lstk, compte.sid)
      const db = new Idb(nombase)
      await db.open()
    } catch (e) {
      console.log(e.toString())
      throw e
    }
  }
  */
}

async function connexionCompteAvion () {
  console.log('connexion locale')
  const org = store().state.ui.org
  const lstk = org + '-' + data.ps.dpbh
  const idCompte = localStorage.getItem(lstk)
  if (!idCompte) {
    return throwAppExc(new AppExc(100, 'Compte non enregistré localement', 'Aucune session synchronisée ne s\'est préalablement exécutée sur ce poste avec cette phrase secrète. Erreur dans la saisie de la ligne 1 de la phrase ?'), false)
  }

  let db
  try {
    db = await getIDB()
  } catch (e) {
    return
  }
  const compte = await db.getCompte()
  if (!compte || compte.pcbh !== data.ps.pcbh) {
    db.close()
    throwAppExc(new AppExc(101, 'Compte non enregistré localement', 'Aucune session synchronisée ne s\'est préalablement exécutée sur ce poste avec cette phrase secrète. Erreur dans la saisie de la ligne 2 de la phrase ?'), false)
  }
  data.clek = compte.k
  store().commit('db/setCompte', compte)
  debutsync()
  remplacePage('Synchro')

  try {
    await db.chargementIdb()
    store().commit('ui/majmodeleactif', true)
    finsync()
    affichermessage('Compte authentifié et connecté', true)
    remplacePage('Compte')
  } catch (e) {
    finsync()
    db.close()
    deconnexion()
    throw e
  }
}
