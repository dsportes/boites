/* gestion WebSocket */

import { cfg } from './util'
import { data } from './modele'

export async function openWS () {
  return new Promise((resolve) => {
    try {
      const u = cfg().urlserveur
      const url = 'wss' + u.substring(u.indexOf('://'))
      const ws = new WebSocket(url)
      ws.onerror = (e) => {
        data.setErWS()
        if (ws) ws.close()
      }
      ws.onclose = () => {
        data.ws = null
      }
      ws.onmessage = (m) => {
        data.onsync(m.data)
      }
      ws.onopen = (event) => {
        ws.send(data.sessionId)
        data.ws = ws
        resolve(ws)
      }
    } catch (e) {
      console.log(e)
      resolve(null)
    }
  })
}
