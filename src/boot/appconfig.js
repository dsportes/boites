import { boot } from 'quasar/wrappers'
import axios from 'axios'
import { setup } from '../app/util'
const crypt = require('../app/crypto')

export default boot(async ({ app /*, router, store, Vue */ }) => {
  const gp = app.config.globalProperties
  const cfg = (await axios.get('./app-config.json')).data
  cfg.isDev = process.env.DEV
  gp.$cfg = cfg
  setup(gp, cfg)
  console.log('Build : ' + cfg.build)
  const salts = (await axios.get('./salts', { responseType: 'arraybuffer' })).data
  crypt.setSalts(salts)
  // crypt.test()
})
