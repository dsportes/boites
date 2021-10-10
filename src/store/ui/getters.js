import * as CONST from '../constantes'

export function enerreur (state) { // boolean
  return state.erreur != null
}
export function aeuuneerreur (state) { // boolean
  return state.derniereerreur != null
}

export function reseauok (state) { // boolean
  return state.statushttp === 200 || state.statushttp === 400 || state.statushttp === 401
}

export function messagevisible (state) {
  return state.message != null
}

export function diagnosticvisible (state) {
  return state.diagnostic !== null
}

export function enligne (state) { // boolean
  return state.mode === CONST.MODE_SYNC || state.mode === CONST.MODE_INCOGNITO
}
export function enlocal (state) { // boolean
  return state.mode === CONST.MODE_AVION || state.mode === CONST.MODE_SYNC
}
export function modeincognito (state) { // boolean
  return state.mode === CONST.MODE_INCOGNITO
}
export function modeavion (state) { // boolean
  return state.mode === CONST.MODE_AVION
}
export function modesync (state) { // boolean
  return state.mode === CONST.MODE_SYNC
}
export function modeinconnu (state) { // boolean
  return state.mode === CONST.MODE_INCONNU
}

export function labelorg (state) {
  if (state.org == null) return 'Organisation non saisie'
  if (state.orgicon != null) return state.org
  return state.org + ' : inconnu ' + (state.mode === CONST.MODE_INCONNU ? '' : (state.mode === CONST.MODE_AVION ? 'sur cet appareil' : ' : du serveur'))
}
