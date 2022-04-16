<template>
  <q-card class="q-ma-xs moyennelargeur fs-md">
    <q-card-section class="column justify-start">
      <div class="row justify-between">
        <div class='titre-lg'>Fichier attaché au secret</div>
        <bouton-help page="p1"/>
      </div>
    </q-card-section>
    <q-separator />
    <q-card-section class="column justify-start">
      <q-file v-model="fileList" label="Choisir un fichier (50Mo max)" max-file-size="50000000" max-file="1"/>
      <div v-if="file.name" class="font-mono fs-sm">{{file.name}} - {{file.type}} - {{file.size}}o</div>
    </q-card-section>
    <q-card-section class="column justify-start">
      <div>Les caractères <span class="q-px-sm text-negative bg-yellow text-bold">{{interdits}}</span>
      ainsi que les "non imprimables CR BS FF ..." ne sont pas autorisés afin que ce nom puisse servir comme nom de fichier.</div>
      <q-input dense v-model="nomfic" label="Nom du fichier" :rules="[r1, r2]"/>
      <q-input dense v-model="info" label="Court qualificatif de sa version" :rules="[r1, r2]"/>
    </q-card-section>
    <q-separator />
    <q-card-section v-if="etf!==0" class="column justify-start">
      <div v-for="(item, idx) in etapes" :key="idx" class="row no-wrap items-start">
        <q-icon class="col-1" size="sm" :name="etf > idx + 1 ? 'done' : 'arrow_right'"/>
        <div class="col-11">{{item}}</div>
      </div>
    </q-card-section>
    <q-separator v-if="etf!==0"/>
    <q-card-actions align="right">
      <q-btn flat icon="undo" label="Annuler" @click="fermer" />
      <q-btn :disable="!valide || etf!==0" flat icon="check" label="Valider" color="warning" @click="valider" />
    </q-card-actions>
  </q-card>
</template>

<script>
import BoutonHelp from './BoutonHelp.vue'
import { readFile } from '../app/util.mjs'
import { NouveauFichier } from '../app/operations.mjs'
import { computed, onMounted } from 'vue'
import { useStore } from 'vuex'

export default ({
  name: 'FichierAttache',

  props: { secret: Object, close: Function },

  components: { BoutonHelp },

  computed: {
    valide () { return this.file && this.nomfic && this.r1(this.nomfic) && this.r1(this.info) === true }
  },

  watch: {
    async fileList (file) {
      if (file) {
        this.file = await readFile(file, true) // { size, name, type }
        this.nomfic = this.nom ? this.nom : this.file.name
        // console.log('file')
      }
    }
  },

  data () {
    return {
      etapes: ['Compression éventuelle et cryptage', 'Transfert vers le serveur de fichiers', 'Validation'],
      fileList: null,
      file: { },
      nomfic: this.nom,
      info: '',
      interdits: '< > : " / \\ | ? *'
    }
  },

  methods: {
    r2 (val) { return val.length !== 0 || 'Valeur requise' },
    r1 (val) {
      // eslint-disable-next-line no-control-regex
      return /[<>:"/\\|?*\x00-\x1F]/.test(val) ? 'Caractères interdits' : true
    },
    fermer () {
      if (this.close) this.close()
    },
    async valider () {
      const fic = { nom: this.nomfic, info: this.info || '', lg: this.file.size, type: this.file.type }
      this.etf = 1
      await new NouveauFichier().run(this.secret, fic, this.file.u8)
      this.etf = 0
      if (this.close) this.close()
    }
  },

  setup () {
    const $store = useStore()
    const etf = computed({ // secret courant
      get: () => $store.state.ui.etapefichier,
      set: (val) => $store.commit('ui/majetapefichier', val)
    })
    onMounted(() => { etf.value = 0 })
    return {
      etf
    }
  }
})
</script>

<style lang="sass" scoped>
@import '../css/app.sass'
</style>
