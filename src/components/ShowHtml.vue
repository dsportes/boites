<template>
  <div v-if="!$q.dark.isActive">
    <sd-light class="markdown-body" :texte="texte"/>
  </div>
  <div v-else>
    <sd-dark class="markdown-body" :texte="texte"/>
  </div>
</template>
<script>
import SdLight from './SdLight.vue'
import SdDark from './SdDark.vue'
export default ({
  name: 'ShowHtml',

  components: { SdDark, SdLight },

  props: { texte: String }
})
</script>

<style lang="css" scoped>
.markdown-body {
  font-family:  Calibri-Light !important;
}
.markdown-body h1, .markdown-body h2 {
  font-family:  Comfortaa !important;
}
</style>
