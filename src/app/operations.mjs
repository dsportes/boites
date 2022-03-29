import { NomAvatar, store, post, get, affichermessage, cfg, sleep, affichererreur, appexc, difference, getfa, getJourJ, edvol, equ8 } from './util.mjs'
import { remplacePage } from './page.mjs'
import {
  deleteIDB, idbSidCompte, commitRows, getCompte, getCompta, getPrefs, getCvs,
  getAvatars, getGroupes, getCouples, getMembres, getSecrets,
  openIDB, enregLScompte, getVIdCvs, putFa, saveListeCvIds
} from './db.mjs'
import { Compte, Avatar, deserialRowItems, compileToObject, data, Prefs, Contact, Invitgr, Compta, Groupe, Membre, Cv, Couple } from './modele.mjs'
import { AppExc, EXBRK, EXPS, F_BRO, E_BRO, X_SRV, E_WS, MC } from './api.mjs'

import { crypt } from './crypto.mjs'
import { schemas, serial } from './schemas.mjs'

const OUI = 1
const NON = 0
const SELONMODE = 2

async function deconnexion () { await data.deconnexion() }

export async function reconnexion () {
  const ps = data.ps
  await data.deconnexion(true)
  data.mode = data.modeInitial
  new ConnexionCompte().run(ps)
}

/* ***************************************************/
class OpBuf {
  constructor () {
    this.lmaj = [] // objets à modifier / insérer en IDB
    this.lsuppr = [] // objets (du moins {table id (id2))} à supprimer de IDB
    this.lav = null // set des ids des avatars à purger
    this.lcc = null // set des ids des couples à purger
    this.lgr = null // set des ids des groupes à purger

    this.lobj = [] // objets en attente d'être rangés en store/db : en synchro permet d'effectuer une validation cohérente
    this.compte = null
    this.prefs = null
    this.compta = null
    this.lcvs = []
  }

  putIDB (obj) { this.lmaj.push(obj) }
  supprIDB (obj) { this.lsuppr.push(obj) } // obj : {table, id, (sid2)}
  async commitIDB () { await commitRows(this) }

  setCompte (obj) { this.compte = obj }
  setCompta (obj) { this.compta = obj }
  setPrefs (obj) { this.prefs = obj }
  setCv (obj) { this.lcvs.push(obj) }
  setObj (obj) { this.lobj.push(obj) }

  commitStore () {
    if (this.compte) data.setCompte(this.compte)
    if (this.compta) data.setCompta(this.compta)
    if (this.prefs) data.setPrefs(this.prefs)
    if (this.lobj.length) data.setObjets(this.lobj)
    if (this.lcvs.length) data.setCvs(this.lcvs)
  }
}

