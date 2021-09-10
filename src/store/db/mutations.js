export function avatar (state, val) {
  if (typeof val === 'string') {
    const x = state.avatars
    delete x[val]
    state.avatars = x
  } else {
    const x = state.avatars[val.id]
    if (!x) {
      state.avatars[val.id] = val
    } else {
      state.avatars[val.id] = { ...x, ...val }
    }
  }
}

function XY (obj, X, val) { // val : { id, val } à insérer / modifier / supprimer dans la proriété X de obj
  const suppr = typeof val.val === 'string'
  if (!obj) return
  const c = obj[X] || {}
  if (suppr) {
    if (c[val.val]) {
      delete c[val.val]
    } else return null
  } else {
    const x = c[val.val.id]
    if (!x) {
      c[val.val.id] = val.val
    } else {
      c[val.val.id] = { ...c[val.val.id], ...val.val }
    }
  }
  return c
}

export function avatarcontact (state, val) { // val est un objet de la forme {id, val:{ id, val } }
  const obj = state.avatars[val.id]
  const c = XY(obj, 'contacts', val)
  if (c) state.avatars[val.id] = { ...obj, contacts: c }
}
