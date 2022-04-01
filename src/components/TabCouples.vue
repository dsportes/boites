<template>
<div v-if="sessionok" :class="$q.screen.gt.sm ? 'ml20' : 'q-pa-xs full-width'">
  <div v-if="state.lst && state.lst.length" class="col">
    <div v-for="(c, idx) in state.lst" :key="c.pkv"
      :class="dkli(idx) + ' zone full-width row items-start q-py-xs cursor-pointer'">
      <div class="col-auto column q-px-xs">
        <img class="photomax" :src="photo(c)"/>
        <q-btn size="md" color="primary" icon="menu" flat dense style="margin-top:-5px"/>
      </div>
      <q-icon class="col-auto q-pr-xs" size="sm" :color="c.stx<2?'primary':'warning'" :name="icone(c.stp)"/>
      <div class="col-3 q-px-xs">{{nom(c)}}</div>
      <div class="col-4 q-pr-xs">{{c.ard.substring(0,40)}}</div>
      <div class="col-auto fs-sm">{{c.dhed}}</div>
      <q-menu touch-position transition-show="scale" transition-hide="scale">
        <q-list dense style="min-width: 10rem">
          <q-item v-if="invitationattente" clickable v-close-popup @click="copier(c)">
            <q-item-section class="titre-lg text-bold text-grey-8 bg-yellow-4 q-mx-sm text-center">[Contact !]</q-item-section>
          </q-item>
          <q-item clickable v-close-popup @click="afficher(c, idx)">
            <q-item-section>Afficher / éditer le couple</q-item-section>
          </q-item>
          <q-separator />
          <q-item clickable v-close-popup @click="voirsecrets(c)">
            <q-item-section>Voir les secrets partagés</q-item-section>
          </q-item>
          <q-separator />
          <q-item clickable v-close-popup @click="nouveausecret(c)">
            <q-item-section>Nouveau secret partagé</q-item-section>
          </q-item>
        </q-list>
      </q-menu>
    </div>
  </div>

  <q-dialog v-model="editcp" class="moyennelargeur">
    <panel-couple :close="fermeredit" :couple="couple"
      :suivant="state.idx < state.lst.length - 1 ? suiv : null"
      :precedent="state.idx > 0 ? prec : null"
      :index="state.idx" :sur="state.lst.length"/>
  </q-dialog>

  <q-dialog v-model="panelfiltre" position="left">
    <panel-filtre-couples @ok="rechercher" :motscles="motscles" :etat-interne="recherche" :fermer="fermerfiltre"></panel-filtre-couples>
  </q-dialog>

  <q-page-sticky v-if="$q.screen.gt.sm" position="top-left" expand :offset="[5,5]">
    <panel-filtre-couples @ok="rechercher" :motscles="motscles" :etat-interne="recherche" :fermer="fermerfiltre"></panel-filtre-couples>
  </q-page-sticky>

</div>
</template>
<script>
import { computed, reactive, watch, ref } from 'vue'
import { useStore } from 'vuex'
import { Motscles, FiltreCp, cfg } from '../app/util.mjs'
import PanelFiltreCouples from './PanelFiltreCouples.vue'
import PanelCouple from './PanelCouple.vue'
import { data } from '../app/modele.mjs'
import { retourInvitation } from '../app/page.mjs'

