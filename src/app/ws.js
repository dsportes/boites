/* gestion WebSocket */

import { cfg, store } from './util'
import { onsync } from './modele'
import { random, id2s } from './crypto'
import { AppExc } from './api'

export const session = { sessionId: '$NULL' }

export function SCID () { return session.sessionId }

export async function newSession () {
  if (session.ws) {
    session.ws.close()
    store().commit('ui/majsessionerreur', null)
  }
  return new Promise((resolve) => {
    try {
      session.sessionId = (store().getters['ui/modeincognito'] ? 'I' : 'S') + id2s(random(6))
      session.ws = new Ws(session.sessionId)
      session.sortie = 0
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

function onwserror (e) {
  store().commit('ui/majsessionerreur', new AppExc(-998, 'Liaison rompue avec le serveur sur incident technique', 'WebSocket error'))
  session.sortie = 2
  if (session.ws) session.ws.close()
}

export class Ws {
  constructor (sessionId) {
    try {
      this.sessionId = sessionId
      this.syncqueue = []
      store().commit('ui/majsessionerreur', null)
      const u = cfg().urlserveur
      const url = 'wss' + u.substring(u.indexOf('://'))
      this.websocket = new WebSocket(url)
      this.websocket.onerror = onwserror
      this.websocket.onclose = () => {
        session.ws = null
        session.sessionId = '$NULL'
        if (!session.sortie) {
          // fermeture par le serveur
          store().commit('ui/majsessionerreur', new AppExc(-999, 'Session fermée par le serveur'))
        }
        session.sortie = 0
      }
      this.websocket.onmessage = (m) => {
        onsync(m.data)
      }
    } catch (e) { // on ne passe jamais ici
      console.log('>>>> ' + e)
    }
  }

  close () { // fermeture volontaire
    session.sortie = 1
    store().commit('ui/majsessionerreur', null)
    if (this.websocket) this.websocket.close()
  }
}
