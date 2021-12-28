import { NomAvatar, store, post, affichermessage, cfg, sleep, affichererreur, appexc, serial } from './util.mjs'
import { remplacePage } from './page.mjs'
import {
  deleteIDB, idbSidCompte, commitRows, getCompte, getAvatars, getContacts, getCvs,
  getGroupes, getInvitcts, getInvitgrs, getMembres, getParrains, getRencontres, getSecrets,
  purgeAvatars, purgeCvs, purgeGroupes, openIDB, enregLScompte, setEtat, getEtat
} from './db.mjs'
import { Compte, Avatar, Invitgr, newObjet, commitMapObjets, data, SIZEAV, SIZEGR } from './modele.mjs'
import { AppExc, EXBRK, EXPS, F_BRO, X_SRV, INDEXT } from './api.mjs'

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
      } else {
        if (!res[item.table]) res[item.table] = []
        const obj = newObjet(item.table)
        await obj.fromRow(row)
        res[item.table].push(obj)
      }
    }
    return res
  }

  async abonnements (compte) {
    // Abonner / signer la session au compte, avatars et groupes
    // si compte est absent, PAS de signature
    const lav = data.setDesAvatars
    const lgr = data.setDesGroupes
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

  /*
  Recharge depuis le serveur les avatars (et les tables associées)
  et les groupes (et membres) des listes lav et lgr
  */
  async chargerAvGr (lav, lgr) {
    const estws = this instanceof OperationWS
    // synchroniser les avatars
    if (lav && lav.size) {
      const ar = Array.from(lav)
      for (let i = 0; i < ar.length; i++) {
        const id = ar[i]
        const sid = crypt.idToSid(id)
        const lv = !estws && data.verAv.get(sid) ? data.verAv.get(sid) : new Array(SIZEAV).fill(0)
        const ret = await post(this, 'm1', 'syncAv', { sessionId: data.sessionId, avgr: id, lv })
        if (data.dh < ret.dh) data.dh = ret.dh
        const objets = []
        commitMapObjets(objets, await this.rowItemsToMapObjets(ret.rowItems)) // stockés en modele
        if (!estws) {
          const av = data.getAvatar(id)
          this.majsynclec({ st: 1, sid: sid, nom: 'Avatar ' + av.na.nomc, nbl: objets.length })
        }
        if (data.db) {
          await commitRows(objets)
          this.BRK()
        }
      }
    }

    // synchroniser les groupes
    if (lgr && lgr.size) {
      const ar = Array.from(lgr)
      for (let i = 0; i < ar.length; i++) {
        const id = ar[i]
        const sid = crypt.idToSid(id)
        const lv = data.verGr.get(sid) ? data.verGr.get(sid) : new Array(SIZEGR).fill(0)
        const ret = await post(this, 'm1', 'syncGr', { sessionId: data.sessionId, avgr: id, lv })
        if (data.dh < ret.dh) data.dh = ret.dh
        const objets = []
        commitMapObjets(objets, await this.rowItemsToMapObjets(ret.rowItems)) // stockés en modele
        if (!estws) {
          const gr = data.getGroupe(id)
          this.majsynclec({ st: 1, sid: sid, nom: 'Groupe ' + gr.info, nbl: objets.length })
        }
        if (data.db) {
          await commitRows(objets)
          this.BRK()
        }
      }
    }
  }

  /* Synchronisation et abonnements des CVs */
  async syncCVs (nvvcv) {
    const estws = this instanceof OperationWS
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
    if (!estws) {
      this.majsynclec({ st: 1, sid: '$CV', nom: 'Cartes de visite', nbl: objets.length })
    }
    if (data.db) {
      await commitRows(objets)
      this.BRK()
    }
    return nvvcv
  }

  async traiteQueue (q) {
    const lavAvant = data.setDesAvatars
    const lgrAvant = data.setDesGroupes

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

    /* Traitement spécial du compte */
    if (mapObj.compte) {
      // Une mise à jour de compte est notifiée
      data.setCompte(mapObj.compte)
      objets.push(mapObj.compte)
    }

    /* Mise en store de tous les autres objets */
    const vcv = commitMapObjets(objets, mapObj)

    if (data.db) {
      await commitRows(objets)
      this.BRK()
    }

    /*
    Il y a :
    - des avatars du compte devenus inutiles (supprimés)
    - des groupes devenus inutiles (disparus / accès résilés)
    - de nouveaux avatars du compte (utiles)
    - de nouveaux groupes utiles ET DONT IL FAUT CHARGER LES MEMBRES et leurs CV
    */

    const lavApres = data.setDesAvatars
    const lgrApres = data.setDesGroupes

    // Purge des avatars / groupes inutiles et détection des manquants
    const lavAPurger = new Set()
    const lavManquants = new Set()
    const lgrAPurger = new Set()
    const lgrManquants = new Set()
    lavAvant.forEach((sid) => { if (!lavApres.has(sid)) lavManquants.add(sid) })
    lavApres.forEach((sid) => { if (!lavAvant.has(sid)) lavAPurger.add(sid) })
    lgrAvant.forEach((sid) => { if (!lgrApres.has(sid)) lgrManquants.add(sid) })
    lgrApres.forEach((sid) => { if (!lgrAvant.has(sid)) lgrAPurger.add(sid) })
    if (lavAPurger.size) data.purgeAvatars(lavApres)
    if (lgrAPurger.size) data.purgeGroupes(lgrApres)
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
    await this.chargerAvGr(lavManquants, lgrManquants)

    // Synchroniser les CVs (et s'abonner)
    const nvvcv = await this.syncCVs(vcv)
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
  async chargementIdb () {
    const hls = [] // objets hors limite, pour purge de IDB à la fin du chargement

    this.razidblec()
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

    /* chargement des CVs. Au début pour avoir le moins de fake
    possible dans le répertoire */
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
      const avatar = new Avatar().nouveau(nomAvatar.id)
      const rowAvatar = await avatar.toRow()

      const args = { sessionId: data.sessionId, mdp64: mdp.mdp64, q1: quotas.q1, q2: quotas.q2, qm1: quotas.qm1, qm2: quotas.qm2, clePub: kp.publicKey, rowCompte, rowAvatar }
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
      const [rows] = commitMapObjets(mapObj)
      rows.push(compte2)

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
        await commitRows(rows)
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

      await this.chargementIdb()

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
    return await c.fromRow(rowCompte)
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
      data.setCompte(compte)

      if (data.db) {
        enregLScompte(compte.sid) // La phrase secrète a pu changer : celle du serveur est installée
        await commitRows([compte])
        this.BRK()
        await this.chargementIdb()
      }

      data.idbSetAvatars = data.setDesAvatars
      data.idbSetGroupes = data.setDesGroupes
      data.idbsetCvsUtiles = data.repertoire.setCvsUtiles

      if (data.db) {
        /* Relecture du compte qui pourrait avoir changé durant le chargement IDB qui peut être long
        Si version postérieure :
        - ré-enregistrement du compte en modèle et IDB
        - suppression des avatars obsolètes non référencés par la nouvelle version du compte, y compris dans la liste des versions
        */
        const compte2 = await this.lectureCompte() // PEUT sortir en EXPS si changement de phrase secrète
        if (compte2.v > compte.v) {
          compte = compte2
          data.setCompte(compte2)
          const avInutiles = new Set()
          const avUtiles = data.setDesAvatars
          for (const id of data.idbSetAvatars) if (!avUtiles.has(id)) avInutiles.add(id)
          if (avInutiles.size) {
            data.purgeAvatars(avUtiles)
            for (const id of avInutiles) {
              const sid = crypt.idToSid(id)
              delete data.verAv[sid]
            }
            await data.db.purgeAvatars(avInutiles)
          }
          this.BRK()
          await commitRows([compte])
          this.BRK()
          if (avInutiles.size) await data.db.purgeAvatars(avInutiles)
          this.BRK()
          data.idbSetAvatars = avUtiles
        }
      } else {
        // créer la liste des versions chargées pour les tables des avatars, cad 0 pour toutes
        // cette liste a été créée par chargementIDB dans le mode synchro, mais pas en mode incognito
        data.idbSetAvatars.forEach((id) => {
          data.setVerAv(crypt.idToSid(id), INDEXT.AVATAR, 0)
        })
      }

      // état chargé correspondant à l'état local (vide le cas échéant - incognito ou première synchro) - compte OK
      data.statut = 1
      data.dhsync = data.dh
      if (data.db) {
        const etat = await getEtat()
        data.vsv = etat.vsv
        setEtat()
      }

      {
        const grAPurger = new Set()
        // chargement des invitgrs ayant changé depuis l'état local (tous le cas échéant)
        // pour obtenir la liste des groupes accédés
        const lvav = {}
        data.verAv.forEach((lv, sid) => { lvav[sid] = lv[INDEXT.AVATAR] })
        const ret = await post(this, 'm1', 'syncInvitgr', { sessionId: data.sessionId, lvav })
        if (data.dh < ret.dh) data.dh = ret.dh
        // traitement des invitgr reçus
        const maj = []
        for (let i = 0; i < ret.rowItems; i++) {
          const item = ret.rowItems[i]
          if (item.table === 'invitgr') {
            const rowInvitgr = schemas.deserialize('rowinvitgr', item.serial)
            const invitgr = new Invitgr()
            await invitgr.fromRow(rowInvitgr)
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
                data.setVerGr(invitgr.sidg, INDEXT.GROUPE, 0)
              }
            }
          }
        }

        if (grAPurger.size) {
          data.purgeGroupes(grAPurger)
          if (data.db) {
            await data.db.purgeGroupes(grAPurger)
          }
        }
        if (maj.length) {
          data.setInvitgrs(maj) // maj du modèle
          if (data.db) {
            await commitRows(maj) // et de IDB
            this.BRK()
          }
        }
      }

      for (const sid in compte.mac) {
        const mac = compte.mac[sid]
        this.majsynclec({ st: 0, sid: sid, nom: 'Avatar ' + mac.na.nomc, nbl: 0 })
      }
      const mgr = store().state.db.invitgrs
      for (const x in mgr) {
        const av = mgr[x]
        const sidg = crypt.idToSid(av.data.idg)
        this.majsynclec({ st: 0, sid: sidg, nom: 'Groupe ' + sidg, nbl: 0 })
      }
      this.majsynclec({ st: 0, sid: '$CV', nom: 'Cartes de visite', nbl: 0 })

      const [lav, lgr] = await this.abonnements(compte)

      // Synchroniser avatars et groupes
      await this.chargerAvGr(lav, lgr)

      // Synchroniser les CVs (et s'abonner)
      const nvvcv = await this.syncCVs(data.vcv)
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
Mise à jour du mémo du compte
*/
export class MemoCompte extends OperationUI {
  constructor () {
    super('Mise à jour du mémo du compte', OUI, SELONMODE)
  }

  excAffichages () { return [this.excAffichage1f] }

  // excActions(), défaut de Operation

  async run (memo) {
    try {
      const c = data.getCompte()
      const memok = await crypt.crypter(data.clek, memo)
      this.BRK()
      const args = { sessionId: data.sessionId, id: c.id, memok: memok }
      const ret = await post(this, 'm1', 'memoCompte', args)
      if (data.dh < ret.dh) data.dh = ret.dh
      this.finOK()
    } catch (e) {
      await this.finKO(e)
    }
  }
}

/******************************************************
Mise à jour des mots clés du compte
*/
export class MmcCompte extends OperationUI {
  constructor () {
    super('Mise à jour des mots clés du compte', OUI, SELONMODE)
  }

  excAffichages () { return [this.excAffichage1f] }

  // excActions(), défaut de Operation

  async run (mmc) {
    try {
      const c = data.getCompte()
      const mmck = await crypt.crypter(data.clek, serial(mmc))
      this.BRK()
      const args = { sessionId: data.sessionId, id: c.id, mmck: mmck }
      const ret = await post(this, 'm1', 'mmcCompte', args)
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

  async run (rowSecret) {
    try {
      const args = { sessionId: data.sessionId, rowSecret }
      const ret = await post(this, 'm1', 'nouveauSecretP', args)
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
      const ret = await post(this, 'm1', 'maj1SecretP', args)
      if (data.dh < ret.dh) data.dh = ret.dh
      this.finOK()
    } catch (e) {
      await this.finKO(e)
    }
  }
}
