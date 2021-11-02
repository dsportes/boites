import { IDBLEC_RAZ } from '../constantes'

let nummessage = 1

export function razdialogues (state) {
  razdiagnostic(state)
  razmessage(state)
  finreq(state)
  razerreur(state)
  majdialoguecrypto(state, false)
  majmenuouvert(state, false)
  majinfomode(state, false)
  majinforeseau(state, false)
  majinfoidb(state, false)
  majconfirmstopchargement(state, false)
  state.dialoguecreationcompte = false
}

export function deconnexion (state) {
  razdiagnostic(state)
  razmessage(state)
  finreq(state)
  razerreur(state)
  state.reqencours = false
  state.syncencours = false
  state.idberreur = null
  state.modeleactif = true
  state.sessionerreur = null
  state.idblec = IDBLEC_RAZ
}

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

export function majconfirmstopchargement (state, val) {
  state.confirmstopchargement = val
}

export function majinfomode (state, val) {
  state.infomode = val
}

export function majinforeseau (state, val) {
  state.inforeseau = val
}

export function majinfoidb (state, val) {
  state.infoidb = val
}

export function majstatushttp (state, status) { // boolean
  state.statushttp = status
}

export function majorg (state, val) {
  state.org = val
}

export function majpage (state, val) {
  state.page = val
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

export function majdialoguetestping (state, val) {
  state.dialoguetestping = val
}

export function majmenuouvert (state, val) {
  state.menuouvert = val
}

export function majsyncencours (state, val) {
  state.syncencours = val
}

export function majidblec (state, { table, st, vol, nbl }) {
  const x = state.idblec
  x[table] = { st, vol, nbl }
  state.idblec = { ...x }
}

export function razidblec (state) {
  state.idblec = { ...IDBLEC_RAZ }
}

export function majidberreur (state, val) {
  state.idberreur = val
}

export function majmodeleactif (state, val) {
  state.modeleactif = val
}
