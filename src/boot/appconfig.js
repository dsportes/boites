import { boot } from 'quasar/wrappers'
import axios from 'axios'

const cfg = { app: null, org: null }

export default boot(async ({ app /*, router, store, Vue */ }) => {
  cfg.app = (await axios.get('./app-config.json')).data
  app.config.globalProperties.$cfg = cfg
  console.log('Boot version ' + cfg.app.version)
  for (let i = 0; i < cfg.app.orgs.length; i++) {
    const o = cfg.app.orgs[i]
    try {
      cfg[o] = (await axios.get(o + '-config.json')).data
    } catch (e) {
      cfg[o] = false
      console.log(o + '-config.json non trouvé')
    }
  }
})

export { cfg }
