import { store, post, affichermessage, cfg, sleep } from './util'
import {
  deleteIDB, idbSidCompte, commitRows, getCompte, getAvatars, getContacts, getCvs,
  getGroupes, getInvitcts, getInvitgrs, getMembres, getParrains, getRencontres, getSecrets,
  purgeAvatars, purgeCvs, purgeGroupes, openIDB, enregLScompte
} from './db.js'
import { NomAvatar, Compte, Avatar, data, remplacePage, Invitgr, rowItemsToMapObjets, commitMapObjets, SIZEAV, SIZEGR } from './modele'
const AppExc = require('./api').AppExc
const api = require('./api')

const crypt = require('./crypto')
const rowTypes = require('./rowTypes')

export const EXBRK = new AppExc(api.E_BRK, 'Interruption volontaire')
export const EXPS = new AppExc(api.F_BRO, 'La phrase secrète a changé depuis l\'authentification du comptE Déconnexion et reconnexion requise')

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
    this.sessionId = data.sessionId
  }

  EX1 (e) {
    return new AppExc(api.E_BRO, 'Exception inattendue', e.message + '\n' + e.stack)
  }

  BRK () {
    if (data.exIDB && this.idb) throw data.exIDB
    if (data.exNET && this.net) throw data.exNET
    if (this.break || (!this.opsync && data.sessionId !== this.sessionId)) throw EXBRK
  }

  stop () {
    if (this.cancelToken) {
      this.cancelToken.cancel('Operation interrompue par l\'utilisateur.')
      this.cancelToken = null
    }
    this.break = true
  }

  async abonnements (compte) {
    // Abonner / signer la session au compte, avatars et groupes
    // si compte est absent, PAS de signature
    const lav = data.setAvatars
    const lgr = data.setGroupes
    const args = {
      sessionId: data.sessionId,
      idc: compte ? compte.id : '',
      lav: Array.from(lav),
      lgr: Array.from(lgr)
    }
    const ret = await post(this, 'm1', 'syncAbo', args)
    if (data.dh < ret.dh) data.dh = ret.dh
    this.BRK()
    return [lav, lgr]
  }

  async chargerAvGr (lav, lgr, manquants) {
    // synchroniser les avatars
    if (lav && lav.size) {
      lav.forEach(async (id) => {
        const sid = crypt.id2s(id)
        const lv = !manquants && data.verAv.get(sid) ? data.verAv.get(sid) : new Array(SIZEAV).fill(0)
        const ret = await post(this, 'm1', 'syncAv', { sessionId: data.sessionId, avgr: id, lv })
        if (data.dh < ret.dh) data.dh = ret.dh
        const [objets] = commitMapObjets(rowItemsToMapObjets(ret.rowItems)) // stockés en modele
        if (data.db) {
          await data.db.commitRows(objets)
          this.BRK()
        }
      })
    }

    // synchroniser les groupes
    if (lgr && lgr.size) {
      lgr.forEach(async (id) => {
        const sid = crypt.id2s(id)
        const lv = !manquants && data.verGr.get(sid) ? data.verGr.get(sid) : new Array(SIZEGR).fill(0)
        const ret = await post(this, 'm1', 'syncGr', { sessionId: data.sessionId, avgr: id, lv })
        if (data.dh < ret.dh) data.dh = ret.dh
        const [objets] = commitMapObjets(rowItemsToMapObjets(ret.rowItems)) // stockés en modele
        if (data.db) {
          await data.db.commitRows(objets)
          this.BRK()
        }
      })
    }
  }

  // Synchronisation et abonnements des CVs
  async syncCVs (nvvcv) {
    data.setCvsInutiles.forEach((sid) => {
      delete data.repertoire[sid]
    })
    const lcvmaj = Array.from(data.setCvsUtiles)
    const lcvchargt = Array.from(data.setCvsManquantes)
    const args = { sessionId: data.sessionId, vcv: data.vcv, lcvmaj, lcvchargt }
    const ret = await post(this, 'm1', 'chargtCVs', args)
    if (data.dh < ret.dh) data.dh = ret.dh
    const [objets, vcv] = commitMapObjets(rowItemsToMapObjets(ret.rowItems)) // stockés en modele
    if (vcv > nvvcv) nvvcv = vcv
    if (data.db) {
      await data.db.commitRows(objets)
      this.BRK()
    }
    return nvvcv
  }

  async traiteQueue (q, notif) {
    const lavAvant = data.setAvatars
    const lgrAvant = data.setGroupes

    const items = []
    let dhc = 0
    q.forEach((syncList) => {
      if (syncList.dhc > dhc) dhc = syncList.dhc
      if (syncList.rowItems) {
        syncList.rowItems.forEach((rowItem) => {
          const item = rowTypes.deserialItem(rowItem)
          items.push(item)
        })
      }
    })

    const mapObj = data.rowItemsToMapObjets(items)

    let compte = null
    if (mapObj.compte) {
      // Une mise à jour de compte notifiée
      const row = mapObj.compte
      if (row.pcbh !== data.ps.pcbh) throw EXPS // phrase secrète changée => déconnexion
      compte = new Compte().fromRow(row)
      data.setcompte(compte)
    }

    const [objets] = data.commitMapObjets(mapObj)
    if (compte) objets.push(compte)

    if (data.db) {
      await data.db.commitRows(objets)
      this.BRK()
    }

    const lavApres = data.setAvatars
    const lgrApres = data.setGroupes

    // Purge des avatars / groupes inutiles et détection des manquants
    const lavAPurger = new Set()
    const lavManquants = new Set()
    const lgrAPurger = new Set()
    const lgrManquants = new Set()
    lavAvant.forEach((sid) => { if (!lavApres.has(sid)) lavManquants.add(sid) })
    lavApres.forEach((sid) => { if (!lavAvant.has(sid)) lavAPurger.add(sid) })
    lgrAvant.forEach((sid) => { if (!lgrApres.has(sid)) lgrManquants.add(sid) })
    lgrApres.forEach((sid) => { if (!lgrAvant.has(sid)) lgrAPurger.add(sid) })
    if (lavAPurger.size) store().commit('db/purgeAvatars', lavApres)
    if (lgrAPurger.size) store().commit('db/purgeGroupes', lgrApres)
    if (data.db) {
      if (lavAPurger.size) {
        await data.db.purgeAvatars(lavAPurger)
      }
      if (lgrAPurger.size) {
        await data.db.purgeGroupes(lgrAPurger)
      }
      this.BRK()
    }

    const chg = lavAPurger.size || lgrAPurger.size || lavManquants.size || lgrManquants.size
    if (chg) await this.abonnements()

    // Traitements des avatars / groupes manquants
    await this.chargerAvGr(lavManquants, lgrManquants, true)

    // Synchroniser les CVs (et s'abonner)
    const nvvcv = await this.syncCVs(data.vcv)
    if (notif) {
      if (data.vcv < nvvcv) data.vcv = nvvcv
      if (data.db) {
        await data.db.setEtat()
      }
    }
    return [dhc, nvvcv]
  }
}

