const crypt = require('../../app/crypto')

export const avatar = (state) => (id) => {
  return state.avatars[crypt.id2s(id)]
}

export const contact = (state) => (id, ic) => {
  const lc = state.contacts[crypt.id2s(id)]
  if (!ic) return lc || { }
  return lc ? lc[ic] : null
}

export const invitct = (state) => (id, ni) => {
  const lc = state.invitcts[crypt.id2s(id)]
  if (!ni) return lc || { }
  return lc ? lc[crypt.id2s(ni)] : null
}

export const invitgr = (state) => (id, ni) => {
  const lc = state.invitgrs[crypt.id2s(id)]
  if (!ni) return lc || { }
  return lc ? lc[crypt.id2s(ni)] : null
}

export const rencontre = (state) => (id, prh) => {
  if (prh) return state.rencontres[crypt.id2s(prh)] || null
  for (const sid in state.rencontres) {
    const obj = state.rencontres[sid]
    if (obj.id === id) return obj
  }
  return null
}

export const parrain = (state) => (id, pph) => {
  if (pph) return state.parrains[crypt.id2s(pph)] || null
  for (const sid in state.parrains) {
    const obj = state.parrains[sid]
    if (obj.id === id) return obj
  }
  return null
}

export const groupe = (state) => (id) => {
  return state.groupes[crypt.id2s(id)]
}

export const membre = (state) => (id, im) => {
  const lc = state.membres[crypt.id2s(id)]
  if (!im) return lc || { }
  return lc ? lc[im] : null
}

export const secret = (state) => (id, ns) => {
  const lc = state.membres[crypt.id2s(id)]
  if (!ns) return lc || { }
  return lc ? lc[crypt.id2s(ns)] : null
}

export const cv = (state) => (id) => {
  return state.cvs[crypt.id2s(id)]
}
