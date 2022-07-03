<template>
  <q-dialog v-model="dialoguecreationcompte">
  <q-card class="q-ma-xs moyennelargeur fs-md">
    <q-card-section class="column items-center">
      <div class="titre-lg text-center">Création d'un compte parrain avec pouvoir comptable</div>
      <div class="titre-sm text-center text-italic">!!! l'autorisation doit avoir été enregistrée en configuration de l'organisation!!!</div>
      <q-btn flat @click="close" color="primary" label="Renoncer" class="q-ml-sm" />
    </q-card-section>

    <q-card-section>
      <q-stepper v-model="step" vertical color="primary" animated>
        <q-step :name="1" title="Phrase secrète du compte" icon="settings" :done="step > 2">
          <span class="fs-sm q-py-sm">Saisir et confirmer la phrase secrète du compte qui permettra de s'authentifier pour y accéder.</span>
          <phrase-secrete :init-val="ps" class="q-ma-xs" v-on:ok-ps="okps" verif icon-valider="check" label-valider="Suivant"></phrase-secrete>
        </q-step>

        <q-step :name="2" title="Nom de l'avatar primaire du compte" icon="settings" :done="step > 3" >
          <nom-avatar class="q-ma-xs" v-on:ok-nom="oknom" verif icon-valider="check" label-valider="Suivant"></nom-avatar>
          <q-stepper-navigation>
            <q-btn flat @click="step = 2" color="primary" label="Précédent" class="q-ml-sm" />
          </q-stepper-navigation>
        </q-step>

        <q-step :name="3" title="Forfaits et ressources auto-attribuées" icon="settings" :done="step > 4" >
          <div>Forfaits du compte</div>
          <choix-forfaits v-model="forfaits" :f1="4" :f2="4"/>
          <div>Ressources attribuables à ses filleuls</div>
          <choix-forfaits v-model="ressources" :f1="4" :f2="4"/>
          <q-stepper-navigation>
            <q-btn flat @click="step = 2" color="primary" label="Précédent" class="q-ml-sm" />
            <q-btn flat @click="step = 4" color="primary" label="Suivant" class="q-ml-sm" />
          </q-stepper-navigation>
        </q-step>

        <q-step :name="4" title="Confirmation" icon="check" :done="step > 5" >
          <q-icon :name="isPwd ? 'visibility_off' : 'visibility'" size="md" class="cursor-pointer" @click="isPwd = !isPwd"/>
          <div>Phrase secrète (ligne 1): <span class="font-mono q-pl-md">{{isPwd ? '***' : ps.debut}}</span></div>
          <div>Phrase secrète (ligne 2): <span class="font-mono q-pl-md">{{isPwd ? '***' : ps.fin}}</span></div>
          <div>Nom de l'avatar: <span class="font-mono q-pl-md">{{nom}}</span></div>
          <div>Forfaits du compte:
            <span class="font-mono q-pl-md">v1: {{ed1(forfaits[0])}}</span>
            <span class="font-mono q-pl-lg">v2: {{ed2(forfaits[1])}}</span>
          </div>
          <div>+ pour les filleuls:
            <span class="font-mono q-pl-md">v1: {{ed1(ressources[0])}}</span>
            <span class="font-mono q-pl-lg">v2: {{ed2(ressources[1])}}</span>
          </div>
          <q-stepper-navigation>
            <q-btn flat @click="step = 3" color="primary" label="Corriger" class="q-ml-sm" />
            <q-btn @click="confirmer" color="warning" label="Confirmer" icon="check" class="q-ml-sm" />
          </q-stepper-navigation>
        </q-step>

      </q-stepper>
    </q-card-section>
  </q-card>
  </q-dialog>
</template>

<script>
import { useStore } from 'vuex'
import { computed } from 'vue'
import PhraseSecrete from './PhraseSecrete.vue'
import ChoixForfaits from './ChoixForfaits.vue'
import NomAvatar from './NomAvatar.vue'
import { CreationCompteComptable } from '../app/operations.mjs'
import { UNITEV1, UNITEV2 } from '../app/api.mjs'
import { edvol } from '../app/util.mjs'

export default ({
  name: 'DialogueCreationCompte',

  components: {
    PhraseSecrete, NomAvatar, ChoixForfaits
  },

  data () {
    return {
      isPwd: true,
      step: 1,
      ps: null,
      forfaits: [4, 4],
      ressources: [4, 4],
      nom: ''
    }
  },

  methods: {
    ed1 (f) { return edvol(f * UNITEV1) },
    ed2 (f) { return edvol(f * UNITEV2) },
    close () {
      this.dialoguecreationcompte = false
    },
    okps (ps) {
      if (ps) {
        this.ps = ps
        this.step = 2
      }
    },
    oknom (nom) {
      if (nom) {
        this.nom = nom
        this.step = 3
      }
    },
    async confirmer () {
      await new CreationCompteComptable().run(this.ps, this.nom, this.forfaits, this.ressources)
      this.ps = null
      this.forfaits = [4, 4]
      this.ressources = [4, 4]
      this.nom = ''
      this.step = 1
    }
  },

  setup () {
    const $store = useStore()
    const dialoguecreationcompte = computed({
      get: () => $store.state.ui.dialoguecreationcompte,
      set: (val) => $store.commit('ui/majdialoguecreationcompte', val)
    })
    return {
      dialoguecreationcompte
    }
  }
})
</script>

<style lang="sass" scoped>
@import '../css/app.sass'
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
