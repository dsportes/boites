<template>
  <q-card class="fs-md moyennelargeur">
    <div class="top bg-secondary text-white full-width">
      <q-toolbar class="q-px-xs">
        <q-btn dense flat size="md" icon="chevron_left" @click="fermerchat"/>
        <q-toolbar-title class="titre-lg full-width text-right q-pr-sm">Chat avec le Comptable</q-toolbar-title>
        <q-btn v-if="!estC()" dense color="warning" label="RAZ" icon="delete" @click="reset"/>
      </q-toolbar>
      <div class="q-px-xs row justify-between items-center">
        <div :class="'font-mono fs-lg ' + ['', 'text-warning', 'text-negative text-bold bg-yellow'][chat.st]">
          {{['OK / résolu', 'A résoudre', 'Bloquant / urgent'][chat.st]}}
        </div>
        <q-btn class="q-ma-xs" dense color="primary" size="md" label="Nouveau" icon="add"
          @click="nvchat=true"/>
      </div>
      <div class="q-px-xs">Dernière émission par le compte:<span class="q-ml-md font-mono">{{dh(chat.dhde)}}</span></div>
    </div>

    <div class="q-pa-sm scroll" style="max-height:100vh;">
      <div class="filler"></div>
      <fiche-avatar :na-avatar="chat.na" contacts groupes compta/>
      <chat-item v-for="item in chat.items" :key="item.dh" :item="item"/>
    </div>

    <q-dialog v-model="nvchat">
      <nouveau-chat :close="fermernvchat"/>
    </q-dialog>

  </q-card>
</template>

<script>
import { useStore } from 'vuex'
import { computed } from 'vue'
import NouveauChat from './NouveauChat.vue'
import ChatItem from './ChatItem.vue'
import FicheAvatar from './FicheAvatar.vue'
import { dhcool } from '../app/util.mjs'
import { LectureChat, ResetChat } from '../app/operations.mjs'
import { data } from '../app/modele.mjs'

export default ({
  name: 'PanelChat',

  components: { FicheAvatar, NouveauChat, ChatItem },

  data () {
    return {
      nvchat: false
    }
  },

  methods: {
    estC () { return data.estComptable },
    dh (t) { return !t ? '(na)' : dhcool(new Date(t)) },
    fermernvchat () {
      this.nvchat = false
    },
    async fermerchat () {
      await new LectureChat().run(this.chat.id)
      this.dialoguechat = false
    },
    async reset () {
      await new ResetChat().run(this.chat.na)
    }
  },

  setup () {
    const $store = useStore()
    const dialoguechat = computed({
      get: () => $store.state.ui.dialoguechat,
      set: (val) => $store.commit('ui/majdialoguechat', val)
    })
    const chat = computed(() => $store.state.db.chat)

    return {
      dialoguechat,
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
.q-toolbar
  padding: 2px !important
  min-height: 0 !important
.q-card > div
  box-shadow: inherit !important
</style>
