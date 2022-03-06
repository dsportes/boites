<template>
  <q-card-section class="q-pt-none shadow-8 row justify-between w20">
    <q-select v-model="f1c" :options="options1" :disable="lecture" bottom-slots dense options-dense label="Forfait 1 (textes)" class="w10">
      <template v-slot:hint>Unité : 1 méga-octet</template>
    </q-select>
    <q-select v-model="f2c" :options="options2" :disable="lecture" bottom-slots dense options-dense label="Forfait 2 (fichiers attachés)" class="w10">
      <template v-slot:hint>Unité : 100 méga-octets</template>
    </q-select>
  </q-card-section>
  <q-card-section v-if="diag1 !== '' || diag2 !== ''">
    <div v-if="diag1 !== ''" class="text-warning text-bold">{{diag1}}</div>
    <div v-if="diag2 !== ''" class="text-warning text-bold">{{diag2}}</div>
  </q-card-section>
  <q-card-actions>
    <q-btn flat dense icon="undo" label="Annuler" @click="undo" :disable="!modif"/>
    <q-btn v-if="labelValider" flat dense color="warning" icon="check" :label="labelValider" @click="valider"
      :disable="!modif || diag1 !== '' || diag2 !== ''"/>
  </q-card-actions>
</template>
<script>
import { cfg } from '../app/util.mjs'
import { ref, toRef, watch } from 'vue'

export default ({
  name: 'ChoixForfaits',
  emits: ['update:modelValue', 'valider'],
  props: { modelValue: Array, lecture: Boolean, labelValider: String, f1: Number, f2: Number, v1: Number, v2: Number },

  data () {
    return {
    }
  },

  methods: {
  },

  setup (props, context) {
    const lf = cfg().forfaits
    const lecture = toRef(props, 'lecture')
    const options1 = []
    const options2 = []
    const mapf = { }
    const mapv = { }
    const f1 = toRef(props, 'f1') // valeurs sur l'élément
    const f2 = toRef(props, 'f2')
    const v1 = toRef(props, 'v1') // valeurs sur l'élément, volume min à couvrir
    const v2 = toRef(props, 'v2')

    const f1inp = ref(0) // valeurs avant édition
    const f2inp = ref(0)
    const f1c = ref(0) // valeurs courantes
    const f2c = ref(0)
    const modif = ref(false)
    const min1 = ref(0)
    const min2 = ref(0)
    const diag1 = ref('')
    const diag2 = ref('')

    function setOptions () {
      min1.value = v1.value ? Math.ceil(v1.value / 1000000) : 0
      min2.value = v2.value ? Math.ceil(v2.value / 100000000) : 0
      for (const f in lf) {
        const v = lf[f]
        if (v < min1.value) continue
        const l = f + ' [' + v + ']'
        options1.push(l)
        mapf[l] = v
        mapv[v] = l
      }
      options1.sort((a, b) => { return mapf[a] < mapf[b] ? -1 : (mapf[a] > mapf[b] ? 1 : 0) })
      let v = f1.value
      if (!mapv[v]) {
        const x = '[' + v + ']'
        options1.push(x)
        mapf[x] = v
        mapv[v] = x
      }
      f1inp.value = v

      for (const f in lf) {
        const v = lf[f]
        if (v < min2.value) continue
        const l = f + ' [' + v + ']'
        options2.push(l)
        mapf[l] = v
        mapv[v] = l
      }
      options1.sort((a, b) => { return mapf[a] < mapf[b] ? -1 : (mapf[a] > mapf[b] ? 1 : 0) })
      v = f2.value
      if (!mapv[v]) {
        const x = '[' + v + ']'
        options2.push(x)
        mapf[x] = v
        mapv[v] = x
      }
      f2inp.value = v
    }

    function initState () {
      f1c.value = mapv[f1.value]
      f2c.value = mapv[f2.value]
      f1inp.value = f1.value
      f2inp.value = f2.value
      modif.value = achange()
    }

    watch(f1, (ap, av) => { // quand f1 d'entrée change, f1c ne change pas si en édition
      setOptions()
      const x = mapf[f1c.value]
      if (x === f1inp.value && x !== ap) {
        // f1c n'était PAS modifié, ni égal à la nouvelle valeur : alignement sur la nouvelle valeur
        f1c.value = mapv[ap]
      }
      f1inp.value = ap
      modif.value = achange()
    })

    watch(f2, (ap, av) => { // quand f1 d'entrée change, f1c ne change pas si en édition
      setOptions()
      const x = mapf[f2c.value]
      if (x === f2inp.value && x !== ap) {
        // f1c n'était PAS modifié, ni égal à la nouvelle valeur : alignement sur la nouvelle valeur
        f2c.value = mapv[ap]
      }
      f2inp.value = ap
      modif.value = achange()
    })

    watch(f1c, (ap, av) => {
      modif.value = achange()
      if (!lecture.value) context.emit('update:modelValue', [mapf[f1c.value], mapf[f2c.value]])
    })

    watch(f2c, (ap, av) => {
      modif.value = achange()
      if (!lecture.value) context.emit('update:modelValue', [mapf[f1c.value], mapf[f2c.value]])
    })

    function valider () {
      if (!lecture.value) context.emit('valider', [mapf[f1c.value], mapf[f2c.value]])
    }

    function achange () {
      const x1 = mapf[f1c.value]
      const x2 = mapf[f2c.value]
      diag1.value = x1 < min1.value ? 'Le forfait 1 choisi (' + x1 + ') ne couvre pas le volume actuel (' + min1.value + ')' : ''
      diag2.value = x2 < min2.value ? 'Le forfait 2 choisi (' + x2 + ') ne couvre pas le volume actuel (' + min2.value + ')' : ''
      return x1 !== f1inp.value || x2 !== f2inp.value
    }

    function undo () {
      f1c.value = mapv[f1inp.value]
      f2c.value = mapv[f2inp.value]
    }

    setOptions()
    initState()

    return {
      undo,
      modif,
      valider,
      options1,
      options2,
      f1c,
      f2c,
      diag1,
      diag2
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
