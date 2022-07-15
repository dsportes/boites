<template>
  <q-card class="fs-md moyennelargeur">

    <div class="top bg-secondary text-white full-width">
      <q-toolbar class="q-px-xs">
        <q-toolbar-title class="titre-lg full-width">Sélection des chats</q-toolbar-title>
        <q-btn dense flat size="md" icon="chevron_right" @click="fermerselchat"/>
      </q-toolbar>
      <div class="q-px-xs row justify-start items-center">
        <q-select class="wsel" filled dense v-model="fdh" :options="dhoptions"
          label="Quand ?" emit-value map-options/>
        <q-select class="q-ml-lg wsel" filled dense v-model="st" :options="stoptions"
          label="Quels statuts ?" emit-value map-options/>
        <q-btn class="q-ml-lg" dense size="md" icon="search" color="primary" @click="select"/>
      </div>
    </div>

    <div class="q-py-sm scroll" style="max-height:100vh;">
      <div class="filler"></div>
      <div v-if="!lst.length" class="titre-md">
        <span v-if="pf">Saisir un critère de recherche et lancer la recherche</span>
        <span v-else>Aucun chat trouvé pour ce critère</span>
      </div>
      <div v-for="(c, idx) in lst" :key="c.id" class="zone full-width q-mb-sm'">
        <q-card class="q-ma-sm">
          <fiche-avatar :na-avatar="c.na" :idx="idx" :parrain="c.stp===1" compta :na-tribu="c.nat"/>
          <div :class="dkli(idx) + ' fs-md text-right full-width q-pa-xs'">
            <q-btn class="q-mr-sm" dense color="primary" size="sm" label="Voir le chat" icon="chat" @click="ouvrirchat(c)"/>
            <span v-if="c.st === 1" class="text-warning text-bold q-mr-sm">À traiter</span>
            <span v-if="c.st === 2" class="text-negative bg-yellow text-bold q-mr-sm q-px-xs">Urgent</span>
            <span class="font-mono">{{dh(c.dhde)}}</span>
          </div>
        </q-card>
      </div>
    </div>

  </q-card>
</template>

<script>
import { useStore } from 'vuex'
import { computed, ref } from 'vue'
import { dhcool, aujhier, cfg } from '../app/util.mjs'
import { SelectChat, GetChat } from '../app/operations.mjs'
import FicheAvatar from './FicheAvatar.vue'

const dhoptions = [
  { label: 'Aujourd\'hui', value: 1 },
  { label: 'Hier et aujourd\'hui', value: 2 },
  { label: 'Dans les 7 jours', value: 7 },
  { label: 'Dans les 15 jours', value: 15 },
  { label: 'Dans les 30 jours', value: 30 },
  { label: 'Tous', value: 0 }
]

const stoptions = [
  { label: 'A traiter et urgents', value: 1 },
  { label: 'Urgents', value: 2 },
  { label: 'Tous', value: 0 }
]

export default ({
  name: 'PanelSelchat',

  components: { FicheAvatar },

  data () {
    return {
      cpt: null,
      dhoptions,
      stoptions,
      fdh: 0,
      st: 0,
      lst: [] // id dhde st na clec photo info stp nat
    }
  },

  methods: {
    dkli (idx) { return this.$q.dark.isActive ? (idx ? 'sombre' + (idx % 2) : 'sombre0') : (idx ? 'clair' + (idx % 2) : 'clair0') },

    dh (t) { return !t ? '(na)' : dhcool(new Date(t)) },

    fermerselchat () { this.dialogueselchat = false },

    async select () {
      this.pf = false
      const [auj, hier] = aujhier()
      let dhde = 0
      if (this.fdh === 1) {
        dhde = auj.getTime()
      } else if (this.fdh === 2) {
        dhde = hier.getTime()
      } else if (this.fdh > 2 && this.fdh < 31) {
        dhde = auj.getTime() - (86400000 * this.fdh)
      }
      this.lst = await new SelectChat().run(dhde, this.st)
    },

    async ouvrirchat (c) {
      this.chat = await new GetChat().run(c.na.id)
      this.dialoguechat = true
    }
  },

  setup () {
    const $store = useStore()
    const pf = ref(true)
    const dialogueselchat = computed({
      get: () => $store.state.ui.dialogueselchat,
      set: (val) => $store.commit('ui/majdialogueselchat', val)
    })
    const dialoguechat = computed({
      get: () => $store.state.ui.dialoguechat,
      set: (val) => $store.commit('ui/majdialoguechat', val)
    })
    const chat = computed({
      get: () => $store.state.db.chat,
      set: (val) => $store.commit('db/setChat', val)
    })
    const tribu = computed({
      get: () => $store.state.db.tribu,
      set: (val) => $store.commit('db/setTribu', val)
    })

    const photoDef = ref(cfg().avatar)

    return {
      pf,
      dialogueselchat,
      dialoguechat,
      photoDef,
      chat,
      tribu
    }
  }
})
</script>

<style lang="sass" scoped>
@import '../css/app.sass'
$haut: 5.5rem
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
.wsel
  width: 10rem
.q-toolbar
  padding: 2px !important
  min-height: 0 !important
.q-card > div
  box-shadow: inherit !important
.q-btn--dense
  padding: 0 3px
  min-height: auto
</style>
