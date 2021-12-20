<template>
  <vue-showdown class="markdown-body" :markdown="texte" flavor="github" :options="{ emoji: true }" />
</template>
<script>
import { VueShowdown } from 'vue-showdown'
export default ({
  name: 'SdLight',

  components: { VueShowdown },

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
.markdown-body { color: black; background-color: white; }
@import 'github-markdown-css/github-markdown-light.css'
</style>