/****************************************************************/
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

  tr (ret) {
    if (!this.dh) this.dh = 0
    if (this.dh < ret.dh) this.dh = ret.dh
    return ret
  }

  /* Obtention des invitGr du compte et traitement de régularisation ***********************************/
  async getInvitGrs (compte) {
    const ids = compte.avatarIds()
    const ret = this.tr(await post(this, 'm1', 'chargerInvitGr', { sessionId: data.sessionId, ids: Array.from(ids) }))
    const lstInvitGr = []
    if (ret.rowItems.length) {
      for (const item of ret.rowItems) {
        const row = schemas.deserialize('rowinvitgr', item.serial)
        const obj = new Invitgr()
        await obj.fromRow(row)
        lstInvitGr.push(obj)
      }
    }
    await this.traitInvitGr(lstInvitGr)
  }

  /* Traitement des invitGr, appel de régularisation ********************************/
  async traitInvitGr (lstInvitGr) {
    for (let i = 0; i < lstInvitGr.length; i++) {
      const iv = lstInvitGr[i]
      const args = { sessionId: data.sessionId, id: iv.id, idg: iv.idg, ni: iv.ni, datak: iv.datak }
      this.tr(await post(this, 'm1', 'regulGr', args))
    }
  }

  async membresDisparus (disp) {
    for (let i = 0; i < disp.length; i++) {
      const args = { sessionId: data.sessionId, id: disp[i][0], im: disp[i][1] }
      this.tr(await post(this, 'm1', 'membreDisparu', args))
    }
  }

  async couplesDisparus (disp) {
    for (let i = 0; i < disp.length; i++) {
      const id = disp[i]
      const c = data.getCouple(id)
      const args = { sessionId: data.sessionId, id, idx: c.avc ? 1 : 0 }
      this.tr(await post(this, 'm1', 'coupleDisparu', args))
    }
  }

  /*
  if (mapObj.secret) {
    data.setSecrets(mapObj.secret)
    // il peut y avoir des secrets ayant un changement de FA
    const lst = []
    const st = store().state.db.faidx
    for (let i = 0; i < mapObj.secret.length; i++) {
      const secret = mapObj.secret[i]
      for (const cle in secret.mfa) {
        const fa = secret.mfa[cle]
        const x = st ? st[secret.sidpj(cle)] : null
        if (x && fa.hv !== x.hv) { // fa locale pas à jour
          try {
            const data = await getfa(secret.sid + '@' + secret.sid2, x.cle) // rechargement du contenu du serveur
            x.hv = fa.hv
            putFa(x, data) // store en IDB
            lst.push(x)
          } catch (e) {
            console.log(e.toString())
            x.hv = null
            lst.push(x)
            data.setFaPerdues(x)
          }
        }
      }
    }
    if (lst.length) data.setFaidx(lst)
    push('secret')
  }

  // Il peut y avoir des FA non référencées, avatar / groupe disparu, FA disparue
  {
    const lst = []
    const st = store().state.db.faidx
    for (const k in st) {
      const x = st[k]
      const secret = data.getSecret(x.id, x.ns)
      if (secret && secret.nbpj) {
        const fa = secret.mpj[x.cle]
        if (!fa) { x.hv = null; lst.push(x) }
      } else { x.hv = null; lst.push(x) }
    }
    if (lst.length) data.setFaidx(lst)
  }

  data.repertoire.commit() // un seul à la fin
  return vcv
}
*/
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
            const data = await getfa(secret.sid + '@' + secret.sid2, x.cle) // du serveur
            nbp++
            vol += data.length
            await putFa(x, data) // store en IDB
            maj.push(x)
          }
        } else { // PJ n'existe plus
          await putFa(x, null) // delete en IDB
          maj.push(x)
        }
      } else {
        await putFa(x, null) // delete en IDB, le secret n'existe plus
        maj.push(x)
      }
    }
    if (maj.length) data.setFaidx(maj) // MAJ du store
    return [nbp, vol]
  }

  /* Recharge depuis le serveur les secrets d'un avatar et s'abonner à l'avatar
    Remplit aussi la liste des membres à mettre à jour en IDB et store/db
  */
  async chargerAS (id, mapObj) {
    const ret = this.tr(await post(this, 'm1', 'chargerAS', { sessionId: data.sessionId, id }))
    if (ret.rowItems.length) {
      const r = await compileToObject(deserialRowItems(ret.rowItems), mapObj)
      if (r.secret) {
        for (const pk of r.secret) {
          const obj = r.secret[pk]
          this.buf.setObj(obj)
          this.buf.putIDB(obj)
        }
      }
    }
  }

  /* Recharge depuis le serveur un couple et ses secrets, et s'abonne
    Remplit aussi la liste des membres à mettre à jour en IDB et store/db
  */
  async chargerCS (id, mapObj) {
    const ret = this.tr(await post(this, 'm1', 'chargerCS', { sessionId: data.sessionId, id }))
    if (ret.rowItems.length) {
      const r = await compileToObject(deserialRowItems(ret.rowItems), mapObj)
      if (r.couple) {
        for (const pk of r.couple) {
          const obj = r.couple[pk]
          this.buf.setObj(obj)
          this.buf.putIDB(obj)
        }
      }
      if (r.secret) {
        for (const pk of r.secret) {
          const obj = r.secret[pk]
          this.buf.setObj(obj)
          this.buf.putIDB(obj)
        }
      }
    }
  }

  /* Recharge depuis le serveur un groupe, ses membres et ses secrets, et s'abonne
    Remplit aussi la liste des membres à mettre à jour en IDB et store/db
  */
  async chargerGMS (id, mapObj) {
    const ret = this.tr(await post(this, 'm1', 'chargerGMS', { sessionId: data.sessionId, id }))
    if (ret.rowItems.length) {
      const r = await compileToObject(deserialRowItems(ret.rowItems), mapObj)
      if (r.groupe) {
        for (const pk of r.groupe) {
          const obj = r.groupe[pk]
          this.buf.setObj(obj)
          this.buf.putIDB(obj)
        }
      }
      if (r.membre) {
        for (const pk of r.membre) {
          const obj = r.membre[pk]
          this.buf.setObj(obj)
          this.buf.putIDB(obj)
        }
      }
      if (r.secret) {
        for (const pk of r.secret) {
          const obj = r.secret[pk]
          this.buf.setObj(obj)
          this.buf.putIDB(obj)
        }
      }
    }
  }

  /* Désabonnements des avatars / groupes / couples / cvs non référencées
  */
  async desabonnements (setAv, setGr, setCp, setCv) {
    this.tr(await post(this, 'm1', 'desabonnements', {
      sessionId: data.sessionId,
      lav: Array.from(setAv),
      lgr: Array.from(setGr),
      lcp: Array.from(setCp),
      lcv: Array.from(setCv)
    }))
  }

  /********************************************/
  async processCA (apCompte, apAvatars) {
    const avCompte = data.getCompte()
    const avAvatarIds = avCompte.avatarIds()
    const avGroupeIds = new Set()
    const avCoupleIds = new Set()
    avAvatarIds.forEach(av => {
      av.groupeIds(avGroupeIds)
      av.couplesIds(avCoupleIds)
    })

    const apAvatarIds = new Set()

    if (apCompte && apCompte.v > avCompte.v) {
      apCompte.avatarIds(apAvatarIds)
      apAvatarIds.forEach(id => { if (!avAvatarIds.has(id)) this.avatarIdsP.add(id) })
      avAvatarIds.forEach(id => { if (!apAvatarIds.has(id)) this.avatarIdsM.add(id) })
    } else {
      avAvatarIds.forEach(av => { apAvatarIds.add(av) })
    }

    const apGroupeIds = new Set()
    const apCoupleIds = new Set()

    if (apAvatars) {
      for (const id in apAvatars) {
        const avAvatar = data.getAvatar(id)
        const apAvatar = apAvatars[id]
        if (!avAvatar || avAvatar.v > apAvatar.v) continue
        apAvatar.repGroupes()
        apAvatar.repCouples()
        avAvatar.groupeIds(apGroupeIds)
        avAvatar.coupleIds(apCoupleIds)
      }
      apGroupeIds.forEach(id => { if (!avGroupeIds.has(id)) this.groupeIdsP.add(id) })
      avGroupeIds.forEach(id => { if (!apGroupeIds.has(id)) this.groupeIdsM.add(id) })
      apCoupleIds.forEach(id => { if (!avCoupleIds.has(id)) this.coupleIdsP.add(id) })
      avCoupleIds.forEach(id => { if (!apCoupleIds.has(id)) this.coupleIdsM.add(id) })
    }

    // Traitements des suppressions
    if (this.avatarIdsM.size) {
      this.buf.lav = this.avatarIdsM
      this.buf.avatarIdsM = this.avatarIdsM
    }
    if (this.groupeIdsM.size) {
      this.buf.lgr = this.groupeIdsM
      this.buf.groupeIdsM = this.groupeIdsM
    }
    if (this.coupleIdsM.size) {
      this.buf.lgr = this.coupleIdsM
      this.buf.coupleIdsM = this.coupleIdsM
    }
  }

  /* traiteQueue ***********************************************************************
  Traitement des synchronisations reçues en queue invoquée dans l'opération ProcessQueue()
  - Principes généraux :
    - tout objet de version inférieure à celle détenue est ignoré
    - la mise à jour de store/db ne s'effectue qu'à la fin en une séquence sans wait
      de manière à ne laisser voir aux vues QUE des états cohérents respectant les frontières des
      transactions du serveur (et dans l'ordre d'éxécution)
    - la mise à jour d'IDB ne s'effectue qu'à la fin en une seule transaction (même raison)
    - la mise à jour du répertoire est au fil de l'eau, il n'est jamais incohérent et n'a pas de suppressions
      les suppressions logiques x de chaque entrée indiquent, soit une entrée disparue, soit une entrée n'étant plus référencée
      Pour celles non référencées, à la fin les objets courants "avatar groupe couple membre secret" sont mis à null
      afin de permettre aux vues de tenir compte de leurs "pseudo" disparitions (suppression de leur dernière référence)
  - Phase 0 : compilation du compte : le répertoire a ainsi la liste des avatars avec leurs clés
  - Phase 1 : compilation des avatars : le répertoire a ainsi la liste des groupes et couples avec leurs clés
  - Phase 2 : détection des avatars disparus et ajoutés, détection des couples et groupes disparus et ajoutés
  - Phase 3 : récupération des manquants depuis le serveur et abonnements
  */
  async traiteQueue (q) {
    this.buf = new OpBuf()
    this.dh = 0

    // concaténation des syncList reçus et stackées dans items
    const items = []
    q.forEach(syncList => {
      if (syncList.rowItems) syncList.rowItems.forEach((rowItem) => { items.push(rowItem) })
    })

    const mrows = deserialRowItems(items) // map des rows désérialisés (mais pas compilés en objet)

    this.groupeIdsP = new Set()
    this.groupeIdsM = new Set()
    this.avatarIdsP = new Set()
    this.avatarIdsM = new Set()
    this.coupleIdsP = new Set()
    this.coupleIdsM = new Set()

    /* Phase 0 : compilation du compte éventuel pour enregistrer les avatars dans le répertoire
    */
    let nvcompte = null
    if (mrows.compte) {
      const obj = new Compte()
      await obj.fromRow(mrows.compte)
      const a = data.getCompte()
      if (obj.v > a.v) {
        nvcompte = obj
        obj.repAvatars()
        this.buf.setCompte(obj)
        this.buf.putIDB(obj)
      }
    }

    /* Phase 1 : compilation des avatars éventuels pour enregistrer les groupes et couples dans le répertoire
    */
    let nvavatars = null
    if (mrows.avatar) {
      for (const id in mrows.avatar) {
        const obj = new Avatar()
        await obj.fromRow(mrows.avatar[id])
        const a = data.getAvatar(id)
        if (!a || obj.v > a.v) {
          if (!nvavatars) nvavatars = {}
          nvavatars[id] = obj
          obj.repGroupes()
          obj.repCouples()
          this.buf.setObj(obj)
          this.buf.putIDB(obj)
        }
      }
    }

    /* Phase 2 : détection des avatars disparus et ajoutés, détection des couples et groupes disparus et ajoutés
      Abonnements aux Plus ???
    */
    if (nvcompte || nvavatars) await this.processCA(nvcompte, nvavatars)

    /* Phase 3 : récupération des manquants depuis le serveur et abonnements
      Abonnements aux Plus ???
    */
    const mapObj = {}
    for (const id in this.avatarIdsP) await this.chargerAS(id, mapObj)
    for (const id in this.groupeIdsP) await this.chargerGMS(id, mapObj)
    for (const id in this.coupleIdsP) await this.chargerCS(id, mapObj)

    this.acgM = this.avatarIdsM.size || this.groupeIdsM.size || this.coupleIdsM.size
    this.acgP = this.avatarIdsP.size || this.groupeIdsP.size || this.coupleIdsP.size
    this.axP = false
    this.axM = false
    this.axDisparus = new Set()
    this.secretIdsM = new Set()

    /* Tous les autres items peuvent se compiler, les clés sont dans le répertoire */
    await compileToObject(mrows, mapObj)

    // Prefs : singleton
    if (mapObj.prefs) {
      const obj = mapObj.prefs
      const a = data.getPrefs()
      if (obj.v > a.v) {
        this.buf.setPrefs(obj)
        this.buf.putIDB(obj)
      }
    }

    // Compta : singleton
    if (mapObj.compta) {
      const obj = mapObj.compta
      const a = data.getCompta()
      if (obj.v > a.v) {
        this.buf.setCompta(obj)
        this.buf.putIDB(obj)
      }
    }

    // Groupes : mise à jour des données
    if (mapObj.groupe) {
      for (const pk in mapObj.groupe) {
        const gr = mapObj.groupe[pk]
        this.buf.setObj(gr)
        this.buf.putIDB(gr)
      }
    }

    // Couples : mise à jour des données et potentiellement un Ax en plus ou en moins
    if (mapObj.couple) {
      for (const pk in mapObj.couple) {
        const cp = mapObj.couple[pk]
        this.buf.setObj(cp)
        this.buf.putIDB(cp)
        const av = data.getCouple(cp.id)
        if (!av || !av.idE) {
          if (cp.idE) this.axP = true
        } else {
          if (!cp.idE) this.axM = true
        }
      }
    }

    // Membres : mise à jour des données et potentiellement un Ax en plus ou en moins
    if (mapObj.membre) {
      for (const pk in mapObj.membre) {
        const mb = mapObj.membre[pk]
        this.buf.setObj(mb)
        this.buf.putIDB(mb)
        const av = data.getMembre(mb.id, mb.im)
        if (!av) {
          if (mb.stx < 5) this.axP = true
        } else {
          if (av.stx !== 5 && mb.stx === 5) this.axM = true
        }
      }
    }

    // Secrets : mise à jour des données et potentiellement un Ax en plus ou en moins
    if (mapObj.secret) {
      for (const pk in mapObj.secret) {
        const s = mapObj.secret[pk]
        this.buf.setObj(s)
        if (s.suppr) {
          this.buf.supprIDB(s)
          this.secretIdsM.add(s)
        } else {
          this.buf.putIDB(s)
        }
      }
    }

    // Invitgr : post de traitement pour maj de la liste des groupes dans l'avatar invité
    if (mapObj.invitgr) {
      const lst = []
      for (const pk in mapObj.invitgr) lst.push(mapObj.invitgr[pk])
      await this.traitInvitGr(lst)
    }

    /* Traitement des CVs. Double effet :
      - si le x est true, c'est une disparition
      - cv peut être null ou non (maj ou suppr)
    */
    if (mapObj.cv) {
      for (const pk in mapObj.cv) {
        const cv = mapObj.cv[pk]
        if (!cv.cv) { // Plus de cv
          const av = data.getCv(cv.id)
          if (av) { // Il y en avait une
            this.buf.setCv({ id: cv.id }) // ça la supprime
          }
        } else { // Il y en a une
          this.buf.setCv(cv) // ça la crée / met à jour
        }
        this.buf.putIDB(cv)
        // Gestion de l'avatar externe associé (s'il était connu)
        if (cv.x) {
          // disparition
          data.repertoire.disparition(cv.id)
          this.axM = true
          this.axDisparus.add(cv.id)
        }
      }
    }

    /* Désabonnements des disparus / non référencés (les Moins) */
    if (this.acgDisp) {
      await this.desabonnements(this.avatarIdsM, this.groupeIdsM, this.coupleIdsM, null)
    }

    /* commit de store/db : séquence SANS AWAIT pour unicité de la mise à jour du store */
    this.buf.commitStore()
    this.coupleIdsDisp = new Set()
    this.membreIdsDisp = new Set()
    if (this.acgP || this.acgM || this.axP || this.axM) {
      if (this.axDisparus.size) {
        const tousAx = data.getTousAx()
        this.axDisparus.forEach(id => {
          const ax = tousAx[id]
          if (ax) {
            ax.c.forEach(id => { this.coupleIdsDisp.add(id) })
            ax.m.forEach(idim => { this.membreIdsDisp.add(idim) })
          }
        })
      }
      data.setTousAx(this.axDisparus)
    }

    /* Mise à nul des "courants" qui contiennt des objets obsolètes
      avatar: null, // avatar courant
      groupe: null, // groupe courant
      groupeplus: null, // couple courant [groupe, membre] ou membre est celui de l'avatar courant
      couple: null, // couple courant
      secret: null, // secret courant
    */
    {
      const av = store().state.db.avatar
      if (av) {
        const e = data.getAvatar(av.id)
        if (!e) store().commit('db/setAvatar', null)
      }
      const gr = store().state.db.groupe
      if (gr) {
        const e = data.getGroupe(gr.id)
        if (!e) store().commit('db/setGroupe', null)
      }
      const cp = store().state.db.couple
      if (cp) {
        const e = data.getCouple(cp.id)
        if (!e) store().commit('db/setCouple', null)
      }
      const sc = store().state.db.secret
      if (sc) {
        const e = data.getGroupe(sc.id)
        if (!e) store().commit('db/setSecret', null)
      }
      const gp = store().state.db.groupeplus
      if (gp) {
        const eg = data.getGroupe(gp[0])
        if (!eg) {
          store().commit('db/majgroupeplus', null)
        } else {
          const em = data.getMembre(gp[1].id, gp[1].im)
          if (!em) store().commit('db/majgroupeplus', null)
        }
      }
    }

    /* Notification au serveur des membres détectés disparus et des couples détectés disparus
      pour changements de leurs statuts
    */
    if (this.coupleIdsDisp.size) {
      await this.couplesDisparus(Array.from(this.coupleIdsDisp))
    }
    if (this.membreIdsDisp.size) {
      await this.membresDisparus(Array.from(this.membreIdsDisp))
    }

    /* commits finaux */
    if (data.dbok && data.netok) await this.buf.commitIDB()
    data.setDhSync(this.dh)
  }
}

