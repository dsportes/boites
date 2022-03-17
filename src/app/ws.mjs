/* gestion WebSocket */

import { cfg, store, dhtToString, affichererreur, deserial } from './util.mjs'
import { data } from './modele.mjs'
import { ProcessQueue, reconnexion } from './operations.mjs'
import { setEtat } from './db.mjs'
import { AppExc, E_WS, PINGTO } from './api.mjs'

let url = ''

function EX0 (e) {
  return new AppExc(E_WS, 'Erreur à l\'ouverture de la connexion avec le serveur (' + url + ')', e.message)
}

function EX1 () {
  return new AppExc(E_WS, 'Ouverture de la connexion avec le serveur impossible (' + url + ')')
}

function EX2 (e) {
  return new AppExc(E_WS, 'Envoi d\'un message au serveur impossible (' + url + ')', e.message)
}

function EX3 () {
  return new AppExc(E_WS, 'Rupture de la liaison avec le serveur par le serveur ou URL mal configurée (' + url + ')')
}

let ondeconnexion = false
export function closeWS () {
  if (data.ws) {
    ondeconnexion = true
    data.ws.close()
  }
}

export async function openWS () {
  return new Promise((resolve, reject) => {
    try {
      const u = cfg().urlserveur
      const i = u.indexOf('://')
      const http = u.substring(0, i)
      url = (http === 'https' ? 'wss' : 'ws') + u.substring(i) + '/ws/' + store().state.ui.org
      const ws = new WebSocket(url)
      if (data.to) clearTimeout(data.to)
      ws.onerror = (e) => {
        reject(data.setErWS(EX1()))
      }
      ws.onclose = () => {
        if (!ondeconnexion) {
          try { data.setErWS(EX3()) } catch (e) {}
        }
        ondeconnexion = false
        data.ws = null
        if (data.to) clearTimeout(data.to)
      }
      ws.onmessage = onmessage
      ws.onopen = (event) => {
        try {
          ws.send(data.sessionId)
          heartBeat(data.sessionId)
          data.ws = ws
          store().commit('ui/majstatutnet', 1)
          resolve(ws)
        } catch (e) {
          data.setErWS(EX2(e))
          data.ws = null
          resolve(null)
        }
      }
    } catch (e) {
      // Sur erreur d'URL (mauvais schéma)
      console.log(e)
      reject(data.setErWS(EX0(e)))
    }
  })
}

let pongrecu = false

async function onmessage (m) {
  if (!data.ws) return
  const ab = await m.data.arrayBuffer()
  const syncList = deserial(new Uint8Array(ab)) // syncList : { sessionId, dh, rowItems }
  if (syncList.sessionId !== data.sessionId) return
  if (data.dh < syncList.dh) data.dh = syncList.dh
  const pong = !syncList.rowItems
  const sessionId = data.sessionId
  if (cfg().debug) {
    console.log('Liste sync reçue: ' + dhtToString(syncList.dh) + ' sessionId:' + syncList.sessionId + (!pong ? ' nb rowItems:' + syncList.rowItems.length : ' - pong'))
  }

  if (pong) {
    pongrecu = true
    if (data.dhsync < data.dh) data.dhsync = data.dh
    if (data.db) {
      await setEtat()
    }
    return
  }

  data.syncqueue.push(syncList) // syncList : { sessionId, dh, rowItems }
  if (data.statutsession === 2 && data.opWS == null) {
    setTimeout(async () => {
      while (data.sessionId === sessionId && data.ws && data.syncqueue.length) {
        const q = data.syncqueue
        data.syncqueue = []
        const op = new ProcessQueue()
        await op.run(q) // ne sort jamais en exception
        if (data.dhsync < data.dh) data.dhsync = data.dh
        if (data.db) {
          await setEtat()
        }
      }
    }, 1)
  }
}

function heartBeat (sid) {
  data.to = setTimeout(async () => {
    if (data.ws && data.sessionId === sid) {
      if (!pongrecu) {
        const choix = await excAffichage()
        if (choix === 'r') {
          await reconnexion()
        } else if (choix === 'd') {
          await data.deconnexion()
        }
        return
      }
      pongrecu = false
      data.ws.send(sid) // ping
      heartBeat(sid)
    }
  }, PINGTO * 1000)
}

async function excAffichage () {
  const ex = EX3({ message: 'ping / pong : pong non reçu' })
  ex.net = true
  data.statutnet = 2
  const options1 = [
    { code: 'c', label: 'Continuer malgré la dégradation du mode', color: 'warning' },
    { code: 'd', label: 'Se déconnecter, retourner au login', color: 'primary' },
    { code: 'r', label: 'Essayer de se reconnecter', color: 'primary' }
  ]
  const options2 = [
    { code: 'd', label: 'Se déconnecter, retourner au login', color: 'primary' },
    { code: 'r', label: 'Essayer de se reconnecter', color: 'primary' }
  ]
  const conseil = data.degraderMode()
  const options = conseil ? options1 : options2
  return await affichererreur(ex, options, conseil)
}
