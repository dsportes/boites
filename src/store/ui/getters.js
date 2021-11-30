import * as CONST from '../constantes.js'
import { cfg } from '../../app/util.mjs'

export function orgicon (state) {
  return state.org ? cfg().orgs[state.org].icon : cfg().logo
}

export function orglabel (state) {
  return state.org || 'Organisation non saisie'
}

export function enerreur (state) { // boolean
  return state.erreur != null
}
export function aeuuneerreur (state) { // boolean
  return state.derniereerreur != null
}

/*
export function reseauok (state) { // boolean
  return state.statushttp === 200 || state.statushttp === 400 || state.statushttp === 401
}
*/
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

export function sessionerreurmsg (state) {
  return state.sessionerreur ? state.sessionerreur.message : 'OK'
}
