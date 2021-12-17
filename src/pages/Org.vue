<template>
  <q-page class="column align-start items-center">
    <div class="titre-1">Choix de l'organisation</div>
    <div v-for="o in listeorgs" :key="o.id">
      <div class="row justify-center items-center cursor-pointer q-my-sm" @click="ok(o)">
        <img class="logo" :src="o.icon"/>
        <span class="orgcode">{{o.id}}</span>
      </div>
    </div>
  </q-page>
</template>

<script>
import { cfg } from '../app/util'
import { computed } from 'vue'
import { useStore } from 'vuex'
import { remplacePage, onBoot } from '../app/page.mjs'

export default ({
  name: 'Org',
  components: { },
  data () {
    return {
    }
  },

  methods: {
    ok (o) {
      this.org = o.id
      remplacePage('Login')
    }
  },

  setup () {
    onBoot()
    const $store = useStore()
    const orgs = cfg().orgs
    const listeorgs = []
    for (const o in orgs) listeorgs.push({ id: o, icon: orgs[o].icon })
    $store.commit('ui/majorg', null)
    const org = computed({
      get: () => $store.state.ui.org,
      set: (val) => $store.commit('ui/majorg', val)
    })
    return {
      org,
      listeorgs
    }
  }

})
</script>

<style lang="sass">
@import '../css/app.sass'
.logo
  width: 64px
.orgcode
  font-size: 1.5rem
  margin-left: 1rem
</style>
