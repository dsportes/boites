<template>
  <q-card class="fs-md moyennelargeur">
    <div class="top bg-secondary text-white full-width">
      <q-toolbar class="q-px-xs">
        <q-btn dense flat size="md" icon="close" @click="fermergf"/>
        <q-toolbar-title class="titre-lg full-width text-right q-mr-sm">Gestion des Forfaits</q-toolbar-title>
      </q-toolbar>
    </div>

    <div class="q-pa-sm scroll" style="max-height:100vh;">
      <div class="filler"></div>
      <fiche-avatar :na-avatar="na"/>
      <q-btn flat dense color="primary" label="voir sa comptabilité" @click="comptadial=true"/>

      <div class="q-mt-md bg-secondary text-white titre-md" :label="'Compteurs de la tribu ' + s.t.na.nom"/>

      <show-html v-if="s.t.info" class="height-4" :texte="s.t.info"/>
      <div v-else class="text-italic texte-center">(Pas de commentaires)</div>

      <div class="q-mt-md titre-md">Forfaits déjà attribués aux comptes ({{s.t.nbc}}) / total alloué à la tribu</div>

      <div class="row items-center">
        <div :class="cl1">V1 (textes)</div>
        <div class="col-3 text-center font-mono">{{f1f}}</div>
        <div class="col-3 text-center font-mono">{{ed1(f1f)}}</div>
        <div class="col-3 text-center font-mono">
          <q-knob v-if="dis1" readonly  show-value font-size="0.7rem" v-model="pc1a" size="30px" :thickness="0.22" color="warning" track-color="grey-3">{{pc1a}}%</q-knob>
        </div>
      </div>
      <div class="row items-center">
        <div :class="cl2">V2 (fichiers)</div>
        <div class="col-3 text-center font-mono">{{f2f}}</div>
        <div class="col-3 text-center font-mono">{{ed1(f2f)}}</div>
        <div class="col-3 text-center font-mono">
          <q-knob v-if="dis2" readonly  show-value font-size="0.7rem" v-model="pc2a" size="30px" :thickness="0.22" color="warning" track-color="grey-3">{{pc2a}}%</q-knob>
        </div>
      </div>
      <div class="q-mt-md titre-md">Réserves attribuables / total alloué à la tribu</div>
      <div class="row items-center">
        <div :class="cl1">V1 (textes)</div>
        <div class="col-3 text-center font-mono">{{r1f}}</div>
        <div class="col-3 text-center font-mono">{{ed1(r1f)}}</div>
        <div class="col-3 text-center font-mono">
          <q-knob v-if="dis1" readonly  show-value font-size="0.7rem" v-model="pc1r" size="30px" :thickness="0.22" color="warning" track-color="grey-3">{{pc1r}}%</q-knob>
        </div>
      </div>
      <div class="row items-center">
        <div :class="cl2">V2 (fichiers)</div>
        <div class="col-3 text-center font-mono">{{r2f}}</div>
        <div class="col-3 text-center font-mono">{{ed2(r2f)}}</div>
        <div class="col-3 text-center font-mono">
          <q-knob v-if="dis2" readonly  show-value font-size="0.7rem" v-model="pc2r" size="30px" :thickness="0.22" color="warning" track-color="grey-3">{{pc2r}}%</q-knob>
        </div>
      </div>
      <div class="q-mt-md titre-md">Forfaits du compte / total alloué à la tribu</div>
      <div class="row items-center">
        <div :class="cl1">V1 (textes)</div>
        <div class="col-3 text-center font-mono">{{a1}}</div>
        <div class="col-3 text-center font-mono">{{ed1(a1)}}</div>
        <div class="col-3 text-center font-mono">
          <q-knob v-if="dis1" readonly  show-value font-size="0.7rem" v-model="ct1" size="30px" :thickness="0.22" color="warning" track-color="grey-3">{{ct1}}%</q-knob>
        </div>
      </div>
      <div class="row items-center">
        <div :class="cl2">V2 (fichiers)</div>
        <div class="col-3 text-center font-mono">{{a2}}</div>
        <div class="col-3 text-center font-mono">{{ed1(a2)}}</div>
        <div class="col-3 text-center font-mono">
          <q-knob v-if="dis2" readonly  show-value font-size="0.7rem" v-model="ct2" size="30px" :thickness="0.22" color="warning" track-color="grey-3">{{ct2}}%</q-knob>
        </div>
      </div>
      <div class="q-mt-md titre-md">Volumes actuellement utilisés du compte / ses forfaits</div>
      <div class="row items-center">
        <div :class="cl1">V1 (textes)</div>
        <div class="col-3 text-center font-mono"></div>
        <div class="col-3 text-center font-mono">{{ed1(this.s.cobj.x.v1c)}}</div>
        <div class="col-3 text-center font-mono">
          <q-knob v-if="dis1" readonly  show-value font-size="0.7rem" v-model="vf1" size="30px" :thickness="0.22" color="warning" track-color="grey-3">{{vf1}}%</q-knob>
        </div>
      </div>
      <div class="row items-center">
        <div :class="cl2">V2 (fichiers)</div>
        <div class="col-3 text-center font-mono"></div>
        <div class="col-3 text-center font-mono">{{ed1(this.s.cobj.x.v2c)}}</div>
        <div class="col-3 text-center font-mono">
          <q-knob v-if="dis2" readonly  show-value font-size="0.7rem" v-model="vf2" size="30px" :thickness="0.22" color="warning" track-color="grey-3">{{vf2}}%</q-knob>
        </div>
      </div>

      <div class="row q-mt-lg items-center">
        <span class="col-auto titre-md q-mr-xs">Augmenter (+) / réduire (-) le forfait V1</span>
        <q-input v-model.number="dv1" filled dense type="number" style="max-width: 4rem"/>
        <span class="q-ml-xs text-bold font-mono fs-md">{{b1}}</span>
        <span class="q-ml-xs text-bold font-mono fs-md">{{codeDe(b1)}}</span>
      </div>
      <div v-if="e1" class="fs-md text-bold bg-yellow text-negative full-width">{{e1}}</div>
      <div v-if="r1" class="fs-md text-bold bg-yellow text-negative full-width">{{r1}}</div>
      <div v-if="w1" class="fs-md text-bold text-warning full-width">{{w1}}</div>

      <div class="row q-mt-sm items-center">
        <span class="col-auto titre-md q-mr-xs">Augmenter (+) / réduire (-) le forfait V2</span>
        <q-input class="col-auto" v-model.number="dv2" filled dense type="number" style="max-width: 4rem"/>
        <span class="q-ml-xs text-bold font-mono fs-md">{{b2}}</span>
        <span class="q-ml-xs text-bold font-mono fs-md">{{codeDe(b2)}}</span>
      </div>
      <div v-if="e2" class="fs-md text-bold bg-yellow text-negative full-width">{{e2}}</div>
      <div v-if="r2" class="fs-md text-bold bg-yellow text-negative full-width">{{r2}}</div>
      <div v-if="w2" class="fs-md text-bold text-warning full-width">{{w2}}</div>
      <div v-if="wg" class="fs-md text-bold text-warning full-width">{{wg}}</div>

      <q-card-actions>
        <q-btn dense color="primary" label="Annuler" @click="reset"/>
        <q-btn dense color="warning" :disable="dis" label="Valider" @click="valider"/>
      </q-card-actions>
    </div>

    <q-dialog v-if="sessionok" v-model="comptadial" full-height position="right">
      <panel-compta :cpt="s.cobj" :close="fermercompta"/>
    </q-dialog>

  </q-card>
