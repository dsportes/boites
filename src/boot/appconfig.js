import { boot } from 'quasar/wrappers'
import { setup, getJsonPub, getImagePub, getBinPub } from '../app/util.mjs'
import { setSalts } from '../app/webcrypto.mjs'
const pako = require('pako')

import FakeIndexedDB from 'fake-indexeddb/build/fakeIndexedDB'
import FDBKeyRange from 'fake-indexeddb/build/FDBKeyRange'

async function hasIDB () {
  if (typeof indexedDB === 'undefined') {
    return false
  }
  try {
    const idbFailed = await new Promise(resolve => {
      const db = indexedDB.open('test-idb')
      db.onerror = () => resolve(true)
      db.onsuccess = () => {
        indexedDB.deleteDatabase('test-idb')
        resolve(false)
      }
    })
    if (idbFailed) {
      return false
    }
  } catch (e) {
    return false
  }
  return true
}

export default boot(async ({ app, router, store /* Vue */ }) => {
  const idb = await hasIDB()

  console.log('hasIDB:' + idb)
  if (!idb) {
    for (const func of ['open', 'deleteDatabase']) {
      indexedDB[func] = FakeIndexedDB[func].bind(FakeIndexedDB)
    }
    for (const func of ['bound', 'lowerBound', 'upperBound', 'only']) {
      IDBKeyRange[func] = FDBKeyRange[func].bind(FDBKeyRange)
    }
  }

  function pagesHelp (cfg) {
    cfg.help = require('../assets/help/help.json')
    for (const page in cfg.help) {
      cfg.help[page].md = require('../assets/help/' + page + '.md').default
    }
  }

  const gp = app.config.globalProperties
  const cfg = await getJsonPub('app-config.json')
  cfg.logo = await getImagePub(cfg.pathlogo)
  cfg.cliccamera = require('../assets/cliccamera.txt')
  cfg.personne = require('../assets/personne.txt')
  cfg.personnes = require('../assets/personnes.txt')
  cfg.idb = idb
  cfg.isDev = process.env.DEV
  for (const org in cfg.orgs) {
    const o = cfg.orgs[org]
    const img = await getImagePub(o.pathicon)
    cfg.orgs[org].icon = img || cfg.logo
  }
  pagesHelp(cfg)
  gp.$cfg = cfg
  console.log('Build : ' + cfg.build)
  const salts = await getBinPub('salts')
  setSalts(salts)
  cfg.mimes = require('../assets/mime-db.json')
  setup(gp, cfg, router, store, pako)
})
