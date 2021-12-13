<template>
<div ref="root" :class="('flow' + taille) + dlclass + ' column justify start'">
  <q-toolbar>
    <q-btn :disable="taille===(tailleM?1:0)" class="icon" icon="zoom_out" size="md" dense flat push @click="taille=taille-1"></q-btn>
    <q-btn :disable="taille===2" class="icon" icon="zoom_in" size="md" push flat dense @click="taille=taille+1"></q-btn>
    <q-btn :disable="!md" class="icon" size="md" label="TXT" :color="md ? 'warning' : 'purple'" push flat dense @click="md=false"></q-btn>
    <q-btn :disable="md" class="icon" size="md" label="HTML" dense flat push @click="md=true"></q-btn>
    <q-btn v-if="editable" :disable="md" class="icon" icon="face" size="md" dense flat push @click="emoji=true"></q-btn>
    <q-btn v-if="modifie" class="icon" icon="undo" size="md" dense flat push @click="undo"></q-btn>
    <q-btn v-if="modifie && labelOk" class="icon" icon="check" :label="labelOk" size="md" dense flat push color="warning" @click="ok"></q-btn>
  </q-toolbar>
  <textarea v-if="!md" :class="taclass + ' font-mono'" v-model="textelocal" :readonly="!editable"/>
  <div v-else :class="taclass">
    <show-html class="markdown-body" :texte="textelocal"/>
  </div>
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

  props: { modelValue: String, texte: String, labelOk: String, editable: Boolean, tailleM: Boolean },

  computed: {
    dlclass () {
      return this.$q.dark.isActive ? ' sombre' : ' clair'
    },
    taclass () {
      return 'ta' + this.taille + ' col' + (this.$q.dark.isActive ? ' sombre' : ' clair') + (this.modifie ? ' borderw' : ' borderp')
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
      md: true,
      emoji: false
    }
  },

  methods: {
    ok () {
      this.$emit('ok', this.textelocal)
    },
    undo () {
      this.textelocal = this.texteinp
    },
    emojiclick (emoji) {
      // console.log(JSON.stringify(emoji.emoji.shortcodes))
      // const code = ':' + emoji.emoji.shortcodes[0] + ':'
      const code = emoji.emoji.unicode
      const ta = this.root.querySelector('textarea')
      this.textelocal = ta.value.substring(0, ta.selectionStart) + code + ta.value.substring(ta.selectionEnd, ta.value.length)
      this.emoji = false
    }
  },

  setup (props) {
    const root = ref(null)
    const taille = ref(0)
    const tailleM = toRef(props, 'tailleM')
    const textelocal = ref('') // en Ref parce que sa valeur dépend du changement de la prop texte ET de l'état d'édition
    const texte = toRef(props, 'texte') // pour pouvoir mettre un watch sur le changement de la propriété
    const texteinp = ref('') // dernière valeur source passée sur la prop 'texte'

    onMounted(() => { // initialisation de textelocal par défaut à texte
      textelocal.value = texte.value
      texteinp.value = texte.value
      taille.value = tailleM.value ? 1 : 0
    })

    watch(texte, (ap, av) => { // quand texte change, textelocal ne change pas si en édition
      // console.log('Texte : ' + ap + '\n' + av)
      if (textelocal.value === texteinp.value && textelocal.value !== ap) {
        // textelocal n'était PAS modifié, ni égal à la nouvelle valeur : alignement sur la nouvelle valeur
        textelocal.value = ap
      }
      texteinp.value = ap
    })

    affidbmsg('Quand Firefox est en mode privé, le premier affichage des emojis peut être long (plus d\'une minute)')

    return {
      root,
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
$ht0: 100px
$ht1: 200px
.q-toolbar
  padding: 2px 0 !important
  height: 25px !important
.icon
  margin-right: 8px
.flow0
  position: relative
  height: $ht0 !important
  padding: 2px
  overflow: hidden
.flow1
  position: relative
  height: $ht1 !important
  padding: 2px
  overflow: hidden
.flow2
  position: fixed
  top: 0
  left: 0
  z-index: 2000
  width: 100vw
  height: 100vh
  padding: 2px
.borderw
  border: 1px solid $warning
.borderp
  border: 1px solid $primary
.ta0, .ta1, .ta2
  width: 100%
  margin: 0
  padding: 2px
.ta0
  overflow-y: hidden
.ta1, .ta2
  overflow-y: scroll
</style>
