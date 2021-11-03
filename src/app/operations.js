import { store, post, affichermessage, throwAppExc /*, cfg */ } from './util'
import { newSession, session } from './ws'
import { getIDB, deleteIDB, AVATAR, GROUPE } from './db.js'
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
  store().commit('db/raz')
  store().commit('ui/deconnexion')
  data.raz(true)
  if (session.ws) session.ws.close()
  connexionCompte(data.ps)
}

function debutsync () {
  store().commit('ui/majsyncencours', true)
  remplacePage('Synchro')
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
  data.ps = ps
  // Modes synchronisé et incognito
  const s = await newSession()
  if (!s) {
    throwAppExc(new AppExc(-101, 'Serveur non joignable ou arrêté', 'Problème technique, soit de réseau, soit sur le site du serveur'), false)
    return
  }

  const kp = await crypt.genKeyPair()
  const nomAvatar = new NomAvatar(nom, true) // nouveau
  let compte = new Compte().nouveau(nomAvatar, kp.privateKey)
  const rowCompte = compte.toRow
  store().commit('db/setCompte', compte)
  let avatar = new Avatar().nouveau(nomAvatar)
  const rowAvatar = avatar.toRow

  try {
    const args = { sessionId: s.sessionId, mdp64: mdp.mdp64, q1: quotas.q1, q2: quotas.q2, qm1: quotas.qm1, qm2: quotas.qm2, clePub: kp.publicKey, rowCompte, rowAvatar }
    const ret = await post('m1', 'creationCompte', args, 'creation de compte sans parrain ...')
    // maj du modèle en mémoire
    if (data.dh < ret.dh) data.dh = ret.dh
    /*
    Le compte vient d'être créé et est déjà dans le modèle (clek enregistrée)
    On peut désérialiser la liste d'items (compte et avatar)
    */
    const rows = rowItemsToRows(ret.rowItems)
    for (const t in rows) {
      if (t === 'compte') compte = rows[t][0]
      if (t === 'avatar') avatar = rows[t][0]
    }
    store().commit('db/setCompte', compte)
    store().commit('db/setAvatars', [avatar])
  } catch (e) {
    deconnexion()
    return
  }

  debutsync()

  const cv = new Cv().fromAvatar(avatar)
  store().commit('db/setCvs', [cv])

  // création de la base IDB et chargement des rows compte et avatar
  if (store().getters['ui/modesync']) {
    const org = store().state.ui.org
    data.nombase = org + '-' + compte.sid
    const lstk = org + '-' + data.ps.dpbh
    try {
      deleteIDB(data.nombase)
      localStorage.setItem(lstk, compte.sid)
      const db = await getIDB()
      await db.commitRows([compte, avatar, cv])
    } catch (e) {
      finsync()
      deleteIDB(data.nombase)
      data.nombase = null
      localStorage.removeItem(lstk)
      deconnexion()
      return
    }
  }
  finsync()
  affichermessage('Compte créé et connecté', false)
  remplacePage('Compte')
}

function onExc (e) {
  store().commit('ui/majmodeleactif', false)
  throwAppExc(e, false)
}

function onStop () {
  if (data.stopChargt) {
    store.commit('ui/majmodeleactif', false)
    return true
  }
  return false
}

