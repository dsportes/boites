<template>
  <q-page class="column align-start items-center">
    <h6>Compte : {{compte.sid}}</h6>
    <h6>Liste des avatars du compte</h6>
    <div v-for="e in compte.mac" :key="e.na.sid">
        <div>{{e.na.sid}} - {{e.na.nomc}} {{e.cpriv.length}}</div>
        <q-btn label="GET cv" color="primary" @click="getcv(e.na.sid)" />
        <q-btn label="GET clepub" color="primary" @click="getclepub(e.na.sid)" />
        <q-btn label="Vue Avatar" color="primary" @click="toAvatar(e.na.sid)" />
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
import { get, decoder } from '../app/util'
import { onBoot, remplacePage } from '../app/modele'
const api = require('../app/api')
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
        const objcv = api.deserialize(rowTypes.rowSchemas.cv, new Uint8Array(r))
        console.log(JSON.stringify(objcv))
      }
    },
    async getclepub (sid) {
      const r = await get('m1', 'getclepub', { sid: sid })
      if (r) {
        const c = decoder.decode(new Uint8Array(r))
        console.log(c)
      }
    },
    toAvatar (sid) {
      this.avatar = this.avatars[sid]
      remplacePage('Avatar')
    },
    toGroupe (sid) {
      this.groupe = this.groupes[sid]
      remplacePage('Groupe')
    }
  },

  setup () {
    onBoot()
    const $store = useStore()
    const org = computed(() => $store.state.ui.org)
    // En déconnexion, compte passe à null et provoque un problème dans la page. Un getter ne marche pas ?!
    const compte = computed({
      get: () => { const c = $store.state.db.compte; return c || { ko: true } }
    })
    const avatar = computed({
      get: () => { const a = $store.state.db.avatar; return a || { ko: true } },
      set: (val) => $store.commit('db/majavatar', val)
    })
    const groupe = computed({
      get: () => { const a = $store.state.db.avatar; return a || { ko: true } },
      set: (val) => $store.commit('db/majgroupe', val)
    })
    const cvs = computed(() => $store.state.db.cvs)
    const avatars = computed(() => $store.state.db.avatars)
    const groupes = computed(() => $store.state.db.groupes)
    const mode = computed(() => $store.state.ui.mode)
    const modeleactif = computed(() => $store.state.ui.modeleactif)

    return {
      org,
      compte,
      avatar,
      groupe,
      mode,
      modeleactif,
      cvs,
      avatars,
      groupes
    }
  }

})
</script>

<style lang="sass">
@import '../css/app.sass'

</style>
