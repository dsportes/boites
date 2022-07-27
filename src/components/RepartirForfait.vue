<template>
  <q-card class="fs-md moyennelargeur">
    <div class="top bg-secondary text-white full-width">
      <q-toolbar class="q-px-xs">
        <q-btn dense flat size="sm" icon="close" @click="fermerrf"/>
        <q-toolbar-title class="titre-lg full-width text-right q-mr-sm">Gestion des Forfaits</q-toolbar-title>
      </q-toolbar>
    </div>

    <div v-if="sessionok" class="q-pa-sm scroll" style="max-height:100vh;">
      <div class="filler"></div>

      <div class="titre-lg text-center full-width">V1 - textes des secrets
        <q-btn class="q-ml-md" dense icon="undo" color="primary" @click="undo1"/>
      </div>

      <div class="row">
        <div class="col-3 titre-md text-italic"></div>
        <div class="col-4 titre-md text-italic text-center">Forfaits</div>
        <div class="col-1"></div>
        <div class="col-4 titre-md text-italic text-center">Volumes occupés</div>
      </div>
      <q-separator/>
      <div class="row q-my-xs">
        <div class="col-3 titre-md text-italic">Total</div>
        <div class="col-4 text-center">
          <span class="font-mon fs-md">{{codeDe(t.tf1)}}<span class="q-ml-sm">{{ed1(t.tf1)}}</span></span>
        </div>
        <div class="col-1"></div>
        <div class="col-4 text-center">
          <span class="font-mon fs-md">{{codeDe(Math.round(t.tv1 / UNITEV1))}}<span class="q-ml-sm">{{ed0(t.tv1)}}</span></span>
        </div>
      </div>
      <div v-for="(nom, idx) in t.lst" :key="nom" class="q-my-sm column">
        <div class="col-auto row">
          <div class="col-3 column">
            <div class="self-start q-mr-sm titre-md text-bold bord1 q-mb-xs cursor-pointer"
              @click="ouvrirfa(s[nom].na)">{{nom}}</div>
            <div v-if="idx!==0" class="self-end q-mr-sm">
              <q-btn class="q-mr-xs btnw" dense outline size="sm" label="+10" @click="plus1(10,nom)"/>
              <q-btn class="q-mr-xs btnw" dense outline size="sm" label="+1" @click="plus1(1,nom)"/>
              <q-btn class="q-mr-xs btnw" dense outline size="sm" label="-10" @click="minus1(10,nom)"/>
              <q-btn class="q-mr-xs btnw" dense outline size="sm" label="-1" @click="minus1(1,nom)"/>
            </div>
          </div>
          <div class="col-4 text-center">
            <q-badge>
              <span class="font-mon fs-md">{{codeDe(s[nom].f1n)}}<span class="q-ml-sm">{{ed1(s[nom].f1n)}}</span></span>
            </q-badge>
            <q-slider v-model="s[nom].pcf1" :label-value="s[nom].pcf1 + '%'" label readonly :color="chg1(s[nom]) ? 'warning' : 'primary'" :min="0" :max="100"/>
          </div>
          <div class="col-1"></div>
          <div class="col-4 text-center">
            <q-badge>
              <span class="font-mon fs-md">{{edv1(s[nom].v1)}}<span class="q-ml-sm">{{ed0(s[nom].v1)}}</span></span>
            </q-badge>
            <q-slider v-model="s[nom].pcv1f" :label-value="s[nom].pcv1f + '%'" label readonly :color="alv1(s[nom]) ? 'warning' : 'primary'" :min="0" :max="100"/>
          </div>
        </div>
        <div v-if="blv1(s[nom])" class="col-auto text-center text-negative bg-yellow-5">{{msg2}}</div>
      </div>

      <q-separator/>

      <div class="titre-lg text-center full-width">V2 - fichiers attachés aux secrets
        <q-btn class="q-ml-md" dense icon="undo" color="primary" @click="undo2"/>
      </div>

      <div class="row">
        <div class="col-3 titre-md text-italic"></div>
        <div class="col-4 titre-md text-italic text-center">Forfaits</div>
        <div class="col-1"></div>
        <div class="col-4 titre-md text-italic text-center">Volumes occupés</div>
      </div>
      <q-separator/>
      <div class="row q-my-xs">
        <div class="col-3 titre-md text-italic">Total</div>
        <div class="col-4 text-center">
          <span class="font-mon fs-md">{{codeDe(t.tf2)}}<span class="q-ml-sm">{{ed2(t.tf2)}}</span></span>
        </div>
        <div class="col-1"></div>
        <div class="col-4 text-center">
          <span class="font-mon fs-md">{{codeDe(Math.round(t.tv2 / UNITEV2))}}<span class="q-ml-sm">{{ed0(t.tv2)}}</span></span>
        </div>
      </div>
      <div v-for="(nom, idx) in t.lst" :key="nom" class="q-my-sm">
        <div class="row">
          <div class="col-3 column">
            <div class="self-start q-mr-sm titre-md text-bold bord1 q-mb-xs cursor-pointer"
              @click="ouvrirfa(s[nom].na)">{{nom}}</div>
            <div v-if="idx!==0" class="self-end q-mr-sm">
              <q-btn class="q-mr-xs btnw" dense outline size="sm" label="+10" @click="plus2(10,nom)"/>
              <q-btn class="q-mr-xs btnw" dense outline size="sm" label="+1" @click="plus2(1,nom)"/>
              <q-btn class="q-mr-xs btnw" dense outline size="sm" label="-10" @click="minus2(10,nom)"/>
              <q-btn class="q-mr-xs btnw" dense outline size="sm" label="-1" @click="minus2(1,nom)"/>
            </div>
          </div>
          <div class="col-4 text-center">
            <q-badge>
              <span class="font-mon fs-md">{{codeDe(s[nom].f2n)}}<span class="q-ml-sm">{{ed2(s[nom].f2n)}}</span></span>
            </q-badge>
            <q-slider v-model="s[nom].pcf2" :label-value="s[nom].pcf2 + '%'" label readonly :color="chg2(s[nom]) ? 'warning' : 'primary'" :min="0" :max="100"/>
          </div>
          <div class="col-1"></div>
          <div class="col-4 text-center">
            <q-badge>
              <span class="font-mon fs-md">{{edv2(s[nom].v2)}}<span class="q-ml-sm">{{ed0(s[nom].v2)}}</span></span>
            </q-badge>
            <q-slider v-model="s[nom].pcv2f" :label-value="s[nom].pcv2f + '%'" label readonly :color="alv2(s[nom]) ? 'warning' : 'primary'" :min="0" :max="100"/>
          </div>
        </div>
        <div v-if="blv2(s[nom])" class="text-center text-negative bg-yellow-5">{{msg2}}</div>
      </div>

      <q-card-actions align="right">
        <q-btn dense color="primary" label="Annuler" @click="reset"/>
        <q-btn dense color="warning" label="Valider" @click="valider"/>
      </q-card-actions>
    </div>

    <q-dialog v-if="sessionok" v-model="fav">
      <q-card class="petitelargeur bord1 shadow-8">
        <q-toolbar class="bg-secondary text-white">
          <q-btn dense color="primary" icon="close" size="md" @click="fermerfa"/>
          <q-toolbar-title class="q-pr-sm full-width text-right" >Fiche : {{na.nom}}</q-toolbar-title>
        </q-toolbar>
        <fiche-avatar class="q-my-md" :na-avatar="na" compta cv-editable/>
      </q-card>
    </q-dialog>

  </q-card>
