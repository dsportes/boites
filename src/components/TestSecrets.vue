<template>
<div class="bg-white text-black">
  <div v-for="sid in listSid" :key="sid">
    <span v-for="n in 4" :key="n">
      <q-btn class="q-pa-md" flat :label="sid + n" @click="doit(sid, n)"/>
    </span>
  </div>
  <div v-for="sid in listSid" :key="sid">
    <div>Liste pour {{sid}}</div>
      <div v-for="sec in listSec(sid)" :key="sid + '/' + sec.ns">{{JSON.stringify(sec)}}</div>
  </div>
</div>
</template>

<script>
// import { computed } from 'vue'
import { useStore } from 'vuex'

export default ({
  name: 'TestSecrets',

  data () {
    return {
      listSid: ['A', 'C']
    }
  },

  methods: {
    doit (sid, n) {
      this.$store.commit('db/setSec', { sid: sid, ns: n, dh: new Date().getTime() % 1000 })
    }
  },

  setup () {
    const $store = useStore()

    function listSec (sid) {
      return $store.state.db['secrets_' + sid] || {}
    }

    return {
      listSec
    }
  }
})
</script>

<style lang="sass">
@import '../css/app.sass'
</style>
