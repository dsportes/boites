let nummessage = 1

export function razdialogues (state) {
  // mainlayout
  majmenuouvert(state, false)
  majconfirmerdrc(state, false)
  majinfomode(state, false)
  majinforeseau(state, false)
  majinfoidb(state, false)
  razmessage(state)
  razdiagnostic(state)
  majopencours(state, null)
  majconfirmstopop(state, false)
  majinvitationattente(state, null)
  majdialoguesynchro(state, false)
  majdialoguehelp(state, false)
  majdialoguechat(state, false)
  majdialoguecrypto(state, false)
  majdialoguetestping(state, false)
  majdialoguecreationcompte(state, false)
  majdialoguedlselection(state, false)
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

// MainLayout
export function majmenuouvert (state, val) { state.menuouvert = val }
export function majpanelcontacts (state, val) { state.panelcontacts = val }
export function majfichiersavion (state, val) { state.fichiersavion = val }
export function majconfirmerdrc (state, val) { state.confirmerdrc = val }
export function majinfomode (state, val) { state.infomode = val }
export function majinforeseau (state, val) { state.inforeseau = val }
export function majinfoidb (state, val) { state.infoidb = val }
export function majdialoguechat (state, val) { state.dialoguechat = val }
export function majdialogueselchat (state, val) { state.dialogueselchat = val }

export function majorg (state, val) { state.org = val }
export function majpage (state, val) { state.page = val }
export function majmode (state, val) { state.mode = val }
export function majmodeinitial (state, val) { state.modeinitial = val }

export function nouveaumessage (state, { texte, important }) {
  state.message = { texte: texte, important: important, n: nummessage++ }
}
export function razmessage (state) { state.message = null; state.messageto = null }
export function majmessageto (state, to) { state.messageto = to }

export function majdiagnostic (state, val) { state.diagnostic = val }
export function razdiagnostic (state) { state.diagnostic = null }

export function majconfirmstopop (state, val) { state.confirmstopop = val }
export function majopencours (state, val) { state.opencours = val }

export function setsessionsync (state, val) { state.sessionsync = val }
export function resetsessionsync (state) { state.sessionsync = null }
export function majsessionid (state, val) { state.sessionid = val }
export function majstatutnet (state, val) { state.statutnet = val }

export function majdialoguesynchro (state, val) { state.dialoguesynchro = val }
export function majdialoguedlselection (state, val) { state.dialoguedlselection = val }

export function majerreur (state, err) { state.erreur = err }
export function majdialogueerreur (state, val) { state.dialogueerreur = val }

export function majtabavatar (state, val) { state.tabavatar = val }
export function majtabsecret (state, val) { state.tabsecret = val }

export function majstatutidb (state, val) { state.statutidb = val }
export function majdialoguecrypto (state, val) { state.dialoguecrypto = val }
export function majdialoguecreationcompte (state, val) { state.dialoguecreationcompte = val }
export function majdialoguetestping (state, val) { state.dialoguetestping = val }

export function majevtfiltresecrets (state, val) { state.evtfiltresecrets = val }

export function majevtavatarsc (state, val) { state.evtavatarsc = { evt: val } }

export function majavatarcprech (state, val) { state.avatarcprech = val }
export function majavatarcpform (state, val) { state.avatarcpform = val }
export function majavatargrrech (state, val) { state.avatargrrech = val }
export function majavatargrform (state, val) { state.avatargrform = val }
export function majavatarscrech (state, val) { state.avatarscrech = val }
export function majavatarscform (state, val) { state.avatarscform = val }
export function majavatartrform (state, val) { state.avatartrform = val }

export function majinvitationattente (state, val) { state.invitationattente = val }
export function majeditgr (state, val) { state.editgr = val }
export function majclipboard (state, val) { state.clipboard = val }
export function majpanelinvit (state, val) { state.panelinvit = val }

export function majetapefichier (state, val) { state.etapefichier = val }

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

export function initchargements (state, val) { state.chargements = val }
export function ajoutchargements (state, val) {
  if (!val || !val.length) return
  // en queue et sauf ceux supprimés (qui sont retirés)
  const plus = []
  const moins = new Set()
  for (const f of val) if (f.suppr) moins.add(f.id)
  if (state.chargements.length) for (const id of state.chargements) if (!moins.has(id)) plus.push(id)
  for (const f of val) if (!f.suppr) plus.push(f.id)
  state.chargements = plus
}
export function okchargement (state) {
  if (state.chargements.length !== 0) {
    const s = state.chargements.slice(1)
    state.chargements = [...s]
  }
}
export function kochargement (state) {
  if (state.chargements.length !== 0) {
    const i = state.chargements[0]
    const s = state.chargements.slice(1)
    state.chargements = [...s]
    state.echecs = [i, ...state.echecs]
  }
}
export function razechec (state, idf) {
  const i = state.echecs.indexOf(idf)
  if (i === -1) return
  const l = []
  state.echecs.forEach(i => { if (i !== idf) l.push(i) })
  state.echecs = l
}
export function majdlencours (state, val) {
  state.dlencours = val
}
