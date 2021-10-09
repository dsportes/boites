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
import { useStore } from 'vuex'

export default ({
  name: 'Org',
  components: { },
  data () {
    return {
    }
  },

  methods: {
    ok (o) {
      this.$router.replace({ path: `/${o.id}` })
    }
  },

  setup () {
    const $store = useStore()
    $store.commit('ui/majorgicon', cfg().logo)
    const orgs = cfg().orgs
    const listeorgs = []
    for (const o in orgs) {
      listeorgs.push({ id: o, icon: orgs[o].icon })
    }
    return {
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
