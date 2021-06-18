<template>
    <q-input dense clearable v-model="locorg" @keydown.enter.prevent="validerorg"
        hint="Presser la touche 'Entrée' à la fin de la saisie"/>
</template>
<script>
export default ({
  name: 'ChoixOrg',
  props: ['initOrg'],
  data () {
    return {
      locorg: this.initorg
    }
  },

  methods: {
    validerorg () {
      this.$emit('choix-org', this.locorg)
    }
  }
})
</script>

<style lang="sass" scoped>
@import '../css/app.sass'
::v-deep(.q-field__bottom)
  font-size: 1.1rem
  font-weight: bold
  color: red
  font-style: italic
  bottom: 5px !important
::v-deep(.q-field__native)
  font-size: 1rem
  font-family: "Roboto Mono"
  font-weight: bold
  color: $primary !important
</style>
