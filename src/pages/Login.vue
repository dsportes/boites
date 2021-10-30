<template>
  <q-page class="column align-start items-center">

    <div class="column align-start items-center">
      <q-card flat class="q-ma-xs petitelargeur">
        <q-card-section>
          <div class="titre-2">Choix du mode
            <q-btn flat dense round icon="info" aria-label="info" @click="$store.commit('ui/majinfomode', true)"/>
          </div>
        </q-card-section>
      <q-card-section>
          <div class="q-gutter-sm">
            <q-radio dark dense v-model="mode" :val="1" label="Synchronisé" />
            <q-radio dark dense v-model="mode" :val="2" label="Incognito" />
            <q-radio dark dense v-model="mode" :val="3" label="Avion" />
          </div>
      </q-card-section>
      </q-card>

      <q-card flat v-if="mode != 0" class="q-ma-xs petitelargeur">
        <q-card-section>
          <div class="titre-2">Phrase secrète de connexion</div>
        </q-card-section>
        <phrase-secrete label-valider="Se connecter" icon-valider="send" v-on:ok-ps="connecter"></phrase-secrete>
      </q-card>

      <div v-if="mode != 0" class="q-my-md petitelargeur column items-start">
        <q-btn flat color="warning" icon="add_circle" label="Test synchro" @click="$store.commit('ui/majdialoguesynchro', true)"/>
        <q-btn flat color="warning" icon="add_circle" label="Nouveau compte parrainé" />
        <q-btn flat color="primary" icon="add_circle" label="Nouveau compte (sans parrain)" @click="$store.commit('ui/majdialoguecreationcompte', true)"/>
      </div>
    </div>

    <dialogue-creation-compte></dialogue-creation-compte>

  </q-page>
</template>

<script>
import { computed } from 'vue'
import { useStore } from 'vuex'
// import { cfg } from '../app/util'
import { deconnexion, connexionCompte } from '../app/operations'
import PhraseSecrete from '../components/PhraseSecrete.vue'
import DialogueCreationCompte from '../components/DialogueCreationCompte.vue'
import { remplacePage } from '../app/modele'

export default ({
  name: 'Login',
  components: { PhraseSecrete, DialogueCreationCompte },
  data () {
    return {
      ps: null,
      erreurconnexion: false,
      diag: ''
    }
  },

  /*
  watch: {
    locmode: async function (m) {
      this.$store.commit('ui/majmode', m)
    }
  },
  */
  methods: {
    async sedeconnecter () {
      await deconnexion()
    },

    changerOrg () {
      this.$store.commit('ui/majorg', null)
      remplacePage('Org')
    },

    async connecter (ps) {
      if (!ps) return
      await connexionCompte(ps)
    }
  },

  setup () {
    const $store = useStore()
    const org = computed(() => $store.state.ui.org)
    const mode = computed({
      get: () => $store.state.ui.mode,
      set: (val) => $store.commit('ui/majmode', val)
    })
    const compte = computed(() => $store.state.db.compte)
    if (!org.value) {
      remplacePage('Org')
      // setTimeout(() => { remplacePage('Org') }, 10)
    }

    return {
      org,
      mode,
      compte
    }
  }

})
</script>

<style lang="sass" scoped>
@import '../css/app.sass'
::v-deep(.q-card__section)
  padding: 2px
</style>
