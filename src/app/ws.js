/* gestion WebSocket */

import { cfg, store } from './util'
import { random } from './crypto'
const base64url = require('base64url')

export const session = {}

export async function newSession () {
  if (session.ws) {
    session.ws.close()
    store().commit('ui/majsessionerreur', null)
  }
  return new Promise((resolve, reject) => {
    try {
      const sessionId = base64url(random(6))
      const ws = new Ws(sessionId)
      ws.websocket.onopen = (event) => {
        ws.websocket.send(sessionId)
        session.ws = ws
        resolve(ws)
      }
    } catch (e) {
      console.log(e)
      reject(e)
    }
  })
}

export class Ws {
  constructor (sessionid) {
    try {
      this.sessionId = sessionid
      this.syncqueue = []
      store().commit('ui/majsessionerreur', 0)
      this.enfermeture = false
      const u = cfg().urlserveur
      const url = 'wss' + u.substring(u.indexOf('://'))
      this.websocket = new WebSocket(url)
      this.websocket.onerror = () => {
        store().commit('ui/majsessionerreur', 1) // serveur injoignable à l'ouverture d'un sync
        this.websocket.close()
      }
      this.websocket.onclose = () => {
        const err = store().state.ui.sessionerreur
        if (!this.enfermeture && err === 0) {
          store().commit('ui/majsessionerreur', 2) // serveur non joignable en cours de sync
        }
        session.ws = null
      }
      this.websocket.onmessage = (m) => {
        this.syncqueue.push(m.data)
        this.onsync()
      }
    } catch (e) {
      console.log(e)
    }
  }

  onsync () {
    console.log('sync reçu')
    // TODO
  }

  close () { // fermeture volontaire
    this.enfermeture = true
    this.websocket.close()
  }
}
