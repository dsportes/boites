<template>
  <q-card class="q-ma-xs moyennelargeur fs-md">
    <q-card-section class="column items-center">
      <div class="titre-lg text-center">{{'Acceptation d\'une rencontre'}}</div>
    </q-card-section>

    <q-card-section>
      <q-stepper v-model="step" vertical color="primary" animated>
        <q-step :name="1" title="Proposition de couple" icon="settings" :done="step > 1">
          <div>Proposition faite par : <span class="font-mono q-pl-md">{{couple.naE.nom}}</span></div>
          <div>Volumes des secrets actuellement occupés:<br>
            <span class="font-mono q-pl-md">v1: {{ed3(couple.v1)}}</span>
            <span class="font-mono q-pl-lg">v2: {{ed3(couple.v2)}}</span>
          </div>
          <div>Maximum des volumes des secrets autorisés par le/la proposant.e:<br>
            <span class="font-mono q-pl-md">v1: {{ed1(couple.mx10)}}</span>
            <span class="font-mono q-pl-lg">v2: {{ed2(couple.mx20)}}</span>
          </div>
          <div class="t1">Validité: <span class="sp1">{{couple.dlv - jourJ}}</span> jour(s)</div>
          <show-html class="full-width height-6 border1" :texte="couple.ard" />
          <q-stepper-navigation>
            <q-btn flat @click="fermer()" color="primary" label="Renoncer" class="q-ml-sm" />
            <q-btn flat @click="step=5" color="primary" label="Refuser" class="q-ml-sm" />
            <q-btn flat @click="step=2" color="warning" label="Continuer" class="q-ml-sm" />
          </q-stepper-navigation>
        </q-step>

        <q-step :name="2" title="Message de remerciement" icon="settings" :done="step > 2" >
          <editeur-md class="full-width height-8" v-model="texte" :texte="textedef" editable modetxt hors-session/>
          <q-stepper-navigation>
            <q-btn flat @click="fermer()" color="primary" label="Renoncer" class="q-ml-sm" />
            <q-btn flat @click="step=5" color="primary" label="Refuser" class="q-ml-sm" />
            <q-btn flat @click="step=3" color="warning" label="Continuer" class="q-ml-sm" />
          </q-stepper-navigation>
        </q-step>

        <q-step :name="3" title="Confirmation" icon="check" :done="step > 3" >
          <div class="titre-md">Volumes de secrets maximum que j'autorise pour le couple</div>
          <choix-forfaits v-model="vmax" :f1="couple.mx11" :f2="couple.mx21"/>
          <q-stepper-navigation>
            <q-btn flat @click="step=1" color="primary" label="Corriger" class="q-ml-sm" />
            <q-btn flat @click="fermer()" color="primary" label="Renoncer" class="q-ml-sm" />
            <q-btn flat @click="step=5" color="primary" label="Refuser" class="q-ml-sm" />
            <q-btn @click="confirmer" color="warning" label="Confirmer la rencontre" icon="check" class="q-ml-sm" />
          </q-stepper-navigation>
        </q-step>

        <q-step :name="5" title="Remerciement / explication (pourquoi décliner)" icon="check" :done="step > 3" >
          <editeur-md class="full-width height-8" v-model="texte" :texte="couple.ard" editable modetxt hors-session/>
          <q-stepper-navigation>
            <q-btn flat @click="step=1" color="primary" label="Corriger" class="q-ml-sm" />
            <q-btn flat @click="fermer()" color="primary" label="Renoncer" class="q-ml-sm" />
            <q-btn flat @click="refuser()" color="warning" label="Décliner définitivement ce parrainage" class="q-ml-sm" />
          </q-stepper-navigation>
        </q-step>

      </q-stepper>
    </q-card-section>
  </q-card>
</template>

<script>
import EditeurMd from './EditeurMd.vue'
import ShowHtml from './ShowHtml.vue'
import { AcceptRencontre, RefusRencontre } from '../app/operations.mjs'
import { getJourJ, edvol } from '../app/util.mjs'
import ChoixForfaits from './ChoixForfaits.vue'
import { UNITEV1, UNITEV2 } from '../app/api.mjs'
import { computed } from 'vue'
import { useStore } from 'vuex'

export default ({
  name: 'AcceptRencontre',

  props: { couple: Object, phch: Number, close: Function },

  components: { EditeurMd, ShowHtml, ChoixForfaits },

  computed: {
    textedef () { return 'Merci ' + this.couple.naE.nom + ',\n\n' + this.couple.ard }
  },

  data () {
    return {
      isPwd: false,
      jourJ: getJourJ(),
      vmax: [],
      step: 1,
      ps: null,
      apsf: false,
      texte: ''
    }
  },

  methods: {
    ed1 (f) { return edvol(f * UNITEV1) },
    ed2 (f) { return edvol(f * UNITEV2) },
    ed3 (f) { return edvol(f) },
    fermer () {
      this.texte = ''
      this.apsf = false
      this.step = 1
      if (this.close) this.close()
    },
    async confirmer () {
      await new AcceptRencontre().run(this.couple, this.avatar, this.texte, this.vmax, this.phch)
      this.fermer()
    },
    async refuser () {
      await new RefusRencontre().run(this.couple, this.avatar, this.texte, this.phch)
      this.fermer()
    }
  },

  setup () {
    const $store = useStore()
    const avatar = computed(() => { return $store.state.db.avatar })
    return { avatar }
  }
})
</script>

<style lang="sass" scoped>
@import '../css/app.sass'
.border1
  border: 1px solid grey
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
