<template>
  <q-card v-if="sessionok" class="q-pa-xs full-height fs-md column">
    <div class="filler"/>

    <div v-if="s.c">
      <div class="titre-md">{{s.stlib}}</div>
      <div class="q-ml-md fs-sm">Volumes occupés par les secrets: {{s.v1}} / {{s.v2}}</div>
      <div v-if="s.c.stI===1" class="q-ml-md fs-sm">J'ai accès aux secrets du contact</div>
      <div v-if="s.c.stI===0" class="q-ml-md fs-sm">Je n'ai PAS accès aux secrets du contact</div>
      <div v-if="s.c.stE===1" class="q-ml-md fs-sm">{{s.c.nom}} a accès aux secrets du contact</div>
      <div v-if="s.c.stE===0" class="q-ml-md fs-sm">{{s.c.nom}} n'a PAS accès aux secrets du contact</div>
      <div v-if="s.c.naE" class="q-mt-lg">
        <fiche-avatar2 :na-avatar="s.c.naE" nomenu/>
        <!--identite-cv :nom-avatar="s.c.naE" type="avatar" invitable/-->
      </div>
      <div class="titre-md q-mt-lg">Carte de visite spécifique du contact</div>
      <identite-cv :nom-avatar="s.c.na" type="couple" editable @cv-changee="cvchangee"/>
    </div>

    <div v-if="s.c && s.c.stI===1" class="q-my-md">
      <div class="row justify-between">
        <div class="titre-md">Volumes des secrets du contact</div>
        <q-btn flat dense size="sm" icon="chevron_right" @click="voledit = !voledit"/>
      </div>
      <div class="q-pl-sm fs-sm">Occupés actuellement - V1: {{s.v1}} / V2: {{s.v2}}</div>
      <div class="q-pl-sm fs-sm">Maximum autorisés - V1: {{s.max1}} / V2: {{s.max2}}</div>
    </div>

    <q-dialog v-model="voledit" full-height position="right">
      <q-card class="petitelargeur q-pa-sm">
        <q-toolbar class="bg-secondary text-white">
          <q-toolbar-title class="titre-md">Volumes maximaux autorisés</q-toolbar-title>
          <q-btn class="chl" dense flat size="md" icon="chevron_right" @click="voledit=false"/>
        </q-toolbar>
        <q-card-section>
          <div class="q-py-sm fs-md">Volumes occupés actuellement - V1: {{s.v1}} / V2: {{s.v2}}</div>
          <div class="titre-md">Volumes maximaux fixés par moi</div>
          <choix-forfaits v-model="vmaxI" :f1="s.c.max1I" :f2="s.c.max2I" label-valider="OK" @valider="changervmax"/>
          <div v-if="s.c.stE===1" class="q-mt-lg titre-md">Pour information, maximaux fixés par {{s.c.nomE}}</div>
          <choix-forfaits v-if="s.c.stE===1" v-model="vmaxE" :f1="s.c.max1E" :f2="s.c.max2E" lecture/>
        </q-card-section>
       </q-card>
    </q-dialog>

    <div v-if="s.c" class="q-my-md">
      <div class="row justify-between">
        <div class="titre-md">Ardoise partagée avec mon contact
          <span v-if="s.c.ard" class="q-pl-sm font-mno fs-sm">{{'(' + s.c.ard.length + 'c) - ' + s.dh}}</span>
        </div>
        <q-btn flat dense size="sm" icon="chevron_right" @click="ardedit = !ardedit"/>
      </div>
      <div v-if="!s.c.ard" class="q-pl-sm">(vide)</div>
      <show-html v-else class="l1 q-pl-sm" :texte="s.c.ard"/>
    </div>

    <q-dialog v-model="ardedit" full-height position="right">
      <q-card class="petitelargeur q-pa-sm">
        <q-toolbar class="bg-secondary text-white">
          <q-toolbar-title class="titre-lg">Ardoise partagée</q-toolbar-title>
          <q-btn class="chl" dense flat size="md" icon="chevron_right" @click="ardedit=false"/>
        </q-toolbar>
        <editeur-md class="height-8 q-mt-lg" v-model="ardTemp" :texte="s.c.ard ? s.c.ard : ''" editable modetxt label-ok="OK" @ok="changerard"/>
       </q-card>
    </q-dialog>

    <div v-if="s.c" class="q-my-md">
      <div class="row justify-between">
        <div class="titre-md text-white">Commentaires personnels à propos du contact
          <span v-if="s.c.info" class="q-pl-sm font-mno fs-sm">({{s.c.info.length + 'c'}})</span>
        </div>
        <q-btn flat dense size="sm" icon="chevron_right" @click="comedit = !comedit"/>
      </div>
      <div v-if="!s.c.info" class="q-pl-sm">(vide)</div>
      <show-html v-else class="l1 q-pl-sm" :texte="s.c.info"/>
    </div>

    <q-dialog v-model="comedit" full-height position="right">
      <q-card class="petitelargeur q-pa-sm">
        <q-toolbar class="bg-secondary text-white">
          <q-toolbar-title class="titre-lg">Commentaires personnels</q-toolbar-title>
          <q-btn class="chl" dense flat size="md" icon="chevron_right" @click="comedit=false"/>
        </q-toolbar>
        <editeur-md class="height-8" v-model="infoTemp" :texte="s.c.info ? s.c.info : ''" editable modetxt label-ok="OK" @ok="changerinfo"/>
      </q-card>
    </q-dialog>

    <div v-if="s.c" class="q-my-md">
      <div class="row justify-between">
        <div class="titre-md">Mots clés associés au contact</div>
        <q-btn flat dense size="sm" icon="chevron_right" @click="mcledit = !mcledit"/>
      </div>
      <apercu-motscles class="q-ml-md" :motscles="s.motscles" :src="s.c.mc"/>
    </div>

    <q-dialog v-model="mcledit" full-height position="right">
      <q-card class="petitelargeur q-pa-sm">
        <q-toolbar class="bg-secondary text-white">
          <q-toolbar-title class="titre-lg">Sélection des mots clés associés</q-toolbar-title>
          <q-btn class="chl" dense flat size="md" icon="chevron_right" @click="mcledit=false"/>
        </q-toolbar>
        <select-motscles class="q-mt-md" :motscles="s.motscles" :src="s.c.mc" @ok="changermc" :close="fermermcl" sans-titre/>
      </q-card>
    </q-dialog>

    <div v-if="s.c && s.c.orig === 1 && s.c.stp === 1" class="q-mt-md">
      <div class="row justify-between">
        <div class="titre-md text-white">Contact créé lors du parrainage du compte du contact</div>
        <q-btn flat dense size="sm" icon="chevron_right" @click="paredit=!paredit"/>
      </div>
    </div>

    <q-dialog v-model="paredit" full-height position="right">
      <q-card class="petitelargeur q-pa-sm">
        <q-toolbar class="bg-secondary text-white">
          <q-toolbar-title class="titre-lg">Parrainage du compte</q-toolbar-title>
          <q-btn class="chl" dense flat size="md" icon="chevron_right" @click="paredit=false"/>
        </q-toolbar>
        <div class="q-mt-md titre-lg">Phrase convenue :</div>
        <div class="q-ml-md font-mono fs-md">{{s.c.phrase}}</div>
      </q-card>
    </q-dialog>

    <div v-if="s.c && s.c.orig === 2 && s.c.stp === 1" class="q-mt-md">
      <div class="titre-md text-white">Contact créé suite à rencontre avec le contact</div>
      <div class="q-ml-md fs-sm">Phrase de rencontre : <span class="text-italic">{{s.c.phrase}}</span></div>
    </div>

    <div v-if="close" class="top full-width">
      <q-toolbar v-if="close" class="bg-primary text-white">
        <q-toolbar-title>
          <span class="titre-md q-mr-sm">Contact</span>
          <titre-banner class-titre="titre-md" :titre="s.c.nomEd"
            :titre2="s.c.nomEd + ' [' + s.c.nomEs + '#' + s.c.na.sfx + ']'" :id-objet="s.c.id"/>
        </q-toolbar-title>
        <q-btn class="chl" dense flat size="md" icon="chevron_right" @click="fermerctc"/>
      </q-toolbar>
    </div>

    <q-page-sticky v-if="!close" class="full-width" position="top-left" expand :offset="[50, 0]">
      <q-toolbar :class="tbc">
        <q-btn :disable="!precedent" flat round dense icon="first_page" size="sm" @click="prec(0)" />
        <q-btn :disable="!precedent" flat round dense icon="arrow_back_ios" size="sm" @click="prec(1)" />
        <span>{{index + 1}}/{{sur}}</span>
        <q-btn :disable="!suivant" flat round dense icon="arrow_forward_ios" size="sm" @click="suiv(1)" />
        <q-btn :disable="!suivant" flat round dense icon="last_page" size="sm" @click="suiv(0)" />
        <q-toolbar-title>
          <titre-banner class-titre="titre-md" :titre="s.c.nomEd"
            :titre2="s.c.nomEd + ' [' + s.c.nomEs + '#' + s.c.na.sfx + ']'" :id-objet="s.c.id"/>
        </q-toolbar-title>
        <q-btn size="md" color="white" icon="menu" flat dense>
          <menu-couple :c="s.c" depuis-detail/>
        </q-btn>
      </q-toolbar>
    </q-page-sticky>

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
import ShowHtml from './ShowHtml.vue'
import TitreBanner from './TitreBanner.vue'
import FicheAvatar2 from './FicheAvatar2.vue'
import { retourInvitation } from '../app/page.mjs'
import { UNITEV1, UNITEV2 } from '../app/api.mjs'

