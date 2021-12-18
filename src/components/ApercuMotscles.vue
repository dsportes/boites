<template>
  <span :class="'mc ' + (argsClick ? 'cursor-pointer' : '')" @click="clic()">{{ed}}
    <q-tooltip v-if="court">{{edl}}</q-tooltip>
  </span>
</template>
<script>
import { toRef } from 'vue'
export default ({
  name: 'ApercuMotscles',

  props: { motscles: Object, src: Object, court: Boolean, argsClick: Object },

  computed: {
    ed () { return this.motscles.edit(this.src, this.court) },
    edl () { return this.motscles.edit(this.src, false) }
  },

  methods: {
    clic () { if (this.argsClick) this.$emit('click-mc', this.argsClick) }
  },

  setup (props) {
    toRef(props, 'motscles')
    toRef(props, 'src')
    toRef(props, 'court')
    toRef(props, 'argsClick')
  }
})
</script>

<style lang="sass" scoped>
.mc
  font-family: 'Roboto Mono'
  font-size: 0.9rem
</style>
