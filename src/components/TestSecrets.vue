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
import { data, Secret } from '../app/modele.mjs'
import { crypt } from '../app/crypto.mjs'

const sidA = crypt.idToSid(10)
const sidC = crypt.idToSid(12)

export default ({
  name: 'TestSecrets',

  data () {
    return {
      listSid: [sidA, sidC],
      v: 1
    }
  },

  methods: {
    doit (sid, n) {
      const s = new Secret()
      s.id = crypt.sidToId(sid)
      s.ns = n
      s.v = this.v++
      s.st = 99999
      s.ic = 0
      s.ora = 0
      s.txt = new Date().getTime() % 1000
      s.mc = {}
      data.setSecrets([s])
    }
  },

  setup () {
    function listSec (sid) {
      return data.getSecret(sid)
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
