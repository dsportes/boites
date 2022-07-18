<template>
<div v-if="sessionok" class="q-pa-xs full-width">

  <div class="filler"></div>
  <div v-if="!state.lst || !state.lst.length" class="titre-lg">
    Aucune tribu ne correspond au critère de recherche</div>

  <panel-tribu v-if="avatartrform && state.lst && state.lst.length"
    :suivant="state.idx < state.lst.length - 1 ? suiv : null"
    :precedent="state.idx > 0 ? prec : null"
    :index="state.idx" :sur="state.lst.length"/>

  <div v-if="!avatartrform && state.lst && state.lst.length">
    <div v-for="(i, idx) in state.lst" :key="i.t.id"
      :class="dkli(idx) + ' zone full-width row items-start q-py-xs' + (idx === state.idx ? ' courant' : '')">
      <div class="row items-start full-width cursor-pointer" @click="afficher(idx)">
        <info-ico class="col-auto" size="sm" :color="colors[i.t.ist]" :icon="icons[i.t.ist]" :info="infos[i.t.ist]"/>
        <div class="col q-px-sm">
          <div class="row items-center">
            <div class="col-4 font-mono fs-md text-bold">{{i.t.nom}}</div>
            <show-html class="col-8" style="height:1.8rem;overflow:hidden" :texte="i.t.info" :idx="idx"/>
          </div>
          <div>
            <div class=q-pr-sm>{{i.t.nbc}} compte(s) - {{i.lp.length}} parrain(s)</div>
            <span class=q-pr-sm>{{ed1(i.t.f1)}} {{ed2(i.t.f2)}} attribués - </span>
            <span class=q-pr-sm>{{ed1(i.t.r1)}} {{ed2(i.t.r2)}} réservés</span>
          </div>
        </div>
      </div>
    </div>
  </div>

  <q-dialog v-if="sessionok" v-model="nouvtr" class="petitelargeur">
    <q-card class="petitelargeur q-pa-xs">
      <q-card-section class="column items-center">
        <div class="titre-lg text-center">Création d'une nouvelle tribu</div>
      </q-card-section>
      <q-card-section>
        <nom-avatar class="full-width" v-on:ok-nom="oknom" tribu verif icon-valider="check" label-valider="OK"></nom-avatar>
        <div class="q-mt-md titre-lg">Commentaires / information</div>
        <editeur-md texte="" v-model="info" editable modetxt style="height:8rem"></editeur-md>
        <div class="q-mt-md titre-lg">Réserves de volumes attribuées</div>
        <choix-forfaits v-model="reserves" :max="99999" :f1="64" :f2="64"/>
      </q-card-section>
      <q-card-actions>
        <q-btn dense flat color="primary" label="Renoncer" v-close-popup/>
        <q-btn dense flat color="warnin" label="Créer" :disable="erreur" v-close-popup @click="creertribu"/>
      </q-card-actions>
    </q-card>
  </q-dialog>

  <q-page-sticky v-if="!avatartrform" position="top-left" class="full-width bg-secondary text-white" expand :offset="[5,5]">
    <q-expansion-item class="full-width titre-lg" v-model="filtre"
      dense dense-toggle expand-separator icon="filter_alt" label="Filtre, actions ...">
    <div class="column justify-center full-width">
      <div class="row items-end">
        <q-radio v-model="opt" val="c" label="contient" />
        <q-radio v-model="opt" val="d" label="débute par" />
        <q-input v-model="txt" class="q-ml-lg" style="width:4rem" label="abc"/>
      </div>
      <div class="row items-end">
        <q-checkbox class="q-ml-sm" left-label v-model="bloquee" label="Tribus bloquées" />
        <q-btn v-if="!avatartrform" class="q-ma-sm" dense icon="add" label="Nouvelle tribu"
          color="primary" @click="filtre = false;nouvtr = true"/>
      </div>
    </div>
    </q-expansion-item>
  </q-page-sticky>
</div>
</template>
<script>
import { computed, reactive, watch, ref } from 'vue'
import { useStore } from 'vuex'
import { cfg, getJourJ, edvol, afficherdiagnostic } from '../app/util.mjs'
import PanelTribu from './PanelTribu.vue'
import ShowHtml from './ShowHtml.vue'
import { UNITEV1, UNITEV2 } from '../app/api.mjs'
import InfoIco from './InfoIco.vue'
import NomAvatar from './NomAvatar.vue'
import ChoixForfaits from './ChoixForfaits.vue'
import EditeurMd from './EditeurMd.vue'
// import { data } from '../app/modele.mjs'
import { NouvelleTribu } from '../app/operations.mjs'

