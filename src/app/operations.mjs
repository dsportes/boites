import { NomAvatar, store, post, affichermessage, cfg, sleep, affichererreur, appexc, difference } from './util.mjs'
import { remplacePage } from './page.mjs'
import {
  deleteIDB, idbSidCompte, commitRows, getCompte, getPrefs, getAvatars, getContacts, getCvs,
  getGroupes, getInvitcts, getInvitgrs, getMembres, getParrains, getRencontres, getSecrets,
  purgeAvatars, purgeCvs, purgeGroupes, openIDB, enregLScompte, setEtat, getEtat
} from './db.mjs'
import { Compte, Avatar, newObjet, commitMapObjets, data, SIZEAV, SIZEGR, Prefs } from './modele.mjs'
import { AppExc, EXBRK, EXPS, F_BRO, INDEXT, X_SRV } from './api.mjs'

import { crypt } from './crypto.mjs'
import { schemas } from './schemas.mjs'

const OUI = 1
const NON = 0
const SELONMODE = 2

export function deconnexion () { data.deconnexion() }

export function reconnexion () {
  const ps = data.ps
  data.deconnexion(true)
  data.mode = data.modeInitial
  if (data.mode === 3) {
    new ConnexionCompteAvion().run(ps)
  } else {
    new ConnexionCompte().run(ps)
  }
}

export class Operation {
  constructor (nomop, net, idb) {
    this.nom = nomop
    this.net = net === OUI ? true : (net === NON ? false : (data.mode === 1 || data.mode === 2))
    this.idb = idb === OUI ? true : (idb === NON ? false : (data.mode === 1 || data.mode === 3))
    this.cancelToken = null
    this.break = false
    this.sessionId = data.sessionId
  }

  ouvrircreationcompte () { store().commit('ui/majdialoguecreationcompte', true) }

  majopencours (op) { store().commit('ui/majopencours', op) }

  razidblec () { store().commit('ui/razidblec') }

  majidblec (obj) { store().commit('ui/majidblec', obj) }

  majsynclec (obj) { store().commit('ui/majsynclec', obj) }

  excActions () { return { d: deconnexion, r: reconnexion, default: null } }

  excAffichage1 () {
    const options1 = [
      { code: 'c', label: 'Continuer malgré la dégradation du mode', color: 'warning' },
      { code: 'd', label: 'Se déconnecter, retourner au login', color: 'primary' },
      { code: 'r', label: 'Essayer de se reconnecter', color: 'primary' }
    ]
    const options2 = [
      { code: 'c', label: 'Continuer malgré l\'erreur', color: 'warning' },
      { code: 'd', label: 'Se déconnecter, retourner au login', color: 'primary' },
      { code: 'r', label: 'Essayer de se reconnecter', color: 'primary' }
    ]
    if (this.appexc.idb || this.appexc.net || this.appexc === EXBRK) {
      const conseil = data.degraderMode()
      const options = conseil ? options1 : options2
      return [options, conseil]
    }
  }

  excAffichage2 () {
    const options = [
      { code: 'c', label: 'Corriger les données saisies', color: 'primary' },
      { code: 'd', label: 'Se déconnecter, retourner au login', color: 'primary' }
    ]
    if (this.appexc.code === X_SRV) {
      return [options, null]
    }
  }

  excAffichage1f () {
    const options = [
      { code: 'd', label: 'Retourner au login', color: 'primary' },
      { code: 'r', label: 'Essayer de  reconnecter le compte', color: 'primary' }
    ]
    return [options, null]
  }

  messageOK () { affichermessage('Succès de l\'opération "' + this.nom + '"') }

  messageKO () {
    if (data.statut === 0) {
      affichermessage('Échec de l\'opération "' + this.nom + '"', true)
    } else {
      affichermessage('Succès partiel de l\'opération "' + this.nom + '"', true)
    }
  }

  finOK (res) {
    if (this instanceof OperationUI) {
      data.opUI = null
      this.majopencours(null)
      this.messageOK()
    } else {
      data.opWS = null
    }
    return [true, res]
  }

