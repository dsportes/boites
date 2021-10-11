let nummessage = 1

export function debutreq (state) {
  state.reqencours = true
}

export function finreq (state) {
  state.reqencours = false
}

export function majdiagnostic (state, val) {
  state.diagnostic = val
}

export function razdiagnostic (state) {
  state.diagnostic = null
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

export function majinfomode (state, val) {
  state.infomode = val
}

export function majinforeseau (state, val) {
  state.inforeseau = val
}

export function majinfosync (state, val) {
  state.infosync = val
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

export function majsessionerreur (state, val) {
  state.sessionerreur = val
}

export function majdialoguecrypto (state, val) {
  state.dialoguecrypto = val
}

export function majdialoguecreationcompte (state, val) {
  state.dialoguecreationcompte = val
}

export function majmenuouvert (state, val) {
  state.menuouvert = val
}
