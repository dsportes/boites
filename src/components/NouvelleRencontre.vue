<template>
  <q-card class="q-ma-xs moyennelargeur fs-md">
    <q-card-section class="column items-center">
      <div class="titre-lg text-center">Nouvelle rencontre</div>
      <q-btn flat @click="close" color="primary" label="Renoncer" class="q-ml-sm" />
    </q-card-section>

    <q-card-section v-if="sessionok">
      <q-stepper v-model="step" vertical color="primary" animated>
        <q-step :name="1" title="Nom de l'avatar rencontré" icon="settings" :done="step > 1" >
          <nom-avatar class="q-ma-xs" v-on:ok-nom="oknom" verif icon-valider="check" label-valider="Suivant"></nom-avatar>
          <q-stepper-navigation>
            <q-btn flat @click="step = 2" color="primary" label="Précédent" class="q-ml-sm" />
          </q-stepper-navigation>
        </q-step>

        <q-step :name="2" title="Mot de bienvenue" icon="settings" :done="step > 2" >
          <editeur-md :texte="mot1" v-model="mot" editable modetxt style="height:8rem"></editeur-md>
          <div v-if="diagmot" class="fs-sm text-warning">De 10 à 140 signes ({{mot.length}})</div>
          <q-stepper-navigation>
            <q-btn flat @click="step = 1" color="primary" label="Précédent" class="q-ml-sm" />
            <q-btn flat @click="okmot" color="primary" label="Suivant" :disable="mot.length<10" class="q-ml-sm" />
          </q-stepper-navigation>
        </q-step>

        <q-step :name="3" title="Maximum d'espace attribués pour les secrets du couple" icon="settings" :done="step > 3" >
          <div class="titre-md text-warning">Mettre 0 pour NE PAS PARTAGER de secrets</div>
          <choix-forfaits v-model="max" :f1="1" :f2="1"/>
          <q-stepper-navigation>
            <q-btn flat @click="step = 2" color="primary" label="Précédent" class="q-ml-sm" />
            <q-btn flat @click="step = 4" color="primary" label="Suivant" class="q-ml-sm" />
          </q-stepper-navigation>
        </q-step>

        <q-step :name="4" title="Confirmation" icon="check" :done="step > 5" >
          <div>Phrase de rencontre: <span class="font-mono q-pl-md">{{phrase}}</span></div>
          <div>Nom de l'avatar rencontré: <span class="font-mono q-pl-md">{{nom}}</span></div>
          <div>Mot de bienvenue: <span class="font-mono q-pl-md">{{mot}}</span></div>
          <div>Volumes maximum attribués aux secrets du couple :
            <span class="font-mono q-pl-md">v1: {{ed1(max[0])}}</span>
            <span class="font-mono q-pl-lg">v2: {{ed2(max[1])}}</span>
          </div>
          <q-stepper-navigation>
            <q-btn flat @click="corriger" color="primary" label="Corriger" class="q-ml-sm" />
            <q-btn @click="confirmer" color="warning" label="Confirmer" icon="check" class="q-ml-sm" />
          </q-stepper-navigation>
        </q-step>

      </q-stepper>
    </q-card-section>
  </q-card>
</template>

<script>
import { useStore } from 'vuex'
import { computed, toRef, watch } from 'vue'
import NomAvatar from './NomAvatar.vue'
import ChoixForfaits from './ChoixForfaits.vue'
import EditeurMd from './EditeurMd.vue'
import { NouvelleRencontre } from '../app/operations.mjs'
import { edvol } from '../app/util.mjs'
import { UNITEV1, UNITEV2 } from '../app/api.mjs'

export default ({
  name: 'NouvelleRencontre',

  props: { clex: Object, phch: Number, phrase: String, close: Function },

  components: { ChoixForfaits, NomAvatar, EditeurMd },

  computed: {
    dlclass () { return this.$q.dark.isActive ? 'sombre' : 'clair' }
  },

  data () {
    return {
      step: 1,
      max: [],
      nom: '',
      mot: '',
      diagmot: false,
      encours: false
    }
  },

  watch: {
    mot (ap, av) {
      this.diagmot = ap.length < 10 || ap.length > 140
    }
  },

  methods: {
    ed1 (f) { return edvol(f * UNITEV1) },
    ed2 (f) { return edvol(f * UNITEV2) },
    r1 (val) { return (val.length > 15 && val.length < 33) || 'De 16 à 32 signes' },
    oknom (nom) {
      if (nom) {
        this.nom = nom
        this.mot1 = 'Bonjour ' + this.nom + ' !'
        this.step = 2
      }
    },
    okmot () {
      if (this.mot.length > 0) {
        this.mot = this.mot.substring(0, 140)
        this.step = 3
      }
    },
    async confirmer () {
      const arg = {
        phch: this.phch, // le hash de la clex (integer)
        pp: this.phrase, // phrase de rencontre (string)
        clex: this.clex, // PBKFD de pp (u8)
        id: this.avatar.id,
        max: this.max, // max volumes couple
        nomf: this.nom, // nom de l'avatar rencontré
        mot: this.mot // mot de bienvenue
      }
      const [st, ex] = await new NouvelleRencontre().run(arg)
      if (st) {
        this.mot = ''
        this.nom = ''
        this.max = [1, 1]
        this.tabavatar = 'couples'
        if (this.close) this.close()
      } else {
        console.log(ex.message)
      }
    },
    corriger () {
      this.step = 1
    }
  },

  setup (props) {
    const $store = useStore()
    const avatar = computed(() => $store.state.db.avatar)
    const compte = computed(() => { return $store.state.db.compte })
    const sessionok = computed(() => { return $store.state.ui.sessionok })
    const mode = computed({
      get: () => $store.state.ui.mode,
      set: (val) => $store.commit('ui/majmode', val)
    })
    const tabavatar = computed({
      get: () => $store.state.ui.tabavatar,
      set: (val) => $store.commit('ui/majtabavatar', val)
    })

    const close = toRef(props, 'close')
    watch(() => sessionok.value, (ap, av) => {
      if (close.value) close.value()
    })

    return {
      mode,
      sessionok,
      tabavatar,
      compte,
      avatar
    }
  }
})
</script>

<style lang="sass" scoped>
@import '../css/app.sass'
@import '../css/input.sass'
.ta
  margin: 0
  border-top: 1px solid $grey-5
  border-bottom: 1px solid $grey-5
  overflow-y: auto
.q-dialog__inner
  padding: 0 !important
</style>

<style lang="sass">
.q-stepper--vertical
  padding: 4px !important
.q-stepper--bordered
  border: none
.q-stepper__tab
  padding: 2px 0 !important
.q-stepper__step-inner
  padding: 0px 2px 2px 18px !important
.q-stepper__nav
  padding: 0 !important
</style>
