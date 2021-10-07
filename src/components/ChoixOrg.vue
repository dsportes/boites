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
@import '../css/input.sass'
</style>
