import { crypt } from '../../app/crypto.mjs'

/*
avatars: {}, // Tous les avatars listés sur le compte
groupes: {}, // Tous les groupes listés sur les avatars
couples: {}, // Tous les couples listés sur les avatars
contactphc: {}, // Tous les contactphc (phch)

Groupés par sid d'avatar : contactstds@sid
Groupés par sid de groupe : membres@sid
Groupés par sid d'avatar ou de groupe ou de couple : secrets@sid

repertoire: {} // Toutes les CVs (enrichies des propriétés lctc et lmbr)
Les objets CV sont conservés dans la map data.repertoire
Le store/db conserve l'image de data.repertoire à chaque changement

Voisins : un ensemble de voisins est matérialisé par une entrée voisins_sid/sns
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
const l1 = { compte: true, compta: true, prefs: true, avatar: true, groupe: true, couple: true, secret: true }

// objets multiples à un seul niveau représenté par une map
const l2 = { avatars: true, groupes: true, couples: true, contactphcs: true, repertoire: true, pjidx: true }

// objets de table multiples gérés comme sous groupe d'un avatar / couple / groupe
const l3 = { contactstd: true, membre: true, secret: true }

// objets de table multiples gérés à un seul niveau (sous ensemble de l2)
const l4 = { avatar: true, groupe: true, couple: true, contactphc: true }

export function raz (state) {
  for (const e in state) {
    if (l1[e]) {
      state[e] = null
    } else if (l2[e]) {
      state[e] = {}
    } else {
      delete state[e]
    }
  }
}

/* Déclaration de l'avatar courant */
export function majavatar (state, val) {
  state.avatar = val
}

/* Déclaration du couple courant */
export function majcouple (state, val) {
  state.couple = val
}

/* Déclaration du groupe courant */
export function majgroupe (state, val) {
  state.groupe = val
  const x = state.groupeplus
  if (x && x.g && x.g.id === val.id) state.groupeplus = { g: val, m: x.m }
}

/* Déclaration du groupe plus courant */
export function majgroupeplus (state, val) {
  state.groupe = val.g
  state.groupeplus = val
}

/* Déclaration du secret courant */
export function majsecret (state, val) {
  state.secret = val
}

/* Purges des avatars inutiles et tables associées */
export function purgeAvatars (state, val) { // val : Set des ids des avatars INUTILES
  if (!val || !val.size) return 0
  const xa = state.avatars
  let na = 0
  const xc = state.contactstds
  let nc = 0
  const xs = state.secrets
  let ns = 0
  for (const id of val) {
    const sid = crypt.idToSid(id)
    if (xa[sid]) { na++; delete xa[sid] }
    if (xc[sid]) { nc++; delete xc[sid] }
    if (xs[sid]) { ns++; delete xs[sid] }
  }
  if (na) state.avatars = { ...xa }
  if (nc) state.contactstds = { ...xc }
  if (ns) state.secrets = { ...xs }
  return na + nc + ns
}

/* purge des groupes inutiles et membres, secrets associés */
export function purgeGroupes (state, val) { // val : Set des ids des groupes INUTILES
  if (!val || !val.size) return 0
  const xg = state.groupes
  let ng = 0
  const xm = state.membres
  let nm = 0
  const xs = state.secrets
  let ns = 0
  for (const id of val) {
    const sid = crypt.idToSid(id)
    if (xg[sid]) { ng++; delete xg[sid] }
    if (xm[sid]) { nm++; delete xm[sid] }
    if (xs[sid]) { ns++; delete xs[sid] }
  }
  if (ng) state.groupes = { ...xg }
  if (nm) state.membres = { ...xm }
  if (ns) state.secrets = { ...xs }
  return ng + nm + ns
}

/* purge des couples inutiles et secrets associés */
export function purgeCouples (state, val) { // val : Set des ids des couples INUTILES
  if (!val || !val.size) return 0
  const xg = state.groupes
  let ng = 0
  const xs = state.secrets
  let ns = 0
  for (const id of val) {
    const sid = crypt.idToSid(id)
    if (xg[sid]) { ng++; delete xg[sid] }
    if (xs[sid]) { ns++; delete xs[sid] }
  }
  if (ng) state.groupes = { ...xg }
  if (ns) state.secrets = { ...xs }
  return ng + ns
}

