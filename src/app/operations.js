import { store, post, affichermessage, setErreur /*, cfg */ } from './util'
import { getIDB, deleteIDB, AVATAR, GROUPE, idbSidCompte } from './db.js'
import { NomAvatar, Compte, Avatar, data, Cv, rowItemsToRows, remplacePage, Invitgr, SIZEAV, SIZEGR } from './modele'
const AppExc = require('./api').AppExc
const api = require('./api')

const crypt = require('./crypto')
const rowTypes = require('./rowTypes')

const EXBRK = new AppExc(api.E_BRK, 'Interruption volontaire')

export class Operation {
  constructor () {
    this.cancelToken = null
    this.break = false
    store().commit('db/opencours', true)
  }

  EX1 (e) {
    return new AppExc(api.E_BRO, 'Exception inattendue : ' + e.message, e.stack)
  }

  BRK () {
    if (this.break) throw EXBRK
  }

  stop () {
    if (this.cancelToken) {
      this.cancelToken.cancel('Operation interrompue par l\'utilisateur.')
      this.cancelToken = null
    }
    this.break = true
  }

  fin (e) {
    data.opUI = null
    store().commit('db/opencours', false)
  }
}

export class OperationWS extends Operation {
  constructor () {
    super()
    data.opWS = this
  }

  fin (e) { // Toute erreur provoque l'arrêt de la synchronisation
    data.opWS = null
    store().commit('db/opencours', false)
    if (e) {
      data.setErDB(e, true)
    }
    if (e) {
      if (e instanceof AppExc) {
        if (e.code === api.E_DB) {
          data.setErDB(e, true)
          return
        }
        if (e.code === api.E_WS) {
          data.setErWS(e, true)
          return
        }
      } else {
        e = new AppExc(api.E_BRO, e.message, e.stack)
      }
      store().commit('ui/majerreur', e) // provoque son affichage
      data.degraderMode()
    }
  }
}

export class OperationUI extends Operation {
  constructor () {
    super()
    data.opUI = this
  }

  /* statut de la session
  0: fantôme (pas de session)
  1: session initiée non authentifiée
  2: session authentifiée, données minimale en cours de chargement
  3: session en partie chargée, utilisable en mode visio
  4: session synchronisée / cohérente
  5: session cohérente mais figée, non synchronisée
  */
  fin (e) {
    data.opUI = null
    store().commit('db/opencours', false)
    if (e) {
      if (e instanceof AppExc) {
        if (e.code === api.E_DB) return
        if (e.code === api.E_WS) return
      } else {
        e = new AppExc(api.E_BRO, e.message, e.stack)
      }
      store().commit('ui/majerreur', e) // provoque son affichage
    }
  }
}

export class ProcessQueue extends OperationWS {
  constructor () {
    super(true)
    this.nomOp = 'processqueue'
  }

  async run (q) {
    try {
      const items = []
      for (let i = 0; i < q.length; i++) {
        const syncList = q[i]
        for (let j = 0; j < syncList.rowItems.length; j++) {
          const rowItem = syncList.rowItems[j]
          rowTypes.deserialItem(rowItem)
          items.push(rowItem)
        }
      }
      if (data.db) {
        await data.db.commitRows(items)
      }
      // TODO : compilation des rows, mettre à jour de l'état mémoire
      this.fin()
    } catch (e) {
      this.fin(e)
    }
  }
}

