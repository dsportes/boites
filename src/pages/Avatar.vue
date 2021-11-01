<template>
<div v-if="avatar != null">
  <h6>Page Avatar {{avatar.label}}</h6>
</div>
</template>

<script>
import { computed } from 'vue'
import { useStore } from 'vuex'
import { onBoot } from '../app/modele'

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
    // En déconnexion, compte passe à null et provoque un problème dans la page. Un getter ne marche pas ?!
    const compte = computed({
      get: () => { const c = $store.state.db.compte; return c || { ko: true } }
    })
    const avatar = computed({
      get: () => { const a = $store.state.db.avatar; return a || { ko: true } },
      set: (val) => $store.commit('db/majavatar', val)
    })
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
