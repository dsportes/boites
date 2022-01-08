<template>
<div>
  <q-card ref="root1" v-if="!max" :class="'column fs-md full-height overflow-hidden shadow-8 ' + dlclass">
    <q-toolbar class="col-auto full-width">
      <q-btn icon="zoom_out_map" size="md" push flat dense @click="max=true"></q-btn>
      <q-btn :disable="!md" class="q-mr-xs" size="md" label="TXT" :color="md ? 'warning' : 'purple'" push flat dense @click="md=false"></q-btn>
      <q-btn :disable="md" class="q-mr-xs" size="md" label="HTML" dense flat push @click="md=true"></q-btn>
      <q-btn v-if="editable" :disable="md" class="q-mr-xs" icon="face" size="md" dense flat push @click="emoji=true"></q-btn>
      <q-btn v-if="modifie" class="q-mr-xs" icon="undo" size="md" dense flat push @click="undo"></q-btn>
      <q-btn v-if="modifie && labelOk" class="q-mr-xs" icon="check" :label="labelOk" size="md" dense flat push color="warning" @click="ok"></q-btn>
    </q-toolbar>
    <textarea v-if="!md" :class="'q-pa-xs col full-width font-mono ta ' + dlclass" v-model="textelocal" :readonly="!editable"/>
    <div v-else class="q-pa-xs col full-width ta"><show-html :idx="idx" :texte="textelocal"/></div>
  </q-card>
  <q-dialog v-model="max" full-height transition-show="slide-up" transition-hide="slide-down">
    <div ref="root2" :class="'column fs-md full-height grandelargeur overflow-hidden ' + dlclass">
      <q-toolbar class="col-auto">
      <q-btn icon="zoom_in_map" size="md" dense flat push @click="max=false"></q-btn>
      <q-btn :disable="!md" class="q-mr-xs" size="md" label="TXT" :color="md ? 'warning' : 'purple'" push flat dense @click="md=false"></q-btn>
      <q-btn :disable="md" class="q-mr-xs" size="md" label="HTML" dense flat push @click="md=true"></q-btn>
      <q-btn v-if="editable" :disable="md" class="q-mr-xs" icon="face" size="md" dense flat push @click="emoji=true"></q-btn>
      <q-btn v-if="modifie" class="q-mr-xs" icon="undo" size="md" dense flat push @click="undo"></q-btn>
      <q-btn v-if="modifie && labelOk" class="q-mr-xs" icon="check" :label="labelOk" size="md" dense flat push color="warning" @click="ok"></q-btn>
      </q-toolbar>
      <textarea v-if="!md" :class="'q-pa-xs col font-mono ta ' + dlclass" v-model="textelocal" :readonly="!editable"/>
      <div v-else :class="'q-pa-xs col ta ' + dlclass"><show-html :idx="idx" :texte="textelocal"/></div>
    </div>
  </q-dialog>
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
  name: 'EditeurMd',

  components: { ShowHtml, VuemojiPicker },

  emits: ['update:modelValue', 'ok'],

  props: { modelValue: String, texte: String, labelOk: String, editable: Boolean, idx: Number, modetxt: Boolean },

  computed: {
    dlclass () {
      if (this.$q.dark.isActive) return this.idx ? ' sombre' + (this.idx % 2) : ' sombre0'
      return this.idx ? ' clair' + (this.idx % 2) : ' clair0'
    },
    modifie () {
      return this.textelocal !== this.texteinp
    }
  },

  watch: {
    textelocal (ap) {
      this.$emit('update:modelValue', ap)
    }
  },

  data () {
    return {
      emoji: false,
      max: false
    }
  },

  methods: {
    ok () {
      this.max = false
      this.taille = this.tailleM ? 1 : 0
      this.md = false
      this.$emit('ok', this.textelocal)
    },
    undo () {
      this.textelocal = this.texteinp
    },
    emojiclick (emoji) {
      // console.log(JSON.stringify(emoji.emoji.shortcodes))
      // const code = ':' + emoji.emoji.shortcodes[0] + ':'
      const code = emoji.emoji.unicode
      const r = this.max ? this.root2 : this.root1
      const ta = r.querySelector('textarea')
      this.textelocal = ta.value.substring(0, ta.selectionStart) + code + ta.value.substring(ta.selectionEnd, ta.value.length)
      this.emoji = false
    }
  },

  setup (props) {
    const root1 = ref(null)
    const root2 = ref(null)
    const taille = ref(0)
    const tailleM = toRef(props, 'tailleM')
    const textelocal = ref('') // en Ref parce que sa valeur dépend du changement de la prop texte ET de l'état d'édition
    const texte = toRef(props, 'texte') // pour pouvoir mettre un watch sur le changement de la propriété
    const modetxt = toRef(props, 'modetxt')
    const texteinp = ref('') // dernière valeur source passée sur la prop 'texte'
    const md = ref(true)

    onMounted(() => { // initialisation de textelocal par défaut à texte
      textelocal.value = texte.value
      texteinp.value = texte.value
      taille.value = tailleM.value ? 1 : 0
      if (modetxt.value) md.value = false
    })

    watch(texte, (ap, av) => { // quand texte change, textelocal ne change pas si en édition
      // console.log('Texte : ' + ap + '\n' + av)
      if (textelocal.value === texteinp.value && textelocal.value !== ap) {
        // textelocal n'était PAS modifié, ni égal à la nouvelle valeur : alignement sur la nouvelle valeur
        textelocal.value = ap
      }
      texteinp.value = ap
    })

    watch(modetxt, (ap, av) => {
      if (ap) md.value = false
    })

    affidbmsg('Quand Firefox est en mode privé, le premier affichage des emojis peut être long (plus d\'une minute)')

    return {
      md,
      root1,
      root2,
      taille,
      texteinp,
      textelocal
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
@import '../css/input.sass'
.q-toolbar
  padding: 2px 0 !important
  height: 25px !important
.ta
  width: 100%
  margin: 0
  border-top: 1px solid $grey-5
  border-bottom: 1px solid $grey-5
  overflow-y: auto
</style>