/* Mises à jour brutes des objets dans le store */
export function setEntree (state, [table, sid]) {
  if (!state[table + 's@' + sid]) {
    state[table + 's@' + sid] = {}
  }
  return state[table + 's@' + sid]
}

/* Stockage (et suppression) d'une liste d'objets de la MEME table, SAUF cvs fait par commitRepertoire */
export function setObjets (state, [table, lobj]) { // lobj : array d'objets
  if (!lobj || !lobj.length) return
  if (l3[table]) {
    // gérés par sous-groupe
    const m = {}
    const cs = state.secret
    lobj.forEach(obj => {
      if (!m[obj.sid]) {
        m[obj.sid] = [obj]
      } else {
        m[obj.sid].push(obj)
      }
      // si le secret qu'on voit passer est le secret courant, il faut mettre à jour aussi le courant
      if (cs && table === 'secret' && cs.id === obj.id && cs.ns === obj.ns) majsecret(state, obj)
      if (table === 'secret') majvoisin(state, obj)
    })
    for (const sid in m) {
      const st = setEntree(state, [table, sid])
      m[sid].forEach(obj => {
        const av = st[obj.sid2]
        if (obj.suppr || obj.horsLimite) {
          if (av) delete st[obj.sid2]
        } else if (!av || av.v < obj.v) {
          st[obj.sid2] = obj
        }
      })
      state[table + 's@' + sid] = { ...st }
    }
  } else if (l4[table]) {
    // gérés une seule entrée
    const st = state[table + 's']
    const ac = state.avatar
    const gc = state.groupe
    const cc = state.couple
    lobj.forEach(obj => {
      const av = st[obj.sid]
      if (obj.suppr || obj.horsLimite) {
        if (av) delete st[obj.sid]
      } else if (!av || av.v < obj.v) {
        st[obj.sid] = obj
        // MAJ aussi des objets courants
        if (ac && table === 'avatar' && ac.id === obj.id) majavatar(state, obj)
        if (gc && table === 'groupe' && gc.id === obj.id) majgroupe(state, obj)
        if (cc && table === 'couple' && cc.id === obj.id) majcouple(state, obj)
      }
    })
    state[table + 's'] = { ...st }
  }
}

export function setCompte (state, obj) { if (!state.compte || state.compte.v < obj.v) state.compte = obj }
export function setCompta (state, obj) { if (!state.compta || state.compta.v < obj.v) state.compta = obj }
export function setPrefs (state, obj) { if (!state.prefs || state.prefs.v < obj.v) state.prefs = obj }

/* Enregistrement de toutes les cv d'un coup */
export function commitRepertoire (state, repertoire) { state.repertoire = { ...repertoire } }

/* Force à créer une entrée de voisinage pour un secret de référence
AVANT insertion (éventuelle) d'un voisin en création et qui POURRAIT être validée */
export function setRefVoisin (state, secret) {
  // setEntree (state, [table, sid])
  const pk = secret.pk
  const st = setEntree(state, ['voisin', pk])
  st[pk] = secret
  state['voisins@' + pk] = { ...st }
}

/* Supprime une entrée voisin à condition qu'elle soit vide ou ne contienne que lui */
export function unsetRefVoisin (state, pkref) {
  // setEntree (state, [table, sid])
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
    const st = setEntree(state, ['voisin', pkref])
    st[pk] = secret
    // recherche du secret de référence
    const st2 = state['secrets@' + crypt.idToSid(secret.ref[0])]
    if (st2) {
      const secref = st2[crypt.idToSid(secret.ref[1])]
      if (secref) {
        st[secref.pk] = secref
      }
    } // sinon le secret de référence est inconnu dans la session
    state['voisins@' + pkref] = { ...st }
  }
}

/* Pièces jointes */
export function majfaidx (state, lst) { // lst : array de { id, ns, cle, hv }
  const st = state.pjidx
  let b = false
  lst.forEach(x => {
    const k = crypt.idToSid(x.id) + '@' + crypt.idToSid(x.ns) + '@' + x.cle
    if (x.hv) {
      st[k] = x
    } else {
      delete st[k]
    }
    b = true
  })
  if (b) state.pjidx = { ...st }
}