async function debutsync (db) {
  store().commit('ui/majsyncencours', true)
  data.dhdebutsync = data.dh
  if (db) await db.setEtat()
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
export class CreationCompte extends OperationUI {
  async run (mdp, ps, nom, quotas) {
    try {
      data.ps = ps
      if (data.mode === 1) {
        deleteIDB(data.nombase)
      }
      if (!data.connexion()) return

      const kp = await crypt.genKeyPair()
      const nomAvatar = new NomAvatar(nom, true) // nouveau
      let compte = new Compte().nouveau(nomAvatar, kp.privateKey)
      const rowCompte = compte.toRow
      store().commit('db/setCompte', compte)
      let avatar = new Avatar().nouveau(nomAvatar)
      const rowAvatar = avatar.toRow
      data.statut = 2

      const args = { sessionId: data.sessionId, mdp64: mdp.mdp64, q1: quotas.q1, q2: quotas.q2, qm1: quotas.qm1, qm2: quotas.qm2, clePub: kp.publicKey, rowCompte, rowAvatar }
      const ret = await post(this, 'm1', 'creationCompte', args)
      this.BRK()
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

      const cv = new Cv().fromAvatar(avatar)
      store().commit('db/setCvs', [cv])

      // création de la base IDB et chargement des rows compte et avatar
      if (data.mode === 1) {
        this.BRK()
        await data.db.commitRows([compte, avatar, cv])
      }
      data.statut = 4
      affichermessage('Compte créé et connecté', false)
      this.fin()
      remplacePage('Compte')
    } catch (e) {
      data.statut = 0
      this.fin(e)
    }
  }
}

function onExc (e) {
  store().commit('ui/majmodeleactif', false)
  setErreur(e)
}

function onStop () {
  if (data.stopChargt === 1) {
    store.commit('ui/majmodeleactif', false)
    affichermessage('Compte connecté MAIS ses données ne sont pas complètement chargées, incohérences possibles', true)
    return true
  }
  if (data.stopChargt === 2) {
    deconnexion()
    return true
  }
  return false
}

async function lectureCompte (info) {
  // obtention du compte depuis le serveur
  let compte
  try {
    const args = { sessionId: session.sessionId, pcbh: data.ps.pcbh, dpbh: data.ps.dpbh }
    const ret = await post('m1', 'connexionCompte', args, info || 'Connexion au compte')
    // maj du modèle en mémoire
    if (data.dh < ret.dh) data.dh = ret.dh
    // construction de l'objet compte
    ret.rowItems.forEach(item => {
      if (item.table === 'compte') {
        const rowCompte = rowTypes.fromBuffer('compte', item.serial)
        compte = new Compte().fromRow(rowCompte)
      }
    })
    return compte
  } catch (e) {
    // pas de compte authentifié et autres erreurs
    deconnexion()
    return false
  }
}

/**********************************************************
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
    setErreur(new AppExc(-101, 'Serveur non joignable ou arrêté', 'Problème technique, soit de réseau, soit sur le site du serveur'))
    return
  }

  let db = null
  if (store().getters['ui/modesync']) {
    try {
      db = await getIDB()
    } catch (e) {
      // base inaccessible
      setErreur(e)
      deconnexion()
      return
    }
  }

  // obtention du compte depuis le serveur
  let compte = await lectureCompte()
  if (compte === false) return
  store().commit('db/setCompte', compte)

  debutsync(db)
  // eslint-disable-next-line no-unused-vars
  const d = data

  if (db) {
    try {
      await db.commitRows([compte])
      await db.chargementIdb()
    } catch (e) {
      setErreur(e)
      return
    }
  }

  data.idbSetAvatars = data.setAvatars
  data.idbSetGroupes = data.setGroupes
  data.idbsetCvsUtiles = data.setCvsUtiles

  if (db) {
    /* Relecture du compte qui pourrait avoir changé durant le chargment IDB qui peut être long
    Si version postérieure :
    - ré-enregistrement du compte en modèle et IDB
    - suppression des avatars obsolètes non référencés par la nouvelle version du compte, y compris dans la liste des versions
    */
    const compte2 = await lectureCompte('Vérification du compte')
    if (compte2 === false) return
    if (compte2.v > compte.v) {
      compte = compte2
      store().commit('db/setCompte', compte)
      const avInutiles = new Set()
      const avUtiles = data.setAvatars
      for (const id of data.idbSetAvatars) if (!avUtiles.has(id)) avInutiles.add(id)
      if (avInutiles.size) {
        store().commit('db/purgeAvatars', avUtiles)
        for (const id of avInutiles) {
          const sid = crypt.id2s(id)
          delete data.verAv[sid]
        }
      }
      try {
        await db.commitRows([compte])
        if (avInutiles.size) await db.purgeAvatars(avInutiles)
      } catch (e) {
        setErreur(e)
        return
      }
      data.idbSetAvatars = avUtiles
    }
  } else {
    // créer la liste des versions chargées pour les tables des avatars, cad 0 pour toutes
    // cette liste a été créée par chargementIDB dans le mode synchro, mais pas en mode incognito
    data.idbSetAvatars.forEach((id) => {
      data.setVerAv(crypt.id2s(id), AVATAR, 0)
    })
  }
  // état chargé correspondant à l'état local (vide le cas échéant - incognito ou première synchro) - compte OK

  if (onStop()) return
  const grAPurger = new Set()
  // chargement des invitgrs ayant changé depuis l'état local (tous le cas échéant)
  // pour obtenir la liste des groupes accédés
  try {
    const lvav = {}
    data.verAv.forEach((value, key) => {
      lvav[key] = value[AVATAR]
    })
    const ret = await post('m1', 'syncInvitgr', { sessionId: session.sessionId, lvav }, 'Recherche des groupes accédés')
    if (data.dh < ret.dh) data.dh = ret.dh
    // traitement des invitgr reçus
    const maj = []
    ret.rowItems.forEach(item => {
      if (item.table === 'invitgr') {
        const rowInvitgr = rowTypes.fromBuffer('invitgr', item.serial)
        const invitgr = new Invitgr().fromRow(rowInvitgr)
        maj.push(invitgr)
        if (invitgr.st < 0) {
          // Inscrire le groupe en inutile et le supprimer de la liste des groupes à synchroniser
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
    if (maj.length) {
      store.commit('db/setInvitgrs', maj) // maj du modèle
      if (db) db.commitRows(maj) // et de IDB
    }
  } catch (e) {
    return onExc(e)
  }
  data.aboAv = data.setAvatars
  data.aboGr = data.setGroupes
  const lav = Array.from(data.aboAv)
  const lgr = Array.from(data.setGroupes)

  if (onStop()) return

  // Abonner la session au compte, avatars et groupes
  try {
    const ret = await post('m1', 'syncAbo', { sessionId: session.sessionId, idc: compte.id, lav, lgr }, 'Abonnement au compte, avatars et groupes')
    if (data.dh < ret.dh) data.dh = ret.dh
  } catch (e) {
    return onExc(e)
  }

  // synchroniser les avatars
  for (let i = 0; i < lav.length; i++) {
    if (onStop()) return

    let rows
    const id = lav[i]
    const sid = crypt.id2s(id)
    const lv = data.verAv.get(sid) || new Array(SIZEAV).fill(0)
    try {
      const ret = await post('m1', 'syncAv', { sessionId: session.sessionId, avgr: id, lv }, 'Chargement des données de l\'avatar ' + sid)
      if (data.dh < ret.dh) data.dh = ret.dh
      rows = rowItemsToRows(ret.rowItems, true) // stockés en modele
    } catch (e) {
      return onExc(e)
    }
    if (db) {
      const lobj = []
      for (const t in rows) lobj.push(rows[t])
      try {
        await db.commitRows(lobj)
      } catch (e) {
        return onExc(e)
      }
    }
  }

  // synchroniser les groupes
  for (let i = 0; i < lgr.length; i++) {
    if (onStop()) return

    let rows
    const id = lgr[i]
    const sid = crypt.id2s(id)
    const lv = data.verGr.get(sid) || new Array(SIZEGR).fill(0)
    try {
      const ret = await post('m1', 'syncGr', { sessionId: session.sessionId, avgr: id, lv }, 'Chargement des données du groupe ' + sid)
      if (data.dh < ret.dh) data.dh = ret.dh
      rows = rowItemsToRows(ret.rowItems, true) // stockés en modele
    } catch (e) {
      return onExc(e)
    }
    if (db) {
      const lobj = []
      for (const t in rows) lobj.push(rows[t])
      try {
        await db.commitRows(lobj)
      } catch (e) {
        return onExc(e)
      }
    }
  }

  // TODO

  finsync()
  affichermessage('Compte connecté', false)
  remplacePage('Compte')
}
/* connexionCompteAvion ****************************************************/
async function connexionCompteAvion () {
  if (!idbSidCompte()) {
    setErreur(new AppExc(100, 'Compte non enregistré localement', 'Aucune session synchronisée ne s\'est préalablement exécutée sur ce poste avec cette phrase secrète. Erreur dans la saisie de la ligne 1 de la phrase ?'))
    return
  }

  try {
    await getIDB()
    const compte = await db.getCompte()
    if (!compte || compte.pcbh !== data.ps.pcbh) {
      db.close()
      setErreur(new AppExc(101, 'Compte non enregistré localement', 'Aucune session synchronisée ne s\'est préalablement exécutée sur ce poste avec cette phrase secrète. Erreur dans la saisie de la ligne 2 de la phrase ?'))
      return
    }
    store().commit('db/setCompte', compte)
  } catch (e) {
    // base inaccessible ou compte non trouvé
    setErreur(e)
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