</template>

<script>
import { useStore } from 'vuex'
import { computed, toRef, watch, reactive } from 'vue'
import FicheAvatar from './FicheAvatar.vue'
import { edvol, cfg, afficherdiagnostic } from '../app/util.mjs'
import { UNITEV1, UNITEV2 } from '../app/api.mjs'
import { RepartirForfait } from '../app/operations.mjs'
import { data } from '../app/modele.mjs'

const msg = `Une opération identique a été lancée en parrallèle depuis une autre session.
Les données d'après lesquelles vos mises à jour ont été établies ne sont plus pertinentes.
Recommencer vos attributions`

const msg2 = 'Le volume occupé excède le forfait. Création de secrets et extensions des secrets existants impossible.'

export default ({
  name: 'GererForfaits',

  components: { FicheAvatar },

  props: { close: Function },

  computed: {
  },

  data () {
    return {
      fav: false,
      UNITEV1,
      UNITEV2,
      msg2,
      na: null
    }
  },

  methods: {
    fermerfa () { this.fav = false },
    ouvrirfa (na) { this.na = na; this.fav = true },

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
    for (const code in lf) if (code !== '0') codes[lf[code]] = code

    function codeDe (v) { return codes[v] ? '#' + v + '-' + codes[v] : '#' + v }
    function ed0 (v) { return edvol(v) }
    function ed1 (f) { return edvol(f * UNITEV1) }
    function ed2 (f) { return edvol(f * UNITEV2) }
    function edv1 (v) { return codeDe(Math.ceil(v / UNITEV1)) }
    function edv2 (v) { return codeDe(Math.ceil(v / UNITEV2)) }

    const close = toRef(props, 'close')
    function fermerrf () { if (close.value) close.value() }

    const $store = useStore()
    const sessionok = computed(() => $store.state.ui.sessionok)
    const compte = computed(() => $store.state.db.compte)
    const comptas = computed(() => $store.state.db.compta)

    const t = reactive({ a: {}, tf1: 0, tf2: 0, tv1: 0, tv2: 0, lst: [], nprim: '' })
    const s = reactive({ })

    function init () {
      const nas = compte.value.avatarNas()
      const lst = []
      t.tf1 = 0; t.tf2 = 0; t.tv1 = 0; t.tv2 = 0
      nas.forEach(na => {
        const compta = data.getCompta(na.id)
        const c = compta.compteurs
        const x = {
          na: na,
          nom: na.nom,
          f1: c.f1,
          f2: c.f2,
          f1n: c.f1,
          f2n: c.f2,
          v1: Math.floor(c.f1 * UNITEV1 * 0.92),
          v2: Math.floor(c.f1 * UNITEV2 * 0.32)
          // v1: c.v1,
          // v2: c.v2
        }
        t.tf1 += x.f1; t.tf2 += x.f2; t.tv1 += x.v1; t.tv2 += x.v2
        lst.push(x.nom)
        s[x.nom] = x
        if (compta.t) t.nprim = x.nom
      })
      lst.sort((a, b) => (a.nom === t.nprim || a.nom < b.nom) ? -1 : (a.nom !== t.nprim || a.nom > b.nom ? 1 : 0))
      lst.forEach(nom => {
        const x = { ...s[nom] }
        x.pcv1t = t.tv1 ? Math.round(x.v1 * 100 / t.tv1) : 0
        x.pcv2t = t.tv2 ? Math.round(x.v2 * 100 / t.tv2) : 0
        s[nom] = x
      })
      t.lst = lst
      reset()
      // console.log(JSON.stringify(s[t.lst[0]]))
    }

    function reset () {
      t.lst.forEach(nom => { const x = { ...s[nom] }; x.f1n = x.f1; x.f2n = x.f2; s[nom] = x })
      maj()
    }

    function maj () {
      t.lst.forEach(nom => {
        const x = { ...s[nom] }
        x.pcf1 = t.tf1 ? Math.round(x.f1n * 100 / t.tf1) : 0
        x.pcf2 = t.tf2 ? Math.round(x.f2n * 100 / t.tf2) : 0
        x.pcv1f = x.f1n ? Math.ceil(x.v1 * 100 / (x.f1n * UNITEV1)) : (x.v1 ? 100 : 0)
        x.pcv2f = x.f2n ? Math.ceil(x.v2 * 100 / (x.f2n * UNITEV2)) : (x.v2 ? 100 : 0)
        s[nom] = x
      })
    }

    function undo1 () {
      t.lst.forEach(nom => {
        const x = { ...s[nom] }
        x.f1n = x.f1
        s[nom] = x
      })
      maj()
    }

    function undo2 () {
      t.lst.forEach(nom => {
        const x = { ...s[nom] }
        x.f2n = x.f2
        s[nom] = x
      })
      maj()
    }

    function chg1 (x) { return x.f1 !== x.f1n }
    function chg2 (x) { return x.f2 !== x.f2n }
    function alv1 (x) { return x.v1 > (x.f1n * UNITEV1) * 0.8 }
    function alv2 (x) { return x.v2 > (x.f2n * UNITEV2) * 0.8 }
    function blv1 (x) { return x.v1 > (x.f1n * UNITEV1) }
    function blv2 (x) { return x.v2 > (x.f2n * UNITEV2) }

    function plus1 (n, nom) {
      const x = { ...s[nom] }
      const p = { ...s[t.nprim] }
      if (n > p.f1n) {
        x.f1n += p.f1n - 1
        p.f1n = 1
      } else {
        x.f1n += n
        p.f1n -= n
      }
      s[nom] = x
      s[t.nprim] = p
      maj()
    }

    function plus2 (n, nom) {
      const x = { ...s[nom] }
      const p = { ...s[t.nprim] }
      if (n > p.f2n) {
        x.f2n += p.f2n
        p.f2n = 0
      } else {
        x.f2n += n
        p.f2n -= n
      }
      s[nom] = x
      s[t.nprim] = p
      maj()
    }

    function minus1 (n, nom) {
      const x = { ...s[nom] }
      const p = { ...s[t.nprim] }
      if (n > x.f1n) {
        p.f1n += x.f1n - 1
        x.f1n = 1
      } else {
        x.f1n -= n
        p.f1n += n
      }
      s[nom] = x
      s[t.nprim] = p
      maj()
    }

    function minus2 (n, nom) {
      const x = { ...s[nom] }
      const p = { ...s[t.nprim] }
      if (n > x.f2n) {
        p.f2n += x.f2n
        x.f2n = 0
      } else {
        x.f2n -= n
        p.f2n += n
      }
      s[nom] = x
      s[t.nprim] = p
      maj()
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
      ed0,
      ed1,
      ed2,
      edv1,
      edv2,
      sessionok,
      init,
      reset,
      maj,
      undo1,
      undo2,
      chg1,
      chg2,
      alv1,
      alv2,
      blv1,
      blv2,
      plus1,
      plus2,
      minus1,
      minus2,
      s,
      t,
      fermerrf
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
.btnw
  min-width: 1.5rem !important
.bord1
  border: 1px solid $grey-5
  border-radius: 3px
.q-slider
  overflow-x: hidden
</style>