  async finKO (exc) {
    this.appexc = appexc(exc)
    if (this instanceof OperationUI) {
      data.opUI = null
      this.majopencours(null)
      this.messageKO()
    } else {
      data.opWS = null
    }
    const la = this.excAffichages()
    let choix
    for (let i = 0; i < la.length; i++) {
      const a = la[i]
      const oc = a.call(this)
      if (oc) {
        choix = await affichererreur(this.appexc, oc[0], oc[1])
        break
      }
    }
    const mac = this.excActions()
    const ac = mac[choix]
    if (ac) {
      ac.call(this)
    } else {
      if (mac.default) mac.default.call(this)
    }
    return [false, this.appexc]
  }

  BRK () { if (this.break) throw EXBRK }

  stop () {
    if (this.cancelToken) {
      this.cancelToken.cancel('Operation interrompue par l\'utilisateur.')
      this.cancelToken = null
    }
    this.break = true
  }

  /*
  Retourne une map avec une entrée pour chaque table et en valeur,
  - pour compte : LE DERNIER objet reçu, pas la liste historique
  - pour les autres, l'array des objets
  */
  async rowItemsToMapObjets (rowItems) {
    const res = {}
    for (let i = 0; i < rowItems.length; i++) {
      const item = rowItems[i]
      const row = schemas.deserialize('row' + item.table, item.serial)
      if (item.table === 'compte') {
        // le dernier quand on en a reçu plusieurs et non la liste
        if (row.pcbh !== data.ps.pcbh) throw EXPS // phrase secrète changée => déconnexion
        const obj = new Compte()
        res.compte = await obj.fromRow(row)
      } else if (item.table === 'prefs') {
        // le dernier quand on en a reçu plusieurs et non la liste
        const obj = new Prefs()
        res.prefs = await obj.fromRow(row)
      } else {
        if (!res[item.table]) res[item.table] = []
        const obj = newObjet(item.table)
        await obj.fromRow(row)
        res[item.table].push(obj)
      }
    }
    return res
  }

  async abonnements (avUtiles, grUtiles, nosign) {
    // Abonner / (signer sauf si nosign) la session au compte, avatars et groupes
    const compte = data.getCompte()
    const args = {
      sessionId: data.sessionId,
      idc: compte.id,
      lav: Array.from(avUtiles),
      lgr: Array.from(grUtiles),
      sign: !nosign
    }
    const ret = await post(this, 'm1', 'syncAbo', args)
    if (data.dh < ret.dh) data.dh = ret.dh
    this.BRK()
  }

  /* Recharge depuis le serveur les avatars du compte */
  async chargerAvatars (avUtiles, tous) {
    // idsVers : map de clé:id de l'avatar, valeur: version détenue en session
    const idsVers = { }
    for (const id of avUtiles) idsVers[id] = tous ? 0 : data.vag.getVerAv(id)[INDEXT.AVATAR]
    const ret = await post(this, 'm1', 'chargerAv', { sessionId: data.sessionId, idsVers })
    if (data.dh < ret.dh) data.dh = ret.dh
    const objets = []
    for (const id of avUtiles) data.vag.setVerAv(id, INDEXT.AVATAR, -1)
    commitMapObjets(objets, await this.rowItemsToMapObjets(ret.rowItems)) // stockés en modele
    if (data.db) {
      await commitRows(objets)
      this.BRK()
    }
  }

  /* Recharge depuis le serveur un avatar et ses rows associées (contact ... secret) */
  async chargerAv (id, tous) { // lav : set des avatars utiles
    const lv = tous ? new Array(SIZEAV).fill(0) : data.vag.getVerAv(id)
    const ret = await post(this, 'm1', 'syncAv', { sessionId: data.sessionId, avgr: id, lv })
    if (data.dh < ret.dh) data.dh = ret.dh
    const objets = []
    commitMapObjets(objets, await this.rowItemsToMapObjets(ret.rowItems)) // stockés en modele
    if (data.db) {
      await commitRows(objets)
      this.BRK()
    }
  }

