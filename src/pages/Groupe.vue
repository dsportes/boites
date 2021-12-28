<template>
<div v-if="groupe != null">
  <h6>Page Groupe {{groupe.na.nom}}</h6>
</div>
</template>

<script>
import { computed } from 'vue'
import { useStore } from 'vuex'
import { onBoot } from '../app/page.mjs'

export default ({
  name: 'Avatar',
  components: { },
  data () {
    return {
    }
  },

  watch: {
  },

  methods: {
  },

  setup () {
    onBoot()
    const $store = useStore()
    const org = computed(() => $store.state.ui.org)
    const compte = computed(() => $store.state.db.compte)
    const groupe = computed(() => $store.state.db.groupe)
    const mode = computed(() => $store.state.ui.mode)
    const modeleactif = computed(() => $store.state.ui.modeleactif)
    return {
      org,
      compte,
      groupe,
      mode,
      modeleactif
    }
  }

})
</script>

<style lang="sass">
@import '../css/app.sass'

</style>
