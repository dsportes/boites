<template>
  <q-card class="q-pa-xs fs-md moyennelargeur"> <!-- ne jamais mettre de marges haute / basse dans un q-page -->
    <q-card-actions v-if="jailu" align="right">
      <q-btn flat label="J'ai lu" color="primary" @click="$store.commit('ui/majdialoguesynchro', false)"/>
    </q-card-actions>
    <q-card-section>
      <div class="titre-lg text-center">Chargement et synchronisation des données du compte</div>
    </q-card-section>
    <q-separator />
    <q-card-section style="max-heigh:70vh;overflow:auto">
      <div v-for="item in state.lst" :key="item.k" class="row no-wrap items-start">
        <q-icon class="col-1" size="sm" :name="item.st ? 'done' : 'arrow_right'"/>
        <div class="col-11">{{item.label}}</div>
      </div>
    </q-card-section>
  </q-card>
</template>

<script>
import { useStore } from 'vuex'
import { computed, reactive, watch } from 'vue'

export default ({
  name: 'RapportSynchro',

  components: { },

  props: {
    jailu: Boolean
  },

  data () {
    return {
    }
  },

  methods: {
  },

  setup () {
    const $store = useStore()
    const syncitems = computed(() => { return $store.state.ui.syncitems })
    const state = reactive({
      lst: []
    })

    watch(() => syncitems.value, (ap, av) => {
      const l = Object.values(ap)
      l.sort((a, b) => { return a.k < b.k ? -1 : (a.k === b.k ? (a.label < b.label ? -1 : (a.label > b.label) ? 1 : 0) : 1) })
      state.lst = l
    })

    return {
      state
    }
  }
})
</script>

<style lang="sass" scoped>
@import '../css/app.sass'
</style>
