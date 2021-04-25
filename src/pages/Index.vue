<template>
  <q-page class="column align-start items-center">
    <h2 class="col-auto">Org : {{ $route.params.org }}</h2>
    <div  class="col-auto" v-if="cfgorg.code == 'anonyme'">
      <img width=64 alt="Anonymous logo" src="~assets/logo-full.svg">
    </div>
    <div  class="col-auto" v-else>
      <h2>{{ cfgorg.nom }}</h2>
      <img :src="cfgorg.code + '-icon.png'">
    </div>
  </q-page>
</template>

<script>
import { computed } from 'vue'
import { useStore } from 'vuex'

export default ({
  name: 'Index',

  setup () {
    const $store = useStore()
    const cfgorg = computed({
      get: () => $store.state.ui.cfgorg
    })
    return {
      cfgorg
    }
  }

})
</script>