</template>

<script>
import { useStore } from 'vuex'
import { computed, toRef, watch, reactive } from 'vue'
import FicheAvatar from './FicheAvatar.vue'
import ShowHtml from './ShowHtml.vue'
import PanelCompta from './PanelCompta.vue'
import { edvol, cfg } from '../app/util.mjs'
import { UNITEV1, UNITEV2 } from '../app/api.mjs'
// import { LectureChat, ResetChat } from '../app/operations.mjs'

export default ({
  name: 'GererForfaits',

  components: { FicheAvatar, ShowHtml, PanelCompta },

  props: { compta: Object, tribu: Object, estpar: Boolean, na: Object, close: Function },

  computed: {
    cl1 () { return this.dv1 ? 'col-3 bordw' : 'col-3 bordn' },
    cl2 () { return this.dv2 ? 'col-3 bordw' : 'col-3 bordn' },
    f1f () { return this.s.t.f1 + this.dv1 },
    f2f () { return this.s.t.f2 + this.dv2 },
    r1f () { return this.s.t.r1 - this.dv1 },
    r2f () { return this.s.t.r2 - this.dv2 },
    tt1 () { return this.s.t.f1 + this.s.t.r1 },
    tt2 () { return this.s.t.f2 + this.s.t.r2 },
    ct1 () { return Math.round(100 * this.a1 / this.tt1) },
    ct2 () { return Math.round(100 * this.a2 / this.tt2) },
    vf1 () { return Math.round(100 * this.s.cobj.x.v1c / this.f1f) },
    vf2 () { return Math.round(100 * this.s.cobj.x.v2c / this.f2f) },
    pc1a () { return Math.round((this.f1f * 100) / this.tt1) },
    pc2a () { return Math.round((this.f2f * 100) / this.tt2) },
    pc1r () { return Math.round((this.r1f * 100) / this.tt1) },
    pc2r () { return Math.round((this.r2f * 100) / this.tt2) },
    // eslint-disable-next-line no-unneeded-ternary
    dis () { return this.e1 || this.e2 || this.r1 || this.r2 || (!this.dv1 && !this.dv2) ? true : false },
    // eslint-disable-next-line no-unneeded-ternary
    dis1 () { return this.e1 || this.r1 ? false : true },
    // eslint-disable-next-line no-unneeded-ternary
    dis2 () { return this.e2 || this.r2 ? false : true },
    a1 () { return this.s.cobj.x.f1 + this.s.cobj.x.s1 + this.dv1 },
    a2 () { return this.s.cobj.x.f2 + this.s.cobj.x.s2 + this.dv2 },
    b1 () { return this.s.cobj.x.f1 + this.dv1 },
    b2 () { return this.s.cobj.x.f2 + this.dv2 },
    y1 () { return this.a1 < 1 },
    y2 () { return this.a2 < 0 },
    z1 () { return this.dv1 > this.s.t.r1 },
    z2 () { return this.dv2 > this.s.t.r2 },
    e1 () { return !this.y1 ? '' : 'L\'allocation résultante ne peut pas être inférieure à 1' },
    e2 () { return !this.y2 ? '' : 'L\'allocation résultante ne peut pas être inférieure à 0' },
    r1 () { return !this.z1 ? '' : 'L\'allocation supplémentaire ne peut pas être supérieure à la réserve' },
    r2 () { return !this.z2 ? '' : 'L\'allocation supplémentaire ne peut pas être supérieure à la réserve' },
    min1 () { return Math.ceil(this.s.cobj.x.v1c / UNITEV1) },
    min2 () { return Math.ceil(this.s.cobj.x.v2c / UNITEV2) },
    w1 () { return this.e1 || this.r1 || this.a1 >= this.min1 ? '' : 'L\'allocation résultante ne couvre pas le volume déjà utilisé' },
    w2 () { return this.e2 || !this.r2 || this.a2 >= this.min2 ? '' : 'L\'allocation résultante ne couvre pas le volume déjà utilisé' },
    wg () { return this.w1 || this.w2 ? 'Le compte ne pourra plus ni créer de secrets ni augmenter le volume de ceux existants' : '' }
  },

  watch: {
  },

  data () {
    return {
      dv1: 0,
      dv2: 0,
      comptadial: false
    }
  },

  methods: {
    fermercompta () { this.comptadial = false },
    estC () { return this.compte.estComptable },
    ed0 (f) { return edvol(f) },
    ed1 (f) { return edvol(f * UNITEV1) },
    ed2 (f) { return edvol(f * UNITEV2) },
    fermergf () { if (this.close) this.close() },
    valider () {
      console.log(this.b1, this.b2)
      // Appel de l'op. Au retour : this.init(compta, tribu) // les objets retournés
      this.reset()
    },
    reset () {
      this.dv1 = 0
      this.dv2 = 0
    }
  },

  setup (props) {
    const lf = cfg().forfaits
    const codes = {}
    for (const code in lf) codes[lf[code]] = code

    function codeDe (v) { return codes[v] || '' }

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
      codeDe,
      sessionok,
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
  border-bottom: 2px solid transparent
.bordw
  border-bottom: 2px solid $warning
</style>
