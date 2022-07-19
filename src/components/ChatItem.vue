<template>
  <q-chat-message
    :name="name"
    :sent="!item[1].c"
    text-color="white"
    :bg-color="color">
    <div>
      <vue-showdown class="markdown-body" :markdown="item[1].t" :key="item[0]" flavor="github" :options="{ emoji: true }" />
      <div v-if="item[1].r && item[1].r.length">
        <q-separator/>
        <div>
          <span class="titre-md text-bold text-italic">Contacts:</span>
          <q-btn v-for="(nr, idx) in item[1].r" :key="idx" flat dense no-caps
            class="q-ml-sm" :label="nr[0]" @click="onref(nr)"/>
        </div>
      </div>
      <q-separator/>
      <div class="font-mono fs-sm">{{stamp}}</div>
    </div>
  </q-chat-message>
</template>

<script>
import { VueShowdown } from 'vue-showdown'
import { useStore } from 'vuex'
import { computed } from 'vue'
import { dhcool, copier } from '../app/util.mjs'

export default ({
  name: 'ChatItem',
  props: { item: Object },
  components: { VueShowdown },
  computed: {
    lua () { return this.chat.lua },
    luc () { return this.chat.luc },
    // lua () { return new Date('2022-06-10T11:40:00').getTime() },
    // luc () { return new Date('2022-07-10T14:40:00').getTime() },
    name () {
      if (this.item[1].c) return 'Comptable' + (this.item[0] > this.lua ? ' [nouveau]' : '')
      return 'Moi' + (this.item[0] > this.luc ? ' [pas lu]' : ' [a été lu]')
    },
    color () {
      if (this.item[1].c) return this.item[0] > this.lua ? 'warning' : 'primary'
      return this.item[0] > this.luc ? 'warning' : 'primary'
    },
    stamp () { return dhcool(this.item[0]) }
  },
  data () {
    return {
    }
  },
  methods: {
    onref (nr) {
      copier(nr)
    }
  },
  setup (props) {
    const $store = useStore()
    const chat = computed(() => $store.state.db.chat)

    return {
      chat
    }
  }
})
</script>

<style lang="css" scoped>
.markdown-body {
  font-family:  Calibri-Light !important;
  background-color: transparent !important;
  color: white !important;
}
@import 'github-markdown-css/github-markdown-dark.css'
</style>

<style lang="sass">
.markdown-body h1, .markdown-body h2, .markdown-body h3, .markdown-body h4, .markdown-body h5
  font-family: Comfortaa
</style>
