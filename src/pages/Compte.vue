<template>
  <q-page class="column align-start items-center">
    <h6>Compte : {{compte.sid}}</h6>
    <h6>Liste des avatars du compte</h6>
    <div v-for="e in compte.mac" :key="e.na.sid">
        <div>{{e.na.sid}} - {{e.na.nomc}} {{e.cpriv.length}}</div>
        <q-btn label="GET cv" color="primary" @click="getcv(e.na.sid)" />
        <q-btn label="GET clepub" color="primary" @click="getclepub(e.na.sid)" />
    </div>
    <h6>Liste des avatars</h6>
    <div v-for="av in avatars" :key="av.sid">
        <div>{{av.sid}} - {{av.na.nomc}}</div>
    </div>
    <h6>Liste des cartes de visite</h6>
    <div v-for="cv in cvs" :key="cv.sid">
        <div>{{cv.sid}} - {{cv.na.nomc}}</div>
    </div>
  </q-page>
</template>

<script>
import { computed } from 'vue'
import { useStore } from 'vuex'
import { get } from '../app/util'
import { remplacePage } from '../app/modele'
const rowTypes = require('../app/rowTypes')

export default ({
  name: 'Compte',
  components: { },
  data () {
    return {
    }
  },

  watch: {
  },

  methods: {
    async getcv (sid) {
      const r = await get('m1', 'getcv', { sid: sid })
      if (r) {
        const objcv = rowTypes.rowSchemas.cv.fromBuffer(Buffer.from(r))
        console.log(JSON.stringify(objcv))
      }
    },
    async getclepub (sid) {
      const r = await get('m1', 'getclepub', { sid: sid })
      if (r) {
        const c = Buffer.from(r).toString()
        console.log(c)
      }
    }
  },

  setup () {
    const $store = useStore()
    const org = $store.state.ui.org
    if (!org) {
      remplacePage('Org')
      return
    }
    const statuslogin = $store.state.ui.statuslogin
    if (!statuslogin) {
      remplacePage('Accueil')
      return
    }
    const cvs = computed(() => $store.state.db.cvs)
    const avatars = computed(() => $store.state.db.avatars)
    const compte = computed(() => $store.state.db.compte)
    const mode = computed(() => $store.state.ui.mode)
    return {
      cvs,
      avatars,
      compte,
      mode
    }
  }

})
</script>

<style lang="sass">
@import '../css/app.sass'

</style>
