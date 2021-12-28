import { crypt } from '../../app/crypto.mjs'

/*
avatars: {}, // Tous les avatars (liste sur le compte)
groupes: {}, // Tous les groupes
parrains: {}, // Tous les parrains (pph) : un getter par id d'avatar
rencontres: {} // Toutes les rencontres (prh) : un getter par id d'avatar

Groupés par sid d'avatar : contacts_sid invitcts_sid invitgrs_sid
Groupés par sid de groupe : membres_sid
Groupés par sid d'avatar ou de groupe : secrets_sid

repertoire: {} // Toutes les CVs (enrichies des propriétés lctc et lmbr)
Les objets CV sont conservés dans la map data.repertoire
Le store/db conserve l'image de data.repertoire à chaque changement
*/

const l1 = { compte: true, avatar: true, groupe: true }
const l2 = { avatars: true, groupes: true, parrains: true, rencontres: true, repertoire: true }
const l3 = { contact: true, invitct: true, invitgr: true, membre: true, secret: true }
const l4 = { avatar: true, groupe: true, parrain: true, rencontre: true }

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

/* Déclaration du groupe courant */
export function majgroupe (state, val) {
  state.groupe = val
}

/* Purges des avatars et groupes inutiles */

export function purgeAvatars (state, val) { // val : Set des ids des avatars INUTILES
  if (!val || !val.size) return 0
  const x = state.avatars
  let n = 0
  for (const id of val) {
    const sid = crypt.idToSid(id)
    if (x[sid]) { n++; delete x[sid] }
  }
  if (n) state.avatars = { ...x }
  return n
}

export function purgeGroupes (state, val) { // val : Set des ids des groupes INUTILES
  if (!val || !val.size) return 0
  const x = state.groupes
  let n = 0
  for (const id of val) {
    const sid = crypt.idToSid(id)
    if (x[sid]) { n++; delete x[sid] }
  }
  if (n) state.groupes = { ...x }
  return n
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
    lobj.forEach(obj => {
      if (!m[obj.sid]) {
        m[obj.sid] = [obj]
      } else {
        m[obj.sid].push(obj)
      }
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
    lobj.forEach(obj => {
      const av = st[obj.sid]
      if (obj.suppr || obj.horsLimite) {
        if (av) delete st[obj.sid]
      } else if (!av || av.v < obj.v) {
        st[obj.sid] = obj
      }
    })
    state[table + 's'] = { ...st }
  }
}

export function setCompte (state, obj) { if (!state.compte || state.compte.v < obj.v) state.compte = obj }

/* Enregistrement de toutes les cv d'un coup */
export function commitRepertoire (state, repertoire) { state.repertoire = { ...repertoire } }