  /* Recharge depuis le serveur les groupes et les tables associées (membres, secrets) */
  async chargerGr (id, tous) { // lgr : set des groupes utiles
    const sid = crypt.idToSid(id)
    const lv = tous ? new Array(SIZEGR).fill(0) : data.getVerGr(sid)
    const ret = await post(this, 'm1', 'syncGr', { sessionId: data.sessionId, avgr: id, lv })
    if (data.dh < ret.dh) data.dh = ret.dh
    const objets = []
    commitMapObjets(objets, await this.rowItemsToMapObjets(ret.rowItems)) // stockés en modele
    if (data.db) {
      await commitRows(objets)
      this.BRK()
    }
  }

  /* Synchronisation et abonnements des CVs */
  async syncCVs (nvvcv) {
    data.repertoire.purge()
    data.repertoire.commit()
    const lcvmaj = Array.from(data.repertoire.setCvsUtiles)
    const lcvchargt = Array.from(data.repertoire.setCvsManquantes)
    const args = { sessionId: data.sessionId, vcv: data.vcv, lcvmaj, lcvchargt }
    const ret = await post(this, 'm1', 'chargtCVs', args)
    if (data.dh < ret.dh) data.dh = ret.dh
    const objets = []
    const vcv = commitMapObjets(objets, await this.rowItemsToMapObjets(ret.rowItems)) // stockés en modele
    if (vcv > nvvcv) nvvcv = vcv
    if (data.db) {
      await commitRows(objets)
      this.BRK()
    }
    return [nvvcv, objets.length]
  }

  async traiteQueue (q) {
    const lavAvant = data.setIdsAvatarsUtiles
    const lgrAvant = data.setIdsGroupesUtiles

    const items = [] // tous les items à traiter reçus en synchro
    let dhc = 0 // date-heure courante : plus haute date-heure reçue sur les liste d'items à synchroniser

    q.forEach((syncList) => {
      if (syncList.dh > dhc) dhc = syncList.dh
      if (syncList.rowItems) {
        syncList.rowItems.forEach((rowItem) => {
          items.push(rowItem)
        })
      }
    })

    /* Transforme tous les items en objet (décryptés / désrialisés)
    - les retourne ventilés dans une map par table
    */
    const mapObj = await this.rowItemsToMapObjets(items)
    const objets = [] // Tous les objets à enregistrer dans IDB

    /* Traitement spécial de compte et prefs */
    if (mapObj.compte) {
      // Une mise à jour de compte est notifiée
      data.setCompte(mapObj.compte)
      objets.push(mapObj.compte)
    }
    if (mapObj.prefs) {
      // Une mise à jour de prefs est notifiée
      data.setPrefs(mapObj.prefs)
      objets.push(mapObj.prefs)
    }

    /* Mise en store de tous les autres objets */
    const vcv = commitMapObjets(objets, mapObj)

    if (data.db) {
      await commitRows(objets)
      this.BRK()
    }

    /*
    MAIS il y a :
    - des avatars du compte devenus inutiles (supprimés)
    - des groupes devenus inutiles (disparus / accès résiliés)
    - de nouveaux avatars du compte (utiles)
    - de nouveaux groupes utiles ET DONT IL FAUT CHARGER LES MEMBRES et leurs CV
    */

    const lavApres = data.setIdsAvatarsUtiles
    const lgrApres = data.setIdsGroupesUtiles

    // Purge des avatars / groupes inutiles et détection des manquants
    const lavAPurger = difference(lavAvant, lavApres)
    const lavManquants = difference(lavApres, lavAvant)
    const lgrAPurger = difference(lgrAvant, lgrApres)
    const lgrManquants = difference(lgrApres, lgrAvant)
    if (lavAPurger.size) data.purgeAvatars(lavAPurger)
    if (lgrAPurger.size) data.purgeGroupes(lgrAPurger)
    if (data.db) {
      if (lavAPurger.size) await data.db.purgeAvatars(lavAPurger)
      if (lgrAPurger.size) await data.db.purgeGroupes(lgrAPurger)
      this.BRK()
    }

    const chg = lavAPurger.size || lgrAPurger.size || lavManquants.size || lgrManquants.size
    if (chg) await this.abonnements(lavApres, lgrApres, true)

    // Chargement depuis le serveur des avatars manquants
    if (lavManquants.size) {
      for (const idav of lavManquants) {
        await this.chargerAv(idav, true) // tous, puisque manquants
      }
    }

    // Chargement depuis le serveur des groupes manquants
    if (lgrManquants.size) {
      for (const idgr of lgrManquants) {
        await this.chargerGr(idgr, true) // tous en incognito)
      }
    }

    // Synchroniser les CVs (et s'abonner)
    const [nvvcv] = await this.syncCVs(vcv)
    if (data.vcv < nvvcv) data.vcv = nvvcv

    return [dhc, nvvcv]
  }
}

