<template>
  <q-card v-if="sessionok" class="full-height fs-md column">
    <q-toolbar class="bg-primary text-white">
      <q-btn :disable="!precedent" flat round dense icon="first_page" size="md" class="q-mr-sm" @click="prec(0)" />
      <q-btn :disable="!precedent" flat round dense icon="arrow_back_ios" size="md" class="q-mr-sm" @click="prec(1)" />
      <span class="q-pa-sm">{{index + 1}} sur {{sur}}</span>
      <q-btn :disable="!suivant" flat round dense icon="arrow_forward_ios" size="md" class="q-mr-sm" @click="suiv(1)" />
      <q-btn :disable="!suivant" flat round dense icon="last_page" size="md" class="q-mr-sm" @click="suiv(0)" />
      <q-toolbar-title></q-toolbar-title>
      <q-btn size="md" color="white" icon="menu" flat dense>
        <menu-couple/>
      </q-btn>
    </q-toolbar>
    <q-toolbar inset class="bg-primary text-white">
      <q-toolbar-title><div class="titre-md text-bold">{{s.stlib}}</div></q-toolbar-title>
    </q-toolbar>

    <div v-if="s.na" class="titre-md bg-secondary text-white">Carte de visite du contact</div>
    <identite-cv  v-if="s.na" :nom-avatar="s.na" type="couple" editable @cv-changee="cvchangee"/>
    <q-separator/>
    <div v-if="s.cvaxvis" class="titre-md bg-secondary text-white">Carte de visite de {{s.naE.nom}}</div>
    <identite-cv  v-if="s.cvaxvis" :nom-avatar="s.naE" type="avatar" invitable/>
    <q-separator/>

    <q-expansion-item header-class="expansion-header-class-1 titre-md bg-secondary text-white">
      <template v-slot:header>
        <q-item-section>Volumes occupés par les secrets: {{s.v1}} / {{s.v2}}</q-item-section>
      </template>
      <q-card-section>
        <div class="bord1 q-pa-xs">
          <div class="titre-md text-italic">Volumes maximaux pour les secrets partagés</div>
          <div class="titre-md text-italic">Fixés par moi</div>
          <choix-forfaits v-model="vmaxI" :f1="s.maxI1" :f2="s.maxI2" label-valider="OK" @valider="changervmax"/>
          <div v-if="s.maxEvis" class="titre-md">Fixés par {{s.nomE}}</div>
          <choix-forfaits v-if="s.maxEvis" v-model="vmaxE" :f1="s.maxE1" :f2="s.maxE2" lecture/>
        </div>
      </q-card-section>
    </q-expansion-item>
    <q-separator/>

    <q-expansion-item header-class="expansion-header-class-1 titre-md bg-secondary text-white">
      <template v-slot:header>
        <q-item-section>
          Ardoise du contact ({{!s.ard ? 'vide': s.ard.length + 'c'}}){{s.ard.length ? ' - ' + s.dh : ''}}
        </q-item-section>
      </template>
      <q-card-section>
        <editeur-md class="height-8" v-model="ardTemp" :texte="s.ard ? s.ard : ''" editable modetxt label-ok="OK" @ok="changerard"/>
      </q-card-section>
    </q-expansion-item>
    <q-separator/>

    <q-expansion-item header-class="expansion-header-class-1 titre-md bg-secondary text-white">
      <template v-slot:header>
        <q-item-section>Commentaires personnels ({{!s.info ? 'vide': s.info.length + 'c'}})</q-item-section>
      </template>
      <q-card-section>
        <editeur-md class="height-8" v-model="infoTemp" :texte="s.info ? s.info : ''" editable modetxt label-ok="OK" @ok="changerinfo"/>
      </q-card-section>
    </q-expansion-item>
    <q-separator/>

    <div class="titre-md bg-secondary text-white">Mots clés qualifiant le contact</div>
      <apercu-motscles :motscles="s.motscles" :src="s.mc" :args-click="{}" @click-mc="mcledit=true"/>
    <q-separator/>

    <q-expansion-item v-if="s.orig === 1" header-class="expansion-header-class-1 titre-md bg-secondary text-white">
      <template v-slot:header>
        <q-item-section>Contact créé du fait du parrainage du compte de {{s.nomE}}</q-item-section>
      </template>
      <q-card-section>
        <div>Phrase de parrainage : <span class="text-italic">{{s.phrase}}</span></div>
        <div>Forfaits attribués au compte parrainé :</div>
        <choix-forfaits v-model="pf" :f1="s.f1" :f2="s.f2" lecture/>
        <div v-if="s.r1 || s.r2" >Réserve attribuée pour parrainage d'autres comptes :</div>
        <choix-forfaits v-if="s.r1 || s.r2" v-model="pr" :f1="s.r1" :f2="s.r2" lecture/>
      </q-card-section>
    </q-expansion-item>
    <q-separator/>

    <q-expansion-item v-if="s.orig === 2" header-class="expansion-header-class-1 titre-md bg-secondary text-white">
      <template v-slot:header>
        <q-item-section>Contact créé par une phrase de rencontre convenue avec {{s.nomE}}</q-item-section>
      </template>
      <q-card-section>
        <div>Phrase de rencontre : <span class="text-italic">{{s.phrase}}</span></div>
      </q-card-section>
    </q-expansion-item>
    <q-separator/>

    <q-dialog v-model="mcledit">
      <select-motscles :motscles="s.motscles" :src="s.mc" @ok="changermc" :close="fermermcl"></select-motscles>
    </q-dialog>

  </q-card>
