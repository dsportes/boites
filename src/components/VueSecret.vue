<template>
<q-card>
  <q-card-section v-if="secret.v" class="row justify-between">
    <apercu-motscles :motscles="motscles" :src="locsecret.mc" court></apercu-motscles>
    <div>
      <span class="dh">{{locsecret.dh}}</span>
      <q-btn v-if="locsecret.nbpj" size="sm" color="warning" flat dense icon="attach_file" :label="locsecret.nbpj" @click="clickpj"></q-btn>
    </div>
  </q-card-section>

  <q-card-section v-if="secret.v === 0">
    <q-btn size="md" color="primary" dense icon="add_circle_outline" label="Nouveau secret" style="width:100%" @click="ouvert=true;editer()"></q-btn>
  </q-card-section>

  <q-card-section>
    <q-expansion-item dense v-model="ouvert" expand-separator :header-class="'titre-3' + (enedition ? ' text-warning' :'')" :label="locsecret.titre">
      <div class="column q-pa-xs btns">
        <div class="row justify-evenly">
          <q-btn v-if="locsecret.v!==0" :disable="enedition" flat dense color="warning" size="md" icon="mode_edit" label="Modifier" @click="editer"/>
          <q-btn :disable="!enedition" dense color="primary" size="md" icon="undo" label="Annuler" @click="annuler"/>
          <q-btn :disable="!enedition || !modifie" dense color="warning" size="md" icon="check" label="Valider" @click="valider"/>
        </div>
        <div v-if="enedition" class="titre-4 text-italic">Cliquer ci-dessous pour changer les mots clés</div>
        <apercu-motscles v-if="enedition" class="mced" :motscles="motscles" :src="mclocal" :argsClick="{}" @click="ouvrirmc"></apercu-motscles>
        <apercu-motscles v-if="!enedition" :motscles="motscles" :src="locsecret.mc"></apercu-motscles>
        <editeur-md v-model="textelocal" :texte="!enedition ? locsecret.txt.t : textelocal" :editable="enedition" taille-m></editeur-md>
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
import { equ8 } from '../app/util.mjs'

export default ({
  name: 'VueSecret',

  components: { ApercuMotscles, SelectMotscles, EditeurMd },

  props: { motscles: Object, secret: Object },

  computed: {
    modifie () {
      return (this.textelocal !== this.locsecret.txt.t) || !equ8(this.mclocal, this.locsecret.mc)
    }
  },

  data () {
    return {
      ouvert: false,
      mcedit: false,
      enedition: false,
      textelocal: '',
      mclocal: null
    }
  },

  methods: {
    ouvrirmc () { this.mcedit = true },
    fermermc () { this.mcedit = false },
    changermc (mc) { this.mclocal = mc },

    clickpj () { this.ouvert = true },

    editer () {
      this.enedition = true
      this.textelocal = this.locsecret.txt.t
      this.mclocal = this.locsecret.mc
    },

    annuler () {
      this.enedition = false
      if (!this.locsecret.v) this.ouvert = false
    },

    valider () {
      this.enedition = false
      // Pour tester
      this.locsecret.txt.t = this.textelocal
      this.locsecret.mc = this.mclocal
      this.ouvert = false
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
  border-top: 1px solid grey
.mced
  padding: 3px
  border-radius: 5px
  border: 1px solid grey
</style>
