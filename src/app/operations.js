import { store, post, affichermessage, cfg, sleep } from './util'
import {
  deleteIDB, AVATAR, GROUPE, idbSidCompte, commitRows, getCompte, getAvatars, getContacts, getCvs,
  getGroupes, getInvitcts, getInvitgrs, getMembres, getParrains, getRencontres, getSecrets,
  purgeAvatars, purgeCvs, purgeGroupes
} from './db.js'
import { NomAvatar, Compte, Avatar, data, Cv, rowItemsToRows, remplacePage, Invitgr, SIZEAV, SIZEGR } from './modele'
const AppExc = require('./api').AppExc
const api = require('./api')

const crypt = require('./crypto')
const rowTypes = require('./rowTypes')

export const EXBRK = new AppExc(api.E_BRK, 'Interruption volontaire')
const OUI = 1
const NON = 0
const SELONMODE = 2

export class Operation {
  constructor (nomop, net, idb) {
    this.nom = nomop
    this.net = net === OUI ? true : (net === NON ? false : (data.mode === 1 || data.mode === 2))
    this.idb = idb === OUI ? true : (idb === NON ? false : (data.mode === 1 || data.mode === 3))
    this.cancelToken = null
    this.break = false
    store().commit('ui/majopencours', this)
  }

  EX1 (e) {
    return new AppExc(api.E_BRO, 'Exception inattendue : ' + e.message, e.stack)
  }

  BRK () {
    if (data.exIDB && this.idb) throw data.exIDB
    if (data.exNET && this.net) throw data.exNET
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
    if (this instanceof OperationUI) data.opUI = null; else data.opWS = null
    store().commit('ui/majopencours', null)
    if (!e) {
      if (this instanceof OperationUI) affichermessage('Opération "' + this.nom + '" terminée avec succès')
      return
    }
    if (this instanceof OperationUI) affichermessage('Opération "' + this.nom + '" interrompue sur erreur', true)
    if (e instanceof AppExc) {
      if (e.code === api.E_DB) {
        data.setErDB(e, true) // affiché (éventuelement) ici
        return
      }
      if (e.code === api.E_WS) {
        data.setErWS(e, true) // affiché (éventuelement) ici
        return
      }
    } else { // toute exception inattendu (pas en AppExc)
      e = new AppExc(api.E_BRO, e.message, e.stack)
    }
    store().commit('ui/majerreur', e) // affichage de l'erreur
    data.degraderMode()
  }

