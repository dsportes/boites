<template>
  <q-card class="full-height moyennelargeur fs-md column">
    <q-toolbar class="col-auto bg-primary text-white maToolBar">
      <q-btn flat round dense icon="close" size="md" class="q-mr-sm" @click="fermer" />
      <q-toolbar-title><div class="titre-md tit text-center">{{state.g ? state.g.nom : ''}}</div></q-toolbar-title>
    </q-toolbar>
    <q-separator/>

    <q-expansion-item v-if="state.g" group="etc" label="Carte de visite du groupe" default-opened
        header-class="expansion-header-class-1 titre-lg bg-primary text-white">
      <apercu-groupe :groupe="state.g" :editer="anim"/>
      <q-toggle v-model="state.arch" :disable="!anim" size="md" :color="state.arch ? 'warning' : 'green'"
          :label="state.arch ? 'Création de secrets et mises à jour bloquées' : 'Création de secrets et mises à jour libres'"/>
      <div v-if="state.g.stx === 2">
        <div class="text-italic text-bold" color="warning">Invitation bloquées - {{state.nbvote}} vote(s) pour le déblocage sur {{state.nbanim}}</div>
        <q-btn v-if="anim" class="q-ma-xs" size="md" dense icon="unlock" label="Débloquer les invitations" @click="debloquer" />
      </div>
      <div v-if="state.g.stx === 1">
        <div class="text-italic">Les invitations sont libres</div>
        <q-btn v-if="anim" class="q-ma-xs" size="md" dense icon="lock" label="Bloquer les invitations" @click="bloquer" />
      </div>
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
          <div :class="dkli(idx) + ' membrecourant q-px-xs full-width row items-start cursor-pointer'">
            <img class="col-auto photomax" :src="m.ph || personne"/>
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
              <div v-if="m.ard" class="row justify-between cursor-pointer">
                <div class="col-auto q-pr-sm">Ardoise :</div>
                <show-html class="col height-2" :texte="m.ard" :idx="idx"/>
                <div class="col-auto q-pl-sm fs-sm">{{m.dhed}}</div>
              </div>
              <div v-else class="text-italic">(ardoise partagée avec le groupe vide)</div>
              <div v-if="m.estAvc" class="cursor-pointer">
                <div v-if="m.info">
                  <div>Titre et commentaires personnels à propos du groupe</div>
                  <show-html class="height-2" :texte="m.info" :idx="idx"/>
                </div>
                <div v-else class="text-italic">(pas de commentaires personnels à propos du groupe)</div>
              </div>
              <apercu-motscles v-if="m.estAvc" :motscles="state.motsclesGr" :src="m.mc"/>
            </div>
          </div>
        </q-card>
      </div>
    </q-expansion-item>
    <q-separator/>

<!--
    <q-card-section>
      <div class="titre-md">Ardoise commune avec le groupe</div>
      <editeur-md class="height-8" v-model="state.ard" :texte="contact ? contact.ard : ''" editable/>
    </q-card-section>

    <q-card-section>
      <div class="titre-md">Commentaires personnels</div>
      <editeur-md class="height-8" v-model="state.info" :texte="contact ? contact.info : ''" editable/>
    </q-card-section>

    <q-dialog v-model="mcledit">
      <select-motscles :motscles="state.motscles" :src="state.mc" @ok="changermcl" :close="fermermcl"></select-motscles>
    </q-dialog>
-->
  </q-card>
</template>
<script>
import { computed, reactive, watch } from 'vue'
import { useStore } from 'vuex'
import { Motscles, equ8, cfg, FiltreMbr } from '../app/util.mjs'
import { data } from '../app/modele.mjs'
import { MajMcGroupe, MajArchGroupe, MajBIGroupe } from '../app/operations.mjs'
import ShowHtml from './ShowHtml.vue'
import ApercuMotscles from './ApercuMotscles.vue'
import ApercuGroupe from './ApercuGroupe.vue'
import MotsCles from './MotsCles.vue'

// import EditeurMd from './EditeurMd.vue'
// import SelectMotscles from './SelectMotscles.vue'

export default ({
  name: 'PanelGroupe',

  components: { ShowHtml, ApercuMotscles, MotsCles, ApercuGroupe /* EditeurMd, SelectMotscles */ },

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
      mcledit: false
    }
  },

  methods: {
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
    fermer () { if (this.close) this.close() },
    dkli (idx) { return this.$q.dark.isActive ? (idx ? 'sombre' + (idx % 2) : 'sombre0') : (idx ? 'clair' + (idx % 2) : 'clair0') }
  },

  setup () {
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
      state.motsclesGr = new Motscles(mcGr, 2, groupeplus.value ? groupeplus.value.g.id : 0)
      state.motsclesGr.recharger()
    }

    const recherche = reactive({ // doit correspondre au Filtre par défaut
      a: new FiltreMbr().etat(),
      p: new FiltreMbr().etat()
    })

    function initState () {
      state.filtre = new FiltreMbr()
      const x = groupeplus.value
      state.g = x.g
      state.m = x.m
      state.arch = x.g ? x.g.sty === 1 : false
      chargerMcGr()
    }

    watch(state, async (ap, av) => {
      if (state.gr && ap.arch !== state.g.sty === 1) {
        await new MajArchGroupe().run(state.g, ap)
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
    chargerMc()
    latotale()

    watch(() => prefs.value, (ap, av) => {
      chargerMc()
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

    return {
      initState,
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
.membrecourant:hover
  background-color: rgba(130, 130, 130, 0.5)
</style>
