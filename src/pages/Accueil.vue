<template>
  <q-page class="column align-start items-center">

    <q-btn v-if="connecte" class="q-ma-sm" color="primary" icon-right="logout" label="Se déconnecter" @click="sedeconnecter"/>

    <div v-else class="column align-start items-center">
      <q-card flat class="q-ma-xs bg-grey-1 petitelargeur">
        <q-card-section>
          <div class="text-h6">Choix du mode <span v-if="$store.state.ui.mode === 0" class="rouge text-bold" >(requis)</span></div>
        </q-card-section>
      <q-card-section>
          <div class="q-gutter-sm">
            <q-radio dense v-model="locmode" :val="1" label="Synchronisé" />
            <q-radio dense v-model="locmode" :val="2" label="Incognito" />
            <q-radio dense v-model="locmode" :val="3" label="Avion" />
          </div>
      </q-card-section>
      </q-card>

      <q-card flat v-if="mode !== 0" class="q-ma-xs bg-grey-4 petitelargeur">
        <q-card-section>
          <div class="text-h6">{{ 'Code de l\'organisation' + ($store.state.ui.org == null ? '(requis)' : '') }}</div>
        </q-card-section>
        <q-card-section>
          <q-input class="moninput" dense clearable v-model="locorg" @keydown.enter.prevent="validerorg"
          hint="Presser la touche 'Entrée' à la fin de la saisie"/>
        </q-card-section>
      </q-card>

      <q-card flat v-if="orgicon != null" class="q-ma-xs bg-grey-5 petitelargeur">
        <q-card-section>
          <div class="text-h6">Phrase secrète</div>
        </q-card-section>
        <phrase-secrete v-on:ok-ps="connecteroucreer"></phrase-secrete>
      </q-card>
    </div>

    <q-dialog v-model="erreurconnexion">
      <q-card>
        <q-card-section class="q-pt-none">{{ diag }}</q-card-section>
        <q-card-actions align="right">
          <q-btn flat label="J'ai lu" color="primary" v-close-popup @click="diag = null" />
        </q-card-actions>
      </q-card>
    </q-dialog>

  </q-page>
</template>

<script>
import { computed } from 'vue'
import { useStore } from 'vuex'
import { gp, orgicon } from '../app/util'
import { connexion } from '../app/db'
import * as CONST from '../store/constantes'
import PhraseSecrete from '../components/PhraseSecrete.vue'

export default ({
  name: 'Accueil',
  components: { PhraseSecrete },
  data () {
    return {
      locmode: this.mode,
      locorg: this.org,
      ligne1: '',
      ligne2: '',
      isPwd: false,
      erreurconnexion: false,
      diag: ''
    }
  },

  watch: {
    // changement d'organisation
    '$route.params.org': function (neworg) {
      this.$store.commit('ui/majorg', neworg)
    },
    locmode: async function (m) {
      this.$store.commit('ui/majmode', m)
      await this.validerorg()
    }
  },

  methods: {
    async validerorg () {
      if (this.mode === CONST.MODE_INCONNU) return
      let ic
      if (this.mode === CONST.MODE_SYNC || this.mode === CONST.MODE_INCOGNITO) {
        try {
          ic = await orgicon(this.locorg)
          if (ic.length < 4) {
            ic = null
          } else {
            if (this.mode === CONST.MODE_SYNC) {
              localStorage.setItem(this.locorg, ic)
            }
          }
        } catch (e) { }
      } else {
        ic = localStorage.getItem(this.locorg)
      }
      if (ic) {
        this.$store.commit('ui/majorg', this.locorg)
        this.$store.commit('ui/majorgicon', ic)
        this.$router.replace('/' + this.locorg)
      } else {
        this.locorg = null
        this.$store.commit('ui/majorg', null)
        this.$store.commit('ui/majorgicon', null)
        this.$router.replace('/')
      }
    },

    sedeconnecter () {
    },

    async connecteroucreer (lignes) {
      this.diag = await connexion(lignes[0], lignes[1])
      this.erreurconnexion = this.diag != null
    }

  },

  setup () {
    const $store = useStore()
    const org = computed(() => $store.state.ui.org)
    const orgicon = computed(() => $store.state.ui.orgicon)
    const mode = computed(() => $store.state.ui.mode)
    const connecte = computed(() => $store.state.ui.statuslogin)
    $store.commit('ui/majorg', gp().$route.params.org || null)

    return {
      org,
      orgicon,
      mode,
      connecte
    }
  }

})
</script>

<style lang="sass">
@import '../css/app.sass'
.vert
  color: $green
.rouge
  color: $red
.petitelargeur
  width: 25rem
</style>
<style scoped>
>>> .q-card__section { padding: 2px; }
>>> .q-field__native {
  font-size: 1.1rem;
  font-family: "Roboto Mono";
  font-weight: bold;
  color: red !important;
}
>>> .q-field__messages {
  font-size: 0.9rem;
  font-weight: bold;
}
</style>