export default ({
  name: 'PanelCouple',

  components: { FicheAvatar2, TitreBanner, EditeurMd, MenuCouple, ApercuMotscles, SelectMotscles, IdentiteCv, ChoixForfaits, ShowHtml },

  props: { couple: Object, suivant: Function, precedent: Function, index: Number, sur: Number, close: Function },

  computed: {
    tbc () { return 'bg-primary text-white' + (this.$q.screen.gt.sm ? ' ml23' : '') }
  },

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

    fermerctc () { if (this.close) this.close() },

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
      this.comedit = false
      await new MajCouple().run(this.couple, { info: info })
    },
    async changervmax (max) {
      await new MajCouple().run(this.couple, { vmax: max })
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
    const paredit = ref(false)
    const comedit = ref(false)
    const ardedit = ref(false)
    const voledit = ref(false)

    const diagnostic = computed({
      get: () => $store.state.ui.diagnostic,
      set: (val) => $store.commit('ui/majdiagnostic', val)
    })
    const couple = toRef(props, 'couple')
    const mode = computed(() => $store.state.ui.mode)
    const prefs = computed(() => { return data.getPrefs() })

    function libst (c) {
      if (c.avc === 0) {
        if (c.stp < 4) {
          if (c.orig === 0) {
            return [
              'En attente d\'acceptation ou de refus',
              'En attente d\'acceptation ou de refus',
              'Proposition explicitement refusée'
            ][c.stp - 1]
          }
          if (c.orig === 1) {
            return [
              `En attente [${c.dlv - getJourJ()} jour(s)] d'acceptation ou de refus du parrainage du compte`,
              'Parrainage du compte caduque, sans réponse dans les délais',
              'Parrainage du compte explicitement refusé'
            ][c.stp - 1]
          }
          if (c.orig === 2) {
            return [
              `En attente [${c.dlv - getJourJ()} jour(s)] d'acceptation ou de refus de contact`,
              'Proposition de contact caduque, sans réponse dans les délais',
              'Proposition de contact explicitement refusée'
            ][c.stp - 1]
          }
        }
        if (c.stp === 4) return 'Contact actif'
        return `Contact orphelin, ${c.nomE} a disparu`
      } else {
        if (c.stp < 4) {
          if (c.orig === 0) {
            return [
              'En attente d\'acceptation ou de refus de la proposition de contact',
              'En attente d\'acceptation ou de refus de la proposition de contact',
              `Proposition faite par ${c.nomE} explicitement refusée` // ne doit pas apparaître
            ][c.stp - 1]
          }
        }
        if (c.stp === 4) return 'Contact actif'
        return `Contact orphelin, ${c.nomE} a disparu`
      }
    }

    const s = reactive({
      motcles: null,
      c: null, // couple courant
      stlib: '',
      dh: '', // date-heure de l'ardoise
      v1: '',
      v2: ''
    })

    const mc = reactive({ categs: new Map(), lcategs: [], st: { enedition: false, modifie: false } })

    function chargerMc () {
      s.motscles = new Motscles(mc, 1, 0)
      s.motscles.recharger()
    }

    function initState () {
      s.c = couple.value
      s.stlib = s.c ? libst(s.c) : ''
      s.dh = s.c ? dhstring(s.c.dh) : ''
      s.v1 = s.c ? edvol(s.c.v1) : ''
      s.v2 = s.c ? edvol(s.c.v2) : ''
      let max1 = 0, max2 = 0
      if (s.c && s.c.stI === 1) {
        max1 = s.c.max1I
        max2 = s.c.max2I
        if (s.c.stE) {
          if (s.c.max1E < max1) max1 = s.c.max1E
          if (s.c.max2E < max2) max2 = s.c.max2E
        }
      }
      s.max1 = s.c ? edvol(max1 * UNITEV1) : ''
      s.max2 = s.c ? edvol(max2 * UNITEV2) : ''
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
      paredit.value = false
      comedit.value = false
      ardedit.value = false
    })

    return {
      mcledit,
      paredit,
      comedit,
      ardedit,
      voledit,
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
.chl
  position: relative
  left: -10px
.l1
  max-height: 1.8rem
  overflow: hidden
.ml23
  margin-left: 23rem
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