export class OperationUI extends Operation {
  constructor (nomop, net, idb) {
    super(nomop, net, idb)
    data.opUI = this
    store().commit('ui/majopencours', this)
  }

  fin (e) {
    data.opUI = null
    store().commit('ui/majopencours', null)
    if (!e) {
      affichermessage('Opération "' + this.nom + '" terminée avec succès')
      return
    }
    affichermessage('Opération "' + this.nom + '" interrompue sur erreur', true)
    if (e instanceof AppExc) {
      if (e.code === api.E_DB) {
        data.setErDB(e, true) // affiché (éventuellement) ici
        return
      }
      if (e.code === api.E_WS) {
        data.setErWS(e, true) // affiché (éventuellement) ici
        return
      }
    } else { // toute exception inattendue (pas en AppExc)
      e = new AppExc(api.E_BRO, e.message, e.stack)
    }
    store().commit('ui/majerreur', e) // affichage de l'erreur
    if (e === EXPS) {
      data.deconnexion()
      return
    }
    data.degraderMode()
  }

  /* Chargement de la totalité de la base en mémoire :
  - détermine les avatars et groupes référencés dans les rows de Idb
  - supprime de la base comme de la mémoire les rows / objets inutiles
  - puis récupère les CVs et supprime celles non référencées
  */
  async chargementIdb () {
    data.refsAv = new Set()
    data.refsGr = new Set()

    store().commit('ui/razidblec')
    this.BRK()
    {
      const { objs, vol } = await getAvatars()
      store().commit('db/setAvatars', objs)
      store().commit('ui/majidblec', { table: 'avatar', st: true, vol: vol, nbl: objs.length })
    }

    // chargement des CVs. Au début pour avoir le moins de fake possible dans le répertoire
    this.BRK()
    {
      const { objs, vol } = await getCvs()
      if (objs && objs.length) {
        objs.forEach((cv) => {
          data.repertoire[cv.sid] = cv
        })
      }
      store().commit('ui/majidblec', { table: 'cv', st: true, vol: vol, nbl: objs.length })
    }

    this.BRK()
    {
      const { objs, vol } = await getInvitgrs()
      store().commit('db/setInvitgrs', objs)
      store().commit('ui/majidblec', { table: 'invitgr', st: true, vol: vol, nbl: objs.length })
    }

    this.BRK()
    {
      const { objs, vol } = await getContacts()
      if (objs && objs.length) {
        objs.forEach((c) => {
          const na = new NomAvatar(c.data.nomc)
          data.cvPlusCtc(na, c.id)
        })
      }
      store().commit('db/setContacts', objs)
      store().commit('ui/majidblec', { table: 'invcontactitgr', st: true, vol: vol, nbl: objs.length })
    }

    this.BRK()
    {
      const { objs, vol } = await getInvitcts()
      if (objs && objs.length) {
        objs.forEach((i) => {
          const na = new NomAvatar(i.data.nomc)
          data.cvPlusCtc(na, i.id)
        })
      }
      store().commit('db/setInvitcts', objs)
      store().commit('ui/majidblec', { table: 'invitct', st: true, vol: vol, nbl: objs.length })
    }

    this.BRK()
    {
      const { objs, vol } = await getParrains()
      store().commit('db/setParrains', objs)
      store().commit('ui/majidblec', { table: 'parrain', st: true, vol: vol, nbl: objs.length })
    }

    this.BRK()
    {
      const { objs, vol } = await getRencontres()
      store().commit('db/setRencontres', objs)
      store().commit('ui/majidblec', { table: 'rencontre', st: true, vol: vol, nbl: objs.length })
    }

    this.BRK()
    {
      const { objs, vol } = await getGroupes()
      store().commit('db/setGroupes', objs)
      store().commit('ui/majidblec', { table: 'groupe', st: true, vol: vol, nbl: objs.length })
    }

    this.BRK()
    {
      const { objs, vol } = await getMembres()
      if (objs && objs.length) {
        objs.forEach((m) => {
          const na = new NomAvatar(m.data.nomc)
          data.cvPlusMbr(na, m.id)
        })
      }
      store().commit('db/setMembres', objs)
      store().commit('ui/majidblec', { table: 'membre', st: true, vol: vol, nbl: objs.length })
    }

    this.BRK()
    {
      const { objs, vol } = await getSecrets()
      store().commit('db/setSecrets', objs)
      store().commit('ui/majidblec', { table: 'secret', st: true, vol: vol, nbl: objs.length })
    }

    // purge des avatars inutiles
    this.BRK()
    {
      const avInutiles = new Set()
      const avUtiles = new Set(data.setAvatars)
      for (const id of data.refsAv) if (!avUtiles.has(id)) avInutiles.add(id)
      const nbp = await purgeAvatars(avInutiles)
      store().commit('db/purgeAvatars', avUtiles)
      store().commit('ui/majidblec', { table: 'purgeav', st: true, vol: 0, nbl: nbp })
    }

    // purge des groupes inutiles
    this.BRK()
    {
      const grInutiles = new Set()
      const grUtiles = new Set(data.setGroupes)
      for (const id of data.refsGr) if (!grUtiles.has(id)) grInutiles.add(id)
      const nbp = await purgeGroupes(grInutiles)
      store().commit('db/purgeGroupes', grUtiles)
      store().commit('ui/majidblec', { table: 'purgegr', st: true, vol: 0, nbl: nbp })
    }

    // purge des CVs inutiles
    this.BRK()
    {
      const nbp = await purgeCvs(data.setCvInutiles)
      data.setCvsInutiles.forEach((sid) => {
        delete data.repertoire[sid]
      })
      data.commitRepertoire()
      store().commit('ui/majidblec', { table: 'purgecv', st: true, vol: 0, nbl: nbp })
    }

    data.refsAv = null
    data.refsGr = null

    if (cfg().debug) await sleep(1000)

    this.BRK()
  }
}

