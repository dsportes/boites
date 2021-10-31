<template>
  <q-list>
    <q-item-section>
      <q-item>
        <span class="text-primary text-italic q-pl-md q-ma-none">Build : {{ $cfg.build }}</span>
      </q-item>
      <q-item>
        <q-btn flat label="Mode foncé / clair" color="primary" @click="tgdark" />
      </q-item>
      <q-item>
        <q-btn flat label="Test d'accès au serveur" color="primary" v-close-popup @click="ping"/>
      </q-item>
      <div v-if="pingret != null" class="text-warning q-pa-xs q-ma-none" style="text-align:right;">{{pingret}}</div>
      <q-item>
        <q-btn v-if="$store.getters['ui/aeuuneerreur']" flat label="Voir la dernière erreur" color="primary" v-close-popup
           @click="$store.commit('ui/majerreur', this.derniereerreur)"/>
        <span v-else class="text-primary text-italic q-pl-md q-ma-none" style="text-align:center;">Pas de dernière erreur</span>
      </q-item>
      <q-item>
      <q-btn flat label="Panneau cryptographie" color="primary" @click="crypto" />
      </q-item>
    </q-item-section>
  </q-list>
</template>

<script>
import { useQuasar } from 'quasar'
import { useStore } from 'vuex'
import { ping } from '../app/util'
// import { computed } from 'vue'

export default ({
  name: 'PanelMenu',

  data () {
    return {
      pingret: null
    }
  },

  methods: {
    crypto () {
      this.$store.commit('ui/majdialoguecrypto', true)
      this.$store.commit('ui/majmenuouvert', false)
    },

    async ping () {
      try {
        this.pingret = null
        this.pingret = await ping()
      } catch (e) {
        this.pingret = 'Erreur ping : ' + e.toString()
      }
      console.log(this.pingret)
    }
  },

  setup () {
    const $store = useStore()
    const $q = useQuasar()
    function tgdark () {
      $q.dark.toggle()
      $store.commit('ui/majmenuouvert', false)
    }
    return {
      tgdark
    }
  }

})
</script>
<style lang="sass" scpoed>
@import '../css/app.sass'
.q-item
  padding: 0 !important
  min-height:0 !important
</style>
