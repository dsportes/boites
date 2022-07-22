<template>
  <q-card class="fs-md moyennelargeur">
    <div class="top bg-secondary text-white full-width">
      <q-toolbar class="q-px-xs">
        <q-btn dense flat size="md" icon="close" @click="fermergf"/>
        <q-toolbar-title class="titre-lg full-width text-right q-mr-sm">Gestion des Forfaits</q-toolbar-title>
      </q-toolbar>
      <fiche-avatar :na-avatar="na"/>
    </div>

    <div class="q-pa-sm scroll" style="max-height:100vh;">
      <div class="filler"></div>
      <q-expansion-item header-class="bg-secondary text-white titre-md" :label="'À propos de la tribu ' + s.t.na.nom">

        <show-html v-if="s.t.info" class="height-4" :texte="s.t.info"/>
        <div v-else class="text-italic texte-center">(Pas de commentaires)</div>

        <div class="q-mt-md titre-md">Volumes déjà attribués aux {{s.t.nbc}} compte(s)</div>
        <div class="row items-center">
          <div class="col-3">V1 (textes)</div>
          <div class="col-3 text-center font-mono">{{pc1a}}</div>
          <div class="col-3 text-center font-mono">{{s.t.f1}}</div>
          <div class="col-3 text-center font-mono">{{ed1(s.t.f1)}}</div>
        </div>
        <div class="row items-center">
          <div class="col-3">V2 (fichiers)</div>
          <div class="col-3 text-center font-mono">{{pc2a}}</div>
          <div class="col-3 text-center font-mono">{{s.t.f2}}</div>
          <div class="col-3 text-center font-mono">{{ed1(s.t.f2)}}</div>
        </div>
        <div class="q-mt-md titre-md">Réserves attribuables</div>
        <div class="row items-center">
          <div class="col-3">V1 (textes)</div>
          <div class="col-3 text-center font-mono">{{pc1r}}</div>
          <div class="col-3 text-center font-mono">{{s.t.r1}}</div>
          <div class="col-3 text-center font-mono">{{ed1(s.t.r1)}}</div>
        </div>
        <div class="row items-center">
          <div class="col-3">V2 (fichiers)</div>
          <div class="col-3 text-center font-mono">{{pc2r}}</div>
          <div class="col-3 text-center font-mono">{{s.t.r2}}</div>
          <div class="col-3 text-center font-mono">{{ed1(s.t.r2)}}</div>
        </div>
      </q-expansion-item>

      <q-expansion-item class="q-mt-sm" header-class="bg-secondary text-white titre-md" :label="'Comptabilité de ' + na.nom">
        <panel-compta :cpt="s.cobj"/>
      </q-expansion-item>

      <div class="row q-mt-lg items-center">
        <span class="col-auto titre-md">Augmentation (+) ou réduction (-) du forfait pour V1 :</span>
        <q-input v-model.number="dv1" filled dense type="number" style="max-width: 5rem"/>
      </div>
      <div v-if="e1" class="fs-md text-bold bg-yellow text-negative full-width">{{e1}}</div>
      <div v-if="w1" class="fs-md text-bold text-warning full-width">{{w1}}</div>

      <div class="row q-mt-sm items-center">
        <span class="col-auto titre-md">Augmentation (+) ou réduction (-) du forfait pour V2 :</span>
        <q-input class="col-auto" v-model.number="dv2" filled dense type="number" style="max-width: 5rem"/>
      </div>
      <div v-if="e2" class="fs-md text-bold bg-yellow text-negative full-width">{{e2}}</div>
      <div v-if="w2" class="fs-md text-bold text-warning full-width">{{w2}}</div>
      <div v-if="wg" class="fs-md text-bold text-warning full-width">{{wg}}</div>

      <q-card-actions>
        <q-btn dense flat color="primary" :disable="dis" label="Annuler" @click="reset"/>
        <q-btn dense flat color="warning" :disable="dis" label="Valider" @click="valider"/>
      </q-card-actions>
    </div>
  </q-card>
</template>

<script>
import { useStore } from 'vuex'
import { computed, toRef, watch, reactive } from 'vue'
import FicheAvatar from './FicheAvatar.vue'
import PanelCompta from './PanelCompta.vue'
import ShowHtml from './ShowHtml.vue'
import { edvol } from '../app/util.mjs'
import { UNITEV1, UNITEV2 } from '../app/api.mjs'
// import { LectureChat, ResetChat } from '../app/operations.mjs'
// import { data } from '../app/modele.mjs'