/* ********************************************************* */
export class OperationUI extends Operation {
  constructor (nomop, net, idb) {
    super(nomop, net, idb)
    data.opUI = this
    this.majopencours(this)
  }

  async postCreation (ret) {
    const mapRows = deserialRowItems(ret.rowItems)

    const compte = await new Compte().fromRow(mapRows.compte)
    compte.repAvatars()
    data.setCompte(compte)

    const compta = await new Compta().fromRow(mapRows.compta)
    data.setCompta(compta)

    const prefs = await new Prefs().fromRow(mapRows.prefs)
    data.setPrefs(prefs)

    const x = Object.values(mapRows.avatar)
    const avatar = await new Avatar().fromRow(x[0])
    data.setAvatars([avatar])

    // création de la base IDB et chargement des rows compte avatar ...
    if (data.mode === 1) { // synchronisé : IL FAUT OUVRIR IDB (et écrire dedans)
      this.BRK()
      enregLScompte(compte.sid)
      await deleteIDB()
      try {
        await openIDB()
      } catch (e) {
        await deleteIDB(true)
        throw e
      }
      await commitRows({ lmaj: [compte, compta, prefs, avatar] })
      await data.debutConnexion()
    }

    data.estComptable = ret.estComptable
    await data.finConnexion(this.dh)
    this.finOK()
    remplacePage('Compte')
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
      await this.traiteQueue(q)
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
- le row Avatar, v à 0
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

      data.resetPhase012()
      this.BRK()
      const kpav = await crypt.genKeyPair()
      const nomAvatar = new NomAvatar(nom) // nouveau

      const compte = new Compte().nouveau(nomAvatar, kpav.privateKey)
      // nouveau() enregistre la clé K dans data.clek !!!
      const rowCompte = await compte.toRow()

      const prefs = new Prefs().nouveau(compte.id)
      const rowPrefs = await prefs.toRow()

      // data.setPrefs(prefs) // tout de suite à cause de l'afficahage qui va y chercher des trucs
      // data.setCompte(compte)

      const compta = new Compta().nouveau(compte.id, null)
      compta.compteurs.setRes(64, 64)
      compta.compteurs.setF1(forfaits[0])
      compta.compteurs.setF2(forfaits[1])
      const rowCompta = await compta.toRow()

      const avatar = new Avatar().nouveau(nomAvatar.id)
      const rowAvatar = await avatar.toRow()

      const args = { sessionId: data.sessionId, clePubAv: kpav.publicKey, rowCompte, rowCompta, rowAvatar, rowPrefs }
      const ret = this.tr(await post(this, 'm1', 'creationCompte', args))

      // Le compte vient d'être créé  et clek enregistrée
      await this.postCreation(ret)
    } catch (e) {
      this.finKO(e)
    }
  }
}

