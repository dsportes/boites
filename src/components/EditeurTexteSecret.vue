<template>
<div ref="root1">
  <q-card class="column fs-md full-height overflow-hidden shadow-8">
    <q-toolbar class="col-auto full-width maToolBar">
      <q-btn :disable="!md" class="q-mr-xs" size="md" label="TEXTE" :color="md ? 'warning' : 'purple'" push flat dense @click="md=false"></q-btn>
      <q-btn :disable="md" class="q-mr-xs" size="md" label="HTML" dense flat push @click="md=true"></q-btn>
      <q-btn v-if="editable" :disable="md" class="q-mr-xs" icon="face" size="md" dense flat push @click="emoji=true"></q-btn>
      <q-toolbar-title class="text-italic text-center fs-md">{{editable?'Modifiable':'Lecture seule'}}</q-toolbar-title>
      <q-btn v-if="editable" :disable="!modifie" class="q-mr-xs" color="primary" icon="undo" size="sm" dense push @click="undo"></q-btn>
    </q-toolbar>
    <textarea v-if="!md" :class="'col q-pa-xs full-width font-mono ta ' + dlclass" v-model="textelocal" :readonly="!editable"/>
    <div v-else class="col q-pa-xs full-width ta"><show-html :texte="textelocal"/></div>
  </q-card>
  <q-dialog v-model="emoji">
    <VuemojiPicker @emojiClick="emojiclick" data-source="emoji.json"/>
  </q-dialog>
</div>
</template>
<script>
import ShowHtml from './ShowHtml.vue'
import { VuemojiPicker } from 'vuemoji-picker'
import { ref, toRef, watch, onMounted } from 'vue'
import { affidbmsg } from '../app/util.mjs'

export default ({
  name: 'EditeurTexteSecret',

  components: { ShowHtml, VuemojiPicker },

  emits: ['update:modelValue', 'ok'],

  props: { modelValue: String, texteRef: String, editable: Boolean },

  computed: {
    modifie () { return this.textelocal !== this.texteRef },
    dlclass () { return this.$q.dark.isActive ? 'sombre' : 'clair' }
  },

  watch: {
    textelocal (ap) { this.$emit('update:modelValue', ap) }
  },

  data () {
    return {
      emoji: false
    }
  },

  methods: {
    emojiclick (emoji) {
      const code = emoji.emoji.unicode
      const ta = this.root1.querySelector('textarea')
      this.textelocal = ta.value.substring(0, ta.selectionStart) + code + ta.value.substring(ta.selectionEnd, ta.value.length)
      this.emoji = false
    }
  },

  setup (props) {
    const root1 = ref(null)
    const textelocal = ref('')
    const texteinp = ref('')
    const texteRef = toRef(props, 'texteRef')
    const editable = toRef(props, 'editable')
    const md = ref(true)

    onMounted(() => { // initialisation de textelocal par défaut à texte
      textelocal.value = texteRef.value
      texteinp.value = texteRef.value
      if (editable.value) md.value = false
    })

    watch(texteRef, (ap, av) => { // quand texte change, textelocal ne change pas si en édition
      if (textelocal.value === texteinp.value && textelocal.value !== ap) {
        // textelocal n'était PAS modifié, ni égal à la nouvelle valeur : alignement sur la nouvelle valeur
        textelocal.value = ap
      }
      texteinp.value = ap
    })

    watch(editable, (ap, av) => {
      if (ap) md.value = false
    })

    affidbmsg('Quand Firefox est en mode privé, le premier affichage des emojis peut être long (plus d\'une minute)')

    function undo () { textelocal.value = texteinp.value }

    return {
      md,
      root1,
      textelocal,
      undo
    }
  }
})
</script>

<style lang="css">
@media screen and (max-width: 320px) {
  emoji-picker {
    --num-columns: 5;
    --category-emoji-size: 1rem;
  }
}
</style>

<style lang="sass" scoped>
@import '../css/app.sass'
.maToolBar
  padding: 0 !important
  min-height: 1.1rem !important
  max-height: 1.6rem !important
.ta
  width: 100%
  margin: 0
  border-top: 1px solid $grey-5
  border-bottom: 1px solid $grey-5
  overflow-y: auto
</style>
