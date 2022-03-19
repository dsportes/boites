import { crypt } from '../../app/crypto.mjs'
import { Sid } from '../../app/util.mjs'

export const avatar = (state) => (id) => {
  return id ? state.avatars[id] : state.avatars
}

export const groupe = (state) => (id) => {
  return id ? state.groupes[id] : state.groupes
}

export const couple = (state) => (id) => {
  return id ? state.couples[id] : state.couples
}

export const cv = (state) => (id) => {
  return id ? state.cvs[id] : state.cvs
}

export const membre = (state) => (id, im) => {
  const lc = state['membres@' + id]
  return !im ? lc || { } : (lc ? lc[im] : null)
}

export const membreParId = (state) => (idg, idm) => {
  const lc = state['membres@' + idg]
  for (const im in lc) {
    const m = lc[im]
    if (m.namb.id === idm) return m
  }
  return null
}

export const secret = (state) => (id, ns) => {
  const lc = state['secrets@' + id]
  return !ns ? lc || {} : lc ? lc[Sid(ns)] : null
}

export const pjidx = (state) => ({ id, ns, cle }) => {
  const k = crypt.idToSid(id) + '@' + (!ns ? '' : crypt.idToSid(ns) + '@' + (!cle ? '' : cle))
  const st = state.pjidx
  const r = []
  for (const kx in st) {
    if (kx.startsWith(k)) r.push(st[kx])
  }
  return r
}
