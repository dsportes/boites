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
        <menu-couple :c="s.c"/>
      </q-btn>
    </q-toolbar>
    <q-toolbar v-if="s.c" inset class="bg-primary text-white">
      <q-toolbar-title><div class="titre-md text-bold">Contact {{s.c.nomEd}}</div></q-toolbar-title>
    </q-toolbar>

    <div v-if="s.c">
      <div class="titre-md">{{s.stlib}}</div>
      <div class="q-ml-md fs-sm">Volumes occupés par les secrets: {{s.v1}} / {{s.v2}}</div>
      <div v-if="s.c.stI===1" class="q-ml-md fs-sm">J'ai accès aux secrets du contact</div>
      <div v-if="s.c.stI===0" class="q-ml-md fs-sm">Je n'ai PAS accès aux secrets du contact</div>
      <div v-if="s.c.stE===1" class="q-ml-md fs-sm">{{s.c.nomE}} a accès aux secrets du contact</div>
      <div v-if="s.c.stE===0" class="q-ml-md fs-sm">{{s.c.nomE}} n'a PAS accès aux secrets du contact</div>
      <div v-if="s.c.naE" class="q-mt-lg">
        <identite-cv :nom-avatar="s.c.naE" type="avatar" invitable/>
      </div>
      <div class="titre-md q-mt-lg">Carte de visite spécifique du contact</div>
      <identite-cv :nom-avatar="s.c.na" type="couple" editable @cv-changee="cvchangee"/>
    </div>

    <div v-if="s.c" class="q-my-md">
      <div class="row justify-between">
        <div class="titre-md">Volumes maximaux autorisés pour les secrets du contact</div>
        <q-btn flat dense size="sm" icon="chevron_right" @click="voledit = !voledit"/>
      </div>
      <div class="q-pl-sm fs-sm">v1: {{s.max1}} / v2: {{s.max2}}</div>
    </div>

    <q-dialog v-model="voledit" full-height position="right">
      <q-card class="petitelargeur q-pa-sm">
        <q-btn class="chl" dense flat size="md" icon="chevron_left" @click="voledit=false"/>
        <div class="q-my-md titre-lg text-center">Volumes maximaux autorisés</div>
        <q-card-section>
          <div class="titre-md">Fixés par moi</div>
          <choix-forfaits v-model="vmaxI" :f1="s.c.max1I" :f2="s.c.max2I" label-valider="OK" @valider="changervmax"/>
          <div v-if="s.c.stE===1" class="q-mt-lg titre-md">Pour information, fixés par {{s.c.nomE}}</div>
          <choix-forfaits v-if="s.c.stE===1" v-model="vmaxE" :f1="s.c.max1E" :f2="s.c.max2E" lecture/>
        </q-card-section>
       </q-card>
    </q-dialog>

    <div v-if="s.c" class="q-my-md">
      <div class="row justify-between">
        <div class="titre-md text-white">Ardoise partagée avec mon contact
          <span v-if="s.c.ard" class="q-pl-sm font-mno fs-sm">{{'(' + s.c.ard.length + 'c) - ' + s.dh}}</span>
        </div>
        <q-btn flat dense size="sm" icon="chevron_right" @click="ardedit = !ardedit"/>
      </div>
      <div v-if="!s.c.ard" class="q-pl-sm">(vide)</div>
      <show-html v-else class="l1 q-pl-sm" :texte="s.c.ard"/>
    </div>

    <q-dialog v-model="ardedit" full-height position="right">
      <q-card class="petitelargeur q-pa-sm">
        <q-btn class="chl" dense flat size="md" icon="chevron_left" @click="ardedit=false"/>
        <div class="q-my-md titre-lg text-center">Ardoise partagée</div>
        <editeur-md class="height-8" v-model="ardTemp" :texte="s.c.ard ? s.c.ard : ''" editable modetxt label-ok="OK" @ok="changerard"/>
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
        <q-btn class="chl" dense flat size="md" icon="chevron_left" @click="comedit=false"/>
        <div class="q-my-md titre-lg text-center">Commentaires personnels</div>
        <editeur-md class="height-8" v-model="infoTemp" :texte="s.c.info ? s.c.info : ''" editable modetxt label-ok="OK" @ok="changerinfo"/>
      </q-card>
    </q-dialog>

    <div v-if="s.c" class="q-my-md">
      <div class="row justify-between">
        <div class="titre-md text-white">Mots clés associés au contact</div>
        <q-btn flat dense size="sm" icon="chevron_right" @click="mcledit = !mcledit"/>
      </div>
      <apercu-motscles class="q-ml-md" :motscles="s.motscles" :src="s.c.mc"/>
    </div>

    <q-dialog v-model="mcledit" full-height position="right">
      <q-card class="petitelargeur">
      <select-motscles :motscles="s.motscles" :src="s.c.mc" @ok="changermc" :close="fermermcl"></select-motscles>
      </q-card>
    </q-dialog>

    <div v-if="s.c && s.c.orig === 1" class="q-mt-md">
      <div class="row justify-between">
        <div class="titre-md text-white">Contact créé lors du parrainage du compte du contact</div>
        <q-btn flat dense size="sm" icon="chevron_right" @click="paredit=!paredit"/>
      </div>
    </div>

    <q-dialog v-model="paredit" full-height position="right">
      <q-card class="petitelargeur q-pa-sm">
        <q-btn class="chl" dense flat size="md" icon="chevron_left" @click="paredit=false"/>
        <div class="q-mt-lg titre-lg">Phrase de parrainage :</div>
        <div class="q-ml-md font-mono fs-md text-italic">{{s.c.data.phrase}}</div>
        <div class="q-mt-lg titre-lg">Forfaits attribués au compte parrainé :</div>
        <choix-forfaits v-model="pf" :f1="s.c.data.f1" :f2="s.c.data.f2" lecture/>
        <div class="q-mt-lg titre-lg" v-if="s.c.data.r1 || s.c.data.r2" >Réserve attribuée pour parrainage d'autres comptes :</div>
        <choix-forfaits v-if="s.c.data.r1 || s.c.data.r2" v-model="pr" :f1="s.c.data.r1" :f2="s.c.data.r2" lecture/>
      </q-card>
    </q-dialog>

    <div v-if="s.c && s.c.orig === 2" class="q-mt-md">
      <div class="row justify-between">
        <div class="titre-md text-white">Contact créé suite à rencontre avec le contact</div>
        <div class="q-ml-md fs-sm">Phrase de rencontre : <span class="text-italic">{{s.c.data.phrase}}</span></div>      </div>
    </div>

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
import { retourInvitation } from '../app/page.mjs'
import { UNITEV1, UNITEV2 } from '../app/api.mjs'

