<template>
<div ref="root" id="toto" :class="('flow' + taille) + dlclass() + ' column justify start'">
  <div class="titre">{{titre}}</div>
  <!--div class="vide"></div-->
  <div class="icons" >
    <q-btn v-if="editable && !enedition" class="icon" label="Modifier" size="sm" dense push color="warning" @click="startEdit"></q-btn>
    <q-btn v-if="enedition" class="icon" icon="undo" size="sm" dense @click="undo"></q-btn>
    <q-btn v-if="enedition" class="icon" icon="check" :disable="!modifie" label="OK" size="sm" dense push color="warning"  @click="ok"></q-btn>
    <q-btn v-if="enedition" :disable="md" class="icon" icon="face" size="sm" dense @click="emoji=true"></q-btn>
    <q-btn v-if="taille!==0" class="icon" icon="zoom_out" size="sm" dense @click="taillefx = 0"></q-btn>
    <q-btn v-if="taille!==1" class="icon" icon="zoom_in" size="sm" dense @click="taillefx = 1"></q-btn>
    <q-btn v-if="taille!==2" class="icon" icon="fullscreen" size="sm" dense @click="taillefx = 2"></q-btn>
    <q-btn :disable="!md" class="icon" icon="mode_edit" size="sm" dense @click="md=false"></q-btn>
    <q-btn :disable="md" class="icon" icon="visibility" size="sm" dense @click="md=true"></q-btn>
  </div>
  <textarea v-if="!md" id="ta" :class="taclass() + ' col font-mono'" v-model="texte" :readonly="!enedition"/>
    <!-- @input="$emit('update:modelValue', $event.target.value)"/> -->
  <div v-if="md && !$q.dark.isActive" :class="taclass() + ' col'">
    <sd-light class="markdown-body" :texte="texte"/>
  </div>
  <div v-if="md && $q.dark.isActive" :class="taclass() + ' col'">
    <sd-dark class="markdown-body" :texte="texte"/>
  </div>
  <q-dialog v-model="emoji">
    <VuemojiPicker @emojiClick="emojiclick" data-source="emoji.json"/>
  </q-dialog>
</div>
</template>
<script>
import SdLight from './SdLight.vue'
import SdDark from './SdDark.vue'
import { VuemojiPicker } from 'vuemoji-picker'
import { ref } from 'vue'
import { affidbmsg } from '../app/util.mjs'

export default ({
  name: 'EditeurMd',

  components: { SdLight, SdDark, VuemojiPicker },

  props: {
    modelValue: String,
    titre: String,
    editable: Boolean,
    tailleInit: String
  },

  emits: ['ok'],

  computed: {
    modifie () { return this.texte !== this.modelValue },
    taille () {
      return this.taillefx === -1 ? (this.tailleInit ? parseInt(this.tailleInit) : 0) : this.taillefx
    }
  },

  data () {
    return {
      texte: this.modelValue,
      enedition: false,
      taillefx: -1,
      md: true,
      emoji: false
    }
  },

  methods: {
    ok () {
      this.$emit('ok', this.texte)
      this.enedition = false
    },
    undo () {
      this.texte = this.modelValue
      this.enedition = false
      this.md = true
    },
    startEdit () {
      this.enedition = true
      this.texte = this.modelValue
      this.md = false
    },
    dlclass () { return this.$q.dark.isActive ? ' sombre' : ' clair' },
    taclass () {
      return 'ta' + this.taille + this.dlclass() + (this.enedition ? ' borderw' : ' borderp')
    },
    emojiclick (emoji) {
      // console.log(JSON.stringify(emoji.emoji.shortcodes))
      // const code = ':' + emoji.emoji.shortcodes[0] + ':'
      const code = emoji.emoji.unicode
      const ta = this.root.querySelector('#ta')
      this.texte = ta.value.substring(0, ta.selectionStart) + code + ta.value.substring(ta.selectionEnd, ta.value.length)
      this.emoji = false
    }
  },

  setup () {
    const root = ref(null)
    affidbmsg('Quand Firefox est en mode privé, le premier affichage des emojis peut être long (plus d\'une minute)')
    return {
      root
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
$ht: 1.2rem
$htic: 1.5rem
$ht0: 50px
$ht1: 200px
.icons
  position: absolute
  top: -2px
  right: 0
  cursor: pointer
.icon
  font-size: $htic
  position: relative
  top: -2px
  margin-left: 2px
.flow0
  position: relative
  height: $ht0 !important
  padding:2px
  overflow: hidden
.flow1
  position: relative
  height: $ht1 !important
  padding:2px
  overflow: hidden
.flow2
  position: fixed
  top: 0
  left: 0
  z-index: 2
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
.titre
  height: $ht
  overflow: hidden
  border-bottom: 1px solid $gris
</style>
