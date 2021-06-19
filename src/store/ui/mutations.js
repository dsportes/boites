let nummessage = 1

export function debutreq (state) {
  state.reqencours = true
}

export function finreq (state) {
  state.reqencours = false
}

export function nouveaumessage (state, { texte, important }) {
  state.message = { texte: texte, important: important, n: nummessage++ }
}

export function razmessage (state) {
  state.message = null
  state.messageto = null
}

export function majmessageto (state, to) {
  state.messageto = to
}

export function majerreur (state, err) {
  state.erreur = err
  state.derniereerreur = err
}

export function razerreur (state) {
  state.erreur = null
}

export function majstatushttp (state, status) { // boolean
  state.statushttp = status
}

export function majorg (state, val) {
  state.org = val
}

export function majstatuslogin (state, val) {
  state.statuslogin = val
}

export function majorgicon (state, val) {
  state.orgicon = val
}

export function majmode (state, val) {
  state.mode = val
}

export function ouvrirsession (state, val) {
  state.session = val
}

export function fermersession (state) {
  state.session = null
}

export function majsessionerreur (state, val) {
  state.sessionerreur = val
}

export function majdialoguecrypto (state, val) {
  state.dialoguecrypto = val
}

export function majmenuouvert (state, val) {
  state.menuouvert = val
}

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
