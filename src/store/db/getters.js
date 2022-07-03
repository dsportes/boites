export const fetat = (state) => (id) => {
  return id ? state.fetats[id] : state.fetats
}

export const tribu = (state) => (id) => {
  return id ? state.tribus[id] : state.tribus
}

export const avatar = (state) => (id) => {
  return id ? state.avatars[id] : state.avatars
}

export const compta = (state) => (id) => {
  return id ? state.comptas[id] : state.comptas
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
  return !im ? (lc || {}) : (lc ? lc[im] : null)
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
  return !ns ? (lc || {}) : (lc ? lc[ns] : null)
}

export const avsecret = (state) => (id, ns) => {
  return id ? state.avsecrets[id + '/' + ns] : state.avsecrets
}
