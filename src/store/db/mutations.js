import { crypt } from '../../app/crypto.mjs'
import { t1n, t2n } from '../../app/api.mjs'

/*
avatars: {}, // Tous les avatars listés sur le compte
groupes: {}, // Tous les groupes listés sur les avatars
couples: {}, // Tous les couples listés sur les avatars
cvs: {}, // Toutes les cartes de visite

Groupés par id de groupe : membres@id
Groupés par id d'avatar ou de groupe ou de couple : secrets@id

Voisins : un ensemble de voisins est matérialisé par une entrée voisins@sid/sns
ou sid/sns est la pk du secret de référence de l'ensemnle des voisins
Chaque entrée est une map :
- clé : pk du secret, soit du secret voisin, soit du secret de référence (comme s'il était son propre voisin)
- valeur : le secret correspondant
Les voisins ne sont pas purgés quand un avatar ou un groupe est purgé.
Quand un secret voisin est en création il est inscrit, de même que sa référence.
La liste des voisins :
- contient donc des fantômes : secrets dont l'avatar ou le groupe ou le couple a disparu
- peut ne contenir que le secret de référence quand un secret voisin en création n'a pas été validé
Normalement quand une entrée existe il n'y a pas que le secret de référence dedans (sauf cas ci-dessus).

*/

// objets courants représentés par un singleton
const l1 = new Set(['compte', 'compta', 'prefs', 'avatar', 'groupe', 'couple', 'secret'])

// objets multiples à un seul niveau représenté par une map
const l2 = new Set(['avatars', 'groupes', 'couples', 'cvs', 'faidx'])

export function raz (state) {
  for (const e in state) if (l1.has(e)) state[e] = null; else if (l2.has(e)) state[e] = {}; else delete state[e]
}

/* Déclaration de l'avatar courant */
export function majavatar (state, val) { state.avatar = val }

/* Déclaration du couple courant */
export function majcouple (state, val) { state.couple = val }

/* Déclaration du groupe courant */
export function majgroupe (state, val) { state.groupe = val }

/* Déclaration du membre courant */
export function majmembre (state, val) { state.membre = val }

/* Déclaration du secret courant */
export function majsecret (state, val) { state.secret = val }

/* Purges des avatars inutiles et tables associées */
export function purgeAvatars (state, val) { // val : Set des ids des avatars INUTILES
  if (!val || !val.size) return 0
  const xa = state.avatars
  for (const id of val) {
    delete xa[id]
    delete state['secrets@' + id]
  }
  state.avatars = { ...xa }
}

/* purge des groupes inutiles et membres, secrets associés */
export function purgeGroupes (state, val) { // val : Set des ids des groupes INUTILES
  if (!val || !val.size) return 0
  const xg = state.groupes
  for (const id of val) {
    delete xg[id]
    delete state['membres@' + id]
    delete state['secrets@' + id]
  }
  state.groupes = { ...xg }
}

/* purge des couples inutiles et secrets associés */
export function purgeCouples (state, val) { // val : Set des ids des couples INUTILES
  if (!val || !val.size) return 0
  const xg = state.groupes
  for (const id of val) {
    delete xg[id]
    delete state['secrets@' + id]
  }
  state.groupes = { ...xg }
}

/* Stockage (et suppression) d'une liste d'objets "multiples", SAUF cvs */
export function setObjets (state, lobj) { // lobj : array d'objets
  if (!lobj || !lobj.length) return
  const cs = state.secret // secret courant
  const sta = {} // accumulation des state racine ayant changé
  lobj.forEach(obj => {
    if (t2n.has(obj.table)) {
      const n = obj.table + 's@' + obj.id
      let st = sta[n]
      if (!st) {
        st = state[n]
        if (!st) { st = {}; state[n] = st }
        sta[n] = st
      }
      const oc = cs && obj.table === 'secret' && cs.id === obj.id && cs.ns === obj.ns // c'est le secret courant
      if (obj.suppr) {
        delete st[obj.id2]
        if (oc) state.secret = null
      } else {
        st[obj.id2] = obj
        if (oc) state.secret = obj
        if (obj.table === 'secret') majvoisin(state, obj)
      }
    } else if (t1n.has(obj.table)) {
      const n = obj.table + 's'
      let st = sta[n]; if (!st) { st = state[n]; sta[n] = st }
      const oc = state[obj.table] && state[obj.table].id === obj.id
      if (obj.suppr) {
        delete st[obj.id]
        if (oc) state[obj.table] = null
      } else {
        st[obj.id] = obj
        if (oc) state[obj.table] = obj
      }
    }
  })
  for (const n in sta) state[n] = { ...sta[n] }
}

