<template>
  <q-card v-if="sessionok && tribu" class="q-pa-xs full-height full-width fs-md column">
    <div v-if="close" class="filler"/>

    <div v-if="state.t">
      <div class="row justify-between">
        <div class="titre-md">{{state.t.nbc}} compte(s) - {{state.lp.length}} parrain(s)</div>
        <q-btn flat dense size="sm" icon="chevron_right" :disable="state.lp.length===0" @click="ouvlp=true"/>
      </div>
    </div>

    <q-dialog v-model="ouvlp" full-height position="right">
      <q-card class="petitelargeur q-pa-sm">
        <q-toolbar class="bg-secondary text-white">
          <q-toolbar-title class="titre-lg">Parrains de la tribu</q-toolbar-title>
          <q-btn dense flat size="md" icon="chevron_right" @click="ouvlp=false"/>
        </q-toolbar>
        <fiche-avatar v-for="nap in state.lp" :key="nap.id" :na-avatar="nap" contacts groupes />
      </q-card>
    </q-dialog>

    <div class="titre-md q-mt-md">Commentaires / informations</div>
    <editeur-md :texte="state.t.info" v-model="info" @ok="changerInfo"
      label-ok="Valider" editable modetxt style="height:8rem"/>

    <div class="q-mt-md titre-lg">Volumes déjà attribuées aux comptes de la tribu</div>
    <div>
      <span class=q-mx-md>V1: {{ed1(state.t.f1)}}</span>
      <span>V2: {{ed2(state.t.f2)}}</span>
    </div>
    <div class="q-mt-md titre-lg">Réserves restantes de volumes à attribuer</div>
    <choix-forfaits v-model="reserves" @valider="changerRes" label-valider="Changer"
      :max="99999" :f1="state.t.r1" :f2="state.t.r2"/>

  <q-dialog v-if="sessionok" v-model="nvpar" persistent class="moyennelargeur">
    <nouveau-parrainage :close="fermerParrain" :tribu="tribu"/>
  </q-dialog>

  <div v-if="close" class="top full-width">
    <q-toolbar v-if="close" class="bg-primary text-white">
      <q-toolbar-title>
        <span class="titre-md q-mr-sm">Tribu</span>
        <titre-banner v-if="state.t" class-titre="titre-md" :titre="state.t.nom"
          :titre2="state.t.nom" :id-objet="state.t.id"/>
      </q-toolbar-title>
      <q-btn dense flat size="md" icon="chevron_right" @click="fermertribu"/>
    </q-toolbar>
  </div>

  <q-page-sticky v-if="!close" class="full-width" position="top-left" expand :offset="[50,0]">
    <q-toolbar class="bg-primary text-white">
      <q-btn :disable="!precedent" flat round dense icon="first_page" size="sm" @click="prec(0)" />
      <q-btn :disable="!precedent" flat round dense icon="arrow_back_ios" size="sm" @click="prec(1)" />
      <span class="fs-sm">{{index + 1}}/{{sur}}</span>
      <q-btn :disable="!suivant" flat round dense icon="arrow_forward_ios" size="sm" @click="suiv(1)" />
      <q-btn :disable="!suivant" flat round dense icon="last_page" size="sm" @click="suiv(0)" />
      <q-toolbar-title>
        <titre-banner v-if="state.t" class-titre="titre-md" :titre="state.t.nom"
          :titre2="state.t.nom" :id-objet="state.t.id"/>
      </q-toolbar-title>
      <q-btn dense color="secondary" label="Parrainer un nouveau compte" size="md"
        text-color="white" @click="nvpar = true"/>
    </q-toolbar>

  </q-page-sticky>
  </q-card>
</template>
<script>
import { computed, reactive, watch } from 'vue'
import { useStore } from 'vuex'
import { UNITEV1, UNITEV2 } from '../app/api.mjs'
import { edvol, NomAvatar } from '../app/util.mjs'
import { InforesTribu } from '../app/operations.mjs'
import ChoixForfaits from './ChoixForfaits.vue'
import EditeurMd from './EditeurMd.vue'
import TitreBanner from './TitreBanner.vue'
import FicheAvatar from './FicheAvatar.vue'
import NouveauParrainage from './NouveauParrainage.vue'

export default ({
  name: 'PanelTribu',

  components: { FicheAvatar, TitreBanner, ChoixForfaits, NouveauParrainage, EditeurMd },

  props: { suivant: Function, precedent: Function, index: Number, sur: Number, close: Function },

  computed: {
  },

  data () {
    return {
      nvpar: false,
      ouvlp: false,
      info: '',
      reserves: [0, 0]
    }
  },

  methods: {
    dkli (idx) { return this.$q.dark.isActive ? (idx ? 'sombre' + (idx % 2) : 'sombre0') : (idx ? 'clair' + (idx % 2) : 'clair0') },
    suiv (n) { if (this.suivant) this.suivant(n) },
    prec (n) { if (this.precedent) this.precedent(n) },
    ed1 (f) { return edvol(f * UNITEV1) },
    ed2 (f) { return edvol(f * UNITEV2) },
    ed3 (f) { return edvol(f) },
    fermerParrain () { this.nvpar = false },
    fermertribu () { if (this.close) this.close() },
    async changerInfo (info) {
      await new InforesTribu().run(this.tribu, info, null)
    },
    async changerRes (res) {
      await new InforesTribu().run(this.tribu, null, this.reserves)
    }
  },

  setup (props) {
    const $store = useStore()
    const sessionok = computed(() => { return $store.state.ui.sessionok })
    const tribu = computed({ // tribu courante
      get: () => $store.state.db.tribu,
      set: (val) => $store.commit('db/majtribu', val)
    })
    const avatartrform = computed({
      get: () => $store.state.ui.avatartrform,
      set: (val) => $store.commit('ui/majavatartrform', val)
    })

    const state = reactive({
      t: null,
      lp: []
    })

    function initState () {
      const t = tribu.value
      state.t = t
      const x = t && t.mncp ? Object.values(t.mncp) : []
      state.lp = []
      x.forEach(y => state.lp.push(new NomAvatar(y[0], y[1])))
    }

    watch(() => tribu.value, (ap, av) => {
      if (!sessionok.value) return
      initState()
    })

    initState()

    return {
      tribu,
      sessionok,
      avatartrform,
      state
    }
  }
})
</script>
<style lang="sass" scoped>
@import '../css/app.sass'
.bord1
  border:  1px solid $grey-5
.q-toolbar
  padding: 2px !important
  min-height: 0 !important
$haut: 3.5rem
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
</style>
