import { NomAvatar, Cv } from '../../app/modele.mjs'
import { crypt } from '../../app/crypto.mjs'

export function setSecSrc (state, sid) {
  if (!state.listsec[sid]) {
    const l = state.listsec
    l[sid] = true
    state.listsec = { ...l }
    state['secrets_' + sid] = {}
  }
  return state['secrets_' + sid]
}

export function setSec (state, obj) { // obj : { sid, ns, dh }
  const st = setSecSrc(state, obj.sid)
  st[obj.ns] = obj
  state['secrets_' + obj.sid] = { ...st }
}

export function raz (state) {
  state.compte = null
  state.avatar = null
  state.groupe = null
  state.avatars = {}
  state.contacts = {}
  state.invitcts = {}
  state.invitgrs = {}
  state.groupes = {}
  state.membres = {}
  state.secrets = {}
  state.parrains = {}
  state.rencontres = {}
  state.cvs = {}
}

export function commitRepertoire (state, repertoire) {
  state.cvs = { ...repertoire }
}

export function majavatar (state, val) {
  state.avatar = val
}

export function majgroupe (state, val) {
  state.groupe = val
}

export function purgeAvatars (state, val) { // val : Set des ids des avatars utiles
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

export function purgeGroupes (state, val) { // val : Set des ids des groupes utiles
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

export function purgeCvs (state, val) { // val : Set des ids des avatars utiles
  const x = state.cvs
  const s = new Set()
  for (const sid in x) {
    const id = crypt.sidToId(sid)
    if (!val.has(id)) s.add(sid)
  }
  if (s.size) {
    for (const sid of s) delete x[sid]
    state.cvs = { ...x }
  }
  return s.size
}

/*
export function setObjets (state, { table, lobj }) { // val : array d'objets Avatar
  switch (table) {
    case 'compte' : return setCompte(state, lobj)
    case 'avatar' : return setAvatars(state, lobj)
    case 'contact' : return setContacts(state, lobj)
    case 'invitct' : return setInvitcts(state, lobj)
    case 'invitgr' : return setInvitgrs(state, lobj)
    case 'parrain' : return setParrains(state, lobj)
    case 'rencontre' : return setRencontres(state, lobj)
    case 'groupe' : return setGroupes(state, lobj)
    case 'membre' : return setMembres(state, lobj)
    case 'secret' : return setSecrets(state, lobj)
    case 'cv' : return setCvs(state, lobj)
  }
}
*/

export function setAvatars (state, val) { // val : array d'objets Avatar
  const x = state.avatars
  val.forEach(a => {
    a.dernier = false
    const y = x[a.sid]
    if (!y || y.v < a.v) { x[a.sid] = a; a.dernier = true }
  })
  state.avatars = { ...x }
}

export function setContacts (state, val) { // val : array d'objets Contact
  const x = state.contacts
  val.forEach(a => {
    a.dernier = false
    const ids = crypt.idToSid(a.id)
    let y = x[ids]
    if (!y) { y = {}; x[ids] = y }
    const a2 = y[a.ic]
    if (!a2 || a2.v < a.v) { y[a.ic] = a; a.dernier = true }
  })
  state.contacts = { ...x }
}

export function setInvitcts (state, val) { // val : array d'objets Invitct
  const x = state.invitcts
  val.forEach(a => {
    a.dernier = false
    const ids = crypt.idToSid(a.id)
    const nis = crypt.idToSid(a.ni)
    let y = x[ids]
    if (!y) { y = {}; x[ids] = y }
    const a2 = y[nis]
    if (!a2 || a2.v < a.v) { y[nis] = a; a.dernier = true }
  })
  state.invitcts = { ...x }
}

export function setInvitgrs (state, val) { // val : array d'objets Invitgr
  const x = state.invitgrs
  val.forEach(a => {
    const ids = crypt.idToSid(a.id)
    const nis = crypt.idToSid(a.ni)
    if (a.st < 0) {
      const d = x[ids]
      if (d) delete d[nis]
    } else {
      a.dernier = false
      let y = x[ids]
      if (!y) { y = {}; x[ids] = y }
      const a2 = y[nis]
      if (!a2 || a2.v < a.v) { y[nis] = a; a.dernier = true }
    }
  })
  state.invitgrs = { ...x }
}

export function setParrains (state, val) { // val : array d'objets Parrain
  const x = state.parrains
  val.forEach(a => {
    a.dernier = false
    const a2 = x[a.sid]
    if (!a2 || a2.v < a.v) { x[a.sid] = a; a.dernier = true }
  })
  state.parrains = { ...x }
}

export function setRencontres (state, val) { // val : array d'objets Rencontre
  const x = state.rencontre
  val.forEach(a => {
    a.dernier = false
    const a2 = x[a.sid]
    if (!a2 || a2.v < a.v) { x[a.sid] = a; a.dernier = true }
  })
  state.rencontre = { ...x }
}

export function setGroupes (state, val) { // val : array d'objets Groupe
  const x = state.groupes
  val.forEach(a => {
    a.dernier = false
    const y = x[a.sid]
    if (!y || y.v < a.v) { x[a.sid] = a; a.dernier = true }
  })
  state.groupes = { ...x }
}

export function setMembres (state, val) { // val : array d'objets Membre
  const x = state.membres
  val.forEach(a => {
    a.dernier = false
    const ids = crypt.idToSid(a.id)
    let y = x[ids]
    if (!y) { y = {}; x[ids] = y }
    const a2 = y[a.ic]
    if (!a2 || a2.v < a.v) { y[a.ic] = a; a.dernier = true }
  })
  state.membres = { ...x }
}

export function setSecrets (state, val) { // val : array d'objets Secret
  const x = state.membres
  val.forEach(a => {
    a.dernier = false
    const ids = crypt.idToSid(a.id)
    const nss = crypt.idToSid(a.ns)
    let y = x[ids]
    if (!y) { y = {}; x[ids] = y }
    const a2 = y[nss]
    if (!a2 || a2.v < a.v) { y[nss] = a; a.dernier = true }
  })
  state.secrets = { ...x }
}

export function setCvs (state, val) { // val : array d'objets Cv OU NomAvatar
  const x = state.cvs
  val.forEach(c => {
    if (c instanceof NomAvatar) {
      if (x[c.sid]) x[c.sid] = new Cv().fromNomAvatar(c)
    } else {
      c.dernier = false
      const y = x[c.sid]
      if (!y || y.vcv < c.vcv) { x[c.sid] = c; c.dernier = true }
    }
  })
  state.cvs = { ...x }
}

export function setCompte (state, val) { // val : objet Compte
  val.dernier = false
  if (!state.compte || state.compte.v < val.v) { state.compte = val; val.dernier = true }
}
