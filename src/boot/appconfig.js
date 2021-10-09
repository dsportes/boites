import { boot } from 'quasar/wrappers'
import { setup, getJsonPub, getImagePub, getBinPub } from '../app/util'
const crypt = require('../app/crypto')

export default boot(async ({ app /*, router, store, Vue */ }) => {
  const gp = app.config.globalProperties
  const cfg = await getJsonPub('app-config.json')
  cfg.logo = await getImagePub(cfg.pathlogo)
  for (const org in cfg.orgs) {
    const o = cfg.orgs[org]
    const img = await getImagePub(o.pathicon)
    cfg.orgs[org].icon = img || cfg.logo
  }
  cfg.isDev = process.env.DEV
  gp.$cfg = cfg
  setup(gp, cfg)
  console.log('Build : ' + cfg.build)
  const salts = await getBinPub('salts')
  crypt.setSalts(salts)
})
