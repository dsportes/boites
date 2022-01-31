<template>
  <q-card class="full-height moyennelargeur fs-md column">
    <q-toolbar class="col-auto bg-primary text-white maToolBar">
      <q-btn flat round dense icon="close" size="md" class="q-mr-sm" @click="fermer" />
      <q-toolbar-title><div class="titre-md tit text-center">{{contact.nom}}</div></q-toolbar-title>
      <q-btn v-if="mode <= 2" :disable="!modif" class="q-ml-sm" flat dense color="white" icon="undo" @click="undo"/>
      <q-btn v-if="mode <= 2" :disable="!modif || erreur !== ''" class="q-my-sm" flat dense color="white" :label="'Valider'" icon="check" @click="valider"/>
      <q-btn icon="more_vert" flat dense color="white" @click="plusinfo"/>
    </q-toolbar>
    <div>{{contact.nom}}</div>
  </q-card>
</template>
<script>
import { computed } from 'vue'
import { useStore } from 'vuex'
export default ({
  name: 'PanelContacts',

  components: { },

  props: { close: Function },

  computed: {
    modif () { return true }
  },

  data () {
    return {
      erreur: ''
    }
  },

  methods: {
    undo () {},
    valider () {},
    plusinfo () {},
    fermer () { if (this.close) this.close() }
  },

  setup () {
    const $store = useStore()
    const diagnostic = computed({
      get: () => $store.state.ui.diagnostic,
      set: (val) => $store.commit('ui/majdiagnostic', val)
    })
    const contact = computed(() => { return $store.state.db.contact })
    const mode = computed(() => $store.state.ui.mode)

    return {
      diagnostic,
      contact,
      mode
    }
  }
})
</script>
<style lang="sass" scoped>
@import '../css/app.sass'
</style>
