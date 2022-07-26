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

      <div class="q-mt-md titre-md">Forfaits de la tribu déjà attribués à {{s.t.nbc}} compte(s) / total alloué à la tribu</div>

      <div class="row items-center">
        <div :class="cl1">V1 (textes)</div>
        <div class="col-3 text-center font-mono">{{f1f}}</div>
        <div class="col-3 text-center font-mono">{{ed1(f1f)}}</div>
        <div class="col-3 text-center font-mono">
          <q-knob readonly  show-value font-size="0.7rem" v-model="pc1a" size="30px" :thickness="0.22" color="warning" track-color="grey-3">{{pc1a}}%</q-knob>
        </div>
      </div>
      <div class="row items-center">
        <div :class="cl2">V2 (fichiers)</div>
        <div class="col-3 text-center font-mono">{{f2f}}</div>
        <div class="col-3 text-center font-mono">{{ed1(f2f)}}</div>
        <div class="col-3 text-center font-mono">
          <q-knob readonly  show-value font-size="0.7rem" v-model="pc2a" size="30px" :thickness="0.22" color="warning" track-color="grey-3">{{pc2a}}%</q-knob>
        </div>
      </div>

      <div class="q-mt-md titre-md">Réserves de la tribu / total alloué à la tribu</div>
      <div class="row items-center">
        <div :class="cl1">V1 (textes)</div>
        <div class="col-3 text-center font-mono">{{r1f}}</div>
        <div class="col-3 text-center font-mono">{{ed1(r1f)}}</div>
        <div class="col-3 text-center font-mono">
          <q-knob readonly  show-value font-size="0.7rem" v-model="pc1r" size="30px" :thickness="0.22" color="warning" track-color="grey-3">{{pc1r}}%</q-knob>
        </div>
      </div>
      <div class="row items-center">
        <div :class="cl2">V2 (fichiers)</div>
        <div class="col-3 text-center font-mono">{{r2f}}</div>
        <div class="col-3 text-center font-mono">{{ed2(r2f)}}</div>
        <div class="col-3 text-center font-mono">
          <q-knob readonly  show-value font-size="0.7rem" v-model="pc2r" size="30px" :thickness="0.22" color="warning" track-color="grey-3">{{pc2r}}%</q-knob>
        </div>
      </div>

      <div class="q-mt-md titre-md">Forfaits de l'avatar primaire / taux d'occupatin actuel</div>
      <div class="row items-center">
        <div :class="cl1">V1 (textes)</div>
        <div class="col-3 text-center font-mono">{{b1}}</div>
        <div class="col-3 text-center font-mono">{{ed1(b1)}}</div>
        <div class="col-3 text-center font-mono">
          <q-knob readonly  show-value font-size="0.7rem" v-model="bt1" size="30px" :thickness="0.22" color="warning" track-color="grey-3">{{bt1}}%</q-knob>
        </div>
      </div>
      <div class="row items-center">
        <div :class="cl2">V2 (fichiers)</div>
        <div class="col-3 text-center font-mono">{{b2}}</div>
        <div class="col-3 text-center font-mono">{{ed1(b2)}}</div>
        <div class="col-3 text-center font-mono">
          <q-knob readonly  show-value font-size="0.7rem" v-model="bt2" size="30px" :thickness="0.22" color="warning" track-color="grey-3">{{bt2}}%</q-knob>
        </div>
      </div>

      <div class="q-mt-md titre-md">Forfaits tous avatars du compte / % d'occupation / % du total de la tribu</div>
      <div class="row items-center">
        <div :class="cl1">V1 (textes)</div>
        <div class="col-3 text-center font-mono">{{a1}}</div>
        <div class="col-3 text-center font-mono">{{ed1(a1)}}</div>
        <div class="col-3 text-center font-mono">
          <q-knob readonly  show-value font-size="0.7rem" v-model="vf1" size="30px" :thickness="0.22" color="warning" track-color="grey-3">{{vf1}}%</q-knob>
          <q-knob class="q-l-sm" readonly  show-value font-size="0.7rem" v-model="ct1" size="30px" :thickness="0.22" color="warning" track-color="grey-3">{{ct1}}%</q-knob>
        </div>
      </div>
      <div class="row items-center">
        <div :class="cl2">V2 (fichiers)</div>
        <div class="col-3 text-center font-mono">{{a2}}</div>
        <div class="col-3 text-center font-mono">{{ed1(a2)}}</div>
        <div class="col-3 text-center font-mono">
          <q-knob readonly  show-value font-size="0.7rem" v-model="vf2" size="30px" :thickness="0.22" color="warning" track-color="grey-3">{{vf2}}%</q-knob>
          <q-knob class="q-l-sm" readonly  show-value font-size="0.7rem" v-model="ct2" size="30px" :thickness="0.22" color="warning" track-color="grey-3">{{ct2}}%</q-knob>
        </div>
      </div>

      <div class="row q-mt-lg items-center">
        <span v-if="this.dv1 > 0" class="titre-md">Augmentation de {{this.dv1}} du forfait V1 :</span>
        <span v-if="this.dv1 < 0" class="titre-md">Réduction de {{-this.dv1}} du forfait V1 :</span>
        <span v-if="this.dv1 === 0" class="titre-md">Forfait V1 inchangé :</span>
        <span class="q-ml-xs text-bold titre-md">{{b1}}</span>
        <span class="q-ml-xs text-bold titre-md">{{codeDe(b1)}}</span>
        <info-txt class="q-ml-sm itxt" :label="'[' + mi1 + '...' + mx1 +']'" info="...réserve de la tribu moins les forfaits distribués aux autres avatars du compte, au plus 255"/>
      </div>
      <div class="row no-wrap items-center">
        <q-btn class="q-mr-xs col-auto" dense :disable="dv1<=mi1" size="sm" color="primary" icon="remove_circle" @click="dv1--"/>
        <q-btn class="q-mr-sm col-auto" dense :disable="dv1>=mx1" size="sm" color="primary" icon="add_circle" @click="dv1++"/>
        <q-slider class="col" v-model="dv1" label :min="mi1" :max="mx1"/>
      </div>
      <div v-if="w1" class="fs-md text-bold text-warning full-width">{{w1}}</div>

      <div class="row q-mt-sm items-center">
        <span v-if="this.dv2 > 0" class="titre-md">Augmentation de {{this.dv2}} du forfait V2 :</span>
        <span v-if="this.dv2 < 0" class="titre-md">Réduction de {{-this.dv2}} du forfait V2 :</span>
        <span v-if="this.dv2 === 0" class="titre-md">Forfait V2 inchangé :</span>
        <span class="q-ml-xs text-bold titre-md">{{b2}}</span>
        <span class="text-bold titre-md">{{codeDe(b2)}}</span>
        <info-txt class="q-ml-sm itxt" :label="'[' + mi2 + '...' + mx2 +']'" info="...réserve de la tribu moins les forfaits distribués aux autres avatars du compte, au plus 255"/>
      </div>
      <div class="row no-wrap items-center">
        <q-btn class="q-mr-xs col-auto" dense :disable="dv2<=mi2" size="sm" color="primary" icon="remove_circle" @click="dv2--"/>
        <q-btn class="q-mr-sm col-auto" dense :disable="dv2>=mx2" size="sm" color="primary" icon="add_circle" @click="dv2++"/>
        <q-slider class="col" v-model="dv2" label :min="mi2" :max="mx2"/>
      </div>
      <div v-if="w2" class="fs-md text-bold text-warning full-width">{{w2}}</div>
      <div v-if="wg" class="fs-md text-bold text-warning full-width">{{wg}}</div>

      <q-card-actions align="right">
        <q-btn dense color="primary" :disable="!this.dv1 && !this.dv2" label="Annuler" @click="reset"/>
        <q-btn dense color="warning" :disable="!this.dv1 && !this.dv2" label="Valider" @click="valider"/>
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
import InfoTxt from './InfoTxt.vue'
import { edvol, cfg, afficherdiagnostic } from '../app/util.mjs'
import { UNITEV1, UNITEV2 } from '../app/api.mjs'
import { GererForfaits } from '../app/operations.mjs'

