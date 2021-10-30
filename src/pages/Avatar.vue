<template>
  <h6>Page Avatar</h6>
</template>

<script>
import { computed } from 'vue'
import { useStore } from 'vuex'
import { remplacePage } from '../app/modele'

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
    const $store = useStore()
    const org = $store.state.ui.org
    if (!org) {
      remplacePage('Org')
      return { org: null, compte: null, avatar: null }
    }
    const compte = $store.state.db.compte
    if (!compte) {
      remplacePage('Login')
      return { org: org, compte: null, avatar: null }
    }
    const avatar = $store.state.db.avatar
    if (!avatar) {
      remplacePage('Compte')
      return { org: org, compte: compte, avatar: null }
    }
    const mode = computed(() => $store.state.ui.mode)
    const modeleactif = computed(() => $store.state.ui.modeleactif)
    return {
      org,
      compte,
      avatar,
      mode,
      modeleactif
    }
  }

})
</script>

<style lang="sass">
@import '../css/app.sass'

</style>
