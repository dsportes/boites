/* gestion WebSocket */

import { cfg, store, razmessage } from './util'
import { onsync } from './modele'
import { random, id2s } from './crypto'
import { AppExc } from './api'

export const WSERR = new AppExc(-998, 'Liaison rompue avec le serveur sur incident technique', 'WebSocket error')

export const session = {
  sessionId: '$NULL',
  enerreur: false
}

export function SCID (scid) {
  const x = session.sessionId
  if (!scid) {
    if (x !== '$NULL') return x
    razmessage()
    if (session.enerreur) {
      store().commit('ui/majerreur', WSERR)
    }
    throw WSERR
  }
  if (x === scid && x !== '$NULL') return
  store().commit('ui/majerreur', WSERR)
  throw WSERR
}

export async function newSession () {
  if (session.ws) {
    session.ws.close()
    store().commit('ui/majsessionerreur', null)
  }
  return new Promise((resolve) => {
    try {
      session.sessionId = (store().getters['ui/modeincognito'] ? 'I' : 'S') + id2s(random(6))
      session.enerreur = false
      store().commit('ui/majsessionerreur', null)
      session.ws = new Ws(session.sessionId)
      session.ws.websocket.onopen = (event) => {
        session.ws.websocket.send(session.sessionId)
        resolve(session.ws)
      }
    } catch (e) {
      console.log(e)
      resolve(null)
    }
  })
}

export class Ws {
  constructor (sessionId) {
    try {
      this.sessionId = sessionId
      store().commit('ui/majsessionerreur', null)
      this.syncqueue = []
      const u = cfg().urlserveur
      const url = 'wss' + u.substring(u.indexOf('://'))
      this.websocket = new WebSocket(url)
      this.websocket.onerror = (e) => {
        session.enerreur = true
        session.sessionId = '$NULL'
        store().commit('ui/majsessionerreur', WSERR)
        if (session.ws) session.ws.close()
      }
      this.websocket.onclose = () => {
        session.ws = null
      }
      this.websocket.onmessage = (m) => {
        onsync(m.data)
      }
    } catch (e) { // on ne passe jamais ici
      console.log('>>>> ' + e)
    }
  }

  close () { // fermeture volontaire (enerreur === true)
    session.sessionId = '$NULL'
    if (this.websocket) this.websocket.close()
  }
}
