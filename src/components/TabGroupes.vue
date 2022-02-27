<template>

  <div :class="$q.screen.gt.sm ? 'ml20' : 'q-pa-xs full-width'">
    <div v-if="state.lst && state.lst.length" class="col">
    <div v-for="(x, idx) in state.lst" :key="x.k"
      :class="dkli(idx) + ' groupecourant full-width row items-start q-py-xs cursor-pointer'">
      <q-icon class="col-auto q-pr-xs" size="sm" :color="c.stx<2?'primary':'warning'"
      :name="['o_thumb_up','thumb_up','o_hourglass_empty','hourglass_empty','hourglass_empty','','','','','thumb_down'][c.stx]"/>
      <img class="col-auto photomax" :src="x.g.ph"/>
      <div class="col-3 q-px-xs">{{g.nom}}</div>
      <div class="col-4 q-pr-xs">{{x.m.ard.substring(0,40)}}</div>
      <div class="col-auto fs-sm">{{c.dhed}}</div>
      <q-menu touch-position transition-show="scale" transition-hide="scale">
        <q-list dense style="min-width: 10rem">
          <q-item clickable v-close-popup @click="afficher(x)">
            <q-item-section>Afficher / éditer le groupe</q-item-section>
          </q-item>
          <q-separator />
          <q-item clickable v-close-popup @click="voirsecrets(x)">
            <q-item-section>Voir les secrets du groupe</q-item-section>
          </q-item>
          <q-separator />
          <q-item clickable v-close-popup @click="nouveausecret(x)">
            <q-item-section>Nouveau secret de groupe</q-item-section>
          </q-item>
        </q-list>
      </q-menu>
    </div>
  </div>

  <q-dialog v-model="editct" class="moyennelargeur">
    <panel-groupe :close="fermeredit"/>
  </q-dialog>

  <q-dialog v-model="panelfiltre" position="left">
    <panel-filtre-groupes @ok="rechercher" :motscles="motscles" :etat-interne="recherche" :fermer="fermerfiltre"></panel-filtre-groupes>
  </q-dialog>

  <q-page-sticky v-if="$q.screen.gt.sm" position="top-left" expand :offset="[5,5]">
    <panel-filtre-groupes @ok="rechercher" :motscles="motscles" :etat-interne="recherche" :fermer="fermerfiltre"></panel-filtre-groupes>
  </q-page-sticky>
</div>
</template>
<script>
import { computed, reactive, watch, ref } from 'vue'
import { useStore } from 'vuex'
import { Motscles, FiltreGrp } from '../app/util.mjs'
import PanelFiltreGroupes from './PanelFiltreGroupes.vue'
import PanelGroupe from './PanelGroupe.vue'
import { data } from '../app/modele.mjs'
import { crypt } from '../app/crypto.mjs'