export function setCvs (state, lst) { // lst : array [{id, cv}]
  if (!lst || !lst.length) return
  const l = { ...state.cvs }
  let chg = false
  lst.forEach(obj => {
    if (l[obj.id]) {
      if (obj.cv) l[obj.id] = obj.cv; else delete l[obj.id]
      chg = true
    } else {
      if (obj.cv) { l[obj.id] = obj.cv; chg = true }
    }
  })
  if (chg) state.cvs = l
}

export function setCompte (state, obj) { state.compte = obj }
export function setCompta (state, obj) { state.compta = obj }
export function setPrefs (state, obj) { state.prefs = obj }

/* Enregistrement de toutes les cv d'un coup */
export function commitRepertoire (state, repertoire) { state.repertoire = { ...repertoire } }

/* Entrée d'un objet à 2 niveaux */
function setEntree (state, table, id) {
  let e = state[table + 's@' + id]
  if (!e) { e = {}; state[table + 's@' + id] = e }
  return e
}

/* Force à créer une entrée de voisinage pour un secret de référence
AVANT insertion (éventuelle) d'un voisin en création et qui POURRAIT être validée */
export function setRefVoisin (state, secret) {
  const pk = secret.pk
  const st = setEntree(state, 'voisin', pk)
  st[pk] = secret
  state['voisins@' + pk] = { ...st }
}

/* Supprime une entrée voisin à condition qu'elle soit vide ou ne contienne que lui */
export function unsetRefVoisin (state, pkref) {
  const st = state['voisins@' + pkref]
  if (st) {
    const l = Object.keys(st).length
    if (l === 0 || (l === 1 && st[pkref])) delete state['voisins@' + pkref]
  }
}

/*
Enregistrement d'un secret comme voisin
- Si c'est un secret (potentiellement) de référence, uniquement si il a déjà des voisins enregistrés
(pour éviter de créer des entrées pour des secrets sans voisins)
- si c'est un secret voisin, sa référence est cherchée et inscrite aussi (si elle existe)
*/
function majvoisin (state, secret) {
  const pk = secret.pk
  if (!secret.ref) {
    // c'est, peut-être, un secret de référence
    const st = state['voisins@' + pk]
    if (st) {
      // il a des voisins enregistrés (a priori) : maj de son entrée
      st[pk] = secret
      state['voisins@' + pk] = { ...st }
    } // sinon on ne l'enregistre pas
  } else {
    const pkref = secret.pkref
    // enregistrement du secret voisin
    const st = setEntree(state, 'voisin', pkref)
    st[pk] = secret
    // recherche du secret de référence
    const st2 = state['secrets@' + secret.ref[0]]
    if (st2) {
      const secref = st2[secret.ref[1]]
      if (secref) st[secref.pk] = secref
    } // sinon le secret de référence est inconnu dans la session
    state['voisins@' + pkref] = { ...st }
  }
}

/* Fichiers attachés */
export function majfaidx (state, lst) { // lst : array de { id, ns, cle, hv }
  const st = state.faidx
  let b = false
  lst.forEach(x => {
    const k = crypt.idToSid(x.id) + '@' + crypt.idToSid(x.ns) + '@' + x.cle
    if (x.hv) st[k] = x; else delete st[k]
    b = true
  })
  if (b) state.faidx = { ...st }
}

/* Recalcul la liste des avatars externes avec pour chacun :
- na : son na
- x : si true, c'est un disparu
- c : set des ids des couples dont il est avatar externe
- m : set des [id, im] des membres dont il est avatar externe
*/
export function setTousAx (state, disparus) {
  const mapx = {}
  for (const e in state) {
    if (e.startsWith('membres@')) {
      const m1 = state[e]
      for (const im in m1) {
        const mb = m1[im] // m.id : id du groupe
        if (!mb.estAc) {
          let y = mapx[mb.namb.id]
          if (!y) {
            y = { na: mb.namb, c: new Set(), m: new Set() }
            mapx[mb.namb.id] = y
          }
          if (mb.stx === 5) y.x = 1 // disparu
          y.m.add([mb.id, mb.im])
        }
      }
    }
  }
  const mc = state.couples
  for (const id in mc) {
    const c = mc[id]
    if (c.idE) {
      let y = mapx[c.idE]
      if (!y) {
        y = { na: c.naE, c: new Set(), m: new Set() }
        mapx[c.idE] = y
      }
      if (c.stp === 5) y.x = 1 // disparu
      y.c.add(c.id)
    }
  }
  if (disparus) {
    disparus.forEach(id => { const ax = mapx[id]; if (ax) ax.x = true })
  }
  state.tousAx = mapx
  return mapx
}
