<template>
<q-card>
  <q-card-section class="row justify-between">
    <apercu-motscles :motscles="motscles" :src="secret.mc" court :argsClick="{}" @click-mc="clickmc"></apercu-motscles>
    <div>
      <span class="dh">{{secret.dh}}</span>
      <q-btn v-if="secret.nbpj" size="sm" color="warning" flat dense icon="attach_file" :label="secret.nbpj" @click="clickpj"></q-btn>
    </div>
  </q-card-section>
  <q-card-section>
    <q-expansion-item dense v-model="ouvert" expand-separator header-class="titre-3" :label="secret.titre">
      <div>Détail du secret</div>
    </q-expansion-item>
  </q-card-section>
  <q-card-section>
    <q-dialog v-model="mcedit">
      <select-motscles :motscles="motscles" :src="secret.mc" @ok="changermc" :close="fermermc"></select-motscles>
    </q-dialog>
  </q-card-section>
</q-card>
</template>
<script>
// import { cfg } from '../app/util.mjs'
import { toRef /*, onMounted, computed, */ } from 'vue'
// import { useStore } from 'vuex'
import ApercuMotscles from './ApercuMotscles.vue'
import SelectMotscles from './SelectMotscles.vue'

export default ({
  name: 'VueSecret',

  components: { ApercuMotscles, SelectMotscles },

  props: { motscles: Object, secret: Object },

  computed: {
  },

  data () {
    return {
      ouvert: false,
      mcedit: false
    }
  },

  methods: {
    fermermc () { this.mcedit = false },

    clickmc () {
      this.mcedit = true
      // console.log('click mc ' + this.secret.sid)
    },
    changermc (mc) {
      console.log(JSON.stringify(mc))
    },
    clickpj () {
      this.ouvert = true
    }
  },

  setup (props) {
    toRef(props, 'motscles')
    toRef(props, 'secret')
    // const $store = useStore()
    // const compte = computed(() => { const c = $store.state.db.compte; return c || { ko: true } })

    // onMounted(() => { console.log('mc.mapAll ' + motscles.value.mapAll.size) })

    return {
      // compte
    }
  }
})
</script>

<style lang="sass" scoped>
.q-card
  border-bottom: 2px solid grey
.q-card__section
  padding: 1px !important
.dh
  font-family: 'Roboto Mono'
  font-size: 0.8rem
</style>
