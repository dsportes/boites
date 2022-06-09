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
    <q-toolbar v-if="s.c" inset class="bg-primary text-white">
      <q-toolbar-title><div class="titre-md text-bold">{{s.stlib}}</div></q-toolbar-title>
    </q-toolbar>

    <div v-if="s.c">
      <div class="titre-lg">Contact {{s.c.nomEd}}</div>
      <div class="titre-md bg-secondary text-white">Carte de visite spécifique du contact</div>
      <identite-cv :nom-avatar="s.c.na" type="couple" editable @cv-changee="cvchangee"/>
      <q-separator/>
      <div v-if="s.c.naE">
        <div class="titre-md bg-secondary text-white">Carte de visite de {{s.c.nomE}}</div>
        <identite-cv :nom-avatar="s.c.naE" type="avatar" invitable/>
        <q-separator/>
      </div>
    </div>

    <q-expansion-item v-if="s.c" header-class="expansion-header-class-1 titre-md bg-secondary text-white">
      <template v-slot:header>
        <q-item-section>Volumes occupés par les secrets: {{s.v1}} / {{s.v2}}</q-item-section>
      </template>
      <q-card-section>
        <div v-if="s.c.stI===1" class="titre-md">J'ai accès aux secrets du contact</div>
        <div v-if="s.c.stI===0" class="titre-md">Je n'ai PAS accès aux secrets du contact</div>
        <div v-if="s.c.stE===1" class="titre-md">{{s.c.nomE}} a accès aux secrets du contact</div>
        <div v-if="s.c.stE===0" class="titre-md">{{s.c.nomE}} n'a PAS accès aux secrets du contact</div>
      </q-card-section>
      <q-card-section v-if="s.c.stI===1 || s.c.stE===1">
        <div class="bord1 q-pa-xs">
          <div class="titre-md text-italic">Volumes maximaux pour les secrets du contact</div>
          <div v-if="s.c.stI===1" class="titre-md text-italic">Fixés par moi</div>
          <choix-forfaits v-if="s.c.stI===1" v-model="vmaxI" :f1="s.max1I" :f2="s.max2I" label-valider="OK" @valider="changervmax"/>
          <div v-if="s.c.stE===1" class="titre-md">Fixés par {{s.c.nomE}}</div>
          <choix-forfaits v-if="s.c.stE===1" v-model="vmaxE" :f1="s.c.max1E" :f2="s.max2E" lecture/>
        </div>
      </q-card-section>
    </q-expansion-item>
    <q-separator v-if="s.c"/>

    <q-expansion-item v-if="s.c" header-class="expansion-header-class-1 titre-md bg-secondary text-white">
      <template v-slot:header>
        <q-item-section>
          Ardoise du contact ({{!s.c.ard ? 'vide': s.c.ard.length + 'c'}}){{s.c.ard.length ? ' - ' + s.dh : ''}}
        </q-item-section>
      </template>
      <q-card-section>
        <editeur-md class="height-8" v-model="ardTemp" :texte="s.c.ard ? s.c.ard : ''" editable modetxt label-ok="OK" @ok="changerard"/>
      </q-card-section>
    </q-expansion-item>
    <q-separator v-if="s.c"/>

    <q-expansion-item v-if="s.c" header-class="expansion-header-class-1 titre-md bg-secondary text-white">
      <template v-slot:header>
        <q-item-section>Commentaires personnels ({{!s.c.info ? 'vide': s.c.info.length + 'c'}})</q-item-section>
      </template>
      <q-card-section>
        <editeur-md class="height-8" v-model="infoTemp" :texte="s.c.info ? s.c.info : ''" editable modetxt label-ok="OK" @ok="changerinfo"/>
      </q-card-section>
    </q-expansion-item>
    <q-separator v-if="s.c" />

    <div v-if="s.c">
      <div class="titre-md bg-secondary text-white">Mots clés qualifiant le contact</div>
      <apercu-motscles :motscles="s.motscles" :src="s.c.mc" :args-click="{}" @click-mc="mcledit=true"/>
      <q-separator/>
    </div>

    <q-expansion-item v-if="s.c && s.c.orig === 1" header-class="expansion-header-class-1 titre-md bg-secondary text-white">
      <template v-slot:header>
        <q-item-section>Contact créé du fait du parrainage du compte de {{s.c.nomE}}</q-item-section>
      </template>
      <q-card-section>
        <div>Phrase de parrainage : <span class="text-italic">{{s.c.data.phrase}}</span></div>
        <div>Forfaits attribués au compte parrainé :</div>
        <choix-forfaits v-model="pf" :f1="s.c.data.f1" :f2="s.c.data.f2" lecture/>
        <div v-if="s.c.data.r1 || s.c.data.r2" >Réserve attribuée pour parrainage d'autres comptes :</div>
        <choix-forfaits v-if="s.c.data.r1 || s.c.data.r2" v-model="pr" :f1="s.c.data.r1" :f2="s.c.data.r2" lecture/>
      </q-card-section>
    </q-expansion-item>
    <q-separator/>

    <q-expansion-item v-if="s.c && s.c.orig === 2" header-class="expansion-header-class-1 titre-md bg-secondary text-white">
      <template v-slot:header>
        <q-item-section>Contact créé par une phrase de rencontre convenue avec {{s.c.nomE}}</q-item-section>
      </template>
      <q-card-section>
        <div>Phrase de rencontre : <span class="text-italic">{{s.c.data.phrase}}</span></div>
      </q-card-section>
    </q-expansion-item>
    <q-separator/>

    <q-dialog v-model="mcledit">
      <select-motscles :motscles="s.motscles" :src="s.c.mc" @ok="changermc" :close="fermermcl"></select-motscles>
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
              `En attente d'acceptation ou de refus du contact de ${c.nomE}`,
              `En attente d'acceptation ou de refus du contact de ${c.nomE}`,
              `Proposition faite à ${c.nomE} explicitement refusée`
            ][c.stp]
          }
          if (c.orig === 1) {
            return [
              `En attente [${c.dlv - getJourJ()} jour(s)] d'acceptation ou de refus du parrainage du compte de ${c.nomE}`,
              `Parrainage du compte de ${c.nomE} caduque, sans réponse dans les délais`,
              `Parrainage du compte de ${c.nomE} explicitement refusé`
            ][c.stp]
          }
          if (c.orig === 2) {
            return [
              `En attente [${c.dlv - getJourJ()} jour(s)] d'acceptation ou de refus de contact avec ${c.nomE}`,
              `Proposition de contact faite à ${c.nomE} caduque, sans réponse dans les délais`,
              `Proposition de rencontre faite à ${c.nomE} explicitement refusée`
            ][c.stp]
          }
        }
        if (c.stp === 4) return `Contact avec ${c.nomE} actif`
        return `Contact orphelin, ${c.nomE} a disparu`
      } else {
        if (c.stp < 4) {
          if (c.orig === 0) {
            return [
              `En attente d'acceptation ou de refus du contact proposé par ${c.nomE}`,
              `En attente d'acceptation ou de refus du contact proposé par ${c.nomE}`,
              `Proposition faite par ${c.nomE} explicitement refusée` // ne doit pas apparaître
            ][c.stp]
          }
        }
        if (c.stp === 4) return `Contact avec ${c.nomE} actif`
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