</template>
<script>
import { computed, reactive, watch, ref, toRef } from 'vue'
import { useStore } from 'vuex'
import { Motscles, edvol, getJourJ, dhstring } from '../app/util.mjs'
import { data } from '../app/modele.mjs'
import { MajCv, MajCouple } from '../app/operations.mjs'
import EditeurMd from './EditeurMd.vue'
import ApercuMotscles from './ApercuMotscles.vue'
import SelectMotscles from './SelectMotscles.vue'
import ChoixForfaits from './ChoixForfaits.vue'
import IdentiteCv from './IdentiteCv.vue'
import MenuCouple from './MenuCouple.vue'
import { retourInvitation } from '../app/page.mjs'

export default ({
  name: 'PanelCouple',

  components: { EditeurMd, MenuCouple, ApercuMotscles, SelectMotscles, IdentiteCv, ChoixForfaits },

  props: { couple: Object, suivant: Function, precedent: Function, index: Number, sur: Number },

  computed: { },

  data () {
    return {
      ardTemp: '',
      infoTemp: '',
      vmaxI: [],
      vmaxE: [],
      pr: [],
      pf: []
    }
  },

  methods: {
    fermermcl () { this.mcledit = false },

    async cvchangee (cv) {
      await new MajCv().run(cv)
    },
    async changermc (mc) {
      await new MajCouple().run(this.couple, { mc: mc })
    },
    async changerard (ard) {
      await new MajCouple().run(this.couple, { ard: ard })
    },
    async changerinfo (info) {
      await new MajCouple().run(this.couple, { info: info })
    },
    async changervmax (maxI) {
      await new MajCouple().run(this.couple, { vmax: maxI })
    },

    suiv (n) { if (this.suivant) this.suivant(n) },
    prec (n) { if (this.precedent) this.precedent(n) },

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

    function libst (c) {
      const nomAbs = c.absentE ? (c.naE ? c.naE.nom : c.data.x[1][0]) : c.naI.nom // Nom de "l'absent"
      if (c.stp <= 2) {
        return [
          '',
          `En attente [${c.dlv - getJourJ()} jour(s)] d'acceptation ou de refus du contact de ${nomAbs}`,
          `Proposition faite à ${nomAbs} caduque, sans réponse dans les délais`,
          `Proposition faite à ${nomAbs} explicitement refusée`,
          `En attente [${c.dlv - getJourJ()} jour(s)] d'acceptation ou de refus du parrainage du compte de ${nomAbs}`,
          `Parrainage du compte de ${nomAbs} caduque, sans réponse dans les délais`,
          `Parrainage du compte de ${nomAbs} explicitement refusé`,
          `En attente [${c.dlv - getJourJ()} jour(s)] d'acceptation ou de refus de rencontre avec ${nomAbs}`,
          `Proposition de rencontre faite à ${nomAbs} caduque, sans réponse dans les délais`,
          `Proposition de rencontre faite à ${nomAbs} explicitement refusée`
        ][c.ste]
      } else if (c.stp === 3) {
        return 'Couple établi'
      } else if (c.stp === 4) { // stp = 4. Couple quitté par l'autre
        return [
          `${nomAbs} a rompu le contact, les secrets restent toutefois accessibles`,
          `${nomAbs} a rompu le contact et a été relancé pour le rétablir: attente de sa décision`,
          `${nomAbs} a rompu le contact, a été relancé pour le rétablir mais ne l'a pas fait dans les délais`,
          `${nomAbs} a rompu le contact, a été relancé pour le rétablir mais a explicitement refusé de le faire`
        ][c.ste]
      } return `${nomAbs} a disparu, les secrets du contact restent toutefois accessibles`
    }

    function liborig (c) {
      const nomE = c.naE ? c.naE.nom : c.data.x[1][0]
      if (c.orig === 0) {
        return [
          `Proposition de contact faite à ${nomE} qui a accepté`,
          `Proposition de contact faite par ${nomE} et acceptée`
        ][c.avc]
      } else if (c.orig === 1) {
        return [
          `Contact proposé à l'occasion de la création du compte de ${nomE} par parrainage`,
          `Contact validé suite à l'acceptation du parrainage du compte par ${nomE}`
        ][c.avc]
      } else {
        return [
          `Contact proposé par phrase de rencontre à ${nomE} qui l'a accepté`,
          `Contact proposé par phrase de rencontre par ${nomE} et accepté`
        ][c.avc]
      }
    }

    const s = reactive({
      motcles: null,
      axvis: false, // l'identité de l'autre est visible
      cvaxvis: false, // la carte de visite de l'autre est visible
      maxEvis: false,
      relstd: false, // relance standard autorisée
      relpar: false, // relance de parrainage autorisée
      relren: false, // relance de rencontre autorisée
      stlib: '',
      dh: '', // date-heure de l'ardoise
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
      v2: '',
      origlib: '',
      orig: 0
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
      s.frvis = c && c.orig === 1
      s.maxEvis = p === 3
      s.relstd = (p === 2 && (e === 2 || e === 3)) || (p === 4 && e === 0)
      s.relpar = p === 2 && (e === 5 || e === 6)
      s.relren = p === 2 && (e === 8 || e === 9)
      s.stlib = c ? libst(c) : ''
      s.info = c ? c.info : ''
      s.dh = c ? dhstring(c.dh) : ''
      s.ard = c ? c.ard : ''
      s.mc = c ? c.mc : new Uint8Array([])
      s.maxI1 = c ? (c.avc === 0 ? c.mx10 : c.mx11) : 0
      s.maxI2 = c ? (c.avc === 0 ? c.mx20 : c.mx21) : 0
      s.maxE1 = c && s.maxEvis ? (c.avc === 0 ? c.mx11 : c.mx10) : 0
      s.maxE2 = c && s.maxEvis ? (c.avc === 0 ? c.mx21 : c.mx20) : 0
      s.phrase = c && c.orig > 0 ? c.data.phrase : ''
      s.f1 = c && s.frvis ? c.data.f1 : 0
      s.f2 = c && s.frvis ? c.data.f2 : 0
      s.r1 = c && s.frvis ? c.data.r1 : 0
      s.r2 = c && s.frvis ? c.data.r2 : 0
      s.v1 = c ? edvol(c.v1) : ''
      s.v2 = c ? edvol(c.v2) : ''
      s.cvc = c ? cvs.value[c.id] : null // carte de visite du couple
      s.na = c ? c.na : null // na du couple
      s.naE = c ? c.naE : null // na de l'autre
      s.nomE = c ? (c.naE ? c.naE.nom : c.data.x[1][0]) : ''
      s.cvax = c && c.naE ? cvs.value[c.naE] : null // carte de visite de l'autre
      s.orig = c ? c.orig : 0
      s.origlib = c ? liborig(c) : ''
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
      mcledit,
      sessionok,
      initState,
      s,
      diagnostic,
      mode
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
</style>
