<template>
  <q-card class="q-ma-xs moyennelargeur fs-md">
    <q-card-section class="column justify-start">
      <div class="row justify-between">
        <div class='titre-lg'>Pièce jointe</div>
        <bouton-help page="p1"/>
      </div>
    </q-card-section>
    <q-separator />
    <q-card-section class="column justify-start">
      <q-file v-model="fileList" label="Choisir un fichier (50Mo max)" max-file-size="50000000" max-file="1"/>
      <div>Nom du fichier : {{file.name}}</div>
      <div>Type du fichier : {{file.type}}</div>
      <div>Taille du fichier : {{file.size}}</div>
    </q-card-section>
    <q-separator />
    <q-card-section class="column justify-start">
      <q-input dense v-model="nompj" label="Nom de la pièce jointe" :readonly="nom?true:false"/>
    </q-card-section>
    <q-separator />
    <q-card-actions align="right">
      <q-btn flat icon="undo" label="Annuler" @click="fermer" />
      <q-btn :disable="!file" flat icon="check" label="Valider" color="warning" @click="valider" />
    </q-card-actions>
  </q-card>
</template>

<script>
import BoutonHelp from './BoutonHelp.vue'
import { readFile } from '../app/util.mjs'

export default ({
  name: 'PieceJointe',

  props: { nom: String, close: Function },

  components: { BoutonHelp },

  computed: { },

  watch: {
    async fileList (file) {
      if (file) {
        this.file = await readFile(file, true)
        this.nompj = this.nom ? this.nom : this.file.name
        console.log('file')
      }
    }
  },

  data () {
    return {
      fileList: null,
      file: { },
      nompj: this.nom
    }
  },

  methods: {
    fermer () {
      if (this.close) this.close()
    },
    valider () {
      this.$emit('ok', { nompj: this.nompj, size: this.file.size, type: this.file.type, u8: this.file.u8 })
      if (this.close) this.close()
    }
  },

  setup () {
    return {
    }
  }
})
</script>

<style lang="sass" scoped>
@import '../css/app.sass'
</style>
