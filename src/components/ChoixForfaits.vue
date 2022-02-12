<template>
    <q-card-section class="q-pt-none shadow-8 row justify-between w20">
      <q-select v-model="f1" :options="options" bottom-slots dense options-dense label="Forfait 1 (textes)" class="w10">
        <template v-slot:hint>Unité : 1 méga-octet</template>
      </q-select>
      <q-select v-model="f2" :options="options" bottom-slots dense options-dense label="Forfait 2 (fichiers attachés)" class="w10">
        <template v-slot:hint>Unité : 100 méga-octets</template>
      </q-select>
    </q-card-section>
</template>
<script>
import { cfg } from '../app/util.mjs'
import { ref, toRef, watch } from 'vue'

export default ({
  name: 'ChoixForfaits',
  emits: ['update:modelValue'],
  props: { modelValue: Array },

  data () {
    return {
    }
  },

  methods: {
  },

  setup (props, context) {
    const lf = cfg().forfaits
    const options = []
    const mapf = { }
    const mapv = { }
    for (const f in lf) {
      const l = f + ' [' + lf[f] + ']'
      options.push(l)
      mapf[l] = lf[f]
      mapv[lf[f]] = l
    }
    options.sort((a, b) => { return mapf[a] < mapf[b] ? -1 : (mapf[a] > mapf[b] ? 1 : 0) })
    const f1 = ref(mapf[options[0]])
    const f2 = ref(mapf[options[0]])
    const ff = toRef(props, 'modelValue')
    if (ff.value && ff.value[0]) {
      const v = ff.value[0]
      if (!mapv[v]) {
        const x = '[' + v + ']'
        options.push(x)
        mapf[x] = v
        mapv[v] = x
      }
      f1.value = mapv[v]
    }
    if (ff.value && ff.value[1]) {
      const v = ff.value[1]
      if (!mapv[v]) {
        const x = '[' + v + ']'
        options.push(x)
        mapf[x] = v
        mapv[v] = x
      }
      f2.value = mapv[v]
    }
    watch(f1, (ap, av) => {
      context.emit('update:modelValue', [mapf[f1.value], mapf[f2.value]])
    })
    watch(f2, (ap, av) => {
      context.emit('update:modelValue', [mapf[f1.value], mapf[f2.value]])
    })
    return {
      options,
      f1,
      f2
    }
  }
})
</script>

<style lang="sass" scoped>
@import '../css/input.sass'
.w20
  width: 23rem
.w10
  width: 10rem
</style>