/* ********************************************************* */
export class OperationUI extends Operation {
  constructor (nomop, net, idb) {
    super(nomop, net, idb)
    data.opUI = this
    this.majopencours(this)
  }

  excActionc () {
    remplacePage('Compte')
  }

  excActionx () {
    deconnexion()
    setTimeout(() => {
      this.ouvrircreationcompte()
    }, 100)
  }

  excAffichage1c () {
    const options = [
      { code: 'c', label: 'Continuer malgré la dégradation du mode', color: 'warning' },
      { code: 'd', label: 'Se déconnecter et retourner au login', color: 'primary' },
      { code: 'r', label: 'Essayer de se reconnecter', color: 'primary' }
    ]
    if (this.appexc.idb || this.appexc.net || this.appexc === EXBRK) {
      const conseil = data.degraderMode()
      return [options, conseil]
    }
  }

  excAffichage2c () {
    const options = [
      { code: 'x', label: 'Corriger la phrase secrète saisie', color: 'primary' },
      { code: 'd', label: 'Retourner au login', color: 'primary' }
    ]
    if (this.appexc.code === X_SRV) {
      return [options, null]
    }
  }

  excAffichage1fc () {
    const options = [
      { code: 'd', label: 'Retourner au login', color: 'primary' },
      { code: 'r', label: 'Essayer de  reconnecter le compte', color: 'primary' }
    ]
    return [options, null]
  }

