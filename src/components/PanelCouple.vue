<template>
  <q-card v-if="sessionok" class="full-height full-width fs-md column">
    <q-toolbar class="col-auto bg-primary text-white maToolBar">
      <q-btn flat round dense icon="view_headline" size="md" class="q-mr-sm" @click="avatarcpform = false" />
      <q-btn :disable="!precedent" flat round dense icon="first_page" size="md" class="q-mr-sm" @click="prec(0)" />
      <q-btn :disable="!precedent" flat round dense icon="arrow_back_ios" size="md" class="q-mr-sm" @click="prec(1)" />
      <span class="q-pa-sm">{{index + 1}} sur {{sur}}</span>
      <q-btn :disable="!suivant" flat round dense icon="arrow_forward_ios" size="md" class="q-mr-sm" @click="suiv(1)" />
      <q-btn :disable="!suivant" flat round dense icon="last_page" size="md" class="q-mr-sm" @click="suiv(0)" />
      <q-toolbar-title><div class="titre-md tit text-center">{{s.na ? s.na.nom : ''}}</div></q-toolbar-title>
    </q-toolbar>

    <q-card-section>
      <div v-if="s.na" class="titre-md">Carte de visite du couple</div>
      <identite-cv  v-if="s.na" :nom-avatar="s.na" type="avatar" editable @cv-changee="cvchangee"/>
      <div v-if="s.naE" class="titre-md">Carte de visite du conjoint</div>
      <identite-cv  v-if="s.naE" :nom-avatar="s.naE" type="avatar" invitable/>
    </q-card-section>

    <q-card-section>
      <div class="titre-md">Ardoise commune avec le contact</div>
      <editeur-md class="height-8" v-model="s.ard" :texte="s.ard ? s.ard : ''" editable modetxt/>
    </q-card-section>

    <q-card-section>
      <div class="titre-md">Commentaires personnels</div>
      <editeur-md class="height-8" v-model="s.info" :texte="s.info ? s.info : ''" editable modetxt/>
    </q-card-section>

    <q-card-section>
      <div class="titre-md">Mots clés qualifiant le contact</div>
      <apercu-motscles :motscles="s.motscles" :src="s.mc" :args-click="{}" @click-mc="mcledit=true"/>
    </q-card-section>

    <q-dialog v-model="mcledit">
      <select-motscles :motscles="s.motscles" :src="s.mc" @ok="changermcl" :close="fermermcl"></select-motscles>
    </q-dialog>

  </q-card>
</template>
<script>
import { computed, reactive, watch, ref, toRef } from 'vue'
import { useStore } from 'vuex'
import { Motscles, edvol } from '../app/util.mjs'
import { data } from '../app/modele.mjs'
import { MajContact, MajCv } from '../app/operations.mjs'
import EditeurMd from './EditeurMd.vue'
import ApercuMotscles from './ApercuMotscles.vue'
import SelectMotscles from './SelectMotscles.vue'
import IdentiteCv from './IdentiteCv.vue'
import { retourInvitation } from '../app/page.mjs'

