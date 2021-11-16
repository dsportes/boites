import { IDBLEC_RAZ } from '../constantes'

let nummessage = 1

export function razdialogues (state) {
  razdiagnostic(state)
  razmessage(state)
  majconfirmerdrc(state, false)
  majopencours(state, null)
  majdialoguecrypto(state, false)
  majdialoguetestping(state, false)
  majmenuouvert(state, false)
  majinfomode(state, false)
  majinforeseau(state, false)
  majinfoidb(state, false)
  majconfirmstopop(state, false)
  state.dialoguecreationcompte = false
  state.erreur = { code: -4, message: 'néant', conseil: 'néant', stack: null }
}

export function deconnexion (state) {
  razdialogues(state)
  state.idblec = IDBLEC_RAZ
}

export function majopencours (state, val) {
  state.opencours = val
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
}

export function majdialogueerreur (state, val) {
  state.dialogueerreur = val
}

export function majconfirmstopop (state, val) {
  state.confirmstopop = val
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

export function majstatutidb (state, val) {
  state.statutidb = val
}

export function majsessionid (state, val) {
  state.sessionid = val
}

export function majstatutnet (state, val) {
  state.statutnet = val
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

export function majmodeinitial (state, val) {
  state.modeinitial = val
}

export function majdialoguecrypto (state, val) {
  state.dialoguecrypto = val
}

export function majconfirmerdrc (state, val) {
  state.confirmerdrc = val
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

export function majidblec (state, { table, st, vol, nbl }) {
  const x = state.idblec
  x[table] = { st, vol, nbl }
  state.idblec = { ...x }
}

export function razidblec (state) {
  state.idblec = { ...IDBLEC_RAZ }
}

export function majstatutsession (state, val) {
  state.statutsession = val
}

export function majdialoguesynchro (state, val) {
  state.dialoguesynchro = val
}

export function razdialoguesynchro (state) {
  state.dialoguesynchro = false
}

export function majsynclec (state, { st, sid, nom, nbl }) {
  const x = state.synclec
  x[sid] = { st, sid, nom, nbl }
  state.synclec = { ...x }
}

export function razsynclec (state) {
  state.synclec = { }
}