  /* Chargement de la totalité de la base en mémoire :
  - détermine les avatars et groupes référencés dans les rows de Idb
  - supprime de la base comme de la mémoire les rows / objets inutiles
  - puis récupère les CVs et supprime celles non référencées
  Les items de dlv dépassée sont lus, non stockés et mis à supprimer de IDB
  */
  async chargementIdb (id) {
    const hls = [] // objets hors limite, pour purge de IDB à la fin du chargement

    this.razidblec()

    {
      let prefs = await getPrefs()
      if (!prefs) prefs = new Prefs().nouveau(id)
      data.setPrefs(prefs)
    }

    this.BRK()
    const avUtiles = data.setIdsAvatarsUtiles
    { /* On ne charge de IDB QUE les avatars référencés dans le compte
      les inutiles sont directement purgés de IDB */
      const { objs, vol, apurger } = await getAvatars(avUtiles)
      data.setAvatars(objs)
      this.majidblec({ table: 'avatar', st: true, vol: vol, nbl: objs.length })
      if (apurger.size) {
        purgeAvatars(apurger) // en IDB pour les contacts, invitct ... secrets
      }
      this.majidblec({ table: 'purgeav', st: true, vol: 0, nbl: apurger.size })
    }

    this.BRK()
    const grUtiles = data.setIdsGroupesUtiles
    { /* On ne charge de IDB QUE les groupes référencés dans les avatars du compte
      les inutiles sont directement purgés de IDB */
      const { objs, vol, apurger } = await getGroupes(grUtiles)
      if (objs.length) data.setGroupes(objs)
      this.majidblec({ table: 'groupe', st: true, vol: vol, nbl: objs.length })
      if (apurger.size) {
        purgeGroupes(apurger) // en IDB pour les membres et secrets
      }
      this.majidblec({ table: 'purgegr', st: true, vol: 0, nbl: apurger.size })
    }

    /* chargement des CVs. Au début pour avoir le moins de fake possible dans le répertoire */
    this.BRK()
    {
      const { objs, vol } = await getCvs()
      if (objs && objs.length) {
        objs.forEach((cv) => {
          data.repertoire.setCv(cv)
        })
      }
      this.majidblec({ table: 'cv', st: true, vol: vol, nbl: objs.length })
    }

    this.BRK()
    {
      const { objs, vol } = await getInvitgrs()
      data.setInvitgrs(objs, hls)
      this.majidblec({ table: 'invitgr', st: true, vol: vol, nbl: objs.length })
    }

    this.BRK()
    {
      const { objs, vol } = await getContacts()
      if (objs && objs.length) {
        objs.forEach((c) => {
          data.repertoire(c.na).plusCtc(c.id)
        })
      }
      data.setContacts(objs)
      this.majidblec({ table: 'contact', st: true, vol: vol, nbl: objs.length })
    }

    this.BRK()
    {
      const { objs, vol } = await getInvitcts()
      if (objs && objs.length) {
        objs.forEach((i) => {
          data.repertoire(i.nab).plusCtc(i.id)
        })
      }
      data.setInvitcts(objs, hls)
      this.majidblec({ table: 'invitct', st: true, vol: vol, nbl: objs.length })
    }

    this.BRK()
    {
      const { objs, vol } = await getParrains()
      data.setParrains(objs, hls)
      this.majidblec({ table: 'parrain', st: true, vol: vol, nbl: objs.length })
    }

    this.BRK()
    {
      const { objs, vol } = await getRencontres()
      data.setRencontres(objs, hls)
      this.majidblec({ table: 'rencontre', st: true, vol: vol, nbl: objs.length })
    }

    this.BRK()
    {
      const { objs, vol } = await getMembres()
      if (objs && objs.length) {
        objs.forEach((m) => {
          data.repertoire(m.namb).plusMbr(m.id)
        })
      }
      data.setMembres(objs, hls)
      this.majidblec({ table: 'membre', st: true, vol: vol, nbl: objs.length })
    }

    this.BRK()
    {
      const { objs, vol } = await getSecrets()
      data.setSecrets(objs, hls)
      this.majidblec({ table: 'secret', st: true, vol: vol, nbl: objs.length })
    }

    // purge des CVs inutiles
    this.BRK()
    {
      const cvi = data.repertoire.setCvsInutiles
      const nbp = await purgeCvs(cvi)
      data.repertoire.purge(cvi)
      data.repertoire.commit()
      this.majidblec({ table: 'purgecv', st: true, vol: 0, nbl: nbp })
    }

    if (hls.length) {
      // Des objets à supprimer de IDB
      hls.forEach(obj => { obj.st = -1 })
      commitRows(hls)
    }

    if (cfg().debug) await sleep(1)

    this.BRK()
  }
}

/* ********************************************************* */
export class OperationWS extends Operation {
  constructor (nomop) {
    super(nomop, OUI, SELONMODE)
    data.opWS = this
  }

  excAffichages () { return [this.excAffichage1, this.excAffichage1f] }

  excActions () { return { d: deconnexion, r: reconnexion, default: null } }
}

export class ProcessQueue extends OperationWS {
  constructor () {
    super('Traitement des synchronisations')
  }

  async run (q) {
    try {
      const [dhc, nvvcv] = await this.traiteQueue(q)
      if (data.dh < dhc) data.dh = dhc
      if (data.vcv < nvvcv) data.vcv = nvvcv
      if (data.db) {
        await setEtat()
      }
      return this.finOK()
    } catch (e) {
      return await this.finKO(e)
    }
  }
}