export default ({
  name: 'PanelCouple',

  components: { EditeurMd, ApercuMotscles, SelectMotscles, IdentiteCv },

  props: { couple: Object, suivant: Function, precedent: Function, index: Number, sur: Number },

  computed: { },

  data () {
    return {
      erreur: ''
    }
  },

  methods: {
    async cvchangee (cv) {
      await new MajCv().run(cv)
    },
    suiv (n) { if (this.suivant) this.suivant(n) },
    prec (n) { if (this.precedent) this.precedent(n) },
    fermermcl () { this.mcledit = false },
    changermcl (mc) {
      this.s.mc = mc
    },
    async valider () {
      await new MajContact().run(this.contact, this.s)
    },
    copier (c) {
      retourInvitation(c)
    }
  },

  setup (props) {
    const $store = useStore()
    const sessionok = computed(() => { return $store.state.ui.sessionok })
    const mcledit = ref(false)

    const diagnostic = computed({
      get: () => $store.state.ui.diagnostic,
      set: (val) => $store.commit('ui/majdiagnostic', val)
    })
    const couple = toRef(props, 'couple')
    const mode = computed(() => $store.state.ui.mode)
    const prefs = computed(() => { return data.getPrefs() })
    const cvs = computed(() => { return $store.state.db.cvs })
    const avatarcpform = computed({
      get: () => $store.state.ui.avatarcpform,
      set: (val) => $store.commit('ui/majavatarcpform', val)
    })
    const invitationattente = computed({
      get: () => $store.state.ui.invitationattente,
      set: (val) => $store.commit('ui/majinvitationattente', val)
    })

    const s = reactive({
      motcles: null,
      axvis: false, // l'identité de l'autre est visible
      cvaxvis: false, // la carte de visite de l'autre est visible
      dlvvis: false, // la dlv est visible
      frvis: false, // les forfaits / ressources sont visibles
      phcvis: false, // la phrase de contact est visible
      maxEvis: false,
      relstd: false, // relance standard autorisée
      relpar: false, // relance de parrainage autorisée
      relren: false, // relance de rencontre autorisée
      dh: 0, // date-heure de l'ardoise
      ard: '', // texte de l'ardoise
      info: '', // commentaire personnel sur le couple
      cvc: null, // carte de visite du couple
      na: null, // na du couple
      cvax: null, // carte de visite de l'autre
      naax: null, // na de l'autre
      mc: new Uint8Array([]), // mots clés attribués
      maxI1: 0, // volumes max perso (I) et fixé par l'autre (E)
      maxI2: 0,
      maxE1: 0,
      maxE2: 0,
      f1: 0,
      f2: 0,
      r1: 0,
      r2: 0,
      v1: '',
      v2: ''
    })

    const mc = reactive({ categs: new Map(), lcategs: [], st: { enedition: false, modifie: false } })

    function chargerMc () {
      s.motscles = new Motscles(mc, 1, 0)
      s.motscles.recharger()
    }

    function initState () {
      const c = couple.value
      const p = c ? c.stp : 0
      const e = c ? c.ste : 0
      s.axvis = (p === 1 && (e === 1 || e === 4 || e === 7)) ||
        (p === 2 && (e === 2 || e === 3 || e === 5 || e === 8)) || p >= 3
      s.cvaxvis = (p === 1 && e === 1) || (p === 2 && (e === 2 || e === 3)) || p === 3 || p === 4
      s.dlvvis = p === 1 && (e === 1 || e === 4 || e === 7)
      s.frvis = e === 4 || e === 5 || e === 6
      s.phcvis = e >= 4 && e <= 9
      s.maxEvis = p === 3
      s.relstd = (p === 2 && (e === 2 || e === 3)) || (p === 4 && e === 0)
      s.relpar = p === 2 && (e === 5 || e === 6)
      s.relren = p === 2 && (e === 8 || e === 9)
      s.info = c ? c.info : ''
      s.dh = c ? c.dh : ''
      s.ard = c ? c.ard : ''
      s.mc = c ? c.mc : new Uint8Array([])
      s.dlv = s.dlvvis ? c.dlv : 0
      s.maxE1 = c && s.maxEvis ? (c.avc ? c.mx11 : c.mx10) : 0
      s.maxE2 = c && s.maxEvis ? (c.avc ? c.mx21 : c.mx20) : 0
      s.f1 = c && s.frvis ? c.data.f1 : 0
      s.f2 = c && s.frvis ? c.data.f2 : 0
      s.r1 = c && s.frvis ? c.data.r1 : 0
      s.r2 = c && s.frvis ? c.data.r2 : 0
      s.v1 = c ? edvol(c.v1) : ''
      s.v2 = c ? edvol(c.v2) : ''
      s.cvc = c ? cvs.value[c.id] : null // carte de visite du couple
      s.na = c ? c.na : null // na du couple
      s.naE = c ? c.naE : null // na de l'autre
      s.cvax = c && c.naE ? cvs.value[c.naE] : null // carte de visite de l'autre
    }

    initState()
    chargerMc()

    watch(() => prefs.value, (ap, av) => {
      chargerMc()
    })

    watch(() => couple.value, (ap, av) => {
      initState()
    })

    watch(() => sessionok.value, (ap, av) => {
      mcledit.value = false
    })

    return {
      avatarcpform,
      mcledit,
      sessionok,
      initState,
      s,
      diagnostic,
      mode,
      invitationattente
    }
  }
})
</script>
<style lang="sass" scoped>
@import '../css/app.sass'
.bord1
  border:  1px solid $grey-5
</style>
