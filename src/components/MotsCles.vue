<template>
<div class='colomn' style="width:100%">
  <div>
    <q-btn :disable="enedition" flat dense size="md" color="warning" label="Editer" @click="startEdit"/>
    <q-btn :disable="!enedition" flat dense size="md" color="warning" label="Annuler" @click="cancelEdit"/>
    <q-btn :disable="!enedition" flat dense size="md" color="warning" label="Valider" @click="okEdit"/>
  </div>
  <q-splitter v-model="splitterModel" class="col" style="width:100%">
    <template v-slot:before>
      <q-tabs v-model="tab" no-caps vertical >
        <q-tab v-for="categ in lcategs" :key="categ" :name="categ" :label="categ" />
      </q-tabs>
    </template>
    <template v-slot:after>
      <q-tab-panels v-model="tab" animated swipeable vertical transition-prev="jump-up" transition-next="jump-up" >
        <q-tab-panel v-for="categ in lcategs" :key="categ" :name="categ">
          <div v-for="item in categs.get(categ)" :key="item.org + '/' + item.idx" style="width:100%">
            <span class="nom">{{item.nom}}</span><span class="idx font-mono">[{{item.idx}}]</span>
            <span v-if="item.src !== 0">
              <q-btn icon="mode_edit" size="sm" dense @click="edit(categ, item.nom, item.idx)"></q-btn>
              <q-btn icon="close" size="sm" dense @click="suppr(item.idx)"></q-btn>
            </span>
          </div>
        </q-tab-panel>
      </q-tab-panels>
    </template>
  </q-splitter>
</div>
</template>
<script>
import { useStore } from 'vuex'
import { computed, onMounted, onUpdated, ref } from 'vue'
import { cfg } from '../app/util.mjs'
import { data } from '../app/modele.mjs'

export default ({
  name: 'MotsCles',

  components: { },

  data () {
    return {
      enedition: false,
      localmap: null
    }
  },

  watch: {
    compte (val) {
      if (!this.enedition) this.rebuild(val.mmc)
    }
  },

  methods: {
    startEdit () {
      this.enedition = true
      this.localmap = {}
      for (const i in this.compte.mmc) {
        this.localmap[i] = this.compte.mmc[i]
      }
      this.rebuild(this.localmap)
    },
    cancelEdit () {
      this.rebuild(this.compte.mmc)
      this.enedition = false
    },
    okEdit () {
      // simulation du retour sync de maj serveur
      console.log('Maj mots clés')
      const c = this.compte.clone
      c.mmc = this.localmap
      c.v++
      data.setCompte(c)
    },
    edit (categ, nom, idx) {

    },
    suppr (idx) {

    }
  },

  setup () {
    const $store = useStore()
    const compte = computed(() => $store.state.db.compte)
    const mc = cfg().motscles
    const categs = new Map()
    const lcategs = []
    const tab = ref('(racine)')

    function fusion (map, src) {
      for (const i in map) {
        const idx = parseInt(i)
        const nc = map[i]
        const j = nc.indexOf('/')
        const categ = j === -1 ? '(racine)' : nc.substring(0, j)
        const nom = j === -1 ? nc : nc.substring(j + 1)
        let x = categs.get(categ)
        if (!x) {
          x = []
          categs.set(categ, x)
        }
        x.push({ nom, idx, src })
      }
      if (!categs.has('(racine)')) categs.set('(racine)', [])
    }

    function tri () {
      categs.forEach((v, k) => {
        lcategs.push(k)
        if (v.length > 1) v.sort((a, b) => { return a.nom < b.nom ? -1 : a.nom === b.nom ? 0 : 1 })
      })
      lcategs.sort()
    }

    function rebuild (map) {
      const tabv = tab.value
      tab.value = null
      categs.clear()
      fusion(mc, 0)
      fusion(map, 1)
      tri()
      setTimeout(() => { tab.value = tabv }, 50)
    }

    onMounted(() => {
      console.log('MotsCles updated!')
      rebuild(compte.value.mmc)
    })

    onUpdated(() => {
      console.log('updated!')
      rebuild()
    })

    return {
      compte,
      categs,
      lcategs,
      tab,
      rebuild,
      splitterModel: ref(33) // start at 33%
    }
  }
})
</script>

<style lang="sass" scoped>
@import '../css/app.sass'
.idx
  font-size: 0.7rem
.nom
  font-size: 1rem
  padding-right: 1rem
</style>