export default ({
  name: 'TabGroupes',

  components: { PanelFiltreGroupes, PanelGroupe },

  computed: {
  },

  data () {
    return {
      editct: false
    }
  },

  methods: {
    nomaff (x) {

    },

    voirsecrets (x) {
      this.groupepluscourant(x)
      this.evtfiltresecrets = { cmd: 'fsg', arg: x.g }
    },

    nouveausecret (x) {
      this.groupepluscourant(x)
      this.evtfiltresecrets = { cmd: 'nvg', arg: x.g }
    },

    afficher (x) {
      this.groupepluscourant(x)
      this.editgr = true
    },

    groupepluscourant (x) {
      // console.log(x.g.nom)
      this.groupeplus = x
    },

    fermeredit () { this.editgr = false },

    fermerfiltre () {
      this.panelfiltre = false
    },

    rechercher (f) {
      this.state.filtre = f
    },

    dkli (idx) { return this.$q.dark.isActive ? (idx ? 'sombre' + (idx % 2) : 'sombre0') : (idx ? 'clair' + (idx % 2) : 'clair0') }
  },

  setup () {
    const $store = useStore()

    /* La liste des groupes relatives à l'avatar courant
    est en fait la liste des objets Membre de l'avatar courant
    (pas directement le groupe lui-même).
    Mais la clé de la map refMembres est bien l'id du groupe
    */
    let watchStopm = null
    let watchStopg = null
    function getRefMbGr () {
      /* Collecte les références vers les array de membres de tous les groupes
      référencés en entête de l'avatar courant
      Déclare deux watch dessus: un pour le membre de l'avatar, un pour le groupe
      */
      for (const sid in refMembres) delete refMembres[sid]
      if (watchStopm) {
        watchStopm()
        watchStopm = null
      }
      for (const sid in refGroupes) delete refGroupes[sid]
      if (watchStopg) {
        watchStopg()
        watchStopg = null
      }

      if (avatar.value) {
        const ida = avatar.value.id
        const setIds = avatar.value.allGrId()
        setIds.forEach(id => {
          const sid = crypt.idToSid(id)
          refMembres[sid] = computed(() => data.getMembreParId(sid, ida))
          refGroupes[sid] = computed(() => data.getGroupe(sid))
        })
        watchStopm = watch(() => { return { ...refMembres } }, () => {
          getGroupes()
        })
        watchStopg = watch(() => { return { ...refGroupes } }, () => {
          getGroupes()
        })
      }
    }

    /* Une entrée par sid de groupe :
    la valeur est l'objet membre correspondant à l'avatar courant */
    const refMembres = reactive({ })

    /* Une entrée par sid de groupe :
    la valeur est l'objet groupe */
    const refGroupes = reactive({ })

    const compte = computed(() => { return $store.state.db.compte })
    const prefs = computed(() => { return $store.state.db.prefs })
    const avatar = computed(() => { return $store.state.db.avatar })
    const mode = computed(() => $store.state.ui.mode)
    const groupeplus = computed({ // groupe courant
      get: () => $store.state.db.groupeplus,
      set: (val) => $store.commit('db/majgroupeplus', val)
    })
    const repertoire = computed(() => { return $store.state.db.repertoire })

    const mc = reactive({ categs: new Map(), lcategs: [], st: { enedition: false, modifie: false } })
    const motscles = new Motscles(mc, 1, null)
    motscles.recharger()

    const recherche = reactive({ // doit correspondre au Filtre par défaut
      a: new FiltreGrp().etat(),
      p: new FiltreGrp().etat()
    })

    watch(() => prefs.value, (ap, av) => { motscles.recharger() })

    const panelfiltre = ref(false)

    function getGroupes () {
      const f = state.filtre
      f.debutFiltre()
      const lst = []
      for (const sid in refMembres) {
        const m = refMembres[sid]
        const g = data.getGroupe(sid)
        if (!g) continue
        if (f.filtre(g, m)) lst.push({ g: g, m: m, k: g.sid + '/' + g.v + '/' + m.pk + '/' + m.v })
      }
      state.lst = lst
    }

    function trier () {
      const l = []; state.lst.forEach(x => l.push(x))
      l.sort((a, b) => state.filtre.fntri(a, b))
      state.lst = l
    }

    function latotale () {
      getRefMbGr()
      getGroupes()
      trier()
    }

    const evtavatargr = computed(() => $store.state.ui.evtavatargr)
    watch(() => evtavatargr.value, (ap) => {
      if (ap.evt === 'recherche') panelfiltre.value = true
    })

    const evtfiltresecrets = computed({ // secret courant
      get: () => $store.state.ui.evtfiltresecrets,
      set: (val) => $store.commit('ui/majevtfiltresecrets', val)
    })

    const state = reactive({
      lst: [], // array des Contacts répondant au filtre
      filtre: new FiltreGrp() // Filtre par défaut
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

    watch(() => repertoire.value, (ap, av) => {
      latotale()
    })

    return {
      compte,
      avatar,
      groupeplus,
      motscles,
      state,
      panelfiltre,
      recherche,
      mode,
      evtfiltresecrets
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
.groupecourant:hover
  background-color: rgba(130, 130, 130, 0.5)
</style>
