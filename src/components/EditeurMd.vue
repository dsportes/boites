<template>
<div :class="modelValue.length > 6 ? 'page' + dlclass() : 'flow' + dlclass()">
  <div class="titre">{{titre}}</div>
  <div class="vide"></div>
  <textarea
    :class="taclass()"
    :value="modelValue"
    @input="$emit('update:modelValue', $event.target.value)"/>
  <!--
  <textarea :value="modelValue" @input="$emit('update:modelValue', $event.target.value)"/>
  -->
</div>
</template>
<script>
export default ({
  name: 'EditeurMd',

  components: {
  },

  props: ['modelValue', 'titre'],

  emits: ['update:modelValue'],

  data () {
    return {
    }
  },

  computed: {
  },

  methods: {
    dlclass () { return this.$q.dark.isActive ? ' sombre' : ' clair' },
    taclass () {
      return (this.modelValue.length <= 4 ? 'ta tas' : (this.modelValue.length <= 6 ? 'ta tam' : 'ta tal')) + this.dlclass()
    }
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
$htz: 2.4rem
$htm: 7rem
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
  border: none
  margin: 0
  padding: 0
.titre
  height: $ht
  overflow: hidden
  border-bottom: 1px solid $gris
</style>
