<template>
  <q-card class="full-height moyennelargeur fs-md column">
    <q-toolbar class="col-auto bg-secondary text-white maToolBar">
      <q-btn flat round dense icon="close" size="md" class="q-mr-sm" @click="fermer" />
      <q-toolbar-title><div class="titre-md tit text-center">{{state.g ? state.g.nom : ''}}</div></q-toolbar-title>
    </q-toolbar>
    <q-separator/>

    <q-expansion-item v-if="state.g" group="etc" label="Carte de visite du groupe" default-opened
        header-class="expansion-header-class-1 titre-lg bg-primary text-white">
      <apercu-groupe :editer="anim"/>
      <q-toggle v-model="state.arch" :disable="!anim" size="md" :color="state.arch ? 'warning' : 'green'"
          :label="state.arch ? 'Création de secrets et mises à jour bloquées' : 'Création de secrets et mises à jour libres'"/>
      <div v-if="state.g.stx === 2">
        <div class="text-italic text-bold" color="warning">Invitation bloquées - {{state.nbvote}} vote(s) pour le déblocage sur {{state.nbanim}}</div>
        <q-btn v-if="anim" class="q-ma-xs" size="md" dense icon="lock_open" label="Débloquer les invitations" @click="debloquer" />
      </div>
      <div v-if="state.g.stx === 1">
        <div class="text-italic">Les invitations sont libres</div>
        <q-btn v-if="anim" class="q-ma-xs" size="md" dense icon="lock" label="Bloquer les invitations" @click="bloquer" />
      </div>
    </q-expansion-item>
    <q-separator/>

    <q-expansion-item v-if="state.g" group="etc" label="Mots clés spécifiques du groupe" color="secondary"
        header-class="expansion-header-class-1 bg-primary text-white">
      <template v-slot:header>
        <q-item-section>
        <div class="titre-lg text-white">
          <span :class="state.g.pc1 > 80 || state.g.pc2 > 80 ? 'text-warning bg-yellow-4' : ''">Taux d'occupation {{state.g.pc1}}% / {{state.g.pc2}}%</span>
          <span v-if="state.g.dfh" class="text-negative bg-yellow-4 text-bold q-ml-sm q-px-xs">PAS D'HEBERGEMENT</span>
        </div>
        </q-item-section>
      </template>
      <q-card class="shadow-8 q-ma-sm">
        <div v-if="state.g.dfh" class="text-negative bg-yellow-4 text-bold q-mx-xs q-pa-xs">
          Le groupe n'a pas de compte qui l'héberge. Mises à jour et créations de secrets bloquées.
          S'auto-détruira dans {{nbj(state.g.dfh)}} jour(s).
          <q-btn dense color="primary" label="Héberger le groupe" @click="debheb"/>
        </div>
        <q-btn v-if="state.g.estHeb" dense color="secondary" class="q-ma-xs" label="Fin d'hébergement du groupe" @click="finheb"/>
        <div>Volumes occupés (arrondis en Mo): {{Math.round(state.g.v1 / 1000000)}}Mo / {{Math.round(state.g.v2 / 1000000)}}Mo</div>
        <div v-if="state.g.pc1 > 80 || state.g.pc2 > 80" class="q-ma-xs">
          <q-icon name="warning" size="md" color="warning"/>
          <span class="text-warning q-px-sm text-bold">Alerte sur les volumes - v1: {{state.g.pc1}}% / v2: {{state.g.pc2}}%</span>
        </div>
        <div>
          <div class="titre-md">Forfaits attribués</div>
          <choix-forfaits v-model="state.forfaits" :lecture="!state.g.estHeb" :f1="9" :f2="state.g.f2" :v1="12000000" :v2="state.g.v2"
            label-valider="Changer les volumes maximum autorisés" @valider="chgvolmax"/>
        </div>
      </q-card>
    </q-expansion-item>
    <q-separator/>

    <q-expansion-item v-if="state.g" group="etc" label="Mots clés spécifiques du groupe" color="secondary"
        header-class="expansion-header-class-1 titre-lg bg-primary text-white">
      <mots-cles :motscles="state.motsclesGr" :lecture="!anim" @ok="changermcl"/>
    </q-expansion-item>
    <q-separator/>

    <q-expansion-item v-if="state.g" group="etc" label="Liste des membres du groupe" color="secondary"
        header-class="expansion-header-class-1 titre-lg bg-primary text-white">
      <div v-for="(m, idx) in state.lst" :key="m.pkv">
        <q-card class="shadow-8">
          <div :class="dkli(idx) + ' zone q-px-xs full-width row items-start cursor-pointer'">
            <div class="col-auto column justify-center q-px-xs">
              <img class="col-auto photomax" :src="m.ph || personne"/>
              <q-btn size="md" color="primary" icon="menu" flat dense class="q-mt-sm"/>
            </div>
            <div class="col q-px-sm">
              <div class="titre-md text-bold">{{m.nom}}</div>
              <div>
                <q-icon v-if="m.estAvc" class="q-mr-xs" size="sm" color="warning" name="stars"/>
                <span v-if="m.estAvc" class="q-mr-sm text-bold text-warning">MOI</span>
                <q-icon size="sm" :color="m.stx === 2 ?'primary':'warning'"
                  :name="m.stx < 2 ? 'hourglass_empty' : (m.stx === 2 ? 'thumb_up' : 'thumb_down')"/>
                <span class="q-px-sm">{{statuts[m.stx]}}</span>
                <span class="q-px-sm" :color="m.stp < 2 ?'primary':'warning'">{{['Simple lecteur','Auteur','Animateur'][m.stp]}}</span>
                <span v-if="state.g.imh === m.im" class="q-px-xs text-bold text-italic text-warning">Hébergeur du groupe</span>
              </div>
              <div v-if="m.ard" class="row justify-between cursor-pointer zone" @click="ouvmajard(m)">
                <div class="col-auto q-pr-sm titre-md text-italic">Ardoise :</div>
                <show-html class="col height-2" :texte="m.ard" :idx="idx"/>
                <div class="col-auto q-pl-sm fs-sm">{{m.dhed}}</div>
              </div>
              <div v-else class="text-italic cursor-pointer zone" @click="ouvmajard(m)">(rien sur l'ardoise partagée avec le groupe)</div>
              <div v-if="m.estAvc">
                <div v-if="m.info" class="zone cursor-pointer" @click="ouvmajinfo(m)">
                  <div class="titre-md text-italic">Titre et commentaires personnels à propos du groupe</div>
                  <show-html class="height-2" :texte="m.info" :idx="idx"/>
                </div>
                <div v-else class="text-italic cursor-pointer zone" @click="ouvmajinfo(m)">(pas de commentaires personnels à propos du groupe)</div>
                <div class="zone cursor-pointer" @click="ouvrirmc(m)">
                  <span class="titre-md text-italic q-pr-sm">Mots clés :</span>
                  <apercu-motscles :motscles="state.motsclesGr"
                    :src="m.mc" :groupe-id="state.g.id" :args-click="m" @click-mc="ouvrirmc"/>
                </div>
              </div>
            </div>
          </div>
        </q-card>
      </div>
    </q-expansion-item>
    <q-separator/>

    <q-dialog v-model="ardedit">
      <q-card-section class="petitelargeur shadow-8">
        <div class="titre-md">Ardoise commune avec le groupe</div>
        <editeur-md class="height-8" v-model="mbcard" :texte="mbc.ard" editable @ok="changerardmbc" label-ok="OK" :close="fermermajard"/>
      </q-card-section>
    </q-dialog>

    <q-dialog v-model="infoedit">
      <q-card-section class="petitelargeur shadow-8">
        <div class="row justify-between align-start">
          <div class="col titre-md">Commentaires personnels à propos du groupe</div>
          <q-btn class="col-auto q-ml-sm" flat round dense icon="close" color="negative" size="md" @click="infoedit = false" />
        </div>
        <editeur-md class="height-8" v-model="mbcinfo" :texte="mbc.info" editable @ok="changerinfombc" label-ok="OK" :close="fermermajinfo"/>
      </q-card-section>
    </q-dialog>

    <q-dialog v-model="mcledit">
      <select-motscles :motscles="state.motsclesGr" :src="mbc.mc" @ok="changermcmbc" :close="fermermcl"></select-motscles>
    </q-dialog>

  </q-card>
</template>
<script>
import { computed, reactive, watch } from 'vue'
import { useStore } from 'vuex'
import { useQuasar } from 'quasar'
import { Motscles, equ8, cfg, FiltreMbr, getJourJ } from '../app/util.mjs'
import { data } from '../app/modele.mjs'
import { MajMcGroupe, MajArchGroupe, MajBIGroupe, MajMcMembre, MajArdMembre, MajInfoMembre } from '../app/operations.mjs'
import ShowHtml from './ShowHtml.vue'
import ApercuMotscles from './ApercuMotscles.vue'
import ApercuGroupe from './ApercuGroupe.vue'
import MotsCles from './MotsCles.vue'
import EditeurMd from './EditeurMd.vue'
import SelectMotscles from './SelectMotscles.vue'
import ChoixForfaits from './ChoixForfaits.vue'

export default ({
  name: 'PanelGroupe',

  components: { ShowHtml, ApercuMotscles, MotsCles, ApercuGroupe, SelectMotscles, EditeurMd, ChoixForfaits },

  props: { close: Function },

  computed: {
    anim () { return this.state.maxstp === 2 },
    modif () {
      const c = this.contact
      if (!c) return false
      const s = this.state
      return c.info !== s.info || c.ard !== s.ard || !equ8(c.mc, s.mc) || s.aps !== (c.stx === 1)
    }
  },

  data () {
    return {
      erreur: '',
      mcledit: false,
      ardedit: false,
      infoedit: false,
      mbcard: '',
      mbcinfo: '',
      mbc: null // membre courant
    }
  },

  methods: {
    dkli (idx) { return this.$q.dark.isActive ? (idx ? 'sombre' + (idx % 2) : 'sombre0') : (idx ? 'clair' + (idx % 2) : 'clair0') },
    nbj (j) { return j - getJourJ() },
    fermermajard () { this.ardedit = false },
    fermermajinfo () { this.infoedit = false },
    ouvmajinfo (m) { this.infoedit = true; this.mbc = m; this.mbcinfo = m.info },
    ouvmajard (m) { this.ardedit = true; this.mbc = m; this.mbcard = m.ard },
    ouvrirmc (m) { this.mcledit = true; this.mbc = m },
    fermermcl () { this.mcledit = false },
    async changermcl (mmc) {
      new MajMcGroupe().run(this.state.g, mmc)
    },
    async bloquer () {
      await new MajBIGroupe().run(this.state.g, true)
    },
    async debloquer () {
      await new MajBIGroupe().run(this.state.g, false)
    },
    async changermcmbc (mc) {
      await new MajMcMembre().run(this.mbc, mc)
    },
    async changerardmbc (texte) {
      await new MajArdMembre().run(this.mbc, texte)
      this.ardedit = false
    },
    async changerinfombc (texte) {
      await new MajInfoMembre().run(this.mbc, texte)
      this.infoedit = false
    },
    fermer () { if (this.close) this.close() },
    debheb () { },
    finheb () { },
    chgvolmax (f) {
      console.log(f.join('/'))
    }
  },

  setup () {
    const $q = useQuasar()
    const $store = useStore()
    const personnes = cfg().personnes.default
    const personne = cfg().personne.default
    const diagnostic = computed({
      get: () => $store.state.ui.diagnostic,
      set: (val) => $store.commit('ui/majdiagnostic', val)
    })
    const groupeplus = computed(() => { return $store.state.db.groupeplus })
    const mode = computed(() => $store.state.ui.mode)
    const prefs = computed(() => { return data.getPrefs() })
    // const avatar = computed(() => { return $store.state.db.avatar })
    const membres = computed(() => { return groupeplus.value ? data.getMembre(groupeplus.value.g.id) : {} })
    const repertoire = computed(() => { return $store.state.db.repertoire })

    const state = reactive({
      filtre: { p: true, i: true, a: true, n: true, dh: false, asc: true },
      forfaits: [0, 0],
      motcles: null,
      g: null,
      arch: false,
      m: null,
      lst: [], // liste des membres
      lstAc: [], // parmi les membres celui / ceux avatar du compte
      nbanim: 0,
      nbvote: 0,
      maxstp: 0, // statut lecteur / auteur / animateur max des avaters du compte membres du groupe
      motclesGr: null
    })

    const mc = reactive({ categs: new Map(), lcategs: [], st: { enedition: false, modifie: false } })

    function chargerMc () {
      state.motscles = new Motscles(mc, 3, groupeplus.value ? groupeplus.value.g.id : 0)
      state.motscles.recharger()
    }

    const mcGr = reactive({ categs: new Map(), lcategs: [], st: { enedition: false, modifie: false } })

    function chargerMcGr () {
      state.motsclesGr.recharger()
    }

    const recherche = reactive({ // doit correspondre au Filtre par défaut
      a: new FiltreMbr().etat(),
      p: new FiltreMbr().etat()
    })

    function initState () {
      state.filtre = new FiltreMbr()
      state.motsclesGr = new Motscles(mcGr, 2, groupeplus.value ? groupeplus.value.g.id : 0)
      const x = groupeplus.value
      if (x) {
        state.g = x.g
        state.arch = x.g ? x.g.sty === 1 : false
        state.forfaits = [x.g.f1, x.g.f2]
      }
      chargerMcGr()
    }

    watch(state, async (ap, av) => {
      if (state.g) {
        const avant = state.g.sty === 1
        if (ap.arch !== avant) {
          confirmer()
        }
      }
    })

    function getMembres () {
      const f = state.filtre
      f.debutFiltre()
      const lst = []
      const lstAc = []
      let maxstp = 0
      let nbanim = 0
      let nbvote = 0
      for (const im in membres.value) {
        const m = membres.value[im]
        if (f.filtre(m)) lst.push(m)
        if (m.estAvc) { lstAc.push(m); if (m.stp > maxstp) maxstp = m.stp }
        if (m.stp === 2) nbanim++
        if (m.stp === 2 && m.vote) nbvote++
      }
      state.lst = lst
      state.lstAc = lstAc
      state.maxstp = maxstp
      state.nbanim = nbanim
      state.nbvote = nbvote
    }

    function trier () {
      const l = []; state.lst.forEach(x => l.push(x))
      l.sort((a, b) => state.filtre.fntri(a, b))
      state.lst = l
    }

    function latotale () {
      getMembres()
      trier()
    }

    initState()
    chargerMcGr()
    chargerMc()
    latotale()

    watch(() => prefs.value, (ap, av) => {
      chargerMc()
    })

    watch(() => membres.value, (ap, av) => {
      latotale()
    })

    watch(() => groupeplus.value, (ap, av) => {
      initState()
      chargerMcGr()
      chargerMc()
      latotale()
    })

    watch(() => repertoire.value, (ap, av) => {
      latotale()
    })

    function confirmer () {
      $q.dialog({
        dark: true,
        title: 'Confirmer',
        message: state.arch ? 'Voulez-vous vraiement INTERDIRE la mise à jour et la création de secrets ?'
          : 'Voulez-vous vraiement AUTORISER A NOUVEAU la mise à jour et la création de secrets ?',
        cancel: { label: 'Je Renonce', color: 'primary' },
        ok: { color: 'warning', label: state.arch ? 'Je veux interdire' : 'Je veux autoriser' },
        persistent: true
      }).onOk(async () => {
        await new MajArchGroupe().run(state.g, state.arch)
      }).onCancel(() => {
        state.arch = !state.arch
      }).onDismiss(() => {
        // console.log('I am triggered on both OK and Cancel')
      })
    }

    return {
      personnes,
      personne,
      recherche,
      state,
      diagnostic,
      mode,
      options: ['Tous', 'Pressentis', 'Invités', 'Actifs', 'Inactivés', 'Refusés', 'Résiliés', 'Disparus'],
      statuts: ['pressenti', 'invité', 'actif', 'refusé', 'résilié', 'disparu']
    }
  }
})
</script>
<style lang="sass" scoped>
@import '../css/app.sass'
.bord1
  border:  1px solid $grey-5
.photomax
  position: relative
  top: 5px
.ml20
  width: 100%
  padding: 0.2rem 0.2rem 0.2rem 23rem
.itemcourant:hover
  border: 1px solid $warning
.itemcourant
  border: 1px solid transparent
</style>