/* ********************************************************* */
/* On poste :
- les rows Compte et prefs, v et dds à 0
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

  excAffichage2 () {
    const options = [
      { code: 'c', label: 'Corriger les données saisies', color: 'primary' },
      { code: 'd', label: 'Abandonner la création, retourner au login', color: 'primary' }
    ]
    if (this.appexc.code === X_SRV) {
      return [options, null]
    }
  }

  excAffichage1f () {
    const options = [
      { code: 'd', label: 'Retourner au login', color: 'primary' }
    ]
    return [options, null]
  }

  excAffichages () { return [this.excAffichage1, this.excAffichage2, this.excAffichage1f] }

  excActions () { return { d: deconnexion, c: this.excActionx, default: null } }

  async run (mdp, ps, nom, quotas) {
    try {
      // eslint-disable-next-line no-unused-vars
      const d = data
      data.ps = ps

      await data.connexion(true) // On force A NE PAS OUVRIR IDB (compte pas encore connu)

      this.BRK()
      const kp = await crypt.genKeyPair()
      const nomAvatar = new NomAvatar(nom) // nouveau
      const compte = new Compte().nouveau(nomAvatar, kp.privateKey)
      const rowCompte = await compte.toRow()
      data.setCompte(compte)
      const prefs = new Prefs().nouveau(compte.id)
      data.setPrefs(prefs)
      const rowPrefs = await prefs.toRow()
      const avatar = await new Avatar().nouveau(nomAvatar.id)
      const rowAvatar = await avatar.toRow()

      const args = { sessionId: data.sessionId, mdp64: mdp.mdp64, q1: quotas.q1, q2: quotas.q2, qm1: quotas.qm1, qm2: quotas.qm2, clePub: kp.publicKey, rowCompte, rowAvatar, rowPrefs }
      const ret = await post(this, 'm1', 'creationCompte', args)
      // maj du modèle en mémoire
      if (data.dh < ret.dh) data.dh = ret.dh
      /*
      Le compte vient d'être créé et est déjà dans le modèle (clek enregistrée)
      On peut désérialiser la liste d'items (compte et avatar)
      */
      const mapObj = await this.rowItemsToMapObjets(ret.rowItems)
      const compte2 = mapObj.compte // le DERNIER objet compte quand on en a reçu plusieurs (pas la liste)
      data.setCompte(compte2)
      const objets = [compte2]
      const prefs2 = mapObj.prefs // le DERNIER objet compte quand on en a reçu plusieurs (pas la liste)
      data.setCompte(prefs2)
      objets.push(prefs2)
      commitMapObjets(objets, mapObj)

      // création de la base IDB et chargement des rows compte et avatar
      if (data.mode === 1) { // synchronisé : IL FAUT OUVRIR IDB (et écrire dedans)
        this.BRK()
        enregLScompte(compte2.sid)
        await deleteIDB()
        try {
          await openIDB()
        } catch (e) {
          await deleteIDB(true)
          throw e
        }
        await commitRows(objets)
      }

      data.statut = 2
      data.dhsync = data.dh
      if (data.db) {
        await setEtat()
      }
      const res = this.finOK()
      remplacePage('Compte')
      return res
    } catch (e) {
      return await this.finKO(e)
    }
  }
}

/* *************************************************** */
export class ConnexionCompteAvion extends OperationUI {
  constructor () {
    super('Connexion à un compte en mode avion', NON, OUI)
    this.opsync = true
  }

  excAffichages () { return [this.excAffichage1c, this.excAffichage2c, this.excAffichage1fc] }

  excActions () {
    return { d: deconnexion, x: this.excActionx, r: reconnexion, default: null }
  }

  async run (ps) {
    try {
      data.ps = ps
      if (!idbSidCompte()) {
        throw new AppExc(F_BRO, 'Compte non enregistré localement : aucune session synchronisée ne s\'est préalablement exécutée sur ce poste avec cette phrase secrète. Erreur dans la saisie de la ligne 1 de la phrase ?')
      }
      await data.connexion()
      this.BRK()

      const etat = await getEtat()
      data.dhsync = etat.dhsync
      data.statut = etat.statut

      const compte = await getCompte()
      if (!compte || compte.pcbh !== data.ps.pcbh) {
        throw new AppExc(F_BRO, 'Compte non enregistré localement : aucune session synchronisée ne s\'est préalablement exécutée sur ce poste avec cette phrase secrète. Erreur dans la saisie de la ligne 2 de la phrase ?')
      }
      data.setCompte(compte)

      await this.chargementIdb(compte.id)

      this.finOK()
      remplacePage('Compte')
    } catch (e) {
      await this.finKO(e)
    }
  }
}

