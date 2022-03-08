<template>
<div :class="$q.screen.gt.sm ? 'ml20' : 'q-pa-xs full-width'">
  <div v-if="state.lst && state.lst.length" class="col">
    <div v-for="(c, idx) in state.lst" :key="c.pkv"
      :class="dkli(idx) + ' zone full-width row items-start q-py-xs cursor-pointer'">
      <div class="col-auto column q-px-xs">
        <img class="photomax" :src="c.ph"/>
        <q-btn size="md" color="primary" icon="menu" flat dense style="margin-top:-5px"/>
      </div>
      <q-icon class="col-auto q-pr-xs" size="sm" :color="c.stx<2?'primary':'warning'"
      :name="['o_thumb_up','thumb_up','o_hourglass_empty','hourglass_empty','hourglass_empty','','','','','thumb_down'][c.stx]"/>
      <div class="col-3 q-px-xs">{{c.nom}}</div>
      <div class="col-4 q-pr-xs">{{c.ard.substring(0,40)}}</div>
      <div class="col-auto fs-sm">{{c.dhed}}</div>
      <q-menu touch-position transition-show="scale" transition-hide="scale">
        <q-list dense style="min-width: 10rem">
          <q-item v-if="invitationattente" clickable v-close-popup @click="copier(c)">
            <q-item-section class="titre-lg text-bold text-grey-8 bg-yellow-4 q-mx-sm text-center">[Contact !]</q-item-section>
          </q-item>
          <q-item clickable v-close-popup @click="afficher(c)">
            <q-item-section>Afficher / éditer le contact</q-item-section>
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

  <q-dialog v-model="editct" class="moyennelargeur">
    <panel-contact :close="fermeredit"/>
  </q-dialog>

  <q-dialog v-model="panelfiltre" position="left">
    <panel-filtre-contacts @ok="rechercher" :motscles="motscles" :etat-interne="recherche" :fermer="fermerfiltre"></panel-filtre-contacts>
  </q-dialog>

  <q-page-sticky v-if="$q.screen.gt.sm" position="top-left" expand :offset="[5,5]">
    <panel-filtre-contacts @ok="rechercher" :motscles="motscles" :etat-interne="recherche" :fermer="fermerfiltre"></panel-filtre-contacts>
  </q-page-sticky>

</div>
</template>
<script>
import { computed, reactive, watch, ref } from 'vue'
import { useStore } from 'vuex'
import { Motscles, FiltreCtc } from '../app/util.mjs'
import PanelFiltreContacts from './PanelFiltreContacts.vue'
import PanelContact from './PanelContact.vue'
import { data } from '../app/modele.mjs'
import { retourInvitation } from '../app/page.mjs'

export default ({
  name: 'TabContacts',

  components: { PanelFiltreContacts, PanelContact },

  computed: {
  },

  data () {
    return {
      editct: false
    }
  },

  methods: {
    voirsecrets (c) {
      this.contact = c
      this.evtfiltresecrets = { cmd: 'fs', arg: c }
    },

    nouveausecret (c) {
      this.contact = c
      this.evtfiltresecrets = { cmd: 'nv', arg: c }
    },

    afficher (c) {
      this.contact = c
      this.editct = true
    },

    copier (c) {
      retourInvitation(c)
    },

    contactcourant (c) {
      console.log(c.nom)
      this.contact = c
    },

    fermeredit () { this.editct = false },

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

    const compte = computed(() => { return $store.state.db.compte })
    const prefs = computed(() => { return $store.state.db.prefs })
    const avatar = computed(() => { return $store.state.db.avatar })
    const mode = computed(() => $store.state.ui.mode)
    const contact = computed({ // contact courant
      get: () => $store.state.db.contact,
      set: (val) => $store.commit('db/majcontact', val)
    })
    const invitationattente = computed({
      get: () => $store.state.ui.invitationattente,
      set: (val) => $store.commit('ui/majinvitationattente', val)
    })
    const contacts = computed(() => { return avatar.value ? data.getContact(avatar.value.id) : [] })
    const repertoire = computed(() => { return $store.state.db.repertoire })

    const mc = reactive({ categs: new Map(), lcategs: [], st: { enedition: false, modifie: false } })
    const motscles = new Motscles(mc, 1, null)
    motscles.recharger()

    const recherche = reactive({ // doit correspondre au Filtre par défaut
      a: new FiltreCtc().etat(),
      p: new FiltreCtc().etat()
    })

    watch(() => prefs.value, (ap, av) => { motscles.recharger() })

    const panelfiltre = ref(false)

    function getContacts () {
      const f = state.filtre
      f.debutFiltre()
      const lst = []
      for (const c in contacts.value) {
        const ct = contacts.value[c]
        if (f.filtre(ct)) lst.push(ct)
      }
      state.lst = lst
    }

    function trier () {
      const l = []; state.lst.forEach(x => l.push(x))
      l.sort((a, b) => state.filtre.fntri(a, b))
      state.lst = l
    }

    function latotale () {
      getContacts()
      trier()
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
      lst: [], // array des Contacts répondant au filtre
      filtre: new FiltreCtc() // Filtre par défaut
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

    watch(() => contacts.value, (ap, av) => {
      latotale()
    })

    watch(() => repertoire.value, (ap, av) => {
      latotale()
    })

    return {
      compte,
      avatar,
      contact,
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
