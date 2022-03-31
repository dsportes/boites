<template>
  <q-card class="q-ma-xs petitelargeur fs-md">
    <q-card-section class="column items-center">
      <div class="titre-lg text-center">Parrainage d'un nouveau compte</div>
      <q-btn flat @click="close" color="primary" label="Renoncer" class="q-ml-sm" />
    </q-card-section>

    <q-card-section v-if="sessionok">
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
          <editeur-md :texte="mot1" v-model="mot" editable modetxt style="height:8rem"></editeur-md>
          <div v-if="diagmot" class="fs-sm text-warning">De 10 à 140 signes ({{mot.length}})</div>
          <q-stepper-navigation>
            <q-btn flat @click="step = 2" color="primary" label="Précédent" class="q-ml-sm" />
            <q-btn flat @click="okmot" color="primary" label="Suivant" :disable="mot.length<10" class="q-ml-sm" />
          </q-stepper-navigation>
        </q-step>

        <q-step :name="4" title="Forfaits attribués" icon="settings" :done="step > 4" >
          <choix-forfaits v-model="forfaits" :f1="4" :f2="4"/>
          <div v-if="estComptable">
            <div style="margin-left:-0.8rem" class="text-primary">
              <q-toggle v-model="estParrain" size="md" color="primary" :label="estParrain ? 'Compte parrain lui-même' : 'Compte filleul standard'"/>
            </div>
            <div v-if="estParrain">
              <div>Ressources maximales attribuables aux filleuls</div>
              <choix-forfaits v-model="ressources" :f1="4" :f2="4"/>
            </div>
          </div>
          <q-stepper-navigation>
            <q-btn flat @click="step = 3" color="primary" label="Précédent" class="q-ml-sm" />
            <q-btn flat @click="step = 5" color="primary" label="Suivant" class="q-ml-sm" />
          </q-stepper-navigation>
        </q-step>

        <q-step :name="5" title="Confirmation" icon="check" :done="step > 5" >
          <div>Phrase de parrainage: <span class="font-mono q-pl-md">{{phrase}}</span></div>
          <div>Nom de l'avatar: <span class="font-mono q-pl-md">{{nom}}</span></div>
          <div>Mot de bienvenue: <span class="font-mono q-pl-md">{{mot}}</span></div>
          <div>Forfaits du compte:
            <span class="font-mono q-pl-md">{{'v1: ' + forfaits[0] + '*0,25MB'}}</span>
            <span class="font-mono q-pl-lg">{{'v2: ' + forfaits[1] + '*25MB'}}</span>
          </div>
          <div v-if="estParrain">Ressources attribuables aux filleuls:
            <span class="font-mono q-pl-md">{{'v1: ' + ressources[0] + '*0,25MB'}}</span>
            <span class="font-mono q-pl-lg">{{'v2: ' + ressources[1] + '*25MB'}}</span>
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
import { NouveauParrainage } from '../app/operations.mjs'
import { crypt } from '../app/crypto.mjs'
import { data } from '../app/modele.mjs'

export default ({
  name: 'NouveauParrainage',

  props: { close: Function },

  components: { ChoixForfaits, NomAvatar, EditeurMd },

  computed: {
    dlclass () { return this.$q.dark.isActive ? 'sombre' : 'clair' }
  },

  data () {
    return {
      isPwd: false,
      step: 1,
      forfaits: [],
      ressources: [],
      estParrain: false,
      nom: '',
      phrase: '',
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
    r1 (val) { return (val.length > 15 && val.length < 33) || 'De 16 à 32 signes' },
    crypterphrase () {
      if (!this.r1(this.phrase)) return
      this.encours = true
      setTimeout(async () => {
        this.clex = await crypt.pbkfd(this.phrase)
        let hx = ''
        for (let i = 0; i < this.phrase.length; i = i + 2) hx += this.phrase.charAt(i)
        this.pph = crypt.hash(hx)
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
      this.mot1 = 'Bonjour ' + this.nom + ' !'
      this.step = 3
    },
    okmot () {
      if (this.mot.length > 0) {
        this.mot = this.mot.substring(0, 140)
        this.step = 4
      }
    },
    async confirmer () {
      const arg = {
        pph: this.pph, // le hash de la clex (integer)
        pp: this.phrase, // phrase de parrainage (string)
        clex: this.clex, // PBKFD de pp (u8)
        id: this.avatar.id,
        forfaits: this.forfaits,
        ressources: this.estParrain ? this.ressources : null,
        nomf: this.nom, // nom du filleul (string)
        mot: this.mot
      }
      const [st, ex] = await new NouveauParrainage().run(arg)
      if (st) {
        this.mot = ''
        this.nom = ''
        this.forfaits = [1, 1]
        this.pp = ''
        this.clex = null
        this.pph = 0
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
    const tabavatar = computed({
      get: () => $store.state.ui.tabavatar,
      set: (val) => $store.commit('ui/majtabavatar', val)
    })

    const close = toRef(props, 'close')
    watch(() => sessionok.value, (ap, av) => {
      if (close.value) close.value()
    })

    const estComptable = data.estComptable
    return {
      estComptable,
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