/* Connexion à un compte par sa phrase secrète (synchronisé et incognito)
X_SRV, '08-Compte non authentifié : aucun compte n\'est déclaré avec cette phrase secrète'
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
    const ret = this.tr(await post(this, 'm1', 'connexionCompte', args))
    const compte = ret.rowCompte ? new Compte() : null
    const prefs = ret.rowPrefs ? new Prefs() : null
    const compta = ret.rowCompta ? new Compta() : null
    if (compte) await compte.fromRow(schemas.deserialize('rowcompte', ret.rowCompte.serial))
    if (prefs) await prefs.fromRow(schemas.deserialize('rowprefs', ret.rowPrefs.serial))
    if (compta) await compta.fromRow(schemas.deserialize('rowcompta', ret.rowCompta.serial))
    return [compte, prefs, compta, ret.estComptable]
  }

  async phase0 () { // compte / prefs / compta : abonnement à compte
    const compteIdb = !data.dbok ? null : await getCompte()
    if (!data.netok && (!compteIdb || compteIdb.pcbh !== data.ps.pcbh)) {
      throw new AppExc(F_BRO, 'Compte non enregistré localement : aucune session synchronisée ne s\'est préalablement exécutée sur ce poste avec cette phrase secrète. Erreur dans la saisie de la ligne 2 de la phrase ?')
    }
    const prefsIdb = !data.dbok ? null : await getPrefs()
    const comptaIdb = !data.dbok ? null : await getCompta()
    const [compteSrv, prefsSrv, comptaSrv, estComptable] = !data.netok ? [null, null, null, false]
      : await this.chargerCPC(compteIdb ? compteIdb.v : 0, prefsIdb ? prefsIdb.v : 0, comptaIdb ? comptaIdb.v : 0)
    this.compte = compteSrv || compteIdb
    // Changement de phrase secrète
    if (data.ps.pcbh !== this.compte.pcbh) throw EXPS
    // Bien que l'utilisateur ait saisie la bonne phrase secrète, elle a pu changer : celle du serveur est installée
    if (data.dbok) enregLScompte(this.compte.sid)
    data.estComptable = estComptable

    this.compte.repAvatars()
    const prefs = prefsSrv || prefsIdb
    const compta = comptaSrv || comptaIdb
    data.setCompte(this.compte)
    data.setPrefs(prefs)
    data.setCompta(compta)
    this.buf.putIDB(this.compte)
    this.buf.putIDB(prefs)
    this.buf.putIDB(compta)
    data.setSyncItem('01', 1, 'Compte et comptabilité')
    return true
  }

  /* Recharge depuis le serveur les avatars du compte, abonnement aux avatars */
  async chargerAvatars (idsVers, idc, vc) {
    const args = { sessionId: data.sessionId, idsVers, idc, vc }
    const ret = this.tr(await post(this, 'm1', 'chargerAv', args))
    if (!ret.ok) return false
    if (!ret.rowItems.length) return {}
    const r = await compileToObject(deserialRowItems(ret.rowItems))
    return r.avatar || {}
  }

  /* Récupération des avatars cités dans le compte
  Depuis IDB : il peut y en avoir trop et certains peuvent manquer et d'autres avoir une version dépassée
  Abonnement aux avatars
  Retourne false si la version du compte a changé depuis la phase 0
  */
  async phase1 () {
    this.avatars = data.dbok ? await getAvatars() : {}
    const setidbav = new Set(); for (const id in this.avatars) setidbav.add(parseInt(id))
    const avrequis = this.compte.avatarIds()
    this.nbAvatars = avrequis.size
    const aventrop = difference(setidbav, avrequis) // avatars en IDB NON requis (à supprimer de IDB)
    aventrop.forEach(id => {
      this.buf.supprIDB({ table: 'avatar', id: id })
      delete this.avatars[id]
    })
    const avidsVers = {}
    avrequis.forEach(id => { const av = this.avatars[id]; avidsVers[id] = av ? av.v : 0 })
    const avnouveaux = !data.netok ? {} : await this.chargerAvatars(avidsVers, this.compte.id, this.compte.v)
    if (avnouveaux === false) return false// le compte a changé de version, reboucler
    // avnouveaux contient tous les avatars ayant une version plus récente que celle (éventuellement) obtenue de IDB
    for (const pk in avnouveaux) { const av = avnouveaux[pk]; this.buf.putIDB(av); this.avatars[av.id] = av }
    // avatars contient la version au top des objets avatars du compte requis et seulement eux
    const lav = Object.values(this.avatars)
    data.setAvatars(lav) // mis en store/db
    lav.forEach(av => { av.repGroupes(); av.repCouples() })
    lav.forEach(av => { data.setSyncItem('05' + av.sid, 0, 'Avatar ' + av.na.nom) })
    return true
  }

  /* Recharge depuis le serveur les groupes et couples des avatars du compte et s'y abonne */
  async chargerGroupesCouples (gridsVers, cpidsVers, avidsVers, idc, vc) {
    const args = { sessionId: data.sessionId, gridsVers, cpidsVers, avidsVers, idc, vc }
    const ret = this.tr(await post(this, 'm1', 'chargerGrCp', args))
    if (!ret.ok) return false
    const r = await compileToObject(deserialRowItems(ret.rowItems))
    return [r.groupe || {}, r.couple || {}]
  }

  /* Récupération de tous les couples et les groupes cités dans les avatars du compte
  Depuis IDB : il peut y en avoir trop et certains peuvent manquer et d'autres avoir une version dépassée
  Abonnement aux couples et groupes
  Retourne false si une des versions des avatars a changé depuis la phase 1, ou si la version du compte a changé
  */
  async phase2 () {
    const avidsVers = {}
    for (const id in this.avatars) avidsVers[id] = this.avatars[id].v

    // Récupération des groupes et couples de tous les avatars
    const grrequis = new Set()
    const cprequis = new Set()
    for (const id in this.avatars) {
      const av = this.avatars[id]
      av.groupeIds(grrequis)
      av.coupleIds(cprequis)
    }
    this.nbGroupes = grrequis.size
    this.nbCouples = cprequis.size
    this.groupes = data.dbok ? await getGroupes() : {}
    const setidbgr = new Set(); for (const id in this.groupes) setidbgr.add(parseInt(id))
    this.couples = data.dbok ? await getCouples() : {}
    const setidbcp = new Set(); for (const id in this.groupes) setidbcp.add(parseInt(id))
    const grentrop = difference(setidbgr, grrequis) // groupes en IDB NON requis (à supprimer de IDB)
    grentrop.forEach(id => {
      this.buf.supprIDB({ table: 'groupe', id: id })
      delete this.groupes[id]
    })
    const cpentrop = difference(setidbcp, cprequis) // couples en IDB NON requis (à supprimer de IDB)
    cpentrop.forEach(id => {
      this.buf.supprIDB({ table: 'couple', id: id })
      delete this.couples[id]
    })

    const gridsVers = {}
    grrequis.forEach(id => { const obj = this.groupes[id]; gridsVers[id] = obj ? obj.v : 0 })
    const cpidsVers = {}
    cprequis.forEach(id => { const obj = this.couples[id]; cpidsVers[id] = obj ? obj.v : 0 })

    const x = !data.netok ? [{}, {}] : await this.chargerGroupesCouples(gridsVers, cpidsVers, avidsVers, this.compte.id, this.compte.v)
    if (x === false) return false // le compte ou les avatars ont changé de version

    const [grnouveaux, cpnouveaux] = x
    // grnouveaux contient tous les groupes ayant une version plus récente que celle (éventuellement) obtenue de IDB
    for (const pk in grnouveaux) { const gr = grnouveaux[pk]; this.buf.putIDB(gr); this.groupes[gr.id] = gr }
    // groupes contient la version au top des objets groupes du compte requis par ses avatars et seulement eux
    const lgr = Object.values(this.groupes)
    data.setGroupes(lgr) // mis en store/db

    // cpnouveaux contient tous les couples ayant une version plus récente que celle (éventuellement) obtenue de IDB
    for (const pk in cpnouveaux) { const cp = cpnouveaux[pk]; this.buf.putIDB(cp); this.couples[cp.id] = cp }
    // couples contient la version au top des objets couples du compte requis par ses avatars et seulement eux
    const lcp = Object.values(this.couples)
    data.setCouples(lcp) // mis en store/db

    lgr.forEach(gr => { data.setSyncItem('10' + gr.sid, 0, 'Groupe ' + gr.na.nom) })
    lcp.forEach(cp => { data.setSyncItem('15' + cp.sid, 0, 'Couple ' + cp.na.nom) })
    return true
  }

  /* Recharge depuis le serveur tous les secrets d'id (avatar / couple / groupe) donnée et de version postérieure à v
  Remplit aussi la liste des secrets à mettre à jour et à supprimer de IDB
  Un secret peut être supprimé : s'il figurait dans la source, il y est enlevé
  */
  async chargerSc (id, v, src) {
    const ret = this.tr(await post(this, 'm1', 'chargerSc', { sessionId: data.sessionId, id, v }))
    if (ret.rowItems.length) {
      const r = await compileToObject(deserialRowItems(ret.rowItems))
      if (r.secret) {
        for (const pk in r) {
          const s = r[pk]
          if (s.suppr) {
            if (src[id] && src[id][s.ns]) delete src[id][s.ns]
            this.buf.supprIDB({ table: 'secret', id: id, id2: s.ns })
          } else {
            let e = src[id]; if (!e) { e = {}; src[id] = e }
            e[s.ns] = s
            this.buf.putIDB(s)
          }
        }
      }
    }
  }

  /* Recharge depuis le serveur tous les membres d'id de groupe donnée et de version postérieure à v
    Remplit aussi la liste des membres à mettre à jour en IDB
  */
  async chargerMb (id, v, src) {
    const ret = this.tr(await post(this, 'm1', 'chargerMb', { sessionId: data.sessionId, id, v }))
    if (ret.rowItems.length) {
      const r = await compileToObject(deserialRowItems(ret.rowItems))
      if (r.membre) {
        for (const pk in r) {
          const m = r[pk]
          let e = src[id]; if (!e) { e = {}; src[id] = e }
          e[m.ns] = m
          this.buf.putIDB(m)
        }
      }
    }
  }

  /* Récupération des membres et secrets requis par les avatars / couples / groupes */
  async phase3 () {
    /* Récupération depuis IDB (éventuellement) les membres et secrets stockés
    - groupés par id de l'objet maître
    - avec la version la plus récente par objet maître
    */
    const [membres, vmbIdb] = data.dbok ? await getMembres() : [{}, {}]
    const [secrets, vscIdb] = data.dbok ? await getSecrets() : [{}, {}]

    /* Récupération depuis le serveur des versions plus récentes des secrets et membres
    pour chaque objet maître et qu'il y en ait eu ou non trouvée en IDB
    */

    for (const idx in this.avatars) {
      const id = parseInt(idx)
      const av = this.avatars[id]
      if (data.netok) await this.chargerSc(id, vscIdb[id] || 0, secrets)
      const nbs = secrets[id] ? Object.keys(secrets[id]).length : 0
      data.setSyncItem('05' + av.sid, 1, 'Avatar ' + av.na.nom + ' - ' + nbs + ' secret(s)')
    }

    for (const idx in this.groupes) {
      const id = parseInt(idx)
      const gr = this.groupes[id]
      if (data.netok) await this.chargerSc(id, vscIdb[id] || 0, secrets)
      const nbs = secrets[id] ? Object.keys(secrets[id]).length : 0
      data.setSyncItem('10' + gr.sid, 0, 'Groupe ' + gr.na.nom + ' - ' + nbs + ' secret(s)')
      if (data.netok) await this.chargerMb(id, vmbIdb[id] || 0, membres)
      const nbm = membres[id] ? Object.keys(membres[id]).length : 0
      data.setSyncItem('10' + gr.sid, 1, 'Groupe ' + gr.na.nom + ' - ' + nbs + ' secret(s)' + ' - ' + nbm + ' membre(s)')
    }

    for (const idx in this.couples) {
      const id = parseInt(idx)
      const cp = this.couples[id]
      if (data.netok) await this.chargerSc(id, vscIdb[id] || 0, secrets)
      const nbs = Object.keys(secrets[id]).length
      data.setSyncItem('15' + cp.sid, 1, 'Couple ' + cp.na.nom + ' - ' + nbs + ' secret(s)')
    }

    /* Mise à jour du modèle */
    const lm = []
    const ls = []
    for (const id in membres) {
      const mx = membres[id]
      for (const im in mx) {
        const m = mx[im]
        m.setRepE() // un membre peut avoir un avatar externe
        lm.push(m)
      }
    }
    for (const id in secrets) {
      const mx = secrets[id]
      for (const ns in mx) ls.push(mx[ns])
    }
    data.setSecrets(ls)
    data.setMembres(lm)
  }

  /* Recharge depuis le serveur tous les membres d'id de groupe donnée et de version postérieure à v
  Remplit aussi la liste des membres à mettre à jour en IDB
  */
  async chargerCv (l1, l2, v) { // utiles : set des avatars utiles
    const chg = {}
    if (l1.length || l2.length) {
      const args = { sessionId: data.sessionId, v, l1, l2 }
      const ret = this.tr(await post(this, 'm1', 'chargerCVs', args))
      for (const item of ret.rowItems) {
        const row = schemas.deserialize('cv', item.serial)
        const c = new Cv()
        await c.fromRow(row)
        chg[c.id] = c
      }
    }
    return chg
  }

  // Récupérer, synchroniser les CVs et s'y abonner
  async syncCVs () {
    const tousAx = data.setTousAx() // Calcul de la liste des avatars externes
    const cvIds = new Set()
    let nb = 0
    for (const id in tousAx) { cvIds.add(parseInt(id)); nb++ }
    for (const id in data.getAvatar()) { cvIds.add(parseInt(id)); nb++ }
    for (const id in data.getGroupe()) { cvIds.add(parseInt(id)); nb++ }
    for (const id in data.getCouple()) { cvIds.add(parseInt(id)); nb++ }
    let msg = 'Cartes de visite : ' + nb + ' requise(s)'
    data.setSyncItem('20', 0, msg)

    // dans this.buf, les CVs à supprimer de IDB (ne sont plus référencées)
    const n1 = this.buf.lsuppr.length
    const cvs = data.dbok ? await getCvs(cvIds, this.buf) : {}
    const nbsuppr = n1 - this.buf.lsuppr.length
    if (nbsuppr) {
      msg = msg + ' - ' + nbsuppr + ' supprimée(s)'
      data.setSyncItem('20', 0, msg)
    }
    const [vcv, ids] = data.dbok ? await getVIdCvs() : [0, new Set()]
    let nv = 0
    let n = 0

    if (data.netok) { // Récupération des CVs mises à jour et disparues
      // séparation des ids en l1 (celles après vcv) et celles sans filtre de version
      const l1 = [], l2 = [], axdisparus = new Set(), cpdisp = [], mbdisp = []
      cvIds.forEach(id => { if (ids.has(id)) l1.push(id); else l2.push(id) })
      const chg = await this.chargerCv(l1, l2, vcv, cvs)
      // traitement des CVs changées / disparues
      for (const id in chg) {
        const cv = chg[id]
        n++
        if (cv.x) { // disparu
          if (!data.repertoire.disparu(cv.id)) { data.repertoire.disparition(cv.id); axdisparus.add(cv.id) }
          cvs[cv.id] = { id: cv.id, cv: null }
          this.buf.supprIDB({ table: 'cv', id: cv.id })
        } else {
          if (cv.v > nv) nv = cv.v
          cvs[cv.id] = cv
          this.buf.putIDB(cv)
        }
      }
      if (axdisparus.size) {
        // Traitement des Ax disparus
        axdisparus.forEach(id => {
          const ax = tousAx[id]
          ax.c.forEach(idc => { cpdisp.push(idc) })
          ax.m.forEach(pk => { mbdisp.push(pk) })
        })
        data.setTousAx(axdisparus) // Il faut recalculer tousAx
      }
      // Traitement des chgt de statut dans membres et couples
      if (mbdisp.length) await this.membresDisparus(mbdisp)
      if (cpdisp.length) await this.couplesDisparus(cpdisp)
    }
    data.setCvs(Object.values(cvs))
    if (data.dbok) { // liste des ids des CV resynchronisées
      const lst = []
      for (const id in cvs) {
        const cv = cvs[id]
        if (cv.v > 0) lst.push(cv.id)
      }
      await saveListeCvIds(nv > vcv ? nv : vcv, lst)
    }
    if (n) msg = msg + ' - ' + n + 'mise(s) à jour'
    data.setSyncItem('20', 1, msg)
  }

  async run (ps, razdb) {
    try {
      this.sessionSync = await data.debutConnexion()
      this.buf = new OpBuf()
      this.dh = 0
      data.ps = ps

      if (razdb) {
        await deleteIDB()
        await sleep(100)
        console.log('RAZ db')
      }
      // En mode avion, vérifie que la phrase secrète a bien une propriété en localstorage donnant le nom de la base
      if (data.mode === 3 && !idbSidCompte()) {
        throw new AppExc(F_BRO, 'Compte non enregistré localement : aucune session synchronisée ne s\'est préalablement exécutée sur ce poste avec cette phrase secrète. Erreur dans la saisie de la ligne 1 de la phrase ?')
      }
      await data.connexion()

      for (let nb = 0; nb < 10; nb++) {
        if (nb >= 5) throw new AppExc(E_BRO, 'Plus de 5 tentatives de connexions. Bug ou incident temporaire. Ré-essayer un peu plus tard')
        data.resetPhase012()
        data.repertoire.raz()
        if (!await this.phase0()) continue // obtention du compte / prefs / compta
        if (!await this.phase1()) continue // obtention des avatars du compte
        if (!await this.phase2()) continue // obtention des groupes et couples des avatars du compte
        break
      }
      this.BRK()
      /* YES ! on a tous les objets maîtres compte / avatar / groupe / couple) à jour, abonnés et signés */

      /* Récupération des membres et secrets */
      await this.phase3()

      /* Phase 4 : récupération des CVs et s'y abonner
      Recalcul de tousAx en tenant compte des disparus
      */
      await this.syncCVs()

      /* Phase 5 : recharger les fichiers attachés aux secrets à stocker en IDB,
      manquants ou ayant changé de version.
      */
      const [nbp, vol] = await this.syncPjs() // A REPRENDRE
      data.setSyncItem('25', 1, 'Fichiers attachés disponibles en "avion" : ' + nbp + ' téléchargée(s) pour ' + edvol(vol))

      /* Phase 6 : récupération des invitations aux groupes
      Elles seront de facto traitées en synchronisation quand un avatar reviendra avec un lgrk étendu
      */
      if (data.netok) await this.getInvitGrs(this.compte)

      // Finalisation en une seule fois, commit en IDB
      if (data.dbok && data.netok) await this.buf.commitIDB()
      await data.finConnexion(this.dh)
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
      const args = { sessionId: data.sessionId, id: data.getCompte().id, code: code, datak: datak }
      await post(this, 'm1', 'prefCompte', args)
      this.finOK()
    } catch (e) {
      await this.finKO(e)
    }
  }
}

