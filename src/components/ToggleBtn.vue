<template>
  <q-toggle class="tg" dense size="md"
      v-model="val"
      :color="color"
      :label="val === true ? lon : loff"
    />
</template>

<script>
import { watch, ref, toRef } from 'vue'

export default ({
  name: 'ToggleBtn',
  emits: ['change'],
  props: { args: Object, label: String, color: String, colorOff: String, labelOff: String, lecture: Boolean, src: Boolean },

  components: { },

  computed: {
    loff () { return this.labelOff || this.label || '' },
    lon () { return this.label || '' }
  },

  data () {
    return {
    }
  },

  methods: {
  },

  setup (props, context) {
    const src = toRef(props, 'src')
    const args = toRef(props, 'args')
    const lecture = toRef(props, 'lecture')
    const val = ref(src.value)
    watch(() => src.value, (ap, av) => { val.value = src.value })
    watch(() => val.value, (ap, av) => {
      if (!lecture.value && ap !== src.value) context.emit('change', { value: ap, args: args.value })
    })

    return {
      val
    }
  }
})
</script>

<style lang="sass" scoped>
@import '../css/app.sass'
</style>
