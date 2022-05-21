<template>
<div>
  <div class="top bg-secondary text-white">
    <q-toolbar>
      <q-toolbar-title class="titre-lg">Tous les contacts</q-toolbar-title>
      <q-btn dense size="md" icon="close" @click="panelcontacts=false"/>
    </q-toolbar>
    <div class="row items-end">
      <q-radio v-model="opt" val="c" label="contient" />
      <q-radio v-model="opt" val="d" label="débute par" />
      <q-input v-model="txt" class="q-ml-lg" style="width:4rem" label="abc"/>
    </div>
  </div>
  <div class="filler"></div>
  <div v-for="ax in s.lst" :key="ax.na.id">{{ax.noml}}</div>
</div>
</template>

<script>
import { useStore } from 'vuex'
import { computed, reactive, watch, ref } from 'vue'
// import { data } from '../app/modeles.mjs'

export default ({
  name: 'PanelContacts',

  components: { },

  data () {
    return {
    }
  },

  methods: {
  },

  setup () {
    const $store = useStore()
    const opt = ref('c')
    const txt = ref('')
    const panelcontacts = computed({
      get: () => $store.state.ui.panelcontacts,
      set: (val) => $store.commit('ui/majpanelcontacts', val)
    })
    const tousAx = computed(() => { return $store.state.db.tousAx })
    const cvs = computed(() => { return $store.state.db.cvs })

    const s = reactive({
      blst: [],
      lst: []
    })

    function init1 () {
      const lst = []
      for (const id in tousAx.value) {
        const ax = tousAx.value[id]
        if (!ax.x) lst.push({ na: ax.na, c: ax.c, m: ax.m, noml: ax.na.noml })
      }
      lst.sort((a, b) => { return a.noml < b.noml ? -1 : (b.noml > a.noml ? 1 : 0) })
      s.blst = lst
    }

    function filtre () {
      const lst = []
      const c = opt.value === 'c'
      const t = txt.value
      s.blst.forEach(ax => {
        if (!t) {
          lst.push(ax)
        } else {
          if (c) {
            if (ax.noml.indexOf(t) !== -1) lst.push(ax)
          } else {
            if (ax.noml.startsWith(t)) lst.push(ax)
          }
        }
      })
      s.lst = lst
    }

    watch(() => tousAx.value, (ap, av) => { init1(); filtre() })
    watch(() => cvs.value, (ap, av) => { init1(); filtre() })
    watch(() => opt.value, (ap, av) => { filtre() })
    watch(() => txt.value, (ap, av) => { filtre() })

    init1()
    filtre()

    return {
      panelcontacts,
      opt,
      txt,
      s
    }
  }
})
</script>

<style lang="sass" scoped>
@import '../css/app.sass'
$haut: 10rem
$larg: 330px
.top
  position: absolute
  top: 0
  left: 0
  height: $haut
  width: $larg
  background-color: $secondary
.filler
  height: $haut
  width: 100%
</style>