export default ({
  name: 'TabCouples',

  components: { PanelFiltreCouples, PanelCouple },

  computed: { },

  data () {
    return {
    }
  },

  methods: {
    voirsecrets (c) {
      this.couple = c
      this.evtfiltresecrets = { cmd: 'fs', arg: c }
    },

    nouveausecret (c) {
      this.couple = c
      this.evtfiltresecrets = { cmd: 'nv', arg: c }
    },

    copier (c) {
      retourInvitation(c)
    },

    fermeredit () { this.editcp = false },

    fermerfiltre () { this.panelfiltre = false },

    rechercher (f) { this.state.filtre = f },

    dkli (idx) { return this.$q.dark.isActive ? (idx ? 'sombre' + (idx % 2) : 'sombre0') : (idx ? 'clair' + (idx % 2) : 'clair0') }
  },

  setup () {
    const phdef = cfg().couple
    const $store = useStore()
    const editcp = ref(false)
    const sessionok = computed(() => { return $store.state.ui.sessionok })

    const prefs = computed(() => { return $store.state.db.prefs })
    const avatar = computed(() => { return $store.state.db.avatar })
    const mode = computed(() => $store.state.ui.mode)
    const couple = computed({ // couple courant
      get: () => $store.state.db.couple,
      set: (val) => $store.commit('db/majcouple', val)
    })
    const invitationattente = computed({
      get: () => $store.state.ui.invitationattente,
      set: (val) => $store.commit('ui/majinvitationattente', val)
    })
    const couples = computed(() => { return avatar.value ? data.getCouple() : [] })
    const cvs = computed(() => { return $store.state.db.cvs })

    const mc = reactive({ categs: new Map(), lcategs: [], st: { enedition: false, modifie: false } })
    const motscles = new Motscles(mc, 1, null)
    motscles.recharger()

    const recherche = reactive({ // doit correspondre au Filtre par défaut
      a: new FiltreCp().etat(),
      p: new FiltreCp().etat()
    })

    watch(() => prefs.value, (ap, av) => { motscles.recharger() })

    const panelfiltre = ref(false)

    function getCouples () {
      const avi = avatar.value.id
      const f = state.filtre
      f.debutFiltre()
      const lst = []
      for (const id in couples.value) {
        const cp = couples.value[id]
        if (cp.idI === avi && f.filtre(cp)) lst.push(cp)
      }
      state.lst = lst
    }

    function trier () {
      const l = []; state.lst.forEach(x => l.push(x))
      l.sort((a, b) => state.filtre.fntri(a, b))
      state.lst = l
      state.idx = 0
      if (couple.value) state.lst.forEach((x, n) => { if (x.id === couple.value.id) state.idx = n })
    }

    function latotale () {
      if (!sessionok.value) return
      getCouples()
      trier()
    }

    function photo (c) {
      const cv = cvs.value[c.id]
      if (cv && cv[0]) return cv[0]
      const cvE = c.idE && cvs.value[c.idE]
      if (cvE && cvE[0]) return cvE[0]
      return phdef
    }

    function nom (c) { return c.naE ? c.naE.noml : c.na.nom }

    function icone (p) {
      return ['thumb_up', 'hourglass_empty', 'thumb_down', 'thumb_up', 'o_thumb_down'][p]
    }

    const evtavatarct = computed(() => $store.state.ui.evtavatarct)
    watch(() => evtavatarct.value, (ap) => {
      if (ap.evt === 'recherche') panelfiltre.value = true
    })

    const evtfiltresecrets = computed({ // secret courant
      get: () => $store.state.ui.evtfiltresecrets,
      set: (val) => $store.commit('ui/majevtfiltresecrets', val)
    })

    const state = reactive({
      lst: [], // array des Couples répondant au filtre
      idx: 0, // index du couple courant dans la liste
      filtre: new FiltreCp() // Filtre par défaut
    })

    latotale()

    watch(() => state.filtre, (filtre, filtreavant) => {
      if (!filtre || !filtreavant || filtre.equal(filtreavant)) return
      const chg = filtre.changement(filtreavant)
      if (chg >= 2) {
        latotale()
      }
      if (chg >= 1) {
        trier()
      }
    })

    watch(() => avatar.value, (ap, av) => {
      latotale()
    })

    watch(() => couples.value, (ap, av) => {
      latotale()
    })

    watch(() => cvs.value, (ap, av) => {
      latotale()
    })

    watch(() => sessionok.value, (ap, av) => {
      editcp.value = false
    })

    function afficher (c, idx) {
      couple.value = c
      state.idx = idx
      editcp.value = true
    }

    function suiv () {
      if (state.idx < state.lst.length - 1) state.idx++
      couple.value = state.lst[state.idx]
    }

    function prec () {
      if (state.idx > 0) state.idx--
      couple.value = state.lst[state.idx]
    }

    return {
      suiv,
      prec,
      afficher,
      sessionok,
      photo,
      nom,
      icone,
      editcp,
      avatar,
      couple,
      motscles,
      state,
      panelfiltre,
      recherche,
      mode,
      evtfiltresecrets,
      invitationattente
    }
  }

})
</script>

<style lang="sass" scoped>
@import '../css/app.sass'
.photomax
  position: relative
  top: -5px
.ml20
  width: 100%
  padding: 0.2rem 0.2rem 0.2rem 23rem
</style>
