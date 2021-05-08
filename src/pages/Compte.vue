<template>
  <q-page class="column align-start items-center">
    <q-btn class="q-ma-sm" color="primary" label="Nouveau" @click="nouveau"/>
    <q-btn class="q-ma-sm" color="primary" label="Suppr" @click="suppr"/>
    <q-btn class="q-ma-sm" color="primary" label="Maj" @click="maj"/>
    <h6>Liste des avatars</h6>
    <div v-for="av in avatars" :key="av.id">
        <div>{{av.id}} - {{av.nom}} {{av.prenom}}</div>
        <div v-for="p in av.contacts" :key="p.id">{{p.pote}}</div>
    </div>
  </q-page>
</template>

<script>
import { computed } from 'vue'
import { useStore } from 'vuex'

const liste = [
  { id: '10', nom: 'Hugo', prenom: 'Victor' },
  { id: '11', nom: 'Zola', prenom: 'Emile' },
  { id: '12', nom: 'De Beauvoir', prenom: 'Simone' },
  { id: '13', nom: 'Nin', prenom: 'Anaïs' }
]

let n = 100

export default ({
  name: 'Accueil',
  components: { },
  data () {
    return {
    }
  },

  watch: {
  },

  methods: {
    nouveau () {
      const x = { id: '11', val: { id: '' + n, pote: 'Jules' + n } }
      this.$store.commit('ui/avatarcontact', x)
      n++
    },
    suppr () {
      n--
      this.$store.commit('ui/avatarcontact', { id: '11', val: '' + n })
    },
    maj () {
      this.$store.commit('ui/avatarcontact', { id: '11', val: { id: '' + (n - 1), pote: 'Doudou' + (n - 1) } })
    }

  },

  setup () {
    const $store = useStore()
    liste.forEach(av => {
      $store.commit('ui/avatar', av)
    })
    const avatars = computed(() => $store.state.ui.avatars)
    const compte = computed(() => $store.state.ui.compte)
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
