import { boot } from 'quasar/wrappers'
import axios from 'axios'
import { setup } from '../app/util'

export default boot(async ({ app /*, router, store, Vue */ }) => {
  const gp = app.config.globalProperties
  const cfg = (await axios.get('./app-config.json')).data
  gp.$cfg = cfg
  setup(gp, cfg)
  console.log('Build : ' + cfg.build)
})
