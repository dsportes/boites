import { crypt } from '../../app/crypto.mjs'

function Sid (id) { return typeof id === 'string' ? id : crypt.idToSid(id) }

export const avatar = (state) => (id) => {
  return id ? state.avatars[Sid(id)] : state.avatars
}

export const groupe = (state) => (id) => {
  return id ? state.groupes[Sid(id)] : state.groupes
}

export const rencontre = (state) => (prh) => {
  return prh ? state.rencontres[Sid(prh)] : state.rencontres
}

export const parrain = (state) => (pph) => {
  return pph ? state.parrains[Sid(pph)] : state.parrains
}

export const contact = (state) => (id, ic) => {
  const lc = state['contacts@' + Sid(id)]
  return !ic ? lc || { } : (lc ? lc[ic] : null)
}

export const membre = (state) => (id, im) => {
  const lc = state['membres@' + Sid(id)]
  return !im ? lc || { } : (lc ? lc[im] : null)
}

export const secret = (state) => (id, ns) => {
  const lc = state['secrets@' + Sid(id)]
  return !ns ? lc || {} : lc ? lc[Sid(ns)] : null
}

export const membreParId = (state) => (idg, idm) => {
  const lc = state['membres@' + Sid(idg)]
  for (const im in lc) {
    const m = lc[im]
    if (m.namb.sid === Sid(idm)) return m
  }
  return null
}

export const contactParId = (state) => (sid, sidc) => {
  const lc = state['contacts@' + sid]
  for (const simc in lc) {
    const c = lc[simc]
    if (c.nactc.sid === Sid(sidc)) return c
  }
  return null
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
