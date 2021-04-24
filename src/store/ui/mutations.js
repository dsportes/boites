export function debutreq (state, texte) {
  state.reqencours = true
  state.textestatus = texte || 'requête en cours ...'
}

export function finreq (state, texte) {
  state.reqencours = false
  state.textestatus = texte || ''
}

export function majtextestatus (state, texte) {
  state.textestatus = texte || ''
}

export function seterreur (state, err) {
  state.erreur = err
}

export function reseterreur (state) {
  state.derniereerreur = state.erreur
  state.erreur = null
}
