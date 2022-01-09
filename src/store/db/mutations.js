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

/* Déclaration du contact courant */
export function majcontact (state, val) {
  state.contact = val
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
  const xc = state.contacts
  let nc = 0
  const xi = state.invitcts
  let ni = 0
  const xj = state.invitgrs
  let nj = 0
  const xs = state.secrets
  let ns = 0
  const xp = state.parrains
  let np = 0
  const xr = state.rencontres
  let nr = 0
  for (const id of val) {
    const sid = crypt.idToSid(id)
    if (xa[sid]) { na++; delete xa[sid] }
    if (xc[sid]) { nc++; delete xc[sid] }
    if (xi[sid]) { ni++; delete xi[sid] }
    if (xj[sid]) { nj++; delete xj[sid] }
    if (xs[sid]) { ns++; delete xs[sid] }
    for (const sidp of xp) {
      const p = xp[sidp]
      if (p.sidav === sid) { np++; delete xp[sidp] }
    }
    for (const sidr of xr) {
      const r = xr[sidr]
      if (r.sidav === sid) { nr++; delete xr[sidr] }
    }
  }
  if (na) state.avatars = { ...xa }
  if (nc) state.contacts = { ...xc }
  if (ni) state.invitcts = { ...xi }
  if (nj) state.invitgrs = { ...xj }
  if (ns) state.secrets = { ...xs }
  if (np) state.parrains = { ...xp }
  if (nr) state.rencontres = { ...xr }
  return na + nc + ni + nj + ns + np + nr
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
    const cc = state.contact
    lobj.forEach(obj => {
      if (!m[obj.sid]) {
        m[obj.sid] = [obj]
      } else {
        m[obj.sid].push(obj)
      }
      if (cc && table === 'contact' && cc.id === obj.id && cc.ic === obj.ic) {
        majcontact(state, obj)
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
    const ac = state.avatar
    const gc = state.groupe
    lobj.forEach(obj => {
      const av = st[obj.sid]
      if (obj.suppr || obj.horsLimite) {
        if (av) delete st[obj.sid]
      } else if (!av || av.v < obj.v) {
        st[obj.sid] = obj
        if (ac && table === 'avatar' && ac.id === obj.id) {
          majavatar(state, obj)
        }
        if (gc && table === 'groupe' && gc.id === obj.id) {
          majgroupe(state, obj)
        }
      }
    })
    state[table + 's'] = { ...st }
  }
}

export function setCompte (state, obj) { if (!state.compte || state.compte.v < obj.v) state.compte = obj }

/* Enregistrement de toutes les cv d'un coup */
export function commitRepertoire (state, repertoire) { state.repertoire = { ...repertoire } }