const msg = `Une opération identique a été lancée en parrallèle depuis une autre session.
Les données d'après lesquelles vos mises à jour ont été établies ne sont plus pertinentes.
Recommencer vos attributions`

export default ({
  name: 'GererForfaits',

  components: { FicheAvatar, ShowHtml, PanelCompta, InfoTxt },

  props: { compta: Object, tribu: Object, estpar: Boolean, na: Object, close: Function },

  computed: {
    cl1 () { return this.dv1 ? 'col-3 bordw' : 'col-3 bordn' },
    cl2 () { return this.dv2 ? 'col-3 bordw' : 'col-3 bordn' },

    f1f () { return this.s.t.f1 + this.dv1 }, // forfait de la tribu attribués aux comptes
    f2f () { return this.s.t.f2 + this.dv2 },
    tt1 () { return this.s.t.f1 + this.s.t.r1 }, // total de la tribu
    tt2 () { return this.s.t.f2 + this.s.t.r2 },
    pc1a () { return Math.round((this.f1f * 100) / this.tt1) }, // forfaits tribu attribués / total de la tribu
    pc2a () { return Math.round((this.f2f * 100) / this.tt2) },

    r1f () { return this.s.t.r1 - this.dv1 }, // réserve de la tribu
    r2f () { return this.s.t.r2 - this.dv2 },
    pc1r () { return Math.round((this.r1f * 100) / this.tt1) }, // réserves tribu / total tribu
    pc2r () { return Math.round((this.r2f * 100) / this.tt2) },

    b1 () { return this.s.cobj.x.f1 + this.dv1 }, // forfait de l'avatar primaire
    b2 () { return this.s.cobj.x.f2 + this.dv2 },
    bt1 () { return Math.round(100 * this.s.cobj.x.v1 / this.b1) }, // taux occupation de l'avatar primaire
    bt2 () { return Math.round(100 * this.s.cobj.x.v2 / this.b2) },

    a1 () { return this.b1 + this.s.cobj.x.s1 }, // forfait total du compte
    a2 () { return this.b2 + this.s.cobj.x.s2 },
    vf1 () { return Math.round(100 * this.s.cobj.x.v1c / this.a1) }, // taux d'occupation du compte
    vf2 () { return Math.round(100 * this.s.cobj.x.v2c / this.f2f) },
    ct1 () { return Math.round(100 * this.a1 / this.tt1) },
    ct2 () { return Math.round(100 * this.a2 / this.tt2) },

    mx1 () { return this.top(this.s.cobj.x.f1, this.s.t.r1, this.s.cobj.x.s1) },
    mx2 () { return this.top(this.s.cobj.x.f2, this.s.t.r2, this.s.cobj.x.s2) },
    mi1 () { return -this.s.cobj.x.f1 + 1 },
    mi2 () { return -this.s.cobj.x.f2 },

    min1 () { return Math.ceil(this.s.cobj.x.v1 / UNITEV1) },
    min2 () { return Math.ceil(this.s.cobj.x.v2 / UNITEV2) },
    w1 () { return this.b1 >= this.min1 ? '' : 'L\'allocation résultante ne couvre pas le volume déjà utilisé' },
    w2 () { return this.b2 >= this.min2 ? '' : 'L\'allocation résultante ne couvre pas le volume déjà utilisé' },
    wg () { return this.w1 || this.w2 ? 'L\'avatar primaire du compte ne pourra plus ni créer de secrets ni augmenter le volume de ceux existants' : '' }
  },

  data () {
    return {
      dv1: 0,
      dv2: 0,
      comptadial: false
    }
  },

  methods: {
    top (f, r, s) { const a = 255 - f - s; const b = r - f - s; return a < b ? a : b },
    mini1 (val) { return val >= this.mi1 || '< ' + this.mi1 },
    maxi1 (val) { return val <= this.mx1 || '> ' + this.mx1 },
    mini2 (val) { return val >= this.mi2 || '< ' + this.mi2 },
    maxi2 (val) { return val <= this.mx1 || '> ' + this.mx2 },
    fermercompta () { this.comptadial = false },
    estC () { return this.compte.estComptable },
    ed0 (f) { return edvol(f) },
    ed1 (f) { return edvol(f * UNITEV1) },
    ed2 (f) { return edvol(f * UNITEV2) },

    async valider () {
      const args = {
        idt: this.s.t.id,
        idc: this.na.id,
        f1t: this.s.t.f1,
        f2t: this.s.t.f2,
        f1c: this.s.cobj.x.f1,
        f2c: this.s.cobj.x.f2,
        dv1: this.dv1,
        dv2: this.dv2
      }
      const [ok, tribu, compta] = await new GererForfaits().run(args)
      this.init(compta, tribu)
      this.reset()
      if (!ok) afficherdiagnostic(msg)
    },
    reset () {
      this.dv1 = 0
      this.dv2 = 0
    }
  },

  setup (props) {
    const lf = cfg().forfaits
    const codes = {}
    for (const code in lf) codes[lf[code]] = '-' + code

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
      fermergf,
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
  border-left: 3px solid transparent
  padding-left: 1rem
.bordw
  border-left: 3px solid $warning
  padding-left: 1rem
.itxt
  position: relative
  top: -0.3rem
</style>
