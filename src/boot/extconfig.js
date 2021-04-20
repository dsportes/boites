import { boot } from 'quasar/wrappers'
import axios from 'axios'

let extconfig

export default boot(async ({ app /*, router, store, Vue */ }) => {
  extconfig = (await axios.get('./extconfig.json')).data
  app.config.globalProperties.$extconfig = extconfig
  console.log('Boot version ' + extconfig.version)
})

export { extconfig }
