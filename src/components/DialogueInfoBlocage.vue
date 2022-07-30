<template>
    <q-dialog v-model="infoblocage" full-height persistent>
      <q-card class="moyennelargeur fs-md">
        <q-card-section>
          <div class="titre-xl text-center">A propos du blocage en cours</div>
        </q-card-section>
        <q-card-actions align="right">
          <q-btn dense label="J'ai lu" color="warning" v-close-popup />
        </q-card-actions>

        <q-card-section>
          <div v-if="blocage===1" class="titre-lg q-pa-xs">Blocage immiment</div>
          <div v-if="blocage===2" class="titre-lg q-pa-xs text-warning bg-yellow-5">Restrictions à la création / mise à jour des secrets</div>
          <div v-if="blocage===3" class="titre-lg q-pa-xs text-negative bg-yellow-5">Compte bloqué, destruction imminente</div>
        </q-card-section>
      </q-card>
    </q-dialog>
</template>

<script>
import { useStore } from 'vuex'
import { computed /*, onMounted */ } from 'vue'

export default ({
  name: 'DialogueInfoBlocage',

  data () {
    return {
    }
  },

  methods: {
  },

  setup () {
    const $store = useStore()
    const blocage = computed(() => $store.state.ui.blocage)
    const sessionok = computed(() => $store.state.ui.sessionok)
    const infoblocage = computed({
      get: () => $store.state.ui.infoblocage,
      set: (val) => $store.commit('ui/majinfoblocage', val)
    })

    return {
      infoblocage,
      blocage,
      sessionok
    }
  }
})
</script>

<style lang="sass" scoped>
@import '../css/app.sass'
</style>
