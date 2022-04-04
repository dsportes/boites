<template>
<div v-if="sessionok" :class="$q.screen.gt.sm ? 'ml20' : 'q-pa-xs full-width'">
  <div v-if="!state.lst || !state.lst.length" class="titre-lg">Aucun couple ne correspond au critère de recherche</div>

  <panel-couple v-if="avatarcpform && state.lst && state.lst.length" :couple="couple"
      :suivant="state.idx < state.lst.length - 1 ? suiv : null"
      :precedent="state.idx > 0 ? prec : null"
      :index="state.idx" :sur="state.lst.length"/>

  <div v-if="!avatarcpform && state.lst && state.lst.length" class="col">
    <div v-for="(c, idx) in state.lst" :key="c.pkv"
      :class="dkli(idx) + ' zone full-width row items-start q-py-xs' + (idx === state.idx ? ' courant' : '')">
      <div class="row items-start full-width">
        <div class="col row cursor-pointer" @click="afficher(c, idx)">
          <img class="col-auto photomax" :src="photo(c)"/>
          <q-icon class="col-auto q-pa-xs" size="sm" :color="c.stx<2?'primary':'warning'" :name="icone(c.stp)"/>
          <div class="col-3 q-px-xs">{{nom(c)}}</div>
          <div class="col q-pr-xs">{{c.ard.substring(0,80)}}</div>
          <div class="col-auto fs-sm">{{dhstring(c.dh)}}</div>
        </div>

        <q-btn class="col-auto btnmenu" size="md" color="white" icon="menu" flat dense>
          <menu-couple :c="c" />
        </q-btn>
    </div>
      </div>
  </div>

  <q-dialog v-if="!$q.screen.gt.sm" v-model="avatarcprech" position="left">
    <panel-filtre-couples @ok="rechercher" :motscles="motscles" :etat-interne="recherche" :fermer="fermerfiltre"></panel-filtre-couples>
  </q-dialog>

  <q-page-sticky v-if="$q.screen.gt.sm" position="top-left" expand :offset="[5,5]">
    <panel-filtre-couples @ok="rechercher" :motscles="motscles" :etat-interne="recherche"></panel-filtre-couples>
  </q-page-sticky>

</div>
</template>
<script>
import { computed, reactive, watch, ref } from 'vue'
import { useStore } from 'vuex'
import { Motscles, FiltreCp, cfg, dhstring } from '../app/util.mjs'
import PanelFiltreCouples from './PanelFiltreCouples.vue'
import PanelCouple from './PanelCouple.vue'
import MenuCouple from './MenuCouple.vue'
import { data } from '../app/modele.mjs'

