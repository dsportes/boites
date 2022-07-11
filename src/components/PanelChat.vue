<template>
  <q-card class="fs-md moyennelargeur">
    <div class="top bg-secondary text-white full-width">
      <q-toolbar class="q-px-xs">
        <q-toolbar-title class="titre-lg full-width">Chat avec le Comptable</q-toolbar-title>
        <q-btn class="chl" dense flat size="md" icon="chevron_right" @click="fermerchat"/>
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
import { dhcool } from '../app/util.mjs'

export default ({
  name: 'PanelChat',

  components: { NouveauChat, ChatItem },

  data () {
    return {
      nvchat: false
    }
  },

  methods: {
    dh (t) { return !t ? '(na)' : dhcool(new Date(t)) },
    fermernvchat () { this.nvchat = false },
    fermerchat () { this.dialoguechat = false }
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
