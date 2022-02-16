import { NomAvatar, store, post, affichermessage, cfg, sleep, affichererreur, appexc, idToIc, difference, getpj, getJourJ, serial, edvol } from './util.mjs'
import { remplacePage } from './page.mjs'
import {
  deleteIDB, idbSidCompte, commitRows, getCompte, getCompta, getArdoise, getPrefs, getAvatars, getContacts, getCvs,
  getGroupes, getMembres, getParrains, getRencontres, getSecrets,
  purgeAvatars, purgeCvs, purgeGroupes, openIDB, enregLScompte, setEtat, getEtat, getPjidx, putPj
} from './db.mjs'
import { Compte, Avatar, rowItemsToMapObjets, commitMapObjets, data, Prefs, Contact, Invitgr, Compta, Ardoise } from './modele.mjs'
import { AppExc, EXBRK, EXPS, F_BRO, INDEXT, X_SRV, E_WS, SIZEAV, SIZEGR, MC } from './api.mjs'

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
    if (this.appexc.code === E_WS) {
      this.appexc = data.setErWS(this.appexc)
    }
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

  /* Obtention des invitGr du compte et traitement de régularisation ***********************************/
  async getInvitGrs () {
    const ids = data.getCompte().allAvId()
    const ret = await post(this, 'm1', 'chargerInvitGr', { sessionId: data.sessionId, ids: Array.from(ids) })
    if (data.dh < ret.dh) data.dh = ret.dh
    const lstInvitGr = []
    if (ret.rowItems.length) {
      for (let i = 0; i < ret.rowItems.length; i++) {
        const item = ret.rowItems[i]
        if (item.table === 'invitgr') {
          const row = schemas.deserialize('rowinvitgr', item.serial)
          const obj = new Invitgr()
          await obj.fromRow(row)
          lstInvitGr.push(obj)
        }
      }
    }
    await this.traitInvitGr(lstInvitGr)
  }

  /* Traitement des invitGr, appel de régularisation ********************************/
  async traitInvitGr (lstInvitGr) {
    for (let i = 0; i < lstInvitGr.length; i++) {
      const iv = lstInvitGr[i]
      const ret = await post(this, 'm1', 'regulGr', { sessionId: data.sessionId, id: iv.id, ni: iv.ni, datak: iv.datak })
      if (data.dh < ret.dh) data.dh = ret.dh
    }
  }

  /* Abonnements aux avatars et groupes utiles ********************************/
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

  /* Recharge depuis le serveur les avatars du compte ************************/
  async chargerAvatars (avUtiles, tous) {
    // idsVers : map de clé:id de l'avatar, valeur: version détenue en session
    const idsVers = { }
    for (const id of avUtiles) idsVers[id] = tous ? 0 : data.vag.getVerAv(id)[INDEXT.AVATAR]
    const ret = await post(this, 'm1', 'chargerAv', { sessionId: data.sessionId, idsVers })
    if (data.dh < ret.dh) data.dh = ret.dh
    const objets = []
    for (const id of avUtiles) data.vag.setVerAv(id, INDEXT.AVATAR, -1)
    await commitMapObjets(objets, await rowItemsToMapObjets(ret.rowItems)) // stockés en modele
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
    await commitMapObjets(objets, await rowItemsToMapObjets(ret.rowItems)) // stockés en modele
    if (data.db) {
      await commitRows(objets)
      this.BRK()
    }
    return objets.length
  }

  /* Recharge depuis le serveur les groupes et les tables associées (membres, secrets) */
  async chargerGr (id, tous) { // lgr : set des groupes utiles
    const sid = crypt.idToSid(id)
    const lv = tous ? new Array(SIZEGR).fill(0) : data.getVerGr(sid)
    const ret = await post(this, 'm1', 'syncGr', { sessionId: data.sessionId, avgr: id, lv })
    if (data.dh < ret.dh) data.dh = ret.dh
    const objets = []
    await commitMapObjets(objets, await rowItemsToMapObjets(ret.rowItems)) // stockés en modele
    if (data.db) {
      await commitRows(objets)
      this.BRK()
    }
    return objets.length
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
    const vcv = await commitMapObjets(objets, await rowItemsToMapObjets(ret.rowItems)) // stockés en modele
    if (vcv > nvvcv) nvvcv = vcv
    if (data.db) {
      await commitRows(objets)
      this.BRK()
    }
    return [nvvcv, objets.length]
  }

  async syncPjs () {
    /* Vérification que toutes les PJ accessibles en avion sont, a) encore utiles, b) encore à jour */
    let nbp = 0
    let vol = 0
    const st = store().state.pjidx
    const maj = []
    for (const sidpj in st) {
      const x = { ...st[sidpj] }
      const secret = data.getSecret(x.id, x.ns)
      if (secret) {
        const pj = secret.mpj[x.cle]
        if (pj) {
          if (pj.hv !== x.hv) { // pj locale pas à jour
            x.hv = pj.hv
            // rechargement du contenu
            const data = await getpj(secret.sid + '@' + secret.sid2, x.cle) // du serveur
            nbp++
            vol += data.length
            await putPj(x, data) // store en IDB
            maj.push(x)
          }
        } else { // PJ n'existe plus
          await putPj(x, null) // delete en IDB
          maj.push(x)
        }
      } else {
        await putPj(x, null) // delete en IDB, le secret n'existe plus
        maj.push(x)
      }
    }
    if (maj.length) data.setPjidx(maj) // MAJ du store
    return [nbp, vol]
  }

  /* traiteQueue ********************************************************************************/
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
    const mapObj = await rowItemsToMapObjets(items)
    const objets = [] // Tous les objets à enregistrer dans IDB

    /* Traitement spécial des singletons */
    if (mapObj.compte) {
      // Une mise à jour de compte est notifiée
      data.setCompte(mapObj.compte)
      objets.push(mapObj.compte)
    }
    if (mapObj.compta) {
      // Une mise à jour de compta est notifiée
      data.setCompta(mapObj.compta)
      objets.push(mapObj.compta)
    }
    if (mapObj.prefs) {
      // Une mise à jour de prefs est notifiée
      data.setPrefs(mapObj.prefs)
      objets.push(mapObj.prefs)
    }
    if (mapObj.ardoise) {
      // Une mise à jour de prefs est notifiée
      data.setArdoise(mapObj.ardoise)
      objets.push(mapObj.ardoise)
    }
    if (mapObj.invitgr) {
      await this.traitInvitGr(mapObj.invitgr)
    }

    /* Mise en store de tous les autres objets */
    const vcv = await commitMapObjets(objets, mapObj)

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

  /* Chargement de la totalité de la base en mémoire : **************************************/
  /*
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
      const compta = await getCompta()
      if (compta) data.setCompta(compta)
      const ardoise = await getArdoise()
      if (ardoise) data.setArdoise(ardoise)
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
      const { objs, vol } = await getContacts()
      if (objs && objs.length) {
        objs.forEach((c) => {
          data.repertoire.getCv(c.na.id).plusCtc(c.id)
        })
      }
      data.setContacts(objs)
      this.majidblec({ table: 'contact', st: true, vol: vol, nbl: objs.length })
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
          data.repertoire.getCv(m.namb.id).plusMbr(m.id)
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

    this.BRK()
    {
      const pjs = await getPjidx()
      store().commit('db/majpjidx', pjs)
    }

    if (cfg().debug) await sleep(1)

    this.BRK()
  }

  async postCreation (ret) {
    const mapObj = await rowItemsToMapObjets(ret.rowItems)
    const compte2 = mapObj.compte // le DERNIER objet compte quand on en a reçu plusieurs (pas la liste)
    data.setCompte(compte2)
    const compta2 = mapObj.compta // le DERNIER objet compte quand on en a reçu plusieurs (pas la liste)
    data.setCompta(compta2)
    const prefs2 = mapObj.prefs // le DERNIER objet compte quand on en a reçu plusieurs (pas la liste)
    data.setPrefs(prefs2)
    const ardoise = mapObj.ardoise // le DERNIER objet compte quand on en a reçu plusieurs (pas la liste)
    data.setArdoise(ardoise)
    const objets = [compte2, compta2, prefs2, ardoise]
    await commitMapObjets(objets, mapObj) // l'avatar n'a pas été traité, les singletons l'ont été juste ci-avant

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

/* Création d'un compte comptable******************************************
On poste :
- les rows Compte, Compta, Prefs, v et dds à 0
- les clés publiques du compte et de l'avatar pour la table avrsa
- le row Avatar, v et dds à 0
Retour:
- dh, sessionId
- rowItems retournés : compte compta prefs avatar
*/
export class CreationCompte extends OperationUI {
  constructor () {
    super('Création d\'un compte de comptable', OUI, SELONMODE)
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

  async run (ps, nom, forfaits) {
    try {
      data.ps = ps

      await data.connexion(true) // On force A NE PAS OUVRIR IDB (compte pas encore connu)

      this.BRK()
      const kpav = await crypt.genKeyPair()
      const kpc = await crypt.genKeyPair()
      const nomAvatar = new NomAvatar(nom) // nouveau

      const compte = new Compte().nouveau(nomAvatar, kpav.privateKey, kpc.privateKey)
      const rowCompte = await compte.toRow()
      const prefs = new Prefs().nouveau(compte.id)
      const rowPrefs = await prefs.toRow()
      data.setPrefs(prefs) // tout de suite à cause de l'afficahage qui va y chercher des trucs
      data.setCompte(compte)

      const compta = new Compta().nouveau(compte.id, null)
      compta.compteurs.setRes(64, 64)
      compta.compteurs.setF1(forfaits[0])
      compta.compteurs.setF2(forfaits[1])
      const rowCompta = await compta.toRow()

      const avatar = await new Avatar().nouveau(nomAvatar.id)
      const rowAvatar = await avatar.toRow()

      const args = { sessionId: data.sessionId, clePubAv: kpav.publicKey, clePubC: kpc.publicKey, rowCompte, rowCompta, rowAvatar, rowPrefs }
      const ret = await post(this, 'm1', 'creationCompte', args)
      // maj du modèle en mémoire
      if (data.dh < ret.dh) data.dh = ret.dh
      /*
      Le compte vient d'être créé et est déjà dans le modèle (clek enregistrée)
      On peut désérialiser la liste d'items (compte et avatar)
      */
      this.postCreation(ret)

      data.estComptable = true
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
      let prefs = await getPrefs()
      if (!prefs) prefs = new Prefs().nouveau(compte.id)
      data.setPrefs(prefs)
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
    const rowCompte = schemas.deserialize('rowcompte', ret.compte.serial)
    if (data.ps.pcbh !== rowCompte.pcbh) throw EXPS // changt de phrase secrète
    const c = new Compte()
    await c.fromRow(rowCompte)
    const rowPrefs = schemas.deserialize('rowprefs', ret.prefs.serial)
    const p = new Prefs()
    await p.fromRow(rowPrefs)
    const rowCompta = schemas.deserialize('rowcompta', ret.compta.serial)
    const compta = new Compta()
    await compta.fromRow(rowCompta)
    const rowArdoise = schemas.deserialize('rowardoise', ret.ardoise.serial)
    const ardoise = new Ardoise()
    await ardoise.fromRow(rowArdoise)
    if (ret.estComptable) data.estComptable = true
    return [c, p, compta, ardoise]
  }

  async run (ps) {
    try {
      data.ps = ps
      await data.connexion()
      this.BRK()

      // obtention du compte depuis le serveur
      let [compte, prefs, compta, ardoise] = await this.lectureCompte()
      data.setCompte(compte)
      data.setPrefs(prefs)
      data.setCompta(compta)
      data.setArdoise(ardoise)

      /* récupération et régularisation des invitGr : maj sur le serveur des avatars du compte
        AVANT chargement des avatars afin d'avoir tous les groupes au plus tôt
      */
      await this.getInvitGrs()

      if (data.db) {
        enregLScompte(compte.sid) // La phrase secrète a pu changer : celle du serveur est installée
        await commitRows([compte, prefs, compta])
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
        const [compte2, prefs2, compta2, ardoise2] = await this.lectureCompte() // PEUT sortir en EXPS si changement de phrase secrète
        const lobj = []
        let b = false
        if (compte2.v > compte.v) {
          compte = compte2
          data.setCompte(compte2)
          lobj.push(compte)
          b = true
        }
        if (prefs2.v > prefs.v) {
          data.setPrefs(prefs2)
          prefs = prefs2
          lobj.push(prefs)
        }
        if (compta2.v > compta.v) {
          data.setCompta(compta2)
          compta = compta2
          lobj.push(compta)
        }
        if (ardoise2.v > ardoise.v) {
          data.setArdoise(ardoise2)
          ardoise = ardoise2
          lobj.push(ardoise)
        }
        if (b) {
          avUtiles = data.setIdsAvatarsUtiles
          const avInutiles = difference(data.setIdsAvatarsStore, avUtiles)
          if (avInutiles.size) {
            data.purgeAvatars(avInutiles) // en store
            await data.db.purgeAvatars(avInutiles)// en IDB
            for (const id of avInutiles) data.vag.delVerAv(id)
          }
        }
        this.BRK()
        if (lobj.length) await commitRows(lobj)
      }

      await this.chargerAvatars(avUtiles, !data.db)

      // On a maintenant la liste des groupes utiles (lisibles dans les avatars chargés)
      const grUtiles = data.setIdsGroupesUtiles
      const grAPurger = difference(data.setIdsGroupesStore, grUtiles)
      if (grAPurger.size) {
        data.purgeGroupes(grAPurger)
        if (data.db) await data.db.purgeGroupes(grAPurger)
      }

      // Abonnements et signature du compte, ses avatars et ses groupes SI PAS EN SURSIS
      if (!compta.st) await this.abonnements(avUtiles, grUtiles)

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
        const n = await this.chargerAv(idav, !data.db) // tous en incognito
        const av = data.getAvatar(idav)
        this.majsynclec({ st: 1, sid: av.sid, nom: 'Avatar ' + av.na.nom, nbl: n })
      }

      // Chargement depuis le serveur des groupes non obtenus de IDB (sync), tous (incognito)
      for (const idgr of grUtiles) {
        const n = await this.chargerGr(idgr, !data.db) // tous en incognito)
        const gr = data.getGroupe(idgr)
        this.majsynclec({ st: 1, sid: gr.sid, nom: 'Groupe ' + gr.na.nom, nbl: n })
      }

      // Synchroniser les CVs (et s'abonner)
      const [nvvcv, nbcv] = await this.syncCVs(data.vcv)
      this.majsynclec({ st: 1, sid: '$CV', nom: 'Cartes de visite', nbl: nbcv })
      if (data.vcv < nvvcv) data.vcv = nvvcv

      // Recharger les pièces jointes manquantes
      const [nbp, vol] = await this.syncPjs()
      this.majsynclec({ st: 1, sid: '$PJ', nom: 'Pièces jointes "avion" : ' + edvol(vol), nbl: nbp })

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

  excAffichages () { return [this.excAffichage1, this.excAffichage2] }

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

  excAffichages () { return [this.excAffichage1, this.excAffichage2] }

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
    super('Création d\'un nouveau secret', OUI, SELONMODE)
  }

  excAffichages () { return [this.excAffichage1, this.excAffichage2] }

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
    super('Mise à jour d\'un secret', OUI, SELONMODE)
  }

  excAffichages () { return [this.excAffichage1, this.excAffichage2] }

  // excActions(), défaut de Operation

  async run (arg) { // arg = ts, id, ns, v1, mc, im, mcg, txts, ora, temp, id2, ns2
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

/******************************************************
Pièce jointe d'un secret P : txt, mc, perm
*/
export class PjSecret extends OperationUI {
  constructor () {
    super('Mise à jour d\'une pièce jointe d\'un secret', OUI, SELONMODE)
  }

  excAffichages () { return [this.excAffichage1, this.excAffichage2] }

  // excActions(), défaut de Operation

  async run (arg) {
    /* { ts, id: s.id, ns: s.ns, cle, idc, buf, lg, id2, ns2}
    - `cle` : hash court en base64 URL de nom.ext
    - `idc` : id complète de la pièce jointe (nom/type/dh), cryptée par la clé du secret et en base64 URL.
    - buf : contenu binaire crypté
    - lg : taille de la pièce jointe d'origine (non gzippée, non cryptée)
    */
    try {
      const args = { sessionId: data.sessionId, ...arg }
      const ret = await post(this, 'm1', 'pjSecret', args)
      if (data.dh < ret.dh) data.dh = ret.dh
      this.finOK()
    } catch (e) {
      await this.finKO(e)
    }
  }
}

/******************************************************************
Parrainage : args de m1/nouveauParrainage
  sessionId: data.sessionId,
  rowParrain: serial(rowParrain)
Retour : dh
*/

export class NouveauParrainage extends OperationUI {
  constructor () {
    super('Parrainage d\'un nouveau compte', OUI, SELONMODE)
  }

  excAffichages () { return [this.excAffichage1, this.excAffichage2] }

  // excActions(), défaut de Operation

  async run (arg) {
    /*
      pph: this.pph, // le hash de la clex (integer)
      pp: this.phrase, // phrase de parrainage (string)
      clex: this.clex, // PBKFD de pp (u8)
      id: this.avatar.id,
      aps: this.aps, // booléen (accepta partage de secrets)
      forfaits: this.forfaits,
      ressources: this.estParrain ? this.ressources : null,
      nomf: this.nom, // nom du filleul (string)
      mot: this.mot
    row Parrain :
    - `pph` : hash du PBKFD de la phrase de parrainage.
    - `id` : id du parrain.
    - `v`
    - `dlv` : la date limite de validité permettant de purger les parrainages (quels qu'en soient les statuts).
    - `st` : < 0: supprimé,
      - 0: en attente de décision de F
      - 1 : accepté
      - 2 : refusé
    - `datak` : cryptée par la clé K du parrain, **phrase de parrainage et clé X** (PBKFD de la phrase). La clé X figure afin de ne pas avoir à recalculer un PBKFD en session du parrain pour qu'il puisse afficher `datax`.
    - `datax` : données de l'invitation cryptées par le PBKFD de la phrase de parrainage.
      - `idcp` : id du compte parrain
      - `idcf` : id du futur compte filleul
      - `nomp, rndp, icp` : nom complet et indice de l'avatar P.
      - `nomf, rndf, icf` : nom complet et indice du filleul F (donné par P).
      - `cc` : clé `cc` générée par P pour le couple P / F.
      - `aps` : `true` si le parrain accepte le partage de secrets.
      - `f: [f1 f2]` : forfaits attribués par P à F.
      - `r: [r1 r2]` : si non null, réserve attribuable aux filleuls si le compte _parrainé_ est en fait un _parrain_ lui-même.
    - `data2k` : c'est le `datak` du futur contact créé en cas d'acceptation.
      - `nom rnd` : nom complet du contact (B).
      - `cc` : 32 bytes aléatoires donnant la clé `cc` d'un contact avec B (en attente ou accepté).
      - `icb` : indice de A dans les contacts de B
      - `idcf` : id du compte filleul
    */
    try {
      const compte = data.getCompte()

      const cc = crypt.random(32)
      const nap = data.getNa(arg.id)
      const naf = new NomAvatar(arg.nomf)
      const icp = await idToIc(naf.id)
      const icf = crypt.rnd4()
      const idcf = crypt.rnd6()
      const x = serial([new Date().getTime(), arg.mot])
      const datax = { idcp: compte.id, idcf, nomp: nap.nom, rndp: nap.rnd, icp, nomf: naf.nom, rndf: naf.rnd, icf, cc, aps: arg.aps, f: arg.forfaits, r: arg.ressources }
      const data2 = { nom: naf.nom, rnd: naf.rnd, ic: icf, cc, idcf }
      const rowParrain = {
        pph: arg.pph,
        id: arg.id,
        v: 0,
        st: 0,
        dlv: getJourJ() + cfg().limitesjour.parrainage,
        datak: await crypt.crypter(data.clek, serial([arg.pp, arg.clex])),
        datax: await crypt.crypter(arg.clex, serial(datax)),
        data2k: await crypt.crypter(data.clek, serial(data2)),
        ardc: await crypt.crypter(cc, x),
        vsh: 0
      }

      const args = { sessionId: data.sessionId, rowParrain: serial(rowParrain) }
      const ret = await post(this, 'm1', 'nouveauParrainage', args)
      if (data.dh < ret.dh) data.dh = ret.dh
      this.finOK()
    } catch (e) {
      await this.finKO(e)
    }
  }
}

/******************************************************************
 * Acceptation / refus d'un parrainage
 * - sessionId
 * - ok : true si acceptation
 * - pph : hash de la phrase de parrainage
 * - idp : de l'avatar parrain
 * - icp : ic du contact du filleul chez le parrain
 * - ardc : mot du filleul crypté par la clé du couple
 * Si acceptation
 * - idf : id du filleul (avatar)
 * - icbc : indice de P comme contact chez F crypté par leur clé cc
 * - clePubAv, clePubC : clés publiques de l'avatar et du compte
 * - rowCompte, rowCompta, rowAvatar, rowPrefs : v attribuées par le serveur
 * - rowContact (du filleul) : st, dlv par le serveur
 *  Pour maj de sr des rows contact du parrain / filleul :
 * - aps : booléen - true si le filleul accepte le partage de secret (false si limitation à l'ardoise)
 * Retour : sessionId, dh
 */

export class AcceptationParrainage extends OperationUI {
  constructor () {
    super('Acceptation du parrainage d\'un nouveau compte', OUI, SELONMODE)
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

  /* arg :
  - ps : phrase secrète
  - ard : réponse du filleul
  - aps : true si le filleul accepte le partage de secret
  - pph : hash phrase de parrainage
  */
  async run (parrain, arg) {
    try {
      data.ps = arg.ps
      await data.connexion(true) // On force A NE PAS OUVRIR IDB (compte pas encore connu)

      this.BRK()
      const kpav = await crypt.genKeyPair()
      const kpc = await crypt.genKeyPair()
      const estpar = parrain.data.r !== null

      const compte = new Compte().nouveau(parrain.naf, kpav.privateKey, kpc.privateKey, parrain.data.idcf)
      const rowCompte = await compte.toRow()
      data.setCompte(compte)

      const prefs = new Prefs().nouveau(compte.id)
      data.setPrefs(prefs)
      const rowPrefs = await prefs.toRow()

      const avatar = await new Avatar().nouveau(parrain.naf.id)
      const rowAvatar = await avatar.toRow()

      const compta = new Compta().nouveau(compte.id, estpar ? null : parrain.data.idcp) // du "filleul / introduit"
      compta.compteurs.setF1(parrain.data.f[0])
      compta.compteurs.setF2(parrain.data.f[1])
      if (estpar) compta.compteurs.setRes(parrain.data.r)
      const rowCompta = await compta.toRow()

      const x = parrain.data.aps ? 1 : 0
      const y = arg.aps ? 1 : 0
      const dh = new Date().getTime()
      const ardc = await crypt.crypter(parrain.data.cc, serial([dh, arg.ard]))

      const p = new Contact()
      p.id = parrain.id
      p.ic = parrain.data.icp
      p.v = 0
      p.st = (10 * x) + y
      p.mc = new Uint8Array([MC.NOUVEAU, (estpar ? MC.INTRODUIT : MC.FILLEUL)])
      p.vsh = 0
      const rowContactP = p.toRowP(parrain.data2k, ardc)

      const f = new Contact()
      f.id = parrain.naf.id
      f.ic = parrain.data.icf
      f.v = 0
      f.st = (10 * y) + x
      f.ard = arg.ard
      f.dh = dh
      f.data = { nom: parrain.nap.nom, rnd: parrain.nap.rnd, ic: parrain.data.icp, cc: parrain.data.cc }
      f.mc = new Uint8Array([MC.NOUVEAU, (estpar ? MC.INTRODUCTEUR : MC.PARRAIN)])
      f.info = null
      f.vsh = 0
      const rowContactF = await f.toRow()

      const args = {
        sessionId: data.sessionId,
        pph: arg.pph,
        idf: parrain.naf.id,
        idp: parrain.id,
        idcp: parrain.data.idcp, // id compte parrain
        forfaits: parrain.data.f, // A déduire des ressources du row compta du parrain
        clePubAv: kpav.publicKey,
        clePubC: kpc.publicKey,
        rowCompte,
        rowPrefs,
        rowAvatar,
        rowCompta,
        rowContactP,
        rowContactF
      }
      const ret = await post(this, 'm1', 'acceptParrainage', args)
      if (data.dh < ret.dh) data.dh = ret.dh
      /*
      Le compte vient d'être créé et est déjà dans le modèle (clek enregistrée)
      On peut désérialiser la liste d'items (compte, contact, avatar)
      */
      this.postCreation(ret)

      data.estComptable = false
      const res = this.finOK()
      remplacePage('Compte')
      return res
    } catch (e) {
      return await this.finKO(e)
    }
  }
}

export class RefusParrainage extends OperationUI {
  constructor () {
    super('Refus de parrainage d\'un nouveau compte', OUI, SELONMODE)
  }

  excAffichages () { return [this.excAffichage1, this.excAffichage2] }

  // excActions(), défaut de Operation

  /* arg :
  - ard : réponse du filleul
  - pph : hash phrase de parrainage
  */
  async run (parrain, ard) {
    try {
      await data.connexion(true) // On force A NE PAS OUVRIR IDB (compte pas encore connu)
      const args = {
        sessionId: data.sessionId,
        pph: parrain.pph,
        ardc: await crypt.crypter(parrain.data.cc, serial([new Date().getTime(), ard]))
      }
      await post(this, 'm1', 'refusParrainage', args)
      data.deconnexion()
    } catch (e) {
      await this.finKO(e)
    }
  }
}
