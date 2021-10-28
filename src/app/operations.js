import { store, post, affichermessage /*, cfg */ } from './util'
import { newSession, session } from './ws'
import { Idb, deleteIDB } from './db.js'

import * as CONST from '../store/constantes'
import { NomAvatar, Compte, Avatar, data, Cv, rowItemsToRows } from './modele'
import { AppExc } from './api'

const crypt = require('./crypto')
const rowTypes = require('./rowTypes')
// const JSONbig = require('json-bigint')

export async function deconnexion () {
  store().commit('ui/majstatuslogin', false)
  store().commit('db/raz')
  data.raz()
  const s = session.ws
  if (s) s.close()
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
  const kp = await crypt.genKeyPair()
  const nomAvatar = new NomAvatar(nom, true) // nouveau
  let compte = new Compte().nouveau(nomAvatar, kp.privateKey)
  data.clek = compte.k
  const rowCompte = compte.toRow
  store().commit('db/setCompte', compte)
  let avatar = new Avatar().nouveau(nomAvatar)
  const rowAvatar = avatar.toRow

  let ret
  try {
    const args = { sessionId: s.sessionId, mdp64: mdp.mdp64, q1: quotas.q1, q2: quotas.q2, qm1: quotas.qm1, qm2: quotas.qm2, clePub: kp.publicKey, rowCompte, rowAvatar }
    ret = await post('m1', 'creationCompte', args, 'creation de compte sans parrain ...')
    store().commit('ui/majstatuslogin', true)
  } catch (e) {
    deconnexion()
    throw e
  }

  // maj du modèle en mémoire
  if (data.dh < ret.dh) data.dh = ret.dh

  /*
  Le compte vient d'être créé,
  il est déjà dans le modèle et data.clek contient la clé
  On peut désrialiser la liste d'items
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
    const org = store().state.ui.org
    const nombase = org + '-' + compte.sid
    const lstk = org + '-' + ps.dpbh
    try {
      deleteIDB(nombase)
      localStorage.setItem(lstk, compte.sid)
      const db = new Idb(nombase)
      await db.open()
      await db.commitRows([compte, avatar, cv])
    } catch (e) {
      console.log(e.toString())
      deleteIDB(nombase)
      localStorage.removeItem(lstk)
      throw e
    }
  }
  store().commit('ui/majstatuslogin', true)
  affichermessage('Compte créé et connecté', false)
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
    store().commit('ui/majstatuslogin', true)
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
}

async function connexionCompteAvion () {
  console.log('connexion locale')
  const org = store().state.ui.org
  const lstk = org + '-' + data.ps.dpbh
  const idCompte = localStorage.getItem(lstk)
  if (!idCompte) {
    throw new AppExc(100, 'Compte non enregistré localement', 'Aucune session synchronisée ne s\'est préalablement exécutée sur ce poste avec cette phrase secrète. Erreur dans la saisie de la ligne 1 de la phrase ?')
  }
  const nombase = org + '-' + idCompte
  let db
  try {
    db = new Idb(nombase)
    await db.open()
  } catch (e) {
    console.log(e.toString())
    throw e
  }
  const compte = await db.getCompte()
  if (!compte || compte.pcbh !== data.ps.pcbh) {
    throw new AppExc(101, 'Compte non enregistré localement', 'Aucune session synchronisée ne s\'est préalablement exécutée sur ce poste avec cette phrase secrète. Erreur dans la saisie de la ligne 2 de la phrase ?')
  }
  data.clek = compte.k
  store().commit('db/setCompte', compte)
  store().commit('ui/majdialoguesynchro', true)
  let ok = true
  try {
    await db.chargementIdb()
  } catch (e) {
    if (e.message === 'STOPCHARGT') {
      ok = false
      affichermessage('Chargement des données locales interrompu sur demande explicite', true)
    } else throw e
  }
  store().commit('ui/majdialoguesynchro', false)
  store().commit('ui/majstatuslogin', true)
  affichermessage('Compte authentifié et connecté' + (ok ? '' : ' mais données peut-être incomplètes'), false)
}
