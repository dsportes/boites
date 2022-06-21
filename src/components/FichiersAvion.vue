<template>
<div class="fs-md">
  <div class="top bg-secondary text-white">
    <q-toolbar>
      <q-btn dense size="md" icon="chevron_left" @click="fichiersavion=false"/>
      <q-toolbar-title class="titre-lg full-width text-right q-pr-sm">Fichiers accessibles en mode avion</q-toolbar-title>
    </q-toolbar>
    <div class="column justify-center">
      <div class="row items-end">
        <q-radio v-model="opt" val="c" label="contient" />
        <q-radio v-model="opt" val="d" label="débute par" />
        <q-input v-model="txt" class="q-ml-lg" style="width:4rem" label="abc"/>
      </div>
    </div>
  </div>

  <div class="filler"></div>

  <div v-for="(ax, idx) in s.lst" :key="ax.na.id" :class="dkli(idx) + ' zone cursor-pointer full-width q-mb-sm'" @click="detail(ax)">
    <q-card class="row justify-start items-center">
      <img class="col-auto photomax q-mr-md" :src="ax.na.photoDef"/>
      <div class="col column">
        <div class="titre-md">{{ax.noml}}</div>
        <div class="fs-sm">
          <span v-if="ax.c.size" class="q-mr-sm">{{ax.c.size + (ax.c.size>1?' contacts':' contact')}}</span>
          <span v-if="ax.m.size">{{ax.m.size + (ax.m.size>1?' groupes':' groupe')}}</span>
        </div>
      </div>
    </q-card>
    <q-separator class="q-my-xs"/>
  </div>

  <q-dialog v-model="detaildial">
    <q-card class="shadow-8 petitelargeur">

    </q-card>
  </q-dialog>

</div>
</template>

<script>
import { useStore } from 'vuex'
import { computed, reactive, watch, ref } from 'vue'
import { data } from '../app/modele.mjs'
import { unpk } from '../app/util.mjs'

export default ({
  name: 'FichiersAvion',

  components: { },

  data () {
    return {
    }
  },

  methods: {
    dkli (idx) { return this.$q.dark.isActive ? (idx ? 'sombre' + (idx % 2) : 'sombre0') : (idx ? 'clair' + (idx % 2) : 'clair0') }
  },

  setup () {
    const $store = useStore()
    const opt = ref('c')
    const txt = ref('')
    const detaildial = ref(false)
    const fichiersavion = computed({
      get: () => $store.state.ui.fichiersavion,
      set: (val) => $store.commit('ui/majfichiersavion', val)
    })
    const avsecrets = computed(() => $store.state.ui.avsecrets)

    const mode = computed(() => $store.state.ui.mode)
    const avatar = computed({
      get: () => $store.state.db.avatar,
      set: (val) => $store.commit('db/majavatar', val)
    })

    const s = reactive({
      blst: []
    })

    function init1 () {
      const lst = []
      for (const pk in avsecrets.value) {
        const k = unpk(pk)
        const avs = avsecrets.value[pk]
        const sec = data.getSecrets(k.id, k.ns)
        lst.push({ sec, avs })
      }
      s.blst = lst
    }

    watch(() => fichiersavion.value, (ap, av) => {
      if (!ap) {
        detaildial.value = false
      }
    })

    init1()

    return {
      fichiersavion,
      opt,
      txt,
      s,
      avatar,
      mode,
      detaildial
    }
  }
})
</script>

<style lang="sass" scoped>
@import '../css/app.sass'
@import '../css/input.sass'
$haut: 5.5rem
$larg: 330px
.top
  position: absolute
  top: 0
  left: 0
  height: $haut
  width: $larg
  overflow: hidden
  background-color: $secondary
.filler
  height: $haut
  width: 100%
.q-toolbar
  padding: 2px !important
  min-height: 0 !important
.photomax
  margin-top: 4px
.q-card > div
  box-shadow: inherit !important
</style>
