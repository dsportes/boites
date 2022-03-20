let nummessage = 1

export function razdialogues (state) {
  razdiagnostic(state)
  razmessage(state)
  majconfirmerdrc(state, false)
  majopencours(state, null)
  majdialoguecrypto(state, false)
  majdialoguehelp(state, false)
  majdialoguetestping(state, false)
  majmenuouvert(state, false)
  majinfomode(state, false)
  majinforeseau(state, false)
  majinfoidb(state, false)
  majconfirmstopop(state, false)
  state.dialoguecreationcompte = false
}

export function majstatutsession (state, val) {
  state.statutsession = val
  if (val === 2) {
    state.sessionok = true
  } else {
    state.sessionok = false
    state.erreur = { code: -4, message: 'néant', conseil: 'néant', stack: null }
    razdialogues(state)
    razsyncitems(state)
  }
}

export function majorg (state, val) { state.org = val }
export function majpage (state, val) { state.page = val }
export function majmode (state, val) { state.mode = val }
export function majmodeinitial (state, val) { state.modeinitial = val }

export function setsessionsync (state, val) { state.sessionsync = val }
export function resetsessionsync (state) { state.sessionsync = null }
export function majopencours (state, val) { state.opencours = val }
export function majsessionid (state, val) { state.sessionid = val }
export function majstatutnet (state, val) { state.statutnet = val }

export function razdialoguesynchro (state) { state.dialoguesynchro = false }
export function majdialoguesynchro (state, val) { state.dialoguesynchro = val }
export function nouveaumessage (state, { texte, important }) {
  state.message = { texte: texte, important: important, n: nummessage++ }
}
export function razmessage (state) { state.message = null; state.messageto = null }
export function majmessageto (state, to) { state.messageto = to }
export function majdiagnostic (state, val) { state.diagnostic = val }
export function razdiagnostic (state) { state.diagnostic = null }
export function majerreur (state, err) { state.erreur = err }
export function majdialogueerreur (state, val) { state.dialogueerreur = val }
export function majconfirmstopop (state, val) { state.confirmstopop = val }
export function majtabavatar (state, val) { state.tabavatar = val }
export function majinfomode (state, val) { state.infomode = val }
export function majinforeseau (state, val) { state.inforeseau = val }
export function majinfoidb (state, val) { state.infoidb = val }
export function majstatutidb (state, val) { state.statutidb = val }
export function majdialoguecrypto (state, val) { state.dialoguecrypto = val }
export function majconfirmerdrc (state, val) { state.confirmerdrc = val }
export function majdialoguecreationcompte (state, val) { state.dialoguecreationcompte = val }
export function majdialoguetestping (state, val) { state.dialoguetestping = val }
export function majmenuouvert (state, val) { state.menuouvert = val }
export function togglemenuouvert (state) { state.menuouvert = !state.menuouvert }

export function majevtavatar (state, val) { state.evtavatar = { evt: val } }
export function majevtfiltresecrets (state, val) { state.evtfiltresecrets = val }
export function majevtfiltresecrets2 (state, val) { state.evtfiltresecrets2 = val }
export function majevtavatarct (state, val) { state.evtavatarct = { evt: val } }
export function majevtavatargr (state, val) { state.evtavatargr = { evt: val } }

export function majinvitationattente (state, val) { state.invitationattente = val }
export function majeditgr (state, val) { state.editgr = val }
export function majclipboard (state, val) { state.clipboard = val }
export function majpanelinvit (state, val) { state.panelinvit = val }

export function pushhelp (state, page) {
  if (state.helpstack.length === 0) state.dialoguehelp = true
  state.helpstack.push(page)
}
export function pophelp (state) {
  if (state.helpstack.length === 1) {
    state.dialoguehelp = false
    state.helpstack.length = 0
  } else {
    state.helpstack.splice(state.helpstack.length - 1, 1)
  }
}
export function majdialoguehelp (state, val) {
  state.dialoguehelp = val
  if (val === false) state.helpstack.length = 0
}

export function setsyncitem (state, { k, st, label }) {
  const x = state.syncitems
  x[k] = { k, st, label }
  state.syncitems = { ...x }
}

export function razsyncitems (state) { state.syncitems = { } }
