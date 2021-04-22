<template>
  <q-page class="column align-start items-center">
    <h2 class="col-auto">Org : {{ $route.params.org }}</h2>
    <div  class="col-auto" v-if="cfgorg == null">
      <img width=64 alt="Anonymous logo" src="~assets/logo-full.svg">
    </div>
    <div  class="col-auto" v-else>
      <h2>{{ cfgorg.nom }}</h2>
      <img :src="cfgorg.code + '-icon.png'">
    </div>
  </q-page>
</template>

<script>
import { getCurrentInstance, ref } from 'vue'

export default /* defineComponent */ ({
  name: 'Index',

  data () {
    return {
    }
  },

  watch: {
    // changement d'organisation
    '$route.params.org': function (org, orgold) {
      this.cfgorg = this.$cfg[org]
      console.log('>>> quit ' + orgold)
    }
  },

  setup () {
    const gp = getCurrentInstance().appContext.config.globalProperties
    const cfgorg = ref(gp.$cfg[gp.$route.params.org])
    return { cfgorg }
  }

})
</script>