export class OperationWS extends Operation {
  constructor (nomop) {
    super(nomop, OUI, SELONMODE)
    data.opWS = this
  }

  fin (e) {
    data.opWS = null
    if (!e) return
    let aff = false
    if (e instanceof AppExc) {
      if (e.code === api.E_DB) {
        data.setErDB(e, true) // affiché (éventuelement) ici
        aff = true
      }
      if (e.code === api.E_WS) {
        data.setErWS(e, true) // affiché (éventuelement) ici
        aff = true
      }
      if (e === EXBRK) aff = true
    } else { // toute exception inattendue (pas en AppExc)
      e = new AppExc(api.E_BRO, e.message, e.stack)
    }
    if (!aff) store().commit('ui/majerreur', e) // affichage de l'erreur
    if (e === EXPS) {
      data.deconnexion()
      return
    }
    data.degraderMode()
  }
}

export class ProcessQueue extends OperationWS {
  constructor () {
    super('Traitement des notifications de synchronisation')
  }

  async run (q) {
    try {
      const [dhc, nvvcv] = await this.traiteQueue(q)
      if (data.dh < dhc) data.dh = dhc
      if (data.vcv < nvvcv) data.vcv = nvvcv
      if (data.db) {
        await data.db.setEtat()
      }
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
      // eslint-disable-next-line no-unused-vars
      const d = data
      data.ps = ps

      await data.connexion(true) // On force A NE PAS OUVRIR IDB (compte pas encore connu)

      this.BRK()
      const kp = await crypt.genKeyPair()
      const nomAvatar = new NomAvatar(nom, true) // nouveau
      const compte = new Compte().nouveau(nomAvatar, kp.privateKey)
      const rowCompte = compte.toRow
      data.setcompte(compte)
      const avatar = new Avatar().nouveau(nomAvatar)
      const rowAvatar = avatar.toRow

      const args = { sessionId: data.sessionId, mdp64: mdp.mdp64, q1: quotas.q1, q2: quotas.q2, qm1: quotas.qm1, qm2: quotas.qm2, clePub: kp.publicKey, rowCompte, rowAvatar }
      const ret = await post(this, 'm1', 'creationCompte', args)
      // maj du modèle en mémoire
      if (data.dh < ret.dh) data.dh = ret.dh
      /*
      Le compte vient d'être créé et est déjà dans le modèle (clek enregistrée)
      On peut désérialiser la liste d'items (compte et avatar)
      */
      const rows = commitMapObjets(rowItemsToMapObjets(ret.rowItems))
      const compte2 = rows.compte[0]
      const avatar2 = rows.avatar[0]

      // création de la base IDB et chargement des rows compte et avatar
      if (data.mode === 1) { // synchronisé : il faut ouvrir IDB
        this.BRK()
        enregLScompte(compte2.sid)
        await deleteIDB()
        try {
          await openIDB()
        } catch (e) {
          await deleteIDB(true)
          throw e
        }
        await commitRows([compte2, avatar2])
      }

      data.statut = 2
      this.fin()
      remplacePage('Compte')
    } catch (e) {
      this.fin(e)
      if (data.statut === 0) data.deconnexion()
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

      if (data.db) {
        await data.db.getEtat()
      }

      const compte = await getCompte()
      if (!compte || compte.pcbh !== data.ps.pcbh) {
        throw new AppExc(api.F_BRO, 'Compte non enregistré localement : aucune session synchronisée ne s\'est préalablement exécutée sur ce poste avec cette phrase secrète. Erreur dans la saisie de la ligne 2 de la phrase ?')
      }
      data.setcompte(compte)

      await this.chargementIdb()

      data.statut = 2
      this.fin()
      remplacePage('Compte')
    } catch (e) {
      this.fin(e)
      if (data.statut === 0) data.deconnexion()
    }
  }
}

