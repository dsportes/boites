<template>
  <q-card class="q-ma-xs petitelargeur fs-md">
    <q-card-section class="column items-center">
      <div class="titre-lg text-center">Parrainage d'un nouveau compte</div>
      <q-btn flat @click="close" color="primary" label="Renoncer" class="q-ml-sm" />
    </q-card-section>

    <q-card-section>
      <q-stepper v-model="step" vertical color="primary" animated>
        <q-step :name="1" title="Phrase de parrainage" icon="settings" :done="step > 1">
          <span class="fs-sm q-py-sm">Phrase à ne communiquer qu'au titulaire du compte à parrainer.</span>
          <q-input dense v-model="phrase" label="Phrase libre" counter :rules="[r1]" maxlength="32"
            @keydown.enter.prevent="crypterphrase" :type="isPwd ? 'password' : 'text'"
            hint="Presser 'Entrée' à la fin de la saisie">
          <template v-slot:append>
            <q-icon :name="isPwd ? 'visibility_off' : 'visibility'" class="cursor-pointer" @click="isPwd = !isPwd"/>
            <span :class="phrase.length === 0 ? 'disabled' : ''"><q-icon name="cancel" class="cursor-pointer"  @click="razphrase"/></span>
          </template>
          </q-input>
          <div v-if="encours" class="fs-md text-italic text-primary">Cryptage en cours ...
            <q-spinner color="primary" size="2rem" :thickness="3" />
          </div>
        </q-step>

        <q-step :name="2" title="Nom du premier avatar du compte" icon="settings" :done="step > 3" >
          <nom-avatar class="q-ma-xs" v-on:ok-nom="oknom" icon-valider="check" label-valider="Suivant"></nom-avatar>
          <q-stepper-navigation>
            <q-btn flat @click="step = 2" color="primary" label="Précédent" class="q-ml-sm" />
          </q-stepper-navigation>
        </q-step>

        <q-step :name="3" title="Mot de bienvenue pour le futur nouveau compte" icon="settings" :done="step > 3" >
          <textarea :class="'q-pa-xs full-width font-mono height-8 ta ' + dlclass" v-model="mot"/>
          <div v-if="diagmot" class="fs-sm text-warning">De 10 à 140 signes ({{mot.length}})</div>
          <q-stepper-navigation>
            <q-btn flat @click="step = 2" color="primary" label="Précédent" class="q-ml-sm" />
            <q-btn flat @click="okmot" color="primary" label="Suivant" :disable="mot.length<10" class="q-ml-sm" />
          </q-stepper-navigation>
        </q-step>

        <q-step :name="4" title="Quotas transférés" icon="settings" :done="step > 4" >
          <quotas-volume :init-val="quotas" class="q-ma-xs" v-on:ok-quotas="okq"></quotas-volume>
          <q-stepper-navigation>
            <q-btn flat @click="step = 3" color="primary" label="Précédent" class="q-ml-sm" />
          </q-stepper-navigation>
        </q-step>

        <q-step :name="5" title="Confirmation" icon="check" :done="step > 5" >
          <div class="text-italic">Phrase de parrainage: <span class="sp1">{{phrase}}</span></div>
          <div class="text-italic">Nom de l'avatar: <span class="sp1">{{nom}}</span></div>
          <div class="text-italic">Mot de bienvenue: <span class="sp1">{{mot}}</span></div>
          <div class="text-italic">Quotas: <span class="sp1">{{'q1:' + quotas.q1 + ' q2:' + quotas.q2 + ' qm1:' + quotas.qm1 + ' qm2:' + quotas.qm2}}</span></div>
          <div style="margin-left:-0.8rem" class="text-primary">
            <q-toggle v-model="aps" size="md" :color="aps ? 'green' : 'grey'" label="Partage de secrets avec cet avatar"/>
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
import { computed } from 'vue'
import NomAvatar from './NomAvatar.vue'
import QuotasVolume from './QuotasVolume.vue'
import { NouveauParrainage } from '../app/operations.mjs'
import { Quotas } from '../app/util.mjs'
import { crypt } from '../app/crypto.mjs'

export default ({
  name: 'NouveauParrainage',

  props: { close: Function },

  components: {
    QuotasVolume, NomAvatar
  },

  computed: {
    dlclass () { return this.$q.dark.isActive ? 'sombre' : 'clair' }
  },

  data () {
    return {
      isPwd: false,
      step: 1,
      quotas: new Quotas(this.quotasDef),
      nom: '',
      phrase: '',
      mot: '',
      diagmot: false,
      aps: false,
      encours: false
    }
  },

  watch: {
    mot (ap, av) {
      this.diagmot = ap.length < 10 || ap.length > 140
    }
  },

  methods: {
    r1 (val) { return (val.length > 15 && val.length < 33) || 'De 16 à 32 signes' },
    crypterphrase () {
      if (!this.r1(this.phrase)) return
      this.encours = true
      setTimeout(async () => {
        this.clex = await crypt.pbkfd(this.phrase)
        this.pph = crypt.hashBin(this.clex)
        this.encours = false
        this.step = 2
        console.log(this.pph)
      }, 1)
    },
    razphrase () {
      this.phrase = ''
      this.encours = false
    },
    oknom (nom) {
      this.nom = nom
      this.step = 3
    },
    okmot () {
      if (this.mot.length > 10) {
        this.mot = this.mot.substring(0, 140)
        this.step = 4
      }
    },
    okq (q) {
      this.quotas = new Quotas(q)
      this.step = 5
    },
    async confirmer () {
      /* { pph, pp, clex, id, aps, quotas: {q1, q2, qm1, qm2}, nomf, mot }
      - pp : phrase de parrainage (string)
      - pph : le hash de la clex (integer)
      - clex : PBKFD de pp (u8)
      - nomf : nom du filleul (string)
      - mot : mot d'accueil (string)
      - aps : booléen (accepta partage de secrets)
      */
      const arg = { pph: this.pph, pp: this.phrase, clex: this.clex, id: this.avatar.id, aps: this.aps, quotas: { ...this.quotas }, nomf: this.nom, mot: this.mot }
      await new NouveauParrainage().run(arg)
      this.mot = ''
      this.nom = ''
      this.quotas = new Quotas(this.quotasDef)
      this.pp = ''
      this.clex = null
      this.pph = 0
      this.aps = false
      if (this.close) this.close()
    },
    corriger () {
      this.step = 1
    }
  },

  setup () {
    const $store = useStore()
    const avatar = computed(() => $store.state.db.avatar)
    return {
      quotasDef: new Quotas({ q1: 1, q2: 1, qm1: 5, qm2: 5 }),
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
.sp1
  margin-left: 1rem
  font-size: 0.9rem
  font-style: normal
  font-family: 'Roboto Mono'
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