export default ({
  name: 'GererForfaits',

  components: { FicheAvatar, PanelCompta, ShowHtml },

  props: { compta: Object, tribu: Object, estpar: Boolean, na: Object, close: Function },

  computed: {
    pc1a () { return Math.round((this.s.t.f1 * 100) / (this.s.t.f1 + this.s.t.r1)) + '%' },
    pc2a () { return Math.round((this.s.t.f2 * 100) / (this.s.t.f2 + this.s.t.r2)) + '%' },
    pc1r () { return Math.round((this.s.t.r1 * 100) / (this.s.t.f1 + this.s.t.r1)) + '%' },
    pc2r () { return Math.round((this.s.t.r2 * 100) / (this.s.t.f2 + this.s.t.r2)) + '%' },
    // eslint-disable-next-line no-unneeded-ternary
    dis () { return this.e1 || this.e2 || (!this.dv1 && !this.dv2) ? true : false }
  },

  watch: {
    dv1 (ap, av) { this.check1() },
    dv2 (ap, av) { this.check2() }
  },

  data () {
    return {
      dv1: 0, dv2: 0, e1: '', e2: '', w1: '', w2: '', wg: ''
    }
  },

  methods: {
    estC () { return this.compte.estComptable },
    ed1 (f) { return edvol(f * UNITEV1) },
    ed2 (f) { return edvol(f * UNITEV2) },
    fermergf () { if (this.close) this.close() },
    check1 () {
      const c = this.s.cobj.x
      const t = this.s.t
      this.e1 = ''; this.w1 = ''; this.wg = ''
      const a1 = c.f1 + this.dv1
      const y1 = a1 < 1
      const z1 = this.dv1 > t.r1
      if (y1) this.e1 = `L'allocation résultante ${a1} ne peut pas être inférieure à 1`
      if (!y1 && z1) this.e1 = `L'allocation supplémentaire de ${this.dv1} ne peut pas être supérieure à la réserve ${t.r1}`
      if (!this.e1) {
        const min1 = Math.ceil(c.v1c / UNITEV1)
        this.w1 = a1 >= min1 ? '' : `L'allocation résultante ${a1} ne couvre pas le volume déjà utilisé ${min1}`
      }
      this.wg = !this.w1 && !this.w2 ? '' : 'Le compte ne pourra plus ni créer de secrets ni augmenter le volume de ceux existants'
    },
    check2 () {
      const c = this.s.cobj.x
      const t = this.s.t
      this.e2 = ''; this.w2 = ''; this.wg = ''
      const a2 = c.f2 + this.dv2
      const y2 = a2 < 0
      const z2 = this.dv2 > t.r2
      if (y2) this.e2 = `L'allocation résultante ${a2} ne peut pas être inférieure à 0`
      if (!y2 && z2) this.e2 = `L'allocation supplémentaire de ${this.dv2} ne peut pas être supérieure à la réserve ${t.r2}`
      if (!this.e2) {
        const min2 = Math.ceil(c.v2c / UNITEV2)
        this.w2 = a2 >= min2 ? '' : `L'allocation résultante ${a2} est ne couvre pas le volume déjà utilisé ${min2}`
      }
      this.wg = !this.w1 && !this.w2 ? '' : 'Le compte ne pourra plus ni créer de secrets ni augmenter le volume de ceux existants'
    },
    valider () {
      console.log(this.dv1, this.dv2)
      // Appel de l'op. Au retour : this.init(compta, tribu) // les objets retournés
      this.reset()
    },
    reset () {
      this.dv1 = 0
      this.dv2 = 0
    }
  },

  setup (props) {
    const $store = useStore()
    const close = toRef(props, 'close')
    const compta = toRef(props, 'compta')
    const tribu = toRef(props, 'tribu')
    const na = toRef(props, 'na')
    const sessionok = computed(() => $store.state.ui.sessionok)
    const compte = computed(() => $store.state.db.compte)

    function fermergf () {
      if (close.value) close.value()
    }

    const s = reactive({ cobj: null, t: null })

    function init (compta, tribu) {
      s.t = tribu
      s.cobj = {
        x: compta.compteurs,
        av: {
          na: na,
          estPrimaire: compta.estPrimaire
        }
      }
    }

    init(compta.value, tribu.value)

    watch(() => sessionok.value, (ap, av) => {
      fermergf()
    })

    return {
      compte,
      init,
      s
    }
  }
})
</script>

<style lang="sass" scoped>
@import '../css/app.sass'
@import '../css/input.sass'
$haut: 6.5rem
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
</style>
