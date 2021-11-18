<template>
<div :class="taille === 2 ? 'page' + dlclass() : 'flow' + dlclass()">
  <div class="titre">{{titre}}</div>
  <div class="vide"></div>
  <div class="icons" >
    <q-icon v-if="taille===0" class="icon" name="zoom_in" @click="taille = 1"></q-icon>
    <q-icon v-if="taille>0" class="icon" name="zoom_out" @click="taille = 0"></q-icon>
    <q-icon v-if="taille===2" class="icon" name="fullscreen_exit" @click="taille = 1"></q-icon>
    <q-icon v-if="taille<2" class="icon" name="fullscreen" @click="taille = 2"></q-icon>
    <q-icon v-if="editable && md" class="icon" name="mode_edit" @click="md=false"></q-icon>
    <q-icon v-if="editable && !md" class="icon" name="visibility" @click="md=true"></q-icon>
    <q-btn v-if="btnok" class="icon" icon="check" label="OK" size="xs" dense push color="warning"
      @click="$emit('ok', modelValue)"></q-btn>
  </div>
  <textarea v-if="!md"
    :class="taclass()"
    :value="modelValue"
    @input="$emit('update:modelValue', $event.target.value)"/>
  <textarea v-if="md"
    :class="taclassmd()"
    :value="modelValue"
    @input="$emit('update:modelValue', $event.target.value)"/>
</div>
</template>
<script>
export default ({
  name: 'EditeurMd',

  components: {
  },

  props: {
    modelValue: String,
    titre: String,
    editable: Boolean,
    btnok: Boolean
  },

  emits: ['update:modelValue', 'ok'],

  data () {
    return {
      taille: 0,
      md: true
    }
  },

  computed: {
  },

  methods: {
    dlclass () { return this.$q.dark.isActive ? ' sombre' : ' clair' },
    taclass () {
      return (this.taille === 0 ? 'ta tas' : (this.taille === 1 ? 'ta tam' : 'ta tal')) + this.dlclass()
    },
    taclassmd () { return this.taclass() + ' tamd' }
  },

  setup () {
    return {
    }
  }
})
</script>
<style lang="sass" scoped>
@import '../css/input.sass'
$ht: 1.2rem
$htic: 1.5rem
$htz: 2.4rem
$htm: 7rem
.icons
  position: absolute
  top: 0
  right: 0
  cursor: pointer
.icon
  font-size: $htic
  position: relative
  top: -2px
.flow
  position: relative
.page
  position: fixed
  top: 0
  left: 0
  z-index: 2
  width: 100vw
.vide
  height: $htz
.tas
  height: $htz
  overflow: hidden
.tam
  height: $htm
  overflow-y: scroll
.tal
  height: 100vh
  overflow-y: scroll
.ta
  position: absolute
  top: $ht
  z-index: 2
  width: 100%
  border: 2px solid $warning
  margin: 0
  padding: 0
.tamd
  border: none !important
.titre
  height: $ht
  overflow: hidden
  border-bottom: 1px solid $gris
</style>
