import { crypt } from '../../app/crypto.js'

export const avatar = (state) => (id) => {
  return state.avatars[crypt.idToSid(id)]
}

export const contact = (state) => (id, ic) => {
  const lc = state.contacts[crypt.idToSid(id)]
  if (!ic) return lc || { }
  return lc ? lc[ic] : null
}

export const invitct = (state) => (id, ni) => {
  const lc = state.invitcts[crypt.idToSid(id)]
  if (!ni) return lc || { }
  return lc ? lc[crypt.idToSid(ni)] : null
}

export const invitgr = (state) => (id, ni) => {
  const lc = state.invitgrs[crypt.idToSid(id)]
  if (!ni) return lc || { }
  return lc ? lc[crypt.idToSid(ni)] : null
}

export const rencontre = (state) => (id, prh) => {
  if (prh) return state.rencontres[crypt.idToSid(prh)] || null
  for (const sid in state.rencontres) {
    const obj = state.rencontres[sid]
    if (obj.id === id) return obj
  }
  return null
}

export const parrain = (state) => (id, pph) => {
  if (pph) return state.parrains[crypt.idToSid(pph)] || null
  for (const sid in state.parrains) {
    const obj = state.parrains[sid]
    if (obj.id === id) return obj
  }
  return null
}

export const groupe = (state) => (id) => {
  return state.groupes[crypt.idToSid(id)]
}

export const membre = (state) => (id, im) => {
  const lc = state.membres[crypt.idToSid(id)]
  if (!im) return lc || { }
  return lc ? lc[im] : null
}

export const secret = (state) => (id, ns) => {
  const lc = state.membres[crypt.idToSid(id)]
  if (!ns) return lc || { }
  return lc ? lc[crypt.idToSid(ns)] : null
}

export const cv = (state) => (id) => {
  return state.cvs[crypt.idToSid(id)]
}