export default ({
  name: 'TabCouples',

  components: { PanelFiltreCouples, PanelCouple, MenuCouple },

  computed: { },

  data () {
    return {
      dhstring: dhstring
    }
  },

  methods: {
    fermerfiltre () { this.avatarcprech = false },

    rechercher (f) { this.state.filtre = f },

    dkli (idx) { return this.$q.dark.isActive ? (idx ? 'sombre' + (idx % 2) : 'sombre0') : (idx ? 'clair' + (idx % 2) : 'clair0') }
  },

  setup () {
    const phdef = cfg().couple
    const $store = useStore()
    const editcp = ref(false)
    const sessionok = computed(() => { return $store.state.ui.sessionok })

    const prefs = computed(() => { return $store.state.db.prefs })
    const avatar = computed(() => { return $store.state.db.avatar })
    const mode = computed(() => $store.state.ui.mode)
    const couple = computed({ // couple courant
      get: () => $store.state.db.couple,
      set: (val) => $store.commit('db/majcouple', val)
    })
    const avatarcprech = computed({
      get: () => $store.state.ui.avatarcprech,
      set: (val) => $store.commit('ui/majavatarcprech', val)
    })
    const avatarcpform = computed({
      get: () => $store.state.ui.avatarcpform,
      set: (val) => $store.commit('ui/majavatarcpform', val)
    })

    const couples = computed(() => { return avatar.value ? data.getCouple() : [] })
    const cvs = computed(() => { return $store.state.db.cvs })

    const mc = reactive({ categs: new Map(), lcategs: [], st: { enedition: false, modifie: false } })
    const motscles = new Motscles(mc, 1, null)
    motscles.recharger()

    const recherche = reactive({ // doit correspondre au Filtre par défaut
      a: new FiltreCp().etat(),
      p: new FiltreCp().etat()
    })

    watch(() => prefs.value, (ap, av) => { motscles.recharger() })

    function getCouples () {
      const avi = avatar.value.id
      const f = state.filtre
      f.debutFiltre()
      const lst = []
      for (const id in couples.value) {
        const cp = couples.value[id]
        if (cp.idI === avi && f.filtre(cp)) lst.push(cp)
      }
      state.lst = lst
    }

    function trier () {
      const l = []; state.lst.forEach(x => l.push(x))
      l.sort((a, b) => state.filtre.fntri(a, b))
      state.lst = l
    }

    function indexer () {
      state.idx = -1
      if (couple.value) state.lst.forEach((x, n) => { if (x.id === couple.value.id) state.idx = n })
      if (state.idx === -1) {
        if (state.lst.length) {
          state.idx = 0; couple.value = state.lst[0]
        } else {
          couple.value = null
        }
      }
    }

    function latotale () {
      if (!sessionok.value) return
      getCouples()
      trier()
      indexer()
    }

    function photo (c) {
      const cv = cvs.value[c.id]
      if (cv && cv[0]) return cv[0]
      const cvE = c.idE && cvs.value[c.idE]
      if (cvE && cvE[0]) return cvE[0]
      return phdef
    }

    function nom (c) { return c.naE ? c.naE.noml : c.na.nom }

    function icone (p) {
      return ['thumb_up', 'hourglass_empty', 'thumb_down', 'thumb_up', 'o_thumb_down'][p]
    }

    const evtfiltresecrets = computed({ // secret courant
      get: () => $store.state.ui.evtfiltresecrets,
      set: (val) => $store.commit('ui/majevtfiltresecrets', val)
    })

    const state = reactive({
      lst: [], // array des Couples répondant au filtre
      idx: 0, // index du couple courant dans la liste
      filtre: new FiltreCp() // Filtre par défaut
    })

    latotale()

    watch(() => state.filtre, (filtre, filtreavant) => {
      if (!filtre || !filtreavant || filtre.equal(filtreavant)) return
      const chg = filtre.changement(filtreavant)
      if (chg >= 2) {
        latotale()
      }
      if (chg >= 1) {
        trier()
        indexer()
      }
    })

    watch(() => avatar.value, (ap, av) => {
      latotale()
    })

    watch(() => couples.value, (ap, av) => {
      latotale()
    })

    watch(() => couple.value, (ap, av) => {
      indexer()
    })

    watch(() => cvs.value, (ap, av) => {
      latotale()
    })

    watch(() => sessionok.value, (ap, av) => {
    })

    /*
    function afficher (c, idx) {
      couple.value = c
      state.idx = idx
      avatarcpform.value = true
    }
    */
    function suiv (n) {
      if (state.idx < state.lst.length - 1) state.idx = n ? state.idx + 1 : state.lst.length - 1
      couple.value = state.lst[state.idx]
    }

    function prec (n) {
      if (state.idx > 0) state.idx = n ? state.idx - 1 : 0
      couple.value = state.lst[state.idx]
    }

    return {
      suiv,
      prec,
      // afficher,
      sessionok,
      photo,
      nom,
      icone,
      editcp,
      avatar,
      couple,
      motscles,
      state,
      recherche,
      mode,
      evtfiltresecrets,
      avatarcprech,
      avatarcpform
    }
  }

})
</script>

<style lang="sass" scoped>
@import '../css/app.sass'
.courant
  border-left: 4px solid $warning !important
.ml20
  width: 100%
  padding: 0.2rem 0.2rem 0.2rem 23rem
.btnmenu
  position: relaive
  top: -6px
.photomax
  position: relative
  top: 3px
</style>
