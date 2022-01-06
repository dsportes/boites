<template>
<q-dialog v-model="dialoguehelp" full-width>
  <q-card class="fs-md">
    <q-card-section>
      <q-bar>
        <div class="font-cf fs-lg">{{page(pagec()).titre}}</div>
        <q-space />
        <q-btn dense size="md" icon="arrow_back" :disable="stackvide" @click="back">
            <q-tooltip class="bg-white text-primary">Page d'aide précédente</q-tooltip>
        </q-btn>
        <q-btn dense size="md" icon="close" v-close-popup>
            <q-tooltip class="bg-white text-primary">Fermer l'aide</q-tooltip>
        </q-btn>
      </q-bar>
    </q-card-section>

    <q-separator />

    <q-card-section style="height: 70vh" class="scroll">
      <show-html :texte="texte"/>
    </q-card-section>

    <q-separator />

    <q-card-section class="col items-align-end">
      <div class="titre-md text-italic">Voir aussi ...</div>
      <div v-for="(p, idx) in page(pagec()).voir" :key="idx">
        <div @click="push(p)" class="titre-sm cursor-pointer q-ml-md">{{page(p).titre}}</div>
      </div>
    </q-card-section>
  </q-card>
</q-dialog>
</template>

<script>
import { useStore } from 'vuex'
import { computed } from 'vue'
import { cfg } from '../app/util.mjs'
import ShowHtml from './ShowHtml.vue'

export default ({
  name: 'DialogueHelp',

  components: { ShowHtml },

  data () {
    return {
    }
  },

  computed: {
    texte () {
      const p = this.helpstack.length ? this.page(this.pagec()) : null
      return p ? p.md : ''
    },
    stackvide () { return this.helpstack.length <= 1 }
  },

  methods: {
    pagec () {
      return this.helpstack[this.helpstack.length - 1]
    },
    page (p) {
      const x = cfg().help
      return x[p] || x.bientot
    },
    push (p) {
      this.$store.commit('ui/pushhelp', p)
    },
    back () {
      this.$store.commit('ui/pophelp')
    }
  },

  setup () {
    const $store = useStore()
    const dialoguehelp = computed({
      get: () => $store.state.ui.dialoguehelp,
      set: (val) => $store.commit('ui/majdialoguehelp', val)
    })
    const helpstack = computed({
      get: () => $store.state.ui.helpstack
    })

    return {
      dialoguehelp,
      helpstack
    }
  }
})
</script>

<style lang="sass" scoped>
@import '../css/app.sass'

</style>
