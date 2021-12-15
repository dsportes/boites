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

export function purgeAvatars (state, val) { // val : Set des ids des avatars UTILES
  const x = state.avatars
  const s = new Set()
  for (const sid in x) {
    const id = crypt.sidToId(sid)
    if (!val.has(id)) s.add(sid)
  }
  if (s.size) {
    for (const sid of s) delete x[sid]
    state.avatars = { ...x }
  }
  return s.size
}

export function purgeGroupes (state, val) { // val : Set des ids des groupes UTILES
  const x = state.groupes
  const s = new Set()
  for (const sid in x) {
    const id = crypt.sidToId(sid)
    if (!val.has(id)) s.add(sid)
  }
  if (s.size) {
    for (const sid of s) delete x[sid]
    state.groupes = { ...x }
  }
  return s.size
}

/* Mises à jour brutes des objets dans le store */
export function setEntree (state, [table, sid]) {
  if (!state[table + '@' + sid]) {
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
        if (obj.st < 0) {
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
      if (obj.st < 0) {
        if (av) delete st[obj.sid]
      } else if (!av || av.v < obj.v) {
        st[obj.sid] = obj
      }
    })
    state[table + 's'] = { ...st }
  }
}

export function setCompte (state, obj) { if (!state.compte || state.compte.v < obj.v) state.compte = obj }
export function setAvatars (state, lobj) { setObjets(state, ['avatar', lobj]) }
export function setContacts (state, lobj) { setObjets(state, ['contact', lobj]) }
export function setInvitcts (state, lobj) { setObjets(state, ['invitct', lobj]) }
export function setInvitgrs (state, lobj) { setObjets(state, ['invitgr', lobj]) }
export function setParrains (state, lobj) { setObjets(state, ['parrain', lobj]) }
export function setRencontres (state, lobj) { setObjets(state, ['rencontre', lobj]) }
export function setGroupes (state, lobj) { setObjets(state, ['groupe', lobj]) }
export function setMembres (state, lobj) { setObjets(state, ['membre', lobj]) }
export function setSecrets (state, lobj) { setObjets(state, ['secret', lobj]) }

/* Enregistrement de toutes les cv d'un coup */
export function commitRepertoire (state, repertoire) { state.repertoire = { ...repertoire } }
