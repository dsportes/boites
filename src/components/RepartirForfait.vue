<template>
  <q-card class="fs-md moyennelargeur">
    <div class="top bg-secondary text-white full-width">
      <q-toolbar class="q-px-xs">
        <q-btn dense flat size="md" icon="close" @click="fermerrf"/>
        <q-toolbar-title class="titre-lg full-width text-right q-mr-sm">Gestion des Forfaits</q-toolbar-title>
      </q-toolbar>
    </div>

    <div class="q-pa-sm scroll" style="max-height:100vh;">
      <div class="filler"></div>

      <q-card-actions align="right">
        <q-btn dense color="primary" label="Annuler" @click="reset"/>
        <q-btn dense color="warning" label="Valider" @click="valider"/>
      </q-card-actions>
    </div>

    <q-dialog v-if="sessionok" v-model="comptadial" full-height position="right">
      <panel-compta :cpt="s.cobj" :close="fermercompta"/>
    </q-dialog>

    <q-dialog v-if="sessionok" v-model="comptadial" full-height position="right">
      <panel-compta :cpt="s.cobj" :close="fermercompta"/>
    </q-dialog>

  </q-card>
</template>

<script>
import { useStore } from 'vuex'
import { computed, toRef, watch, reactive } from 'vue'
import PanelCompta from './PanelCompta.vue'
import { edvol, cfg, afficherdiagnostic } from '../app/util.mjs'
import { UNITEV1, UNITEV2 } from '../app/api.mjs'
import { RepartirForfait } from '../app/operations.mjs'
import { data } from '../app/modele.mjs'

const msg = `Une opération identique a été lancée en parrallèle depuis une autre session.
Les données d'après lesquelles vos mises à jour ont été établies ne sont plus pertinentes.
Recommencer vos attributions`

export default ({
  name: 'GererForfaits',

  components: { PanelCompta },

  props: { close: Function },

  computed: {
  },

  data () {
    return {
      comptadial: false
    }
  },

  methods: {
    ed0 (f) { return edvol(f) },
    ed1 (f) { return edvol(f * UNITEV1) },
    ed2 (f) { return edvol(f * UNITEV2) },
    fermercompta () { this.comptadial = false },

    async valider () {
      const ok = await new RepartirForfait().run()
      this.init()
      this.reset()
      if (!ok) afficherdiagnostic(msg)
    }
  },

  setup (props) {
    const lf = cfg().forfaits
    const codes = {}
    for (const code in lf) codes[lf[code]] = '-' + code

    function codeDe (v) { return codes[v] || '' }

    const $store = useStore()
    const close = toRef(props, 'close')
    const sessionok = computed(() => $store.state.ui.sessionok)
    const compte = computed(() => $store.state.db.compte)
    const comptas = computed(() => $store.state.db.compta)

    function fermerrf () {
      if (close.value) close.value()
    }

    const s = reactive({
      lst: [],
      t1: 0,
      t2: 0,
      tv1: 0,
      tv2: 0
    })

    function init () {
      const nas = compte.value.avatarNas()
      s.lst = []
      nas.forEach(na => {
        const id = na.id
        const compta = data.getCompta(id)
        const x = { c: compta.compteurs, na: na, t: compta.t }
        s.lst.push(x)
      })
      reset()
      s.lst.sort((a, b) => (a.t + a.na.nom) < (b.t + b.na.nom) ? -1 : ((a.t + a.na.nom) > (b.t + b.na.nom) ? 1 : 0))
      s.t1 = s.lst[0].c.f1 + s.lst[0].c.s1
      s.t2 = s.lst[0].c.f2 + s.lst[0].c.s2
      s.tv1 = 0; s.tv2 = 0
      s.lst.forEach(x => { s.tv1 += x.c.v1; s.tv2 += x.c.v2 })
    }

    function reset () {
      s.lst.forEach(x => { x.df1 = 0; x.df2 = 0 })
    }

    init()

    watch(() => sessionok.value, (ap, av) => {
      fermerrf()
    })

    watch(() => compte.value, (ap, av) => {
      init()
    })

    watch(() => comptas.value, (ap, av) => {
      init()
    })

    return {
      codeDe,
      sessionok,
      init,
      reset,
      s
    }
  }
})
</script>

<style lang="sass" scoped>
@import '../css/app.sass'
@import '../css/input.sass'
$haut: 2.5rem
.top
  position: absolute
  top: 0
  left: 0
  height: $haut
  overflow: hidden
  z-index: 2
.filler
  height: $haut
  width: 100%
.q-toolbar
  padding: 2px !important
  min-height: 0 !important
.q-card > div
  box-shadow: inherit !important
.bordn
  border-left: 3px solid transparent
  padding-left: 1rem
.bordw
  border-left: 3px solid $warning
  padding-left: 1rem
.itxt
  position: relative
  top: -0.3rem
</style>
