<template>
  <q-page class="column align-start items-center">

    <q-btn v-if="connecte" class="q-ma-sm" color="primary" icon-right="logout" label="Se déconnecter" @click="sedeconnecter"/>

    <div v-else class="column align-start items-center">
      <q-card class="q-ma-sm petitelargeur">
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

      <q-card class="q-ma-sm petitelargeur">
        <q-card-section>
          <div class="text-h6">{{ 'Code de l\'organisation' + ($store.state.ui.org == null ? '(requis)' : '') }}</div>
        </q-card-section>
        <q-card-section>
          <q-input dense clearable v-model="locorg" @keydown.enter.prevent="validerorg"
          hint="Presser la touche 'Entrée' à la fin de la saisie"/>
        </q-card-section>
      </q-card>

      <q-card class="q-ma-sm petitelargeur" v-if="!connecte && orgicon != null">
        <q-card-section>
          <div class="text-h6">Identification du compte</div>
        </q-card-section>
        <q-card-section>
          <q-input dense clearable counter hint="Au moins 16 caractères" v-model="ligne1" :type="isPwd ? 'password' : 'text'" label="Première ligne de la phrase secrète">
            <template v-slot:append>
              <q-icon :name="isPwd ? 'visibility_off' : 'visibility'" class="cursor-pointer" @click="isPwd = !isPwd"/>
            </template>
          </q-input>
          <q-input dense clearable counter hint="Au moins 16 caractères" v-model="ligne2" :type="isPwd ? 'password' : 'text'" label="Seconde ligne de la phrase secrète">
            <template v-slot:append>
              <q-icon :name="isPwd ? 'visibility_off' : 'visibility'" class="cursor-pointer" @click="isPwd = !isPwd"/>
            </template>
          </q-input>
        </q-card-section>
        <q-card-actions align="right">
          <q-btn flat label="OK" :disable="ligne1.length < 16 || ligne2.length < 16" color="primary" @click="seconnecter" />
        </q-card-actions>
      </q-card>

      <q-btn v-if="!connecte && orgicon != null" flat class="q-ma-sm" color="accent" icon-right="edit" label="Créer un nouveau compte" @click="creercompte"/>
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
import { gp, orgicon, connexion } from '../app/util'
import * as CONST from '../store/constantes'

export default ({
  name: 'Accueil',

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

    async seconnecter () {
      this.diag = await connexion(this.ligne1, this.ligne2)
      this.erreurconnexion = this.diag != null
    },

    creercompte () {
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
  width: 20rem
.q-field__native
  font-size: 1.1rem !important
  font-family: "Roboto Mono" !important
  font-weight: bold !important
  color: $red !important
.q-field__messages
  font-size: 0.9rem !important
  font-weight: bold !important
.q-card__section
  padding: 5px
</style>
