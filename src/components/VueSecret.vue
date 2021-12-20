<template>
<q-card>
  <q-card-section class="row justify-between">
    <apercu-motscles :motscles="motscles" :src="secret.mc" court></apercu-motscles>
    <div>
      <span class="dh">{{secret.dh}}</span>
      <q-btn v-if="secret.nbpj" size="sm" color="warning" flat dense icon="attach_file" :label="secret.nbpj" @click="clickpj"></q-btn>
    </div>
  </q-card-section>
  <q-card-section>
    <q-expansion-item dense v-model="ouvert" expand-separator header-class="titre-3" :label="secret.titre">
      <div class="column q-pa-xs btns">
        <div class="row justify-center">
          <q-btn :disable="enedition" flat dense color="warning" size="md" icon="mode_edit" label="Modifier" @click="editer"/>
          <q-btn :disable="!enedition" dense color="primary" size="md" icon="undo" label="Annuler" @click="annuler"/>
          <q-btn :disable="!enedition || !modifie" dense color="warning" size="md" icon="check" label="Valider" @click="valider"/>
        </div>
        <q-btn v-if="enedition" flat color="primary" size="md" label="Changer les mots clés" @click="ouvrirmc"/>
        <editeur-md v-model="textelocal" :texte="!enedition ? secret.txt.t : textelocal" :editable="enedition" taille-m></editeur-md>
      </div>
    </q-expansion-item>
  </q-card-section>
  <q-card-section>
    <q-dialog v-model="mcedit">
      <select-motscles :motscles="motscles" :src="mclocal" @ok="changermc" :close="fermermc"></select-motscles>
    </q-dialog>
  </q-card-section>
</q-card>
</template>

<script>
import { toRef } from 'vue'
import ApercuMotscles from './ApercuMotscles.vue'
import SelectMotscles from './SelectMotscles.vue'
import EditeurMd from './EditeurMd.vue'
// props: { modelValue: String, texte: String, labelOk: String, editable: Boolean, tailleM: Boolean },
import { equ8, eqref } from '../app/util.mjs'

export default ({
  name: 'VueSecret',

  components: { ApercuMotscles, SelectMotscles, EditeurMd },

  props: { motscles: Object, secret: Object },

  computed: {
    modifie () {
      return (this.textelocal !== this.secret.txt.t) || !equ8(this.mc, this.secret.mc) || !eqref(this.reflocal, this.secret.txt.r)
    }
  },

  data () {
    return {
      ouvert: false,
      mcedit: false,
      enedition: false,
      textelocal: '',
      mclocal: null,
      reflocal: null
    }
  },

  methods: {
    fermermc () { this.mcedit = false },

    ouvrirmc () { this.mcedit = true },

    changermc (mc) {
      this.reflocal = mc
    },

    clickpj () { this.ouvert = true },

    editer () {
      this.enedition = true
      this.textelocal = this.secret.txt.t
      this.mclocal = this.secret.mc
      this.reflocal = this.secret.txt.r
    },

    annuler () {
      this.enedition = false
    },

    valider () {

    }
  },

  setup (props) {
    toRef(props, 'motscles')
    const locsecret = toRef(props, 'secret')

    return {
      locsecret
    }
  }
})
</script>

<style lang="sass" scoped>
.q-card
  border-bottom: 2px solid grey
.q-card__section
  padding: 1px !important
.q-btn
  height: 2rem !important
.dh
  font-family: 'Roboto Mono'
  font-size: 0.8rem
.btns
  width: 100%
  border-top: 1 px solid grey
</style>
