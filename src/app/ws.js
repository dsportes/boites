/* gestion WebSocket */

import { cfg, store } from './util'

export async function newSession (init) {
  const session = store().state.ui.session
  if (session) {
    session.close()
    store().commit('ui/fermersession')
    store().commit('ui/majsessionerreur', null)
  }
  return new Promise((resolve, reject) => {
    try {
      const s = new Ws()
      s.websocket.onopen = (event) => {
        store().commit('ui/ouvrirsession', s)
        s.send(init)
        resolve(s)
      }
    } catch (e) {
      console.log(e)
      reject(e)
    }
  })
}

export class Ws {
  constructor () {
    try {
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
        if (!this.enfermeture && !store().state.ui.sessionerreur) {
          store().commit('ui/majsessionerreur', 2) // serveur non joignable en cours de sync
        }
        store().commit('ui/fermersession')
      }
      this.websocket.onmessage = (m) => {
        try {
          const x = JSON.parse(m.data)
          console.log(JSON.stringify(x))
        } catch (e) {
          console.log(e + '/n' + m)
        }
      }
    } catch (e) {
      console.log(e)
    }
  }

  close () { // fermeture volontaire
    this.enfermeture = true
    this.websocket.close()
  }

  send (m) {
    this.websocket.send(JSON.stringify(m))
  }
}