/* Connexion à un compte par sa phrase secrète (synchronisé et incognito) **/
export class ConnexionCompte extends OperationUI {
  constructor () {
    super('Connexion à un compte', OUI, SELONMODE)
    this.opsync = true
  }

  async lectureCompte () {
    // obtention du compte depuis le serveur
    const args = { sessionId: data.sessionId, pcbh: data.ps.pcbh, dpbh: data.ps.dpbh }
    const ret = await post(this, 'm1', 'connexionCompte', args)
    // maj du modèle en mémoire
    if (data.dh < ret.dh) data.dh = ret.dh
    // construction de l'objet compte
    const rowCompte = rowTypes.fromBuffer('compte', ret.rowItems[0].serial)
    if (data.ps.pcbh !== rowCompte.pcbh) throw EXPS // changt de phrase secrète
    return new Compte().fromRow(rowCompte)
  }

  async run (ps) {
    try {
      // eslint-disable-next-line no-unused-vars
      const d = data

      data.ps = ps
      await data.connexion()
      this.BRK()

      // obtention du compte depuis le serveur
      let compte = await this.lectureCompte()
      data.setcompte(compte)

      if (data.db) {
        enregLScompte(compte.sid) // La phrase secrète a pu changer : celle du serveur est installée
        await data.db.commitRows([compte])
        this.BRK()
        await data.db.chargementIdb()
      }

      data.idbSetAvatars = data.setAvatars
      data.idbSetGroupes = data.setGroupes
      data.idbsetCvsUtiles = data.setCvsUtiles

      if (data.db) {
        /* Relecture du compte qui pourrait avoir changé durant le chargement IDB qui peut être long
        Si version postérieure :
        - ré-enregistrement du compte en modèle et IDB
        - suppression des avatars obsolètes non référencés par la nouvelle version du compte, y compris dans la liste des versions
        */
        const compte2 = await this.lectureCompte() // PEUT sortir en EXPS si changement de phrase secrète
        if (compte2.v > compte.v) {
          compte = compte2
          data.setcompte(compte2)
          const avInutiles = new Set()
          const avUtiles = data.setAvatars
          for (const id of data.idbSetAvatars) if (!avUtiles.has(id)) avInutiles.add(id)
          if (avInutiles.size) {
            store().commit('db/purgeAvatars', avUtiles)
            for (const id of avInutiles) {
              const sid = crypt.id2s(id)
              delete data.verAv[sid]
            }
            await data.db.purgeAvatars(avInutiles)
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
          data.setVerAv(crypt.id2s(id), api.AVATAR, 0)
        })
      }

      // état chargé correspondant à l'état local (vide le cas échéant - incognito ou première synchro) - compte OK
      data.statut = 1

      {
        const grAPurger = new Set()
        // chargement des invitgrs ayant changé depuis l'état local (tous le cas échéant)
        // pour obtenir la liste des groupes accédés
        const lvav = {}
        data.verAv.forEach((lv, sid) => { lvav[sid] = lv[api.AVATAR] })
        const ret = await post(this, 'm1', 'syncInvitgr', { sessionId: data.sessionId, lvav })
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
                data.setVerGr(invitgr.sidg, api.GROUPE, 0)
              }
            }
          }
        })
        if (grAPurger.size) {
          store().commit('db/purgeGroupes', grAPurger)
          if (data.db) {
            await data.db.purgeGroupes(grAPurger)
          }
        }
        if (maj.length) {
          store.commit('db/setInvitgrs', maj) // maj du modèle
          if (data.db) {
            await data.db.commitRows(maj) // et de IDB
            this.BRK()
          }
        }
      }

      const [lav, lgr] = await this.abonnements(compte)

      // Synchroiser avatars et groupes
      await this.chargerAvGr(lav, lgr)

      // Synchroniser les CVs (et s'abonner)
      let nvvcv = await this.syncCVs(data.vcv)

      // Traiter les notifications éventuellement arrivées
      while (data.syncqueue.length) {
        const q = data.syncqueue
        data.syncqueue = []
        const [dhc, vcv] = await this.traiteQueue(q)
        if (dhc > data.dh) data.dh = dhc
        if (vcv > nvvcv) nvvcv = vcv
      }

      // Enregistrer l'état de synchro (nvdhc et nvvcv)
      // { dhsyncok: data.dhsyncok, dhdebutsync: data.dhdebutsync, vcv: data.vcv }
      if (data.dh > data.dhsyncok) data.dhsyncok = data.dh
      data.dhdebutsync = 0
      if (data.vcv < nvvcv) data.vcv = nvvcv
      if (data.db) {
        await data.db.setEtat()
      }

      data.statut = 2
      this.fin()
      remplacePage('Compte')
    } catch (e) {
      this.fin(e)
      if (data.statut === 0) data.deconnexion()
    }
  }
}
