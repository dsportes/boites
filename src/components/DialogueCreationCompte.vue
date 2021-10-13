<template>
  <q-dialog v-model="dialoguecreationcompte">
  <q-card class="q-ma-xs moyennelargeur">
    <q-card-section>
      <div class="titre-2 text-italic">Création d'un compte SANS parrain</div>
      <q-btn flat @click="close" color="primary" label="Renoncer" class="q-ml-sm" />
    </q-card-section>

    <q-card-section>
      <q-stepper v-model="step" vertical color="primary" animated>
        <q-step :name="1" title="Saisie du mot de passe" icon="settings" :done="step > 1">
          Donner le mot de passe du "grand argentier" qui permet de s'octroyer
          des quotas sans limite et de se passer d'être parrainé par le titulaire d'un compte existant.
          <mdp-admin :init-val="mdp" class="q-ma-xs" v-on:ok-mdp="okmdp"></mdp-admin>
        </q-step>

        <q-step :name="2" title="Phrase secrète du compte" icon="settings" :done="step > 2">
          Saisir et confirmer la phrase secrète du compte qui permettra de s'authentifier pour y accéder.
          <phrase-secrete :init-val="ps" class="q-ma-xs" v-on:ok-ps="okps" verif icon-valider="check" label-valider="Suivant"></phrase-secrete>
          <q-stepper-navigation>
            <q-btn flat @click="step = 1" color="primary" label="Précédent" class="q-ml-sm" />
          </q-stepper-navigation>
        </q-step>

        <q-step :name="3" title="Nom du premier avatar du compte" icon="settings" :done="step > 3" >
          Ce nom de 6 à 24 caractères NE POURRA PLUS être changé
          <q-input dense counter v-model="nom" @keydown.enter.prevent="oknom" label="Nom"
            hint="Presser 'Entrée' à la fin de la saisie'"
            :rules="[val => (val.length >= 6 && val.length <= 24) || 'Entre 6 et 24 caractères' ]"/>
          <q-stepper-navigation>
            <q-btn flat @click="step = 2" color="primary" label="Précédent" class="q-ml-sm" />
          </q-stepper-navigation>
        </q-step>

        <q-step :name="4" title="Quotas demandés" icon="settings" :done="step > 4" >
          Saisir les quotas de volume demandés
          <quotas-volume :init-val="quotas" class="q-ma-xs" v-on:ok-quotas="okq"></quotas-volume>
          <q-stepper-navigation>
            <q-btn flat @click="step = 3" color="primary" label="Précédent" class="q-ml-sm" />
          </q-stepper-navigation>
        </q-step>

        <q-step :name="5" title="Confirmation" icon="check" :done="step > 5" >
          <q-icon :name="isPwd ? 'visibility_off' : 'visibility'" class="cursor-pointer" @click="isPwd = !isPwd"/>
          <div class="t1">Mot de passe: <span class="sp1">{{isPwd ? '***' : mdp.mdp}}</span></div>
          <div class="t1">Phrase secrète (ligne 1): <span class="sp1">{{isPwd ? '***' : ps.debut}}</span></div>
          <div class="t1">Phrase secrète (ligne 2): <span class="sp1">{{isPwd ? '***' : ps.fin}}</span></div>
          <div class="t1">Nom de l'avatar: <span class="sp1">{{nom}}</span></div>
          <div class="t1">Quotas: <span class="sp1">{{'q1:' + quotas.q1 + ' q2:' + quotas.q2 + ' qm1:' + quotas.qm1 + ' qm2:' + quotas.qm2}}</span></div>
          <q-stepper-navigation>
            <q-btn flat @click="corriger" color="primary" label="Corriger" class="q-ml-sm" />
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
// const crypt = require('../app/crypto')
import PhraseSecrete from './PhraseSecrete.vue'
import MdpAdmin from './MdpAdmin.vue'
import QuotasVolume from './QuotasVolume.vue'
import { creationCompte } from '../app/operations'
import { Quotas } from '../app/modele'

export default ({
  name: 'DialogueCreationCompte',

  components: {
    PhraseSecrete, MdpAdmin, QuotasVolume
  },

  data () {
    return {
      isPwd: false,
      step: 1,
      ps: null,
      mdp: null,
      quotas: null,
      nom: ''
    }
  },

  methods: {
    close () {
      this.$store.commit('ui/majdialoguecreationcompte', false)
    },
    okmdp (mdp) {
      this.mdp = mdp
      this.step = 2
    },
    okps (ps) {
      if (ps) {
        this.ps = ps
        this.step = 3
      }
    },
    oknom () {
      this.step = 4
    },
    okq (q) {
      this.quotas = new Quotas(q)
      this.step = 5
    },
    confirmer () {
      creationCompte()
    },
    corriger () {
      this.step = 1
    }
  },

  setup () {
    const $store = useStore()
    return {
      dialoguecreationcompte: computed({
        get: () => $store.state.ui.dialoguecreationcompte,
        set: (val) => $store.commit('ui/majdialoguecreationcompte', val)
      })
    }
  }
})
</script>

<style lang="sass" scoped>
@import '../css/app.sass'
.sp1
  margin-left: 1rem
  font-size: 0.9rem
  font-weight: bold
  font-style: normal
  font-family: 'Roboto Mono'
.q-card__section
  padding: 5px
.q-stepper--vertical
  padding: 12px 4px !important
.q-stepper__step-inner
  padding: 0px 12px 32px 32px !important
</style>
