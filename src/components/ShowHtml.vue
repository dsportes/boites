<template>
  <div v-if="!$q.dark.isActive">
    <sd-light v-if="idx0" :texte="texte"/>
    <sd-light1 v-else :texte="texte"/>
  </div>
  <div v-else>
    <sd-dark v-if="idx0" :texte="texte"/>
    <sd-dark1 v-else :texte="texte"/>
  </div>
</template>
<script>
import SdLight from './SdLight.vue'
import SdDark from './SdDark.vue'
import SdLight1 from './SdLight1.vue'
import SdDark1 from './SdDark1.vue'
export default ({
  name: 'ShowHtml',

  components: { SdDark, SdLight, SdDark1, SdLight1 },

  props: { texte: String, idx: Number },

  computed: {
    idx0 () { return !this.idx || (this.idx % 2 === 0) }
  }
})
</script>

<style lang="css" scoped>
</style>