/******************************************************
Mise à jour d'une carte de visite
A_SRV, '07-Carte de visite non trouvée'
*/
export class MajCv extends OperationUI {
  constructor () {
    super('Mise à jour de la carte de visite d\'un avatar / groupe / couple', OUI, SELONMODE)
  }

  async run (cv) {
    try {
      const cvc = await cv.toRow()
      const args = { sessionId: data.sessionId, id: cv.id, cv: cvc }
      await post(this, 'm1', 'majCV', args)
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
- sessionId: data.sessionId,
- rowCouple
- rowContact
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
      forfaits: this.forfaits,
      ressources: this.estParrain ? this.ressources : null,
      nomf: this.nom, // nom du filleul (string)
      mot: this.mot
    row Contact :
    row Couple :
    */
    try {
      const compte = data.getCompte()

      const cc = crypt.random(32) // clé du couple
      const nap = data.repertoire.na(arg.id) // na de l'avatar créateur
      const naf = new NomAvatar(arg.nomf) // na de l'avatar du filleul
      const idcf = crypt.rnd6() // id du compte filleul
      const dlv = getJourJ() + cfg().limitesjour.parrainage

      const couple = new Couple().nouveauP(nap, naf, cc, dlv, arg.mot, compte.id, idcf, arg.pp, arg.forfaits, arg.ressources)
      const rowCouple = await couple.toRow()

      const contact = new Contact().nouveau(arg.pph, arg.clex, dlv, cc, arg.nomf)
      const rowContact = await contact.toRow()

      const args = { sessionId: data.sessionId, rowCouple, rowContact }
      await post(this, 'm1', 'nouveauParrainage', args)
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
