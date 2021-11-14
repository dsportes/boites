<template>
  <q-page>
    <rapport-synchro></rapport-synchro>
  </q-page>
</template>

<script>
import { onBoot } from '../app/modele'
import RapportSynchro from '../components/RapportSynchro.vue'

export default ({
  name: 'Synchro',

  components: { RapportSynchro },

  data () {
    return {
    }
  },

  methods: {
  },

  setup () {
    onBoot()
    return {
    }
  }
})
</script>

<style lang="sass">
@import '../css/app.sass'
</style>