/* Connexion à un compte par sa phrase secrète (synchronisé et incognito) **/
export class ConnexionCompte extends OperationUI {
  constructor () {
    super('Connexion à un compte', OUI, SELONMODE)
    this.opsync = true
  }

  excAffichages () { return [this.excAffichage1c, this.excAffichage2c, this.excAffichage1fc] }

  excActions () {
    return { d: deconnexion, x: this.excActionx, r: reconnexion, default: null }
  }

  async lectureCompte () {
    // obtention du compte depuis le serveur
    const args = { sessionId: data.sessionId, pcbh: data.ps.pcbh, dpbh: data.ps.dpbh }
    const ret = await post(this, 'm1', 'connexionCompte', args)
    // maj du modèle en mémoire
    if (data.dh < ret.dh) data.dh = ret.dh
    // construction de l'objet compte
    const rowCompte = schemas.deserialize('rowcompte', ret.rowItems[0].serial)
    if (data.ps.pcbh !== rowCompte.pcbh) throw EXPS // changt de phrase secrète
    const c = new Compte()
    await c.fromRow(rowCompte)
    const rowPrefs = schemas.deserialize('rowprefs', ret.rowItems[1].serial)
    const p = new Prefs()
    await p.fromRow(rowPrefs)
    return [c, p]
  }

  async run (ps) {
    try {
      // eslint-disable-next-line no-unused-vars
      const d = data

      data.ps = ps
      await data.connexion()
      this.BRK()

      // obtention du compte depuis le serveur
      let [compte, prefs] = await this.lectureCompte()
      data.setCompte(compte)
      data.setPrefs(prefs)

      if (data.db) {
        enregLScompte(compte.sid) // La phrase secrète a pu changer : celle du serveur est installée
        await commitRows([compte, prefs])
        this.BRK()
        await this.chargementIdb(compte.id)
      }

      let avUtiles = data.setIdsAvatarsUtiles
      if (data.db) { // mode sync
        /* Relecture du compte qui pourrait avoir changé durant le chargement IDB qui peut être long
        Si version postérieure :
        - ré-enregistrement du compte en modèle et IDB
        - suppression des avatars obsolètes non référencés par la nouvelle version du compte, y compris dans la liste des versions
        */
        const [compte2, prefs2] = await this.lectureCompte() // PEUT sortir en EXPS si changement de phrase secrète
        if (compte2.v > compte.v) {
          compte = compte2
          data.setCompte(compte2)
          data.setPrefs(prefs2)
          avUtiles = data.setIdsAvatarsUtiles
          const avInutiles = difference(data.setIdsAvatarsStore, avUtiles)
          if (avInutiles.size) {
            data.purgeAvatars(avInutiles) // en store
            await data.db.purgeAvatars(avInutiles)// en IDB
            for (const id of avInutiles) data.vag.delVerAv(id)
          }
          this.BRK()
          await commitRows([compte])
        }
      }

      await this.chargerAvatars(avUtiles, !data.db)

      // On a maintenant la liste des groupes utiles (lisibles dans les avatars chargés)
      const grUtiles = data.setIdsGroupesUtiles
      const grAPurger = difference(data.setIdsGroupesStore, grUtiles)
      if (grAPurger.size) {
        data.purgeGroupes(grAPurger)
        if (data.db) await data.db.purgeGroupes(grAPurger)
      }

      // Abonnements et signature du compte, ses avatars et ses groupes
      await this.abonnements(avUtiles, grUtiles)

      /* État chargé correspondant à l'état local :
      - presque vide le cas échéant - incognito ou première synchro
      - a minima compte et avatars présents
      - signature et abonnements enregistrés
      - compte OK */
      data.statut = 1
      data.dhsync = data.dh
      if (data.db) {
        const etat = await getEtat()
        data.vsv = etat.vsv
        setEtat()
      }

      // Chargement depuis le serveur des avatars non obtenus de IDB (sync), tous (incognito)
      for (const idav of avUtiles) {
        await this.chargerAv(idav, !data.db) // tous en incognito
        const av = data.getAvatar(idav)
        this.majsynclec({ st: 0, sid: av.sid, nom: 'Avatar ' + av.na.nom, nbl: 0 })
      }

      // Chargement depuis le serveur des groupes non obtenus de IDB (sync), tous (incognito)
      for (const idgr of grUtiles) {
        await this.chargerGr(idgr, !data.db) // tous en incognito)
        const gr = data.getGroupe(idgr)
        this.majsynclec({ st: 0, sid: gr.sid, nom: 'Groupe ' + gr.na.nom, nbl: 0 })
      }

      // Synchroniser les CVs (et s'abonner)
      const [nvvcv, nbcv] = await this.syncCVs(data.vcv)
      this.majsynclec({ st: 1, sid: '$CV', nom: 'Cartes de visite', nbl: nbcv })
      if (data.vcv < nvvcv) data.vcv = nvvcv

      // Traiter les notifications éventuellement arrivées
      while (data.syncqueue.length) {
        const q = data.syncqueue
        data.syncqueue = []
        await this.traiteQueue(q)
      }

      // Enregistrer l'état de synchro
      data.statut = 2
      if (data.dhsync < data.dh) data.dhsync = data.dh
      if (data.db) {
        await setEtat()
      }

      this.finOK()
      remplacePage('Compte')
    } catch (e) {
      await this.finKO(e)
    }
  }
}

