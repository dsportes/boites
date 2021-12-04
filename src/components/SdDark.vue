<template>
  <vue-showdown class="markdown-body" :markdown="texte" :key="texte" flavor="github" :options="{ emoji: true }" />
</template>
<script>
import { VueShowdown } from 'vue-showdown'
export default ({
  name: 'SdDark',

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
@import 'github-markdown-css/github-markdown-dark.css'
</style>
