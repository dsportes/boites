<template>
  <q-list>
    <q-btn class="fermer" round size="sm" color="warning" icon="close" @click="menuouvert = false"/>
    <q-item-section>
      <q-item>
        <span class="text-primary text-italic q-pl-md q-ma-none">Build : {{ $cfg.build }}</span>
      </q-item>
      <q-item>
        <q-btn flat label="Mode foncé / clair" color="primary" @click="tgdark" />
      </q-item>
      <q-item>
        <q-btn flat label="Tests d'accès" color="primary" @click="dialoguetestping = true;menuouvert = false"/>
      </q-item>
      <q-item>
        <q-btn flat label="Rapport de Synchronisation" color="primary" @click="dialoguesynchro = true;menuouvert = false"/>
      </q-item>
      <q-item>
        <q-btn flat label="Panneau cryptographie" color="primary" @click="dialoguecrypto = true;menuouvert = false" />
      </q-item>
    </q-item-section>
  </q-list>
</template>

<script>
import { useQuasar } from 'quasar'
import { useStore } from 'vuex'
import { computed } from 'vue'

export default ({
  name: 'PanelMenu',

  data () {
    return {
      pingret: null
    }
  },

  methods: {
  },

  setup () {
    const $store = useStore()
    const $q = useQuasar()
    function tgdark () {
      $q.dark.toggle()
      $store.commit('ui/majmenuouvert', false)
    }
    const dialoguetestping = computed({
      get: () => $store.state.ui.dialoguetestping,
      set: (val) => $store.commit('ui/majdialoguetestping', val)
    })
    const menuouvert = computed({
      get: () => $store.state.ui.menuouvert,
      set: (val) => $store.commit('ui/majmenuouvert', val)
    })
    const dialoguecrypto = computed({
      get: () => $store.state.ui.dialoguecrypto,
      set: (val) => $store.commit('ui/majdialoguecrypto', val)
    })
    const dialoguesynchro = computed({
      get: () => $store.state.ui.dialoguesynchro,
      set: (val) => $store.commit('ui/majdialoguesynchro', val)
    })
    return {
      tgdark,
      dialoguetestping,
      dialoguecrypto,
      dialoguesynchro,
      menuouvert
    }
  }

})
</script>
<style lang="sass" scoped>
@import '../css/app.sass'
.fermer
  position: absolute
  top: 0
  left: -1rem
  z-index: 2
.q-item
  padding: 0 !important
  min-height: 0 !important
</style>
