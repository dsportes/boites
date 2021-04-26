<template>
  <q-page class="column align-start items-center">
    <h2 class="col-auto">Org : {{ $route.params.org }}</h2>
    <div  class="col-auto" v-if="org == 'anonyme'">
      <img width=64 alt="Anonymous logo" src="~assets/anonymous.svg">
    </div>
    <div  class="col-auto" v-else>
      <img :src="org + '-icon.png'">
    </div>
  </q-page>
</template>

<script>
import { computed } from 'vue'
import { useStore } from 'vuex'
import { gp } from '../app/util'

export default ({
  name: 'Accueil',

  watch: {
    // changement d'organisation
    '$route.params.org': function (neworg) {
      this.$store.commit('ui/majorg', neworg)
    }
  },

  setup () {
    const $store = useStore()
    const org = computed(() => $store.state.ui.org)
    const x = gp().$route.params.org
    if (!x) {
      $store.commit('ui/majorg', 'anonyme')
    } else {
      if (x !== 'anonyme') $store.commit('ui/majorg', x)
    }
    return {
      org
    }
  }

})
</script>
