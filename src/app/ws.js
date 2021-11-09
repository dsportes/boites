/* gestion WebSocket */

import { cfg, store } from './util'
import { data } from './modele'
const api = require('./api')
const AppExc = require('./api').AppExc

function EX1 (e) {
  return new AppExc(api.E_WS, 'Ouverture de la connexion avec le serveur impossible', e.message)
}

function EX2 (e) {
  return new AppExc(api.E_WS, 'Envoi d\'un message au serveur impossible', e.message)
}

function EX3 (e) {
  return new AppExc(api.E_WS, 'Rupture de la liaison avec le serveur par le serveur', e.message)
}

export async function openWS () {
  return new Promise((resolve) => {
    try {
      const u = cfg().urlserveur
      const url = 'wss' + u.substring(u.indexOf('://'))
      const ws = new WebSocket(url)
      if (data.to) clearTimeout(data.to)
      ws.onerror = (e) => {
        try { data.setErWS(EX3(e)) } catch (e) {}
        if (ws) ws.close()
      }
      ws.onclose = () => {
        try { data.setErWS(EX2('Fermeture')) } catch (e) {}
        data.ws = null
        if (data.to) clearTimeout(data.to)
      }
      ws.onmessage = (m) => {
        data.onsync(m.data)
      }
      ws.onopen = (event) => {
        try {
          ws.send(data.sessionId)
          heartBeat(data.sessionId)
          data.ws = ws
          store().commit('ui/majstatutnet', 1)
          resolve(ws)
        } catch (e) {
          try { data.setErWS(EX2(e)) } catch (e) {}
          data.ws = null
          resolve(null)
        }
      }
    } catch (e) {
      console.log(e)
      try { data.setErWS(EX1(e)) } catch (e) {}
      resolve(null)
    }
  })
}

function heartBeat (sid) {
  data.to = setTimeout(() => {
    if (data.ws && data.sessionId === sid) {
      try {
        data.ws.send(sid)
        heartBeat(sid)
      } catch (e) {
        try { data.setErWS(EX3(e)) } catch (e) {}
        data.ws.close()
      }
    }
  }, 10000)
}
