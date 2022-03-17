import { NomAvatar, store, post, get, affichermessage, cfg, sleep, affichererreur, appexc, idToIc, difference, getpj, getJourJ, serial, edvol, equ8, Sid } from './util.mjs'
import { remplacePage } from './page.mjs'
import {
  deleteIDB, idbSidCompte, commitRows, getCompte, getCompta, getArdoise, getPrefs, getCvs,
  getAvatars, getGroupes, getCouples, getMembres, getSecrets,
  purgeAvatars, purgeCvs, purgeGroupes, openIDB, enregLScompte, setEtat, getEtat, getPjidx, putPj
} from './db.mjs'
import { Compte, Avatar, rowItemsToMapObjets, commitMapObjets, data, Prefs, Contact, Invitgr, Compta, Groupe, Membre } from './modele.mjs'
import { AppExc, EXBRK, EXPS, F_BRO, E_BRO, X_SRV, E_WS, MC, t1n, t2n } from './api.mjs'

import { crypt } from './crypto.mjs'
import { schemas } from './schemas.mjs'

const OUI = 1
const NON = 0
const SELONMODE = 2

async function deconnexion () { await data.deconnexion() }

export async function reconnexion () {
  const ps = data.ps
  await data.deconnexion(true)
  data.mode = data.modeInitial
  if (data.mode === 3) {
    new ConnexionCompteAvion().run(ps)
  } else {
    new ConnexionCompte().run(ps)
  }
}
const options0 = [
  { code: 'd', label: 'Retourner au login', color: 'primary' },
  { code: 'r', label: 'Essayer de  reconnecter le compte', color: 'primary' }
]
const options11 = [
  { code: 'c', label: 'Continuer malgré la dégradation du mode', color: 'warning' },
  { code: 'd', label: 'Se déconnecter, retourner au login', color: 'primary' },
  { code: 'r', label: 'Essayer de se reconnecter', color: 'primary' }
]
const options12 = [
  { code: 'c', label: 'Continuer malgré l\'erreur', color: 'warning' },
  { code: 'd', label: 'Se déconnecter, retourner au login', color: 'primary' },
  { code: 'r', label: 'Essayer de se reconnecter', color: 'primary' }
]
const options21 = [
  { code: 'c', label: 'Corriger les données saisies', color: 'primary' },
  { code: 'd', label: 'Se déconnecter, retourner au login', color: 'primary' }
]
const options22 = [
  { code: 'c', label: 'Continuer bien que l\'opération ait échoué', color: 'primary' },
  { code: 'd', label: 'Se déconnecter, retourner au login', color: 'primary' }
]
const options3 = [
  { code: 'd', label: 'Retourner au login', color: 'primary' }
]
const options6 = [
  { code: 'x', label: 'Corriger la phrase secrète saisie', color: 'primary' },
  { code: 'd', label: 'Retourner au login', color: 'primary' }
]
const options7 = [
  { code: 'c', label: 'Corriger les données saisies', color: 'primary' }
]

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

  // Par défaut pour toutes les opérations UI classiques
  excAffichages () { return [this.excAffichage1, this.excAffichage2, this.excAffichage0] }

  // Par défaut pour toutes les opérations UI classiques
  excActions () { return { d: deconnexion, r: reconnexion, default: null } }

  excAffichage0 () { return [options0, null] }

  excAffichage1 () { // exceptions réseau / idb / break
    if (this.appexc.idb || this.appexc.net || this.appexc === EXBRK) {
      const conseil = data.degraderMode()
      return [conseil ? options11 : options12, conseil]
    }
  }

  excAffichage2 () {
    return [this.appexc.code === X_SRV ? options21 : options22, null]
  }

  excAffichage3 () {
    return [options3, null]
  }

  excAffichage4 () {
    if (this.appexc.idb || this.appexc.net || this.appexc === EXBRK) {
      return [options11, data.degraderMode()]
    }
  }

  excAffichage6 () {
    if (this.appexc.code === X_SRV) return [options6, null]
  }

  excAffichage7 () {
    return [this.appexc.code === X_SRV ? options7 : options3, null]
  }

  /*
  excActionc () { // Inutilisé pour l'instant : action retour à l'accueil "compte"
    remplacePage('Compte')
  }
  */

  messageOK () { affichermessage('Succès de l\'opération "' + this.nom + '"') }

  messageKO () {
    affichermessage('Échec de l\'opération "' + this.nom + '"', true)
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
      this.messageKO(true)
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
  async getInvitGrs (compte) {
    const ids = compte.allAvId()
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
      const args = { sessionId: data.sessionId, id: iv.id, idg: iv.idg, ni: iv.ni, datak: iv.datak }
      const ret = await post(this, 'm1', 'regulGr', args)
      if (data.dh < ret.dh) data.dh = ret.dh
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
    const vcv = await commitMapObjets(objets, await rowItemsToMapObjets(ret.rowItems)) // stockés en modele
    if (vcv > nvvcv) nvvcv = vcv
    if (data.db) {
      await commitRows(objets)
      this.BRK()
    }
    return [nvvcv, objets.length]
  }

  async syncPjs () { // A REPRENDRE
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
    /*
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
    */

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

    data.statutsession = 2
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

  excAffichages () { return [this.excAffichage1, this.excAffichage0] }

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

/*********************************************************************/
/* Pour toutes opérations UI
E_WS, '01-Session interrompue. Se déconnecter et tenter de se reconnecter'
*/

/* Création d'un compte comptable******************************************
On poste :
- les rows Compte, Compta, Prefs, v et dds à 0
- les clés publiques du compte et de l'avatar pour la table avrsa
- le row Avatar, v et dds à 0
Retour:
- dh, sessionId
- rowItems retournés : compte compta prefs avatar
X_SRV, '02-Cette phrase secrète n\'est pas reconnue comme étant l\'une des comptables de l\'organisation')
X_SRV, '03-Phrase secrète probablement déjà utilisée. Vérifier que le compte n\'existe pas déjà en essayant de s\'y connecter avec la phrase secrète'
X_SRV, '04-Une phrase secrète semblable est déjà utilisée. Changer a minima la première ligne de la phrase secrète pour ce nouveau compte'
*/
export class CreationCompte extends OperationUI {
  constructor () {
    super('Création d\'un compte de comptable', OUI, SELONMODE)
    this.opsync = true
  }

  ouvrircreation () {
    deconnexion()
    setTimeout(() => {
      this.ouvrircreationcompte()
    }, 100)
  }

  excAffichages () { return [this.excAffichage7] }

  excActions () { return { d: deconnexion, c: this.ouvrircreation, default: null } }

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

      const avatar = new Avatar().nouveau(nomAvatar.id)
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

  excAffichages () { return [this.excAffichage4, this.excAffichage6, this.excAffichage0] }

  excActions () { return { d: deconnexion, x: deconnexion, r: reconnexion, default: null } }

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
      data.statutsession = etat.statut

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

class OpBuf {
  constructor () {
    this.compte = null
    this.prefs = null
    this.compta = null
    this.lmaj = []
    this.lsuppr = []
    // db state
    this.avatar = {}
    this.groupe = {}
    this.couple = {}
    this.membre = {}
    this.secret = {}
  }

  putIDB (obj) { this.lmaj.push(obj) }

  supprIDB (obj) { this.lsuppr.push(obj) } // obj : {table, id, (sid2)}

  // Pour avatar / couple / groupe
  putObj (obj) { this[obj.table][obj.id] = obj }

  // Stocke tous les secrets (donnés par maps des secrets par clé ns) d'un objet maître (avatar / couple / groupe) d'id donnée
  putSecrets (id, map) { this.secret[id] = map }

  // Stocke tous les membres (donnés par maps des membres par clé im) d'un groupe d'id donnée
  putMembres (id, map) { this.membre[id] = map }

  async commiIDB () { await commitRows(this.lmaj, this.lsuppr) }

  commitState () {
    if (this.compte) { store().commit('db/setCompte', this.compte) }
    if (this.prefs) { store().commit('db/setPrefs', this.prefs) }
    if (this.compta) { store().commit('db/setCompte', this.compta) }
    t1n.forEach(t => {
      const s = this[t]
      for (const id in s) store().commit('db/setObjets', s[id])
    })
    t2n.forEach(t => {
      const s = this[t]
      for (const id in s) {
        for (const id2 in s[id]) store().commit('db/setObjets', s[id][id2])
      }
    })
  }
}

/* Connexion à un compte par sa phrase secrète (synchronisé et incognito)
X_SRV, '08-Compte non authentifié : aucun compte n\'est déclaré avec cette phrase secrète'
A_SRV, '09-Données de préférence absentes'
A_SRV, '10-Données de comptabilité absentes'
A_SRV, '11-Données des échanges avec parrain / comptable absentes'
**/
export class ConnexionCompte extends OperationUI {
  constructor () {
    super('Connexion à un compte', OUI, SELONMODE)
    this.opsync = true
  }

  excAffichages () { return [this.excAffichage4, this.excAffichage0, this.excAffichage6] }

  excActions () { return { d: deconnexion, x: deconnexion, r: reconnexion, default: null } }

  /* Obtention de compte / prefs / compta depuis le serveur (si plus récents que ceux connus localement)
  RAZ des abonnements et abonnement au compte
  */
  async chargerCPC (vcompte, vprefs, vcompta) {
    const args = { sessionId: data.sessionId, pcbh: data.ps.pcbh, dpbh: data.ps.dpbh, vcompte, vprefs, vcompta }
    const ret = await post(this, 'm1', 'connexionCompte', args)
    if (data.dh < ret.dh) data.dh = ret.dh
    const compte = ret.rowCompte ? new Compte() : null
    const prefs = ret.rowPrefs ? new Prefs() : null
    const compta = ret.rowCompta ? new Compta() : null
    if (compte) await compte.fromRow(schemas.deserialize('rowcompte', ret.rowCompte.serial))
    if (prefs) await prefs.fromRow(schemas.deserialize('rowprefs', ret.rowPrefs.serial))
    if (compta) await compta.fromRow(schemas.deserialize('rowcompta', ret.rowCompta.serial))
    return [compte, prefs, compta, ret.estComptable]
  }

  async phase0 () { // compte / prefs / compta : abonnement à compte
    const compteIdb = !data.db ? null : await getCompte()
    if (!data.net && (!compteIdb || compteIdb.pcbh !== data.ps.pcbh)) {
      throw new AppExc(F_BRO, 'Compte non enregistré localement : aucune session synchronisée ne s\'est préalablement exécutée sur ce poste avec cette phrase secrète. Erreur dans la saisie de la ligne 2 de la phrase ?')
    }
    const prefsIdb = !data.db ? null : await getPrefs()
    const comptaIdb = !data.db ? null : await getCompta()
    const [compteSrv, prefsSrv, comptaSrv, estComptable] = !data.net ? [null, null, null, false]
      : await this.chargerCPC(compteIdb ? compteIdb.v : 0, prefsIdb ? prefsIdb.v : 0, comptaIdb ? comptaIdb.v : 0)
    this.buf.compte = compteSrv || compteIdb
    this.buf.prefs = prefsSrv || prefsIdb
    this.buf.compta = comptaSrv || comptaIdb
    this.estComptable = estComptable

    // Changement de phrase secrète
    if (data.ps.pcbh !== this.buf.compte.pcbh) throw EXPS
    // Bien que l'utilisateur ait saisie la bonne phrase secrète, elle a pu changer : celle du serveur est installée
    if (data.db) enregLScompte(this.buf.compte.sid)
  }

  /* Recharge depuis le serveur les avatars du compte, abonnement aux avatars */
  async chargerAvatars (idsVers, idc, vc) {
    const args = { sessionId: data.sessionId, idsVers, idc, vc }
    const ret = await post(this, 'm1', 'chargerAv', args)
    if (!ret.ok) return false
    if (data.dh < ret.dh) data.dh = ret.dh
    if (!ret.rowItems.length) return []
    return await rowItemsToMapObjets(ret.rowItems).avatar
  }

  /* Recharge depuis le serveur les groupes et couples des avatars du compte et s'y abonne */
  async chargerGroupesCouples (gridsVers, cpidsVers, avIdsVers, idc, vc) {
    const args = { sessionId: data.sessionId, gridsVers, cpidsVers, avIdsVers, idc, vc }
    const ret = await post(this, 'm1', 'chargerGrCp', args)
    if (!ret.ok) return false
    if (data.dh < ret.dh) data.dh = ret.dh
    const r = await rowItemsToMapObjets(ret.rowItems)
    return [r.groupe || [], r.couple || []]
  }

  /* Récupération des avatars cités dans le compte
  Depuis IDB : il peut y en avoir trop et certains peuvent manquer et d'autres avoir une version dépassée
  Abonnement aux avatars
  Retourne false si la version du compte a changé depuis la phase 0
  */
  async phase1 () {
    const compte = this.buf.compte
    const avatars = data.db ? await getAvatars() : {}
    const setidbav = new Set(); for (const id of avatars) setidbav.add(id)
    const avrequis = compte.allAvId()
    this.buf.nbAvatars = avrequis.size
    const aventrop = difference(setidbav, avrequis) // avatars en IDB NON requis (à supprimer de IDB)
    aventrop.forEach(id => {
      this.buf.supprIDB({ table: 'avatar', id: id })
      delete avatars[id]
    })
    const avidsVers = {}
    const m = compte.mac
    avrequis.forEach(id => {
      const av = avatars[id]
      avidsVers[id] = av ? av.v : 0
      const na = m[Sid(id)].na // sa clé est dans mack du compte
      data.repertoire.setAv(na.nom, na.rnd, true) // l'avatar est stocké en répertoire
    })
    const avnouveaux = !data.net ? [] : await this.chargerAvatars(avidsVers, compte.id, compte.v)
    if (avnouveaux === false) return false// le compte a changé de version, reboucler
    // avnouveaux contient tous les avatars ayant une version plus récente que celle (éventuellement) obtenue de IDB
    avnouveaux.forEach(av => { this.buf.putIDB(av); avatars[av.id] = av })
    // avatars contient la version au top des objets avatars du compte requis et seulement eux
    for (const id in avatars) this.buf.putObj(avatars[id]) // prêts à être mis en state
    return true
  }

  /* Récupération de tous les couples et les groupes cités dans les avatars du compte
  Depuis IDB : il peut y en avoir trop et certains peuvent manquer et d'autres avoir une version dépassée
  Abonnement aux avatars
  Retourne false si une des versions des avatars a changé depuis la phase 1, ou si la version du compte a changé
  */
  async phase2 () {
    const compte = this.buf.compte
    const avatars = this.buf.avatar
    const avidsVers = {}
    for (const id in avatars) avidsVers[id] = avatars[id].v

    // Récupération des groupes et couples de tous les avatars
    const grrequis = new Set()
    const cprequis = new Set()
    for (const id in avatars) {
      const av = avatars[id]
      // this.m1gr = new Map() // clé:ni val: { na du groupe, im de l'avatar dans le groupe }
      av.m1gr.forEach(val => {
        data.repertoire.setGr(val.na.nom, val.na.rnd) // les cles des groupes sont désormais accessibles
        grrequis.add(val.na.id)
      })
      // this.mcc = new Map() // clé: id du couple, val: clé cc
      av.mcc.forEach((cc, id) => {
        data.repertoire.setCp(cc) // les cles des couples sont désormais accessibles
        cprequis.add(id)
      })
    }
    this.buf.nbGroupes = grrequis.size
    this.buf.nbCouples = cprequis.size
    const groupes = data.db ? await getGroupes() : {}
    const setidbgr = new Set(); for (const id of groupes) setidbgr.add(id)
    const couples = data.db ? await getCouples() : {}
    const setidbcp = new Set(); for (const id of groupes) setidbgr.add(id)
    const grentrop = difference(setidbgr, grrequis) // groupes en IDB NON requis (à supprimer de IDB)
    grentrop.forEach(id => {
      this.buf.supprIDB({ table: 'groupe', id: id })
      delete groupes[id]
    })
    const cpentrop = difference(setidbcp, cprequis) // couples en IDB NON requis (à supprimer de IDB)
    cpentrop.forEach(id => {
      this.buf.supprIDB({ table: 'couple', id: id })
      delete couples[id]
    })

    const gridsVers = {}
    grrequis.forEach(id => { const obj = groupes[id]; gridsVers[id] = obj ? obj.v : 0 })
    const cpidsVers = {}
    cprequis.forEach(id => { const obj = couples[id]; cpidsVers[id] = obj ? obj.v : 0 })

    const x = !data.net ? [] : await this.chargerGroupesCouples(gridsVers, cpidsVers, avidsVers, compte.id, compte.v)
    if (x === false) return false // le compte ou les avatars ont changé de version

    const [grnouveaux, cpnouveaux] = x
    // grnouveaux contient tous les groupes ayant une version plus récente que celle (éventuellement) obtenue de IDB
    grnouveaux.forEach(gr => { this.buf.putIDB(gr); groupes[gr.id] = gr })
    // groupes contient la version au top des objets groupes du compte requis par ses avatars et seulement eux
    for (const id in groupes) this.buf.putObj(groupes[id]) // prêts à être mis en state

    // cpnouveaux contient tous les couples ayant une version plus récente que celle (éventuellement) obtenue de IDB
    cpnouveaux.forEach(cp => { this.buf.putIDB(cp); couples[cp.id] = cp })
    // couples contient la version au top des objets couples du compte requis par ses avatars et seulement eux
    for (const id in couples) {
      const c = couples[id]
      this.buf.putObj(c) // prêts à être mis en state
      // un couple peut générer une carte de visite sur son conjoint externe
      data.repertoire.avIECp(id, c.data.x)
    }
    return true
  }

  /* Recharge depuis le serveur tous les secrets d'id (avatar / couple / groupe) donnée et de version postérieure à v
  Remplit aussi la liste des secrets à mettre à jour et à supprimer de IDB
  Un secret peut être supprimé : s'il figurait dans la source, il y est enlevé
  */
  async chargerSc (id, v, src) { // lav : set des avatars utiles
    const ret = await post(this, 'm1', 'secretsParId', { sessionId: data.sessionId, id, v })
    if (data.dh < ret.dh) data.dh = ret.dh
    const x = await rowItemsToMapObjets(ret.rowItems)
    if (x.secret) {
      x.secret.forEach(s => {
        if (s.suppr) {
          if (src[id] && src[id][s.ns]) delete src[id][s.ns]
          this.buf.supprIDB({ table: 'secret', id: id, id2: s.ns })
        } else {
          let e = src[id]; if (!e) { e = {}; src[id] = e }
          e[s.ns] = s
          this.buf.putIDB(s)
        }
      })
    }
  }

  /* Recharge depuis le serveur tous les membres d'id de groupe donnée et de version postérieure à v
    Remplit aussi la liste des membres à mettre à jour en IDB
  */
  async chargerMb (id, v, src) { // lav : set des avatars utiles
    const ret = await post(this, 'm1', 'membresParId', { sessionId: data.sessionId, id, v })
    if (data.dh < ret.dh) data.dh = ret.dh
    const x = await rowItemsToMapObjets(ret.rowItems)
    if (x.membre) {
      x.membre.forEach(m => {
        let e = src[id]; if (!e) { e = {}; src[id] = e }
        e[m.ns] = m
        this.buf.putIDB(m)
      })
    }
  }

  /* Récupération des membres et secrets requis par les avatars / couples / groupes */
  async phase3 () {
    /* Récupération depuis IDB (éventuellement) les membres et secrets stockés
    - groupés par id de l'objet maître
    - avec la version la plus récente par objet maître
    */
    const [membres, vmbIdb] = data.db ? getMembres() : [{}, {}]
    const [secrets, vscIdb] = data.db ? getSecrets() : [{}, {}]

    /* Récupération depuis le serveur des versions plus récentes des secrets et membres
    pour chaque objet maître et qu'il y en ait eu ou non trouvée en IDB
    */
    if (data.net) {
      for (const id in this.buf.avatars) await this.chargerSc(id, vscIdb[id] || 0, secrets)
      for (const id in this.buf.groupes) {
        await this.chargerSc(id, vmbIdb[id] || 0, membres)
        await this.chargerSc(id, vscIdb[id] || 0, secrets)
      }
      for (const id in this.buf.couples) await this.chargerSc(id, vscIdb[id] || 0, secrets)
    }
    /* Préparation pour mise à jour du modèle */
    for (const id in membres) {
      const mapm = membres[id]
      this.buf.putMembres(mapm)
      // un membre génère une carte de visite
      for (const im in mapm) {
        const m = mapm[im]
        data.repertoire.setMembre(m.data.nom, m.data.rnd, m.id)
      }
    }
    for (const id in secrets) this.buf.putSecrets(secrets[id])
  }

  /* Recharge depuis le serveur tous les membres d'id de groupe donnée et de version postérieure à v
  Remplit aussi la liste des membres à mettre à jour en IDB
  */
  async chargerCv (utiles, v, src) { // lav : set des avatars utiles
    const args = { sessionId: data.sessionId, v, lids: Array.from(utiles) }
    const ret = await post(this, 'm1', 'chargerCVs', args)
    if (data.dh < ret.dh) data.dh = ret.dh
    const x = await rowItemsToMapObjets(ret.rowItems)
    if (x.cv) {
      x.cv.forEach(c => {
        src[c.id] = c
        this.buf.putIDB(c)
      })
    }
  }

  // Récupérer, syynchroniser les CVs et s'y abonner
  async phase4 () {
    const utiles = data.repertoire.avUtiles()
    const [cvs, maxv] = data.db ? getCvs(utiles, this.buf) : [{}, 0]
    if (data.net && utiles.size) await this.chargerCv(utiles, maxv, cvs)
    for (const id in cvs) data.repertoire.setCv(cvs[id])
  }

  async run (ps, razdb) {
    try {
      data.statutsession = 1
      this.buf = new OpBuf()
      data.ps = ps

      if (data.net && razdb) {
        await deleteIDB()
        await sleep(100)
        console.log('RAZ db')
      }
      if (!data.net && !idbSidCompte()) {
        throw new AppExc(F_BRO, 'Compte non enregistré localement : aucune session synchronisée ne s\'est préalablement exécutée sur ce poste avec cette phrase secrète. Erreur dans la saisie de la ligne 1 de la phrase ?')
      }
      await data.connexion()
      this.BRK()

      for (let nb = 0; nb < 10; nb++) {
        if (nb >= 5) throw new AppExc(E_BRO, 'Plus de 5 tentatives de connexions. Bug ou incident temporaire. Ré-essayer un peu plus tard')
        // obtention du compte / prefs / compta depuis le serveur et commit
        data.repertoire.raz()
        if (!await this.phase0()) continue // obtention du compte
        if (!await this.phase1()) continue // obtention des avatars du compte
        if (!await this.phase2()) continue // obtention des groupes et couples des avatars du compte
      }
      /* YES ! on a tous les objets maîtres compte / avatar / groupe / couple) à jour, abonnés et signés */

      // Récupération des membres et secrets
      await this.phase3()

      // Récupérer, syynchroniser les CVs et s'y abonner
      await this.phase4()

      // Recharger les pièces jointes manquantes A REPRENDRE
      const [nbp, vol] = await this.syncPjs()
      this.majsynclec({ st: 1, sid: '$PJ', nom: 'Pièces jointes "avion" : ' + edvol(vol), nbl: nbp })

      /* on récupère les éventuelles invitations aux groupes
      Elles seront de facto traitées en synchronisation quand un avatar reviendra avec un lgrk étendu
      */
      if (data.net) await this.getInvitGrs(this.buf.compte)

      // Finalisation en une seule fois: commit en IDB et state/db des données accumulées
      if (data.db) await this.buf.commiIDB()
      this.buf.commitState()

      /*
      // Traiter les notifications éventuellement arrivées. DISCUTABLE
      while (data.syncqueue.length) {
        const q = data.syncqueue
        data.syncqueue = []
        await this.traiteQueue(q)
      }
      */

      /*
      // Enregistrer l'état de synchro. DISCUTABLE
      data.statutsession = 2
      if (data.dhsync < data.dh) data.dhsync = data.dh
      if (data.db) {
        await setEtat()
      }
      */

      data.statutsession = 2
      this.finOK()
      remplacePage('Compte')
    } catch (e) {
      await this.finKO(e)
    }
  }
}

/******************************************************
Mise à jour d'une préférence d'un compte
X_SRV, '06-Compte non trouvé. Ne devrait pas arriver (bug probable)'
*/
export class PrefCompte extends OperationUI {
  constructor () {
    super('Mise à jour d\'une préférence du compte', OUI, SELONMODE)
  }

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
A_SRV, '07-Avatar non trouvé'
*/
export class CvAvatar extends OperationUI {
  constructor () {
    super('Mise à jour de la carte de visite d\'un avatar', OUI, SELONMODE)
  }

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
X_SRV, '12-Forfait dépassé'
*/
export class NouveauSecret extends OperationUI {
  constructor () {
    super('Création d\'un nouveau secret', OUI, SELONMODE)
  }

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
A_SRV, '13-Secret inexistant'
X_SRV, '12-Forfait dépassé'
*/
export class Maj1Secret extends OperationUI {
  constructor () {
    super('Mise à jour d\'un secret', OUI, SELONMODE)
  }

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
A_SRV, '13-Secret inexistant'
X_SRV, '12-Forfait dépassé'
*/
export class PjSecret extends OperationUI {
  constructor () {
    super('Mise à jour d\'une pièce jointe d\'un secret', OUI, SELONMODE)
  }

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
X_SRV, '14-Cette phrase de parrainage est trop proche d\'une déjà enregistrée' + x
*/

export class NouveauParrainage extends OperationUI {
  constructor () {
    super('Parrainage d\'un nouveau compte', OUI, SELONMODE)
  }

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
      const datax = {
        idcp: compte.id,
        idcf,
        nomp: nap.nom,
        rndp: nap.rnd,
        icp,
        nomf: naf.nom,
        rndf: naf.rnd,
        icf,
        cc,
        aps: arg.aps,
        f: arg.forfaits,
        r: arg.ressources
      }
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
      return this.finOK()
    } catch (e) {
      return await this.finKO(e)
    }
  }
}

/******************************************************************
Suppression / prolongation d'un parrainage : args de m1/supprParrainage
args : sessionId, pph, dlv: 0 (suppr) 999 (prolongation)
Retour : dh
X_SRV, '15-Phrase de parrainage inconnue'
X_SRV, '16-Ce parrainage a déjà fait l\'objet ' + (p.st !== 1 ? 'd\'une acceptation.' : 'd\'un refus'
*/

export class SupprParrainage extends OperationUI {
  constructor () {
    super('Suppression / prolongation d\'un parrainage', OUI, SELONMODE)
  }

  async run (arg) {
    try {
      const args = { sessionId: data.sessionId, pph: arg.pph, dlv: arg.dlv }
      const ret = await post(this, 'm1', 'supprParrainage', args)
      if (data.dh < ret.dh) data.dh = ret.dh
      this.finOK()
    } catch (e) {
      await this.finKO(e)
    }
  }
}
/******************************************************************
 * Acceptation d'un parrainage
 * - sessionId
 * - pph : hash de la phrase de parrainage
 * - idp : de l'avatar parrain
 * - icp : ic du contact du filleul chez le parrain
 * - idcp : id du compte parrain pour maj de son row compta
 * - ardc : mot du filleul crypté par la clé du couple
 * - idf : id du filleul (avatar)
 * - icbc : indice de P comme contact chez F crypté par leur clé cc
 * - clePubAv, clePubC : clés publiques de l'avatar et du compte
 * - rowCompte, rowCompta, rowAvatar, rowPrefs, rowContactF ("MOI" le filleul), rowContactP (du parrain)
 *  : v attribuées par le serveur
 * Retour : sessionId, dh
A_SRV, '17-Compte parrain : données de comptabilité absentes'
X_SRV, '18-Réserves de volume insuffisantes du parrain pour attribuer ces forfaits'
X_SRV, '03-Phrase secrète probablement déjà utilisée. Vérifier que le compte n\'existe pas déjà en essayant de s\'y connecter avec la phrase secrète'
X_SRV, '04-Une phrase secrète semblable est déjà utilisée. Changer a minima la première ligne de la phrase secrète pour ce nouveau compte'
X_SRV, '15-Phrase de parrainage inconnue'
X_SRV, '16-Ce parrainage a déjà fait l\'objet ' + (p.st !== 1 ? 'd\'une acceptation.' : 'd\'un refus'
 */

export class AcceptationParrainage extends OperationUI {
  constructor () {
    super('Acceptation du parrainage d\'un nouveau compte', OUI, SELONMODE)
    this.opsync = true
  }

  excAffichages () { return [this.excAffichage1, this.excAffichage3] }

  excActions () { return { d: deconnexion, default: null } }

  /* arg :
  - ps : phrase secrète
  - ard : réponse du filleul
  - aps : true si le filleul accepte le partage de secret
  - pph : hash phrase de parrainage
  */
  async run (parrain, arg) {
    try {
      // LE COMPTE EST CELUI DU FILLEUL
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

      const avatar = new Avatar().nouveau(parrain.naf.id)
      const rowAvatar = await avatar.toRow()

      const compta = new Compta().nouveau(compte.id, estpar ? null : parrain.data.idcp) // du "filleul / introduit"
      compta.compteurs.setF1(parrain.data.f[0])
      compta.compteurs.setF2(parrain.data.f[1])
      if (estpar) compta.compteurs.setRes(parrain.data.r)
      const rowCompta = await compta.toRow()

      const x = parrain.data.aps ? 1 : 0
      const y = arg.aps ? 1 : 0 // y c'est MOI
      const dh = new Date().getTime()

      const p = new Contact() // Contact dans LE COMPTE PARRAIN
      p.id = parrain.id
      p.ic = parrain.data.icp
      p.v = 0
      p.st = (10 * x) + y
      p.ncc = y ? parrain.data.idcf : null // si j'accepte le partage, le parrain a mon numéro de compte
      p.ard = arg.ard
      p.dh = dh
      p.mc = new Uint8Array([MC.NOUVEAU, (estpar ? MC.INTRODUIT : MC.FILLEUL)])
      p.info = null
      p.vsh = 0
      const rowContactP = await p.toRow(parrain.data2k, parrain.data.cc)

      const f = new Contact() // Contact dans "MON" COMPTE
      f.id = parrain.naf.id
      f.ic = parrain.data.icf
      f.v = 0
      f.st = (10 * y) + x // si le parrain accepte le partage, J'AI son numéro de compte
      p.ncc = x ? parrain.data.idcp : null
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
        idcp: parrain.data.idcp, // id compte parrain : pour maj de son row compta
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

/*
X_SRV, '15-Phrase de parrainage inconnue'
X_SRV, '16-Ce parrainage a déjà fait l\'objet ' + (p.st !== 1 ? 'd\'une acceptation.' : 'd\'un refus'
*/
export class RefusParrainage extends OperationUI {
  constructor () {
    super('Refus de parrainage d\'un nouveau compte', OUI, SELONMODE)
  }

  excAffichages () { return [this.excAffichage3] }

  excActions () { return { d: deconnexion, default: null } }

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
      await data.deconnexion()
    } catch (e) {
      await this.finKO(e)
    }
  }
}

/*********************************************************
 * MAJ Contact
 */

export class MajContact extends OperationUI {
  constructor () {
    super('Mise à jour d\'un contact', OUI, SELONMODE)
  }

  /* arg :
  - aps : accepte le partage de secret
  - ard : ardoise
  - mc : mots clés
  - info
  */
  async run (contact, arg) {
    try {
      const compte = data.getCompte()
      const nccc = arg.aps ? await crypt.crypter(contact.data.cc, '' + compte.id) : null
      const ardc = arg.ard !== contact.ard
        ? await crypt.crypter(contact.data.cc, serial([new Date().getTime(), arg.ard]))
        : null
      const args = {
        sessionId: data.sessionId,
        id: contact.id,
        ic: contact.ic,
        idb: contact.id2,
        icb: contact.ic2,
        nccc,
        ardc,
        infok: arg.info === contact.info ? null : await crypt.crypter(data.clek, arg.info),
        mc: equ8(arg.mc, contact.mc) ? null : arg.mc
      }
      const ret = await post(this, 'm1', 'majContact', args)
      if (data.dh < ret.dh) data.dh = ret.dh
      this.finOK()
    } catch (e) {
      await this.finKO(e)
    }
  }
}

/* Creation nouvel avatar ****************************************
- sessionId, clePub, idc (numéro du compte), vcav, mack, rowAvatar
Retour :
- sessionId
- dh
- statut : 0:OK, 1:retry (version compte ayant évolué)
A_SRV, '06-Compte non trouvé'
*/
export class CreationAvatar extends OperationUI {
  constructor () {
    super('Création d\'un nouvel avatar', OUI, SELONMODE)
  }

  async run (nom) { // argument : nom du nouvel avatar
    let n = 1
    try {
      while (true) {
        const nomAvatar = new NomAvatar(nom) // nouveau
        const kpav = await crypt.genKeyPair()

        const compte = data.getCompte()
        const mack = await compte.ajoutAvatar(nomAvatar, kpav)

        const avatar = new Avatar().nouveau(nomAvatar.id)
        const rowAvatar = await avatar.toRow()

        const args = { sessionId: data.sessionId, idc: compte.id, vcav: compte.v, clePub: kpav.publicKey, mack, rowAvatar }
        const ret = await post(this, 'm1', 'creationAvatar', args)
        if (ret.statut === 1) {
          affichermessage('(' + n++ + ')-Petit incident, nouvel essai en cours, merci d\'attendre', true)
          await sleep(2000)
        } else {
          if (data.dh < ret.dh) data.dh = ret.dh
          break
        }
      }
      this.finOK()
    } catch (e) {
      await this.finKO(e)
    }
  }
}

/* Mise à jour des mots clés d'un groupe ****************************************
- sessionId
Retour :
- sessionId
- dh
*/
export class MajMcGroupe extends OperationUI {
  constructor () {
    super('Mise à jour des mots clés d\'un groupe', OUI, SELONMODE)
  }

  async run (groupe, mmc) { // arguments : groupe, map des mots clés
    try {
      const args = { sessionId: data.sessionId, idg: groupe.id, mcg: await groupe.toMcg(mmc) }
      const ret = await post(this, 'm1', 'majmcGroupe', args)
      if (data.dh < ret.dh) data.dh = ret.dh
      this.finOK()
    } catch (e) {
      await this.finKO(e)
    }
  }
}

/* Mise à jour de la carte de visite d'un groupe ****************************************
- sessionId
Retour :
- sessionId
- dh
*/
export class MajCvGroupe extends OperationUI {
  constructor () {
    super('Mise à jour des mots clés d\'un groupe', OUI, SELONMODE)
  }

  // arguments : groupe, cv {ph: , info: }
  async run (groupe, cv) {
    try {
      const args = { sessionId: data.sessionId, idg: groupe.id, cvg: await groupe.toCvg(cv) }
      const ret = await post(this, 'm1', 'majcvGroupe', args)
      if (data.dh < ret.dh) data.dh = ret.dh
      this.finOK()
    } catch (e) {
      await this.finKO(e)
    }
  }
}

/* Mise à jour du statut d'archivage d'un groupe ****************************************
- sessionId
Retour :
- sessionId
- dh
*/
export class MajArchGroupe extends OperationUI {
  constructor () {
    super('Mise à jour des mots clés d\'un groupe', OUI, SELONMODE)
  }

  // arguments : groupe, arch
  async run (groupe, arch) {
    try {
      const args = { sessionId: data.sessionId, idg: groupe.id, arch }
      const ret = await post(this, 'm1', 'majarchGroupe', args)
      if (data.dh < ret.dh) data.dh = ret.dh
      this.finOK()
    } catch (e) {
      await this.finKO(e)
    }
  }
}

/* Mise à jour du statut de blocage d'invitations d'un groupe ****************************************
- sessionId
Retour :
- sessionId
- dh
*/
export class MajBIGroupe extends OperationUI {
  constructor () {
    super('Mise à jour des mots clés d\'un groupe', OUI, SELONMODE)
  }

  // arguments : groupe, blocage (true / false)
  async run (groupe, blocage) {
    try {
      const args = { sessionId: data.sessionId, idg: groupe.id, blocage }
      const ret = await post(this, 'm1', 'majBIGroupe', args)
      if (data.dh < ret.dh) data.dh = ret.dh
      this.finOK()
    } catch (e) {
      await this.finKO(e)
    }
  }
}

/* Création d'un nouveau groupe ****************************************
args :
- sessionId
- ida : id de l'avatar créateur
- ni : numéro d'inscription
- datak : [] du terme de lgrk
- rowGroupe
- rowMembre
Retour :
- sessionId
- dh
*/
export class CreationGroupe extends OperationUI {
  constructor () {
    super('Création d\'un nouveau groupe', OUI, SELONMODE)
  }

  async run (avatar, nom, forfaits) { // arguments : nom (string), forfaits [f1, f2]
    try {
      const im = crypt.rnd4()
      const groupe = new Groupe().nouveau(nom, im, forfaits)
      const na = groupe.na
      const rowGroupe = await groupe.toRow()

      const membre = new Membre().nouveau(groupe.id, im, avatar.na)
      const rowMembre = await membre.toRow()
      const ni = membre.data.ni

      const lgr = [na.nom, na.rnd, im]
      const datak = await crypt.crypter(data.clek, serial(lgr))

      const args = {
        sessionId: data.sessionId,
        ida: avatar.id,
        ni,
        datak,
        rowGroupe,
        rowMembre
      }
      const ret = await post(this, 'm1', 'creationGroupe', args)
      if (data.dh < ret.dh) data.dh = ret.dh
      this.finOK()
    } catch (e) {
      await this.finKO(e)
    }
  }
}

/* Mise à jour des mots clés d'un membre d'un groupe ****************************************
- sessionId, id, im, mc
Retour :
- sessionId, dh
*/
export class MajMcMembre extends OperationUI {
  constructor () {
    super('Mise à jour des mots clés d\'un membre d\'un groupe', OUI, SELONMODE)
  }

  async run (m, mc) {
    try {
      const args = { sessionId: data.sessionId, id: m.id, im: m.im, mc }
      const ret = await post(this, 'm1', 'majmcMembre', args)
      if (data.dh < ret.dh) data.dh = ret.dh
      this.finOK()
    } catch (e) {
      await this.finKO(e)
    }
  }
}

/* Mise à jour de l'ardoise d'un membre d'un groupe ****************************************
- sessionId, id, im, texte
Retour :
- sessionId, dh
*/
export class MajArdMembre extends OperationUI {
  constructor () {
    super('Mise à jour de l\'ardoise d\'un membre d\'un groupe', OUI, SELONMODE)
  }

  async run (m, texte) {
    try {
      const ardg = await m.toArdg(texte)
      const args = { sessionId: data.sessionId, id: m.id, im: m.im, ardg }
      const ret = await post(this, 'm1', 'majardMembre', args)
      if (data.dh < ret.dh) data.dh = ret.dh
      this.finOK()
    } catch (e) {
      await this.finKO(e)
    }
  }
}

/* Mise à jour du commentaire d'un membre d'un groupe ****************************************
- sessionId, id, im, infok
Retour :
- sessionId, dh
*/
export class MajInfoMembre extends OperationUI {
  constructor () {
    super('Mise à jour de l\'ardoise d\'un membre d\'un groupe', OUI, SELONMODE)
  }

  async run (m, texte) {
    try {
      const infok = await crypt.crypter(data.clek, texte)
      const args = { sessionId: data.sessionId, id: m.id, im: m.im, infok }
      const ret = await post(this, 'm1', 'majinfoMembre', args)
      if (data.dh < ret.dh) data.dh = ret.dh
      this.finOK()
    } catch (e) {
      await this.finKO(e)
    }
  }
}

/* Fin d'hébergement d'un groupe ****************************************
args :
- sessionId
- idc, idg : id du compte, id = groupe
- imh : indice de l'avatar membre hébergeur
Retour: sessionId, dh
A_SRV, '10-Données de comptabilité absentes'
A_SRV, '18-Groupe non trouvé'
X_SRV, '22-Ce compte n\'est pas l\'hébergeur actuel du groupe'
*/
export class FinHebGroupe extends OperationUI {
  constructor () {
    super('Fin d\'hébergement d\'un groupe', OUI, SELONMODE)
  }

  async run (g) {
    try {
      const args = { sessionId: data.sessionId, idc: data.getCompte().id, idg: g.id, imh: g.imh }
      const ret = await post(this, 'm1', 'finhebGroupe', args)
      if (data.dh < ret.dh) data.dh = ret.dh
      this.finOK()
    } catch (e) {
      await this.finKO(e)
    }
  }
}

/* Début d'hébergement d'un groupe ****************************************
args :
- sessionId
- idc, idg : id du compte, id = groupe,
- idhg : idg crypté par la clé G du groupe
- imh : indice de l'avatar membre hébergeur
Retour: sessionId, dh
A_SRV, '10-Données de comptabilité absentes'
A_SRV, '18-Groupe non trouvé'
X_SRV, '20-Groupe encore hébergé : un nouvel hébergeur ne peut se proposer que si le groupe n\'a plus de compte hébergeur'
X_SRV, '21-Forfaits (' + f + ') insuffisants pour héberger le groupe.'
*/
export class DebHebGroupe extends OperationUI {
  constructor () {
    super('Début d\'hébergement d\'un groupe', OUI, SELONMODE)
  }

  async run (g, imh) {
    try {
      const idc = data.getCompte().id
      const idhg = await g.toIdhg(idc)
      const args = { sessionId: data.sessionId, idc, idg: g.id, idhg, imh }
      const ret = await post(this, 'm1', 'debhebGroupe', args)
      if (data.dh < ret.dh) data.dh = ret.dh
      this.finOK()
    } catch (e) {
      await this.finKO(e)
    }
  }
}

/* Mise à jour des volumes max d'un groupe ****************************************
args :
- sessionId
- idg : du groupe,
- imh : indice de l'avatar membre hébergeur
- forfaits: [max1, max2]
Retour: sessionId, dh
A_SRV, '18-Groupe non trouvé'
A_SRV, '22-Groupe hébergé par un autre compte'
X_SRV, '21-Forfaits (' + f + ') insuffisants pour héberger le groupe.'
*/
export class MajvmaxGroupe extends OperationUI {
  constructor () {
    super('Mise à jour des volumes maximaux d\'un groupe', OUI, SELONMODE)
  }

  async run (g, imh, f) {
    try {
      const args = { sessionId: data.sessionId, idg: g.id, imh, forfaits: f }
      const ret = await post(this, 'm1', 'majvmaxGroupe', args)
      if (data.dh < ret.dh) data.dh = ret.dh
      this.finOK()
    } catch (e) {
      await this.finKO(e)
    }
  }
}

/* Nouveau contact d'un groupe ****************************************
args :
- sessionId
- rowMembre : objet membre
Retour: sessionId, dh
A_SRV, '18-Groupe non trouvé'
*/
export class ContactGroupe extends OperationUI {
  constructor () {
    super('Nouveau contact d\'un groupe', OUI, SELONMODE)
  }

  async run (g, id, idi) {
    try {
      const m = new Membre().nouveau(g.id, crypt.rnd4(), data.getNa(id), idi)
      m.st = 0
      const rowMembre = await m.toRow()
      const args = { sessionId: data.sessionId, rowMembre }
      const ret = await post(this, 'm1', 'contactGroupe', args)
      if (data.dh < ret.dh) data.dh = ret.dh
      this.finOK()
    } catch (e) {
      await this.finKO(e)
    }
  }
}

/* Inviter un contact d'un groupe ****************************************
args :
- sessionId
- rowMembre : objet membre
Retour: sessionId, dh
A_SRV, '18-Groupe non trouvé'
*/
export class InviterGroupe extends OperationUI {
  constructor () {
    super('Inviter un contact d\'un groupe', OUI, SELONMODE)
  }

  async run (g, m, laa) {
    try {
      const clepub = await get('m1', 'getclepub', { sessionId: data.sessionId, sid: m.namb.sid })
      if (!clepub) throw new AppExc(E_BRO, '23-Cle RSA publique d\'avatar non trouvé')

      const invitgr = new Invitgr()
      /*
      - `id` : id du membre invité.
      - `ni` : numéro d'invitation.
      - `datap` : crypté par la clé publique du membre invité.
        - `[nom rnd im]` : nom complet du groupe (donne sa clé) + son indice de membre dans le groupe
      */
      invitgr.id = m.namb.id
      invitgr.ni = m.data.ni
      const na = g.na
      invitgr.data = [na.nom, na.rnd, m.im]
      const rowInvitgr = await invitgr.toRow(clepub)
      const args = { sessionId: data.sessionId, rowInvitgr, id: m.id, im: m.im, st: 10 + laa }
      const ret = await post(this, 'm1', 'inviterGroupe', args)
      if (data.dh < ret.dh) data.dh = ret.dh
      this.finOK()
    } catch (e) {
      await this.finKO(e)
    }
  }
}
