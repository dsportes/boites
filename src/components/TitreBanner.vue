<template>
  <q-btn :class="clt" dense no-caps :label="titre">
    <q-popup-proxy transition-show="flip-up" transition-hide="flip-down">
      <q-banner inline-actions dense rounded>
        <q-icon size="sm" name="lightbulb" color="primary" />
        <span class="titre-sm q-mr-sm">{{titre2 || titre}}</span>
        <q-badge v-if="idObjet" color="primary">{{idObjet}}</q-badge>
        <template v-slot:action>
          <q-btn flat dense size="sm" icon="close" v-close-popup />
        </template>
      </q-banner>
    </q-popup-proxy>
  </q-btn>
</template>

<script>
export default ({
  name: 'TitreBanner',
  props: { classTitre: String, titre: String, titre2: String, idObjet: Number },
  data () {
    return {
      clt: this.classTitre || 'titre-md'
    }
  }
})
</script>

<style lang="sass" scoped>
@import '../css/app.sass'
.q-banner--dense
  padding: 2px !important
  min-height: 0 !important
  border: 1px solid $warning
</style>