export default ({
  name: 'TabTribus',

  components: { ChoixForfaits, NomAvatar, EditeurMd, InfoIco, PanelTribu, ShowHtml },
  props: { close: Function },
  computed: {
    erreur () { return !this.nom || this.nom.length < 4 || this.reserves[0] <= 0 || this.reserves[1] <= 0 }
  },

  data () {
    return {
      nouvtr: false,
      icons: ['thumb_up', 'report', 'report_problen', 'lock', 'highlight_off'],
      colors: ['green', 'warning', 'negative', 'negative', 'primary'],
      infos: ['OK', 'En alerte', 'En sursis', 'Bloqué', 'Aucun compte'],
      nom: '',
      info: '',
      reserves: [0, 0],
      filtre: false
    }
  },

  methods: {
    fermertribus () { if (this.close) this.close() },
    closetr () { this.nouvtr = false },
    ed1 (f) { return edvol(f * UNITEV1) },
    ed2 (f) { return edvol(f * UNITEV2) },
    ed3 (f) { return edvol(f) },
    nbj (j) { return j - getJourJ() + cfg().limitesjour.groupenonheb },

    oknom (nom) {
      if (this.state.setNoms.has(nom)) {
        afficherdiagnostic('Ce nom a déjà été attribué à une tribu, les doublons de nom ne sont pas acceptés.')
        this.nom = null
      } else {
        this.nom = nom
      }
    },
    async creertribu () {
      await new NouvelleTribu().run(this.nom, this.info, this.reserves)
    },

    dkli (idx) { return this.$q.dark.isActive ? (idx ? 'sombre' + (idx % 2) : 'sombre0') : (idx ? 'clair' + (idx % 2) : 'clair0') }
  },

  setup () {
    const $store = useStore()

    const opt = ref('c')
    const txt = ref('')
    const bloquee = ref(false)

    const sessionok = computed(() => { return $store.state.ui.sessionok })

    const compte = computed(() => { return $store.state.db.compte })
    const tribus = computed(() => { return $store.state.db.tribus })
    const tribu = computed({ // tribu courante
      get: () => $store.state.db.tribu,
      set: (val) => $store.commit('db/majtribu', val)
    })
    const avatartrform = computed({
      get: () => $store.state.ui.avatartrform,
      set: (val) => $store.commit('ui/majavatartrform', val)
    })

    const state = reactive({
      blst: [],
      lst: [],
      setNoms: new Set(),
      idx: 0
    })

    function getTribus () {
      const lst = []
      state.setNoms = new Set()
      for (const x in tribus.value) {
        const idt = parseInt(x)
        const t = tribus.value[idt]
        state.setNoms.add(t.nom)
        const lp = Object.values(t.mncp)
        lst.push({ t, lp })
      }
      lst.sort((a, b) => { return a.t.nom < b.t.nom ? -1 : (a.t.nom > b.t.nom ? 1 : 0) })
      state.blst = lst
    }

    function filtrer () {
      const lst = []
      const c = opt.value === 'c'
      const t = txt.value
      function b (tr) {
        if (bloquee.value) {
          if (tr.st) lst.push(tr)
        } else lst.push(tr)
      }
      state.blst.forEach(tr => {
        if (!t) {
          b(tr)
        } else {
          if (c) {
            if (tr.t.info.indexOf(t) !== -1) b(tr)
          } else {
            if (tr.t.nom.startsWith(t)) b(tr)
          }
        }
      })
      state.lst = lst
    }

    function indexer () {
      state.idx = -1
      if (tribu.value) state.lst.forEach((x, n) => { if (x.t.id === tribu.value.id) state.idx = n })
      if (state.idx === -1) {
        if (state.lst.length) {
          state.idx = 0; tribu.value = state.lst[0].t
        } else {
          tribu.value = null
        }
      }
    }

    function latotale () {
      getTribus()
      filtrer()
      indexer()
    }

    latotale()

    watch(() => opt.value, (ap, av) => {
      filtrer(); indexer()
    })

    watch(() => txt.value, (ap, av) => {
      filtrer(); indexer()
    })

    watch(() => bloquee.value, (ap, av) => {
      filtrer(); indexer()
    })

    watch(() => tribus.value, (ap, av) => {
      latotale()
    })

    function afficher (idx) {
      state.idx = idx
      tribu.value = state.lst[state.idx].t
      avatartrform.value = true
    }

    function suiv (n) {
      if (state.idx < state.lst.length - 1) state.idx = n ? state.idx + 1 : state.lst.length - 1
      tribu.value = state.lst[state.idx].t
    }

    function prec (n) {
      if (state.idx > 0) state.idx = n ? state.idx - 1 : 0
      tribu.value = state.lst[state.idx].t
    }

    return {
      sessionok,
      opt,
      txt,
      bloquee,
      compte,
      state,
      avatartrform,
      afficher,
      suiv,
      prec
    }
  }

})
</script>

<style lang="sass" scoped>
@import '../css/app.sass'
.courant
  border-left: 4px solid $warning !important
$haut: 2.5rem
.filler
  height: $haut
  width: 100%
</style>
