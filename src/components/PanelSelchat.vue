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

    <div class="q-pa-sm scroll" style="max-height:100vh;">
      <div class="filler"></div>
      <div v-if="!lst.length" class="titre-md">Aucun chat trouvé pour ce critère</div>
      <div v-for="(c, idx) in lst" :key="c.id"
        :class="dkli(idx) + ' zone cursor-pointer full-width q-mb-sm'" @click="detail(c)">
        <q-card class="row justify-start items-center">
          <img class="col-auto photomax q-mr-md" :src="c.photo || photoDef"/>
          <div class="col">
            <div class="row justify-between">
              <div class="titre-md">
                <span class="text-bold">{{c.na.nom}}</span>
                <span v-if="c.stp" class="q-ml-md text-warning">Parrain</span>
                <span class="text-italic q-ml-sm">[{{c.nat.nom}}]</span>
              </div>
              <div class="fs-md">
                <span v-if="c.st === 1" class="text-warning text-bold q-mr-sm">À traiter</span>
                <span v-if="c.st === 2" class="text-negative bg-yellow text-bold q-mr-sm q-px-xs">Urgent</span>
                <span class="font-mono">ed(c.dhde)</span>
              </div>
            </div>
            <show-html class="height-6" v-if="c.info" :texte="c.info" :idx="idx"/>
          </div>
        </q-card>
        <q-separator class="q-my-xs"/>
      </div>
    </div>

  </q-card>
</template>

<script>
import { useStore } from 'vuex'
import { computed, ref } from 'vue'
import { dhcool, aujhier, cfg } from '../app/util.mjs'
import { SelectChat } from '../app/operations.mjs'
import ShowHtml from './ShowHtml.vue'

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

  components: { ShowHtml },

  data () {
    return {
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
    detail (c) {
      console.log(c.na.nom)
    }
  },

  setup () {
    const $store = useStore()
    const dialogueselchat = computed({
      get: () => $store.state.ui.dialogueselchat,
      set: (val) => $store.commit('ui/majdialogueselchat', val)
    })
    const chat = computed({
      get: () => $store.state.db.chat,
      set: (val) => $store.commit('db/setChat', val)
    })
    const photoDef = ref(cfg().avatar)

    return {
      dialogueselchat,
      photoDef,
      chat
    }
  }
})
</script>

<style lang="sass" scoped>
@import '../css/app.sass'
$haut: 6.5rem
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
.photomax
  margin-top: 4px
.wsel
  width: 10rem
.q-toolbar
  padding: 2px !important
  min-height: 0 !important
.q-card > div
  box-shadow: inherit !important
</style>