/*
Connexion à un compte par sa phrase secrète
*/
export async function connexionCompte (ps) {
  data.ps = ps

  if (store().getters['ui/modeavion']) {
    await connexionCompteAvion()
    return
  }

  // Modes synchronisé et incognito
  const s = await newSession()
  if (!s) {
    throwAppExc(new AppExc(-101, 'Serveur non joignable ou arrêté', 'Problème technique, soit de réseau, soit sur le site du serveur'), false)
    return
  }

  let db = null
  if (store().getters['ui/modesync']) {
    try {
      db = await getIDB()
    } catch (e) {
      // base inaccessible
      throwAppExc(e, true)
      deconnexion()
      return
    }
  }

  // obtention du compte depuis le serveur
  let compte
  try {
    const args = { sessionId: s.sessionId, pcbh: ps.pcbh, dpbh: ps.dpbh }
    const ret = await post('m1', 'connexionCompte', args, 'Connexion compte ...')
    // maj du modèle en mémoire
    if (data.dh < ret.dh) data.dh = ret.dh
    // construction de l'objet compte
    ret.rowItems.forEach(item => {
      if (item.table === 'compte') {
        const rowCompte = rowTypes.fromBuffer('compte', item.serial)
        compte = new Compte().fromRow(rowCompte)
      }
    })
    store().commit('db/setCompte', compte)
  } catch (e) {
    // pas de compte authentifié et autres erreurs
    deconnexion()
    return
  }

  debutsync()
  // eslint-disable-next-line no-unused-vars
  const d = data

  if (db) {
    try {
      await db.commitRows([compte])
      await db.chargementIdb()
    } catch (e) {
      throwAppExc(e, true)
      return
    }
  }
  data.idbSetAvatars = data.setAvatars
  data.idbSetGroupes = data.setGroupes
  data.idbsetCvsUtiles = data.setCvsUtiles
  const grAPurger = new Set()
  if (!db) { // créer la liste des versions chargées pour les tables des avatars, cad 0 pour toutes
    data.setAvatars.forEach((id) => {
      data.setVerAv(crypt.id2s(id), AVATAR, 0)
    })
  }
  // état chargé correspondant à l'état local (vide le cas échéant) - compte OK

  if (onStop()) return
  // chargement des invitgrs ayant changé depuis l'état local (tous le cas échéant)
  try {
    const lvav = {}
    data.verAv((value, key) => {
      lvav[key] = value[AVATAR]
    })
    const ret = await post('m1', 'syncInvitgr', { sessionId: session.sessionId, lvav })
    if (data.dh < ret.dh) data.dh = ret.dh
    // traitement des invitgr reçus
    const maj = []
    ret.rowItems.forEach(item => {
      if (item.table === 'invitgr') {
        const invitgr = rowTypes.fromBuffer('invitgr', item.serial)
        maj.push(invitgr)
        if (invitgr.st < 0) {
          // Inscrire le groupe en inutile
          // Le supprimer de la liste des groupes à synchroniser
          grAPurger.add(invitgr.idg)
          if (data.verGr.has(invitgr.sidg)) {
            data.verGr.delete(invitgr.sidg)
          }
        } else {
          // Inscrire le groupe dans la liste de ceux à synchroniser s'il n'y était pas
          if (!data.verGr.has(invitgr.sidg)) {
            data.setVerGr(invitgr.sidg, GROUPE, 0)
          }
        }
      }
    })
    store.commit('db/setInvitgrs', maj)
    if (db && maj.length) {
      db.commitRows(maj)
    }
  } catch (e) {
    return onExc(e)
  }

  if (onStop()) return
  // synchroniser les avatars
  // TODO

  finsync()
  affichermessage('Compte connecté', false)
  remplacePage('Compte')
}

async function connexionCompteAvion () {
  const idCompte = localStorage.getItem(store().state.ui.org + '-' + data.ps.dpbh)
  if (!idCompte) {
    throwAppExc(new AppExc(100, 'Compte non enregistré localement', 'Aucune session synchronisée ne s\'est préalablement exécutée sur ce poste avec cette phrase secrète. Erreur dans la saisie de la ligne 1 de la phrase ?'), false)
    return
  }

  let db
  try {
    db = await getIDB()
    const compte = await db.getCompte()
    if (!compte || compte.pcbh !== data.ps.pcbh) {
      db.close()
      throwAppExc(new AppExc(101, 'Compte non enregistré localement', 'Aucune session synchronisée ne s\'est préalablement exécutée sur ce poste avec cette phrase secrète. Erreur dans la saisie de la ligne 2 de la phrase ?'), false)
      return
    }
    store().commit('db/setCompte', compte)
  } catch (e) {
    // base inaccessible ou compte non trouvé
    throwAppExc(e, true)
    deconnexion()
    return
  }

  debutsync()

  try {
    await db.chargementIdb()
    store().commit('ui/majmodeleactif', true)
  } catch (e) {
    finsync()
    db.close()
    deconnexion()
    return
  }

  finsync()
  affichermessage('Compte authentifié et connecté', true)
  remplacePage('Compte')
}