export default ({
  name: 'PanelCouple',

  components: { EditeurMd, MenuCouple, ApercuMotscles, SelectMotscles, IdentiteCv, ChoixForfaits, ShowHtml },

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
            ][c.stp]
          }
          if (c.orig === 1) {
            return [
              `En attente [${c.dlv - getJourJ()} jour(s)] d'acceptation ou de refus du parrainage du compte`,
              'Parrainage du compte caduque, sans réponse dans les délais',
              'Parrainage du compte explicitement refusé'
            ][c.stp]
          }
          if (c.orig === 2) {
            return [
              `En attente [${c.dlv - getJourJ()} jour(s)] d'acceptation ou de refus de contact`,
              'Proposition de contact caduque, sans réponse dans les délais',
              'Proposition de contact explicitement refusée'
            ][c.stp]
          }
        }
        if (c.stp === 4) return `Contact avec ${c.nomE} actif`
        return `Contact orphelin, ${c.nomE} a disparu`
      } else {
        if (c.stp < 4) {
          if (c.orig === 0) {
            return [
              'En attente d\'acceptation ou de refus de la proposition de contact',
              'En attente d\'acceptation ou de refus de la proposition de contact',
              `Proposition faite par ${c.nomE} explicitement refusée` // ne doit pas apparaître
            ][c.stp]
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
  max-height: 1.1rem
  overflow: hidden
</style>
