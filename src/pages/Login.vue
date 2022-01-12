<template>
  <q-page class="column align-start items-center">
    <q-card flat class="q-ma-xs petitelargeur fs-md">
      <q-card-section>
        <div class="column items-center q-ma-sm">
        <div class="titre-lg">Choix du mode
          <q-btn flat dense round icon="info" aria-label="info" @click="infomode = true"/>
        </div>
        <div class="q-gutter-md q-ma-sm">
          <q-radio dense v-model="mode" :val="1" label="Synchronisé" />
          <q-radio dense v-model="mode" :val="2" label="Incognito" />
          <q-radio dense v-model="mode" :val="3" label="Avion" />
        </div>
        </div>
      </q-card-section>
    </q-card>

    <q-card flat v-if="mode > 0 && mode < 4" class="q-mt-lg petitelargeur">
      <phrase-secrete label-valider="Se connecter" icon-valider="send" v-on:ok-ps="connecter"></phrase-secrete>
    </q-card>

    <div v-if="mode === 1 || mode === 2" class="q-mt-lg petitelargeur column items-start">
      <q-btn flat color="warning" icon="add_circle" label="Nouveau compte parrainé" />
      <q-btn flat color="primary" icon="add_circle" label="Nouveau compte (sans parrain)" @click="dialoguecreationcompte = true"/>
    </div>
  </q-page>
</template>

<script>
import { computed } from 'vue'
import { useStore } from 'vuex'
import { ConnexionCompte, ConnexionCompteAvion } from '../app/operations'
import PhraseSecrete from '../components/PhraseSecrete.vue'
import { onBoot } from '../app/page.mjs'

export default ({
  name: 'Login',
  components: { PhraseSecrete },
  data () {
    return {
      ps: null
    }
  },

  methods: {
    connecter (ps) {
      if (ps) {
        if (this.$store.state.ui.mode === 3) {
          new ConnexionCompteAvion().run(ps)
        } else {
          new ConnexionCompte().run(ps)
        }
      }
    }
  },

  setup () {
    const $store = useStore()
    onBoot()
    const mode = computed({
      get: () => $store.state.ui.mode,
      set: (val) => $store.commit('ui/majmode', val)
    })
    const infomode = computed({
      get: () => $store.state.ui.infomode,
      set: (val) => $store.commit('ui/majinfomode', val)
    })
    const dialoguecreationcompte = computed({
      get: () => $store.state.ui.infomode,
      set: (val) => $store.commit('ui/majdialoguecreationcompte', val)
    })
    return {
      mode,
      infomode,
      dialoguecreationcompte
    }
  }

})
</script>

<style lang="sass" scoped>
@import '../css/app.sass'

</style>