  /* Chargement de la totalité de la base en mémoire :
  - détermine les avatars et groupes référencés dans les rows de Idb
  - supprime de la base comme de la mémoire les rows / objets inutiles
  - puis récupère les CVs et supprime celles non référencées
  */
  async chargementIdb () {
    let objs, vol, t, nbp

    data.refsAv = new Set()
    data.refsGr = new Set()
    data.refsCv = new Set()
    data.enregCvs = new Set()

    store().commit('ui/razidblec')
    this.BRK()
    t = true; ({ objs, vol } = await getAvatars())
    store().commit('db/setAvatars', objs)
    store().commit('ui/majidblec', { table: 'avatar', st: t, vol: vol, nbl: objs.length })

    this.BRK()
    t = true; ({ objs, vol } = await getInvitgrs())
    store().commit('db/setInvitgrs', objs)
    store().commit('ui/majidblec', { table: 'invitgr', st: t, vol: vol, nbl: objs.length })

    this.BRK()
    t = true; ({ objs, vol } = await getContacts())
    store().commit('db/setContacts', objs)
    store().commit('ui/majidblec', { table: 'invcontactitgr', st: t, vol: vol, nbl: objs.length })

    this.BRK()
    t = true; ({ objs, vol } = await getInvitcts())
    store().commit('db/setInvitcts', objs)
    store().commit('ui/majidblec', { table: 'invitct', st: t, vol: vol, nbl: objs.length })

    this.BRK()
    t = true; ({ objs, vol } = await getParrains())
    store().commit('db/setParrains', objs)
    store().commit('ui/majidblec', { table: 'parrain', st: t, vol: vol, nbl: objs.length })

    this.BRK()
    t = true; ({ objs, vol } = await getRencontres())
    store().commit('db/setRencontres', objs)
    store().commit('ui/majidblec', { table: 'rencontre', st: t, vol: vol, nbl: objs.length })

    this.BRK()
    t = true; ({ objs, vol } = await getGroupes())
    store().commit('db/setGroupes', objs)
    store().commit('ui/majidblec', { table: 'groupe', st: t, vol: vol, nbl: objs.length })

    this.BRK()
    t = true; ({ objs, vol } = await getMembres())
    store().commit('db/setMembres', objs)
    store().commit('ui/majidblec', { table: 'membre', st: t, vol: vol, nbl: objs.length })

    this.BRK()
    t = true; ({ objs, vol } = await getSecrets())
    store().commit('db/setSecrets', objs)
    store().commit('ui/majidblec', { table: 'secret', st: t, vol: vol, nbl: objs.length })

    // purge des avatars inutiles
    this.BRK()
    const avInutiles = new Set()
    const avUtiles = new Set(data.setAvatars)
    for (const id of data.refsAv) if (!avUtiles.has(id)) avInutiles.add(id)
    nbp = await purgeAvatars(avInutiles)
    store().commit('db/purgeAvatars', avUtiles)
    store().commit('ui/majidblec', { table: 'purgeav', st: t, vol: 0, nbl: nbp })

    // purge des groupes inutiles
    this.BRK()
    const grInutiles = new Set()
    const grUtiles = new Set(data.setGroupes)
    for (const id of data.refsGr) if (!grUtiles.has(id)) grInutiles.add(id)
    nbp = await purgeGroupes(grInutiles)
    store().commit('db/purgeGroupes', grUtiles)
    store().commit('ui/majidblec', { table: 'purgegr', st: t, vol: 0, nbl: nbp })

    // chargement des CVs
    this.BRK()
    t = true; ({ objs, vol } = await getCvs())
    store().commit('db/setCvs', objs)
    store().commit('ui/majidblec', { table: 'cv', st: t, vol: vol, nbl: objs.length })

    // purge des CVs inutiles
    this.BRK()
    const cvInutiles = new Set()
    const cvUtiles = new Set(data.setCvUtiles)
    for (const id of data.enregCvs) if (!cvUtiles.has(id)) cvInutiles.add(id)
    nbp = await purgeCvs(cvInutiles)
    store().commit('db/purgeCvs', cvUtiles)
    store().commit('ui/majidblec', { table: 'purgecv', st: t, vol: 0, nbl: nbp })

    data.refsAv = null
    data.refsGr = null
    data.refsCv = null
    data.enregCvs = null

    if (cfg().debug) await sleep(1000)

    this.BRK()
  }

  async lectureCompte () {
    // obtention du compte depuis le serveur
    let compte
    const args = { sessionId: data.sessionId, pcbh: data.ps.pcbh, dpbh: data.ps.dpbh }
    const ret = await post(this, 'm1', 'connexionCompte', args)
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
  }
}

export class OperationUI extends Operation {
  constructor (nomop, net, idb) {
    super(nomop, net, idb)
    data.opUI = this
  }
}

export class OperationWS extends Operation {
  constructor (nomop) {
    super(nomop, OUI, SELONMODE)
    data.opWS = this
  }
}

export class ProcessQueue extends OperationWS {
  constructor () {
    super('Traitement des notifications de synchronisation')
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
  constructor () {
    super('Création de compte', OUI, SELONMODE)
    this.opsync = true
  }

  async run (mdp, ps, nom, quotas) {
    try {
      data.ps = ps
      if (data.mode === 1) {
        deleteIDB()
      }
      await data.connexion()

      this.BRK()
      const kp = await crypt.genKeyPair()
      const nomAvatar = new NomAvatar(nom, true) // nouveau
      let compte = new Compte().nouveau(nomAvatar, kp.privateKey)
      const rowCompte = compte.toRow
      store().commit('db/setCompte', compte)
      let avatar = new Avatar().nouveau(nomAvatar)
      const rowAvatar = avatar.toRow

      const args = { sessionId: data.sessionId, mdp64: mdp.mdp64, q1: quotas.q1, q2: quotas.q2, qm1: quotas.qm1, qm2: quotas.qm2, clePub: kp.publicKey, rowCompte, rowAvatar }
      const ret = await post(this, 'm1', 'creationCompte', args)
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
      if (data.db) {
        this.BRK()
        await commitRows([compte, avatar, cv])
      }
      data.statut = 2
      this.fin()
      remplacePage('Compte')
    } catch (e) {
      this.fin(e)
    }
  }
}

/* connexionCompteAvion ****************************************************/
export class ConnexionCompteAvion extends OperationUI {
  constructor () {
    super('Connexion à un compte en mode avion', NON, OUI)
    this.opsync = true
  }

