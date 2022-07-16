<template>
  <q-card class="q-ma-xs moyennelargeur fs-md">
    <q-card-section class="column items-center">
      <div class="titre-lg text-center">Proposition de contact de {{naInt.nom}} à {{naExt.nom}}</div>
      <q-btn flat @click="close" color="primary" label="Renoncer" class="q-ml-sm" />
    </q-card-section>

    <q-card-section v-if="sessionok">
      <q-stepper v-model="step" vertical color="primary" animated>
        <q-step :name="1" title="Mot de bienvenue sur l'ardoise du couple" icon="settings" :done="step > 1" >
          <editeur-md :texte="'Bonjour ' + naExt.nom + ' !'" v-model="mot" editable modetxt style="height:8rem"></editeur-md>
          <div v-if="diagmot" class="fs-sm text-warning">De 10 à 140 signes ({{mot.length}})</div>
          <q-stepper-navigation>
            <q-btn flat @click="okmot" color="primary" label="Suivant" :disable="mot.length<10" class="q-ml-sm" />
          </q-stepper-navigation>
        </q-step>

        <q-step :name="2" title="Maximum d'espace attribués pour les secrets du contact" icon="settings" :done="step > 2" >
          <div class="text-warning">Mettre 0 pour ne PAS partager de secrets</div>
          <choix-forfaits v-model="max" :f1="1" :f2="1"/>
          <q-stepper-navigation>
            <q-btn flat @click="step = 1" color="primary" label="Précédent" class="q-ml-sm" />
            <q-btn flat @click="step = 3" color="primary" label="Suivant" class="q-ml-sm" />
          </q-stepper-navigation>
        </q-step>

        <q-step :name="3" title="Confirmation" icon="check" :done="step > 3" >
          <div>Nom de l'avatar sollicité: <span class="font-mono q-pl-md">{{naExt.nom}}</span></div>
          <div>Mot de bienvenue: <span class="font-mono q-pl-md">{{mot}}</span></div>
          <div v-if="max[0]">Volumes maximum des secrets du contact :<br>
            <span class="font-mono q-pl-md">v1: {{ed1(max[0])}}</span>
            <span class="font-mono q-pl-lg">v2: {{ed2(max[1])}}</span>
          </div>
          <div v-else>Pas d'accès aux secrets du contact</div>
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
import ChoixForfaits from './ChoixForfaits.vue'
import EditeurMd from './EditeurMd.vue'
import { NouveauCouple } from '../app/operations.mjs'
import { edvol } from '../app/util.mjs'
import { UNITEV1, UNITEV2 } from '../app/api.mjs'

export default ({
  name: 'NouveauCouple',

  props: { naInt: Object, naExt: Object, close: Function },

  components: { ChoixForfaits, EditeurMd },

  data () {
    return {
      step: 1,
      max: [1, 1],
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
    okmot () {
      if (this.mot.length > 0) {
        this.mot = this.mot.substring(0, 140)
        this.step = 2
      }
    },
    async confirmer () {
      await new NouveauCouple().run(this.naInt, this.naExt, this.max, this.mot)
      this.mot = ''
      this.max = [1, 1]
      if (this.close) this.close()
    },
    corriger () {
      this.step = 1
    }
  },

  setup (props) {
    const $store = useStore()
    const sessionok = computed(() => { return $store.state.ui.sessionok })

    const close = toRef(props, 'close')
    watch(() => sessionok.value, (ap, av) => {
      if (close.value) close.value()
    })

    return {
      sessionok
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