/******************************************************
Mise à jour d'une préférence d'un compte
*/
export class PrefCompte extends OperationUI {
  constructor () {
    super('Mise à jour d\'une préférence du compte', OUI, SELONMODE)
  }

  excAffichages () { return [this.excAffichage1f] }

  // excActions(), défaut de Operation

  async run (code, datak) {
    try {
      this.BRK()
      const args = { sessionId: data.sessionId, id: data.getCompte().id, code: code, datak: datak }
      const ret = await post(this, 'm1', 'prefCompte', args)
      if (data.dh < ret.dh) data.dh = ret.dh
      this.finOK()
    } catch (e) {
      await this.finKO(e)
    }
  }
}

/******************************************************
Mise à jour de la carte de visite d'un avatar
*/
export class CvAvatar extends OperationUI {
  constructor () {
    super('Mise à jour de la carte de visite d\'un avatar', OUI, SELONMODE)
  }

  excAffichages () { return [this.excAffichage1f] }

  // excActions(), défaut de Operation

  async run (id, phinfo) {
    try {
      const args = { sessionId: data.sessionId, id: id, phinfo: phinfo }
      const ret = await post(this, 'm1', 'cvAvatar', args)
      if (data.dh < ret.dh) data.dh = ret.dh
      this.finOK()
    } catch (e) {
      await this.finKO(e)
    }
  }
}

/******************************************************
Création d'un nouveau secret P
*/
export class NouveauSecret extends OperationUI {
  constructor () {
    super('Création d\'un nouveau secret personnel', OUI, SELONMODE)
  }

  excAffichages () { return [this.excAffichage1f] }

  // excActions(), défaut de Operation

  // arg = { ts, id, ns, ic, st, ora, v1, mcg, mc, im, txts, dups, refs, id2, ns2, ic2, dups2 }
  async run (arg) {
    try {
      const args = { sessionId: data.sessionId, ...arg }
      const ret = await post(this, 'm1', 'nouveauSecret', args)
      if (data.dh < ret.dh) data.dh = ret.dh
      this.finOK()
    } catch (e) {
      await this.finKO(e)
    }
  }
}

/******************************************************
Maj 1 d'un secret P : txt, mc, perm
*/
export class Maj1Secret extends OperationUI {
  constructor () {
    super('Mise à jour d\'un secret personnel', OUI, SELONMODE)
  }

  excAffichages () { return [this.excAffichage1f] }

  // excActions(), défaut de Operation

  async run (arg) { // { id: s.id, ns: s.ns, v1, txts: txts, mcs: mcs }
    try {
      const args = { sessionId: data.sessionId, ...arg }
      const ret = await post(this, 'm1', 'maj1Secret', args)
      if (data.dh < ret.dh) data.dh = ret.dh
      this.finOK()
    } catch (e) {
      await this.finKO(e)
    }
  }
}
