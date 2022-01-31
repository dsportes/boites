<template>
<div :class="$q.screen.gt.sm ? 'ml20' : 'q-pa-xs full-width'">
  <div v-if="state.contacts && state.contacts.length" class="col">
    <div v-for="(c, idx) in state.contacts" :key="c.pkv" @click="contactcourant(c)"
      :class="dkli(idx) + ' contactcourant full-width row items-start q-py-xs cursor-pointer'">
      <q-icon class="col-auto q-pr-xs" size="sm" :color="c.stx<2?'primary':'warning'"
      :name="['o_thumb_up','thumb_up','o_hourglass_empty','hourglass_empty','hourglass_empty','','','','','thumb_down'][c.stx]"/>
      <img class="col-auto photomax" :src="c.ph"/>
      <div class="col-3 q-px-xs">{{c.nom}}</div>
      <div class="col-4 q-pr-xs">{{c.ard.substring(0,40)}}</div>
      <div class="col-auto fs-sm">{{c.dhed}}</div>
      <q-menu touch-position context-menu >
        <q-list dense style="min-width: 100px">
          <q-item clickable v-close-popup @click="voirsecrets(c)">
            <q-item-section>Voir les secrets partagés</q-item-section>
          </q-item>
          <q-item clickable v-close-popup>
            <q-item-section>New</q-item-section>
          </q-item>
          <q-separator />
          <q-item clickable>
            <q-item-section>Preferences</q-item-section>
            <q-item-section side>
              <q-icon name="keyboard_arrow_right" />
            </q-item-section>
          </q-item>
        </q-list>
      </q-menu>
    </div>
  </div>

  <q-dialog v-model="panelfiltre" position="left">
    <panel-filtre-contacts></panel-filtre-contacts>
  </q-dialog>

  <q-page-sticky v-if="$q.screen.gt.sm" position="top-left" expand :offset="[5,5]">
    <panel-filtre-contacts></panel-filtre-contacts>
  </q-page-sticky>

</div>
</template>
<script>
import { computed, reactive, watch, ref } from 'vue'
import { useStore } from 'vuex'
import { Motscles, getJourJ } from '../app/util.mjs'
import PanelFiltreContacts from './PanelFiltreContacts.vue'
import { data } from '../app/modele.mjs'

export default ({
  name: 'TabContacts',

  components: { PanelFiltreContacts },

  computed: {
  },

  data () {
    return {
    }
  },

  methods: {
    voirsecrets (c) {
      this.contact = c
      this.evtfiltresecrets = { cmd: 'fs', arg: c }
    },

    contactcourant (c) {
      console.log(c.nom)
      this.contact = c
    },

    fermerfiltre () {
      this.panelfiltre = false
    },

    async action (n, p) {

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
    const contacts = computed(() => { return avatar.value ? data.getContact(avatar.value.id) : [] })
    const repertoire = computed(() => { return $store.state.db.repertoire })

    const mc = reactive({ categs: new Map(), lcategs: [], st: { enedition: false, modifie: false } })
    const motscles = new Motscles(mc, 1, null)
    motscles.recharger()

    // watch(() => groupe.value, (ap, av) => { motscles.recharger() })
    watch(() => prefs.value, (ap, av) => { motscles.recharger() })

    const state = reactive({
      contacts: []
    })

    const panelfiltre = ref(false)

    function mesContacts () {
      const lst = []
      for (const c in contacts.value) lst.push(contacts.value[c])
      state.contacts = lst.sort((a, b) => { return a.nom < b.nom ? -1 : (a.nom > b.nom ? 1 : 0) })
    }

    mesContacts()

    watch(() => avatar.value, (ap, av) => {
      mesContacts()
    })

    watch(() => contacts.value, (ap, av) => {
      mesContacts()
    })

    watch(() => repertoire.value, (ap, av) => {
      mesContacts()
    })

    function nbj (dlv) { return dlv - getJourJ() }

    const evtavatarct = computed(() => $store.state.ui.evtavatarct)
    watch(() => evtavatarct.value, (ap) => {
      if (ap.evt === 'recherche') panelfiltre.value = true
    })

    const evtfiltresecrets = computed({ // secret courant
      get: () => $store.state.ui.evtfiltresecrets,
      set: (val) => $store.commit('ui/majevtfiltresecrets', val)
    })

    return {
      compte,
      avatar,
      contact,
      motscles,
      state,
      nbj,
      panelfiltre,
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
.contactcourant:hover
  background-color: rgba(130, 130, 130, 0.5)
</style>
