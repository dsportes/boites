<template>
  <router-view />
</template>
<script>
import { getCurrentInstance } from 'vue'
import { setgp } from './app/util'

export default ({
  name: 'App',

  watch: {
    // changement d'organisation
    '$route.params.org': function (org, orgold) {
      this.$store.commit('ui/setcfgorg', this.$cfg[org])
    }
  },

  setup () {
    setgp(getCurrentInstance().appContext.config.globalProperties)
  }
})
</script>
