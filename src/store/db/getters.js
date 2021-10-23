const crypt = require('../../app/crypto')

export function avatar (state, id) {
  return state.avatars[crypt.id2s(id)]
}

export function groupe (state, id) {
  return state.groupes[crypt.id2s(id)]
}

export function contact (state, { id, ic }) {
  const lc = state.contacts[crypt.id2s(id)]
  return lc ? lc[ic] : null
}
