<template>
  <q-page class="column align-start items-center">
    <h6>Compte : {{compte.sid}}</h6>
    <h6>Liste des avatars du compte</h6>
    <div v-for="e in compte.mac" :key="e.na.id">
        <div>{{e.na.id}} - {{e.nomc}} {{e.cpriv}}</div>
    </div>
    <h6>Liste des avatars</h6>
    <div v-for="av in avatars" :key="av.id">
        <div>{{av.id}} - {{av.nomc}} {{av.nomAvatar.nomc}}</div>
    </div>
  </q-page>
</template>

<script>
import { computed } from 'vue'
import { useStore } from 'vuex'

export default ({
  name: 'Compte',
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
    const avatars = computed(() => $store.state.db.avatars)
    const compte = computed(() => $store.state.db.compte)
    const mode = computed(() => $store.state.ui.mode)

    return {
      avatars,
      compte,
      mode
    }
  }

})
</script>

<style lang="sass">
@import '../css/app.sass'

</style>
