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
  state.derniereerreur = err
}

export function reseterreur (state) {
  state.erreur = null
}

export function setstatusreseau (state, val) {
  state.statusreseau = val
}

export function setstatuslocal (state, val) {
  state.statuslocal = val
}

export function setcfgorg (state, val) {
  state.cfgorg = val
}
