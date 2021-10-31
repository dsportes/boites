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
    const compte = computed(() => $store.state.db.compte)
    const avatar = computed(() => $store.state.db.avatar)
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
