import { crypt } from '../../app/crypto.mjs'

export const avatar = (state) => (id) => {
  return id ? state.avatars[crypt.idToSid(id)] : state.avatars
}

export const groupe = (state) => (id) => {
  return id ? state.groupes[crypt.idToSid(id)] : state.groupes
}

export const rencontre = (state) => (id, prh) => {
  return prh ? state.rencontres[crypt.idToSid(prh)] : state.rencontres
}

export const parrain = (state) => (pph) => {
  return pph ? state.parrains[crypt.idToSid(pph)] : state.parrains
}

export const contact = (state) => (sid, sid2) => {
  const lc = state['contacts@' + sid]
  return !sid2 ? lc || { } : (lc ? lc[sid2] : null)
}

export const invitct = (state) => (sid, sid2) => {
  const lc = state['invitcts@' + sid]
  return !sid2 ? lc || { } : (lc ? lc[sid2] : null)
}

export const invitgr = (state) => (sid, sid2) => {
  const lc = state['invitgrs@' + sid]
  return !sid2 ? lc || { } : (lc ? lc[sid2] : null)
}

export const membre = (state) => (sid, sid2) => {
  const lc = state['membres@' + sid]
  return !sid2 ? lc || { } : (lc ? lc[sid2] : null)
}

export const secret = (state) => (sid, sid2) => {
  const lc = state['secrets@' + sid]
  return !sid2 ? lc || {} : lc ? lc[sid2] : null
}
