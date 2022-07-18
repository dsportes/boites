<template>
<q-page class="fs-md q-pa-xs">
  <tab-secrets v-if="sessionok && tabavatar === 'secrets'"></tab-secrets>
  <tab-couples v-if="sessionok && tabavatar === 'couples'"></tab-couples>
  <tab-groupes v-if="sessionok && tabavatar === 'groupes'"></tab-groupes>
</q-page>
</template>

<script>
import { computed } from 'vue'
import { useStore } from 'vuex'
import { onBoot } from '../app/page.mjs'
import TabSecrets from '../components/TabSecrets.vue'
import TabCouples from '../components/TabCouples.vue'
import TabGroupes from '../components/TabGroupes.vue'

export default ({
  name: 'Avatar',

  components: { TabSecrets, TabCouples, TabGroupes },

  computed: { },

  data () { return { } },

  methods: {
  },

  setup () {
    onBoot()

    const $store = useStore()
    const sessionok = computed(() => { return $store.state.ui.sessionok })
    const avatar = computed(() => { return $store.state.db.avatar })
    const mode = computed(() => $store.state.ui.mode)

    const tabavatar = computed({
      get: () => $store.state.ui.tabavatar,
      set: (val) => $store.commit('ui/majtabavatar', val)
    })

    // watch(() => sessionok.value, (ap, av) => { })

    return {
      sessionok,
      avatar,
      tabavatar,
      mode
    }
  }

})
</script>

<style lang="sass" scoped>
@import '../css/app.sass'
</style>
