import { NomAvatar, Cv } from '../../app/modele'
/*
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
*/

export function setAvatars (state, val) { // val : array d'objets Avatar
  const x = state.avatars
  val.forEach(a => {
    x[a.sid] = a
  })
  state.avatars = { ...x }
}

export function setCvs (state, val) { // val : array d'objets Cv OU NomAvatar
  const x = state.cvs
  val.forEach(c => {
    if (c instanceof NomAvatar) {
      if (x[c.sid]) x[c.sid] = new Cv().fromNomAvatar(c)
    } else {
      const y = x[c.sid]
      if (!y || y.vcv < c.vcv) x[c.sid] = c
    }
  })
  state.cvs = { ...x }
}

export function setCompte (state, val) { // val : objet Compte
  state.compte = val
}

/*
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
*/