  async run (ps) {
    try {
      data.ps = ps
      if (!idbSidCompte()) {
        throw new AppExc(api.F_BRO, 'Compte non enregistré localement : aucune session synchronisée ne s\'est préalablement exécutée sur ce poste avec cette phrase secrète. Erreur dans la saisie de la ligne 1 de la phrase ?')
      }
      await data.connexion()
      this.BRK()

      const compte = await getCompte()
      if (!compte || compte.pcbh !== data.ps.pcbh) {
        throw new AppExc(api.F_BRO, 'Compte non enregistré localement : aucune session synchronisée ne s\'est préalablement exécutée sur ce poste avec cette phrase secrète. Erreur dans la saisie de la ligne 2 de la phrase ?')
      }
      store().commit('db/setCompte', compte)

      await this.chargementIdb()

      data.statut = 2
      this.fin()
      remplacePage('Compte')
    } catch (e) {
      this.fin(e)
    }
  }
}

/* Connexion à un compte par sa phrase secrète ********************************/
export class ConnexionCompte extends OperationUI {
  constructor () {
    super('Connexion à un compte', OUI, SELONMODE)
    this.opsync = true
  }

  async run (ps) {
    try {
      data.ps = ps
      await data.connexion()
      this.BRK()

      // obtention du compte depuis le serveur
      let compte = await this.lectureCompte()
      store().commit('db/setCompte', compte)

      if (data.db) {
        await data.db.commitRows([compte])
        this.BRK()
        await data.db.chargementIdb()
      }

      data.idbSetAvatars = data.setAvatars
      data.idbSetGroupes = data.setGroupes
      data.idbsetCvsUtiles = data.setCvsUtiles

      if (data.db) {
        /* Relecture du compte qui pourrait avoir changé durant le chargment IDB qui peut être long
        Si version postérieure :
        - ré-enregistrement du compte en modèle et IDB
        - suppression des avatars obsolètes non référencés par la nouvelle version du compte, y compris dans la liste des versions
        */
        const compte2 = await this.lectureCompte()
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
          this.BRK()
          await data.db.commitRows([compte])
          this.BRK()
          if (avInutiles.size) await data.db.purgeAvatars(avInutiles)
          this.BRK()
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
      data.statut = 1

      const grAPurger = new Set()
      // chargement des invitgrs ayant changé depuis l'état local (tous le cas échéant)
      // pour obtenir la liste des groupes accédés
      const lvav = {}
      data.verAv.forEach((value, key) => {
        lvav[key] = value[AVATAR]
      })
      let ret = await post(this, 'm1', 'syncInvitgr', { sessionId: data.sessionId, lvav })
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
        if (data.db) {
          await data.db.commitRows(maj) // et de IDB
          this.BRK()
        }
      }

      data.aboAv = data.setAvatars
      data.aboGr = data.setGroupes
      const lav = Array.from(data.aboAv)
      const lgr = Array.from(data.setGroupes)

      // Abonner la session au compte, avatars et groupes
      ret = await post(this, 'm1', 'syncAbo', { sessionId: data.sessionId, idc: compte.id, lav, lgr })
      if (data.dh < ret.dh) data.dh = ret.dh

      // synchroniser les avatars
      for (let i = 0; i < lav.length; i++) {
        const id = lav[i]
        const sid = crypt.id2s(id)
        const lv = data.verAv.get(sid) || new Array(SIZEAV).fill(0)
        const ret = await post(this, 'm1', 'syncAv', { sessionId: data.sessionId, avgr: id, lv })
        if (data.dh < ret.dh) data.dh = ret.dh
        const rows = rowItemsToRows(ret.rowItems, true) // stockés en modele
        if (data.db) {
          const lobj = []
          for (const t in rows) lobj.push(rows[t])
          await data.db.commitRows(lobj)
          this.BRK()
        }
      }

      // synchroniser les groupes
      for (let i = 0; i < lgr.length; i++) {
        const id = lgr[i]
        const sid = crypt.id2s(id)
        const lv = data.verGr.get(sid) || new Array(SIZEGR).fill(0)
        const ret = await post(this, 'm1', 'syncGr', { sessionId: data.sessionId, avgr: id, lv })
        if (data.dh < ret.dh) data.dh = ret.dh
        const rows = rowItemsToRows(ret.rowItems, true) // stockés en modele
        if (data.db) {
          const lobj = []
          for (const t in rows) lobj.push(rows[t])
          await data.db.commitRows(lobj)
        }
      }

      // TODO

      data.statut = 2
      this.fin()
      remplacePage('Compte')
    } catch (e) {
      this.fin(e)
    }
  }
}
