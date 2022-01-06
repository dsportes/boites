<template>
  <q-btn icon="help" dense :size="size || 'md'" @click="ouvrir">
    <q-tooltip class="bg-white text-primary">{{titre}}</q-tooltip>
  </q-btn>
</template>
<script>
import { cfg } from '../app/util.mjs'
export default ({
  name: 'BoutonHelp',

  props: { size: String, page: String },

  computed: {
    titre () {
      return this.page && cfg().help[this.page] ? 'Page d\'aide : ' + cfg().help[this.page].titre : 'Page d\'aide bientôt disponible'
    }
  },

  methods: {
    ouvrir () {
      if (this.page) this.$store.commit('ui/pushhelp', this.page)
    }
  }
})
</script>
<style lang="sass" scoped>
@import '../css/app.sass'
</style>
