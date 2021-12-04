<template>
<q-dialog v-model="dialoguehelp" full-width>
  <q-card>
    <q-card-section>
      <q-bar>
        <div>{{page(pagec()).titre}}</div>
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
      <div v-if="!$q.dark.isActive">
        <sd-light class="markdown-body" :texte="texte"/>
      </div>
      <div v-if="$q.dark.isActive">
        <sd-dark class="markdown-body" :texte="texte"/>
      </div>
    </q-card-section>

    <q-separator />

    <q-card-section class="col items-align-end">
      <div class="titre-3 text-italic">Voir aussi ...</div>
      <div v-for="(p, idx) in page(pagec()).voir" :key="idx">
        <div @click="push(p)" class="titre-6 cursor-pointer q-ml-md">{{page(p).titre}}</div>
      </div>
    </q-card-section>
  </q-card>
</q-dialog>
</template>

<script>
import { useStore } from 'vuex'
import { computed } from 'vue'
import SdLight from './SdLight.vue'
import SdDark from './SdDark.vue'
import { cfg } from '../app/util.mjs'

export default ({
  name: 'DialogueHelp',

  components: { SdLight, SdDark },

  data () {
    return {
    }
  },

  computed: {
    texte () {
      return this.helpstack.length ? this.page(this.pagec()).md : ''
    },
    stackvide () { return this.helpstack.length <= 1 }
  },

  methods: {
    pagec () {
      return this.helpstack[this.helpstack.length - 1]
    },
    page (p) {
      return cfg().help[p]
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
