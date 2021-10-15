/* gestion WebSocket */

import { cfg, store, dhtToString } from './util'
import { random } from './crypto'
import { Idb } from './db'
const rowTypes = require('./rowTypes')

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
  constructor (sessionId) {
    try {
      this.sessionId = sessionId
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

  async onsync (syncList) {
    if (cfg().debug) {
      console.log('Liste sync reçue: ' + dhtToString(syncList.dh) +
        ' status:' + syncList.status + ' sessionId:' + syncList.sessionId + ' nb rowItems:' + syncList.rowItems.length)
    }
    this.syncqueue.push(syncList)
    if (store().state.ui.phasesync === 0) {
      const q = this.syncqueue
      this.syncqueue = []
      await this.processqueue(q)
    }
  }

  close () { // fermeture volontaire
    this.enfermeture = true
    this.websocket.close()
  }

  async processqueue (q) {
    const items = []
    const db = Idb.idb
    for (let i = 0; i < q.length; i++) {
      const syncList = q[i]
      for (let j = 0; j < syncList.rowItems.length; j++) {
        const rowItem = syncList.rowItems[j]
        rowTypes.deserialItem(rowItem)
        items.push(rowItem)
      }
    }
    await db.commitRows(items)
    // TODO : compilation des rows, mettre à jour de l'état mémoire
  }
}
