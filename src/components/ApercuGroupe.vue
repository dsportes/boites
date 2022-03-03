<template>
<q-card class="q-pa-sm full-width fs-md shadow-8">
  <div class="row justify-between items-center full-width q-my-lg">
    <div class="col row justify-start items-center full-width">
      <img class="col-auto photomax" :src="photo"/>
      <div class="col q-px-sm">
        <span class='titre-lg text-bold'>{{ids[1]}}</span><span class='titre-sm q-pl-sm'>@{{ids[0]}}</span>
      </div>
    </div>
    <q-btn class="col-auto" v-if="editer" flat dense size="md" color="primary" icon="edit" @click="cvloc=true"/>
  </div>
  <div class="full-width overflow-y-auto height-4 shadow-8"><show-html :texte="info"/></div>
  <q-dialog v-model="cvloc">
    <carte-visite :nomc="nomc" :close="closedialog" :photo-init="photox" :info-init="info" @ok="validercv"/>
  </q-dialog>
</q-card>
</template>

<script>
import { watch, computed, reactive } from 'vue'
import ShowHtml from './ShowHtml.vue'
import CarteVisite from './CarteVisite.vue'
import { cfg } from '../app/util.mjs'
import { MajCvGroupe } from '../app/operations.mjs'
import { useStore } from 'vuex'

export default ({
  name: 'ApercuGroupe',

  props: { editer: Boolean },

  components: {
    ShowHtml, CarteVisite
  },

  computed: {
    photo () { return this.state.g && this.state.g.photo ? this.state.g.photo : this.personnes },
    photox () { return this.state.g && this.state.g.photo ? this.state.g.photo : '' },
    ids () { return this.state.g ? [this.state.g.na.sid, this.state.g.na.nom] : ['', ''] },
    nomc () { return this.state.g ? this.state.g.na.nomc : '' },
    info () { return this.state.g ? this.state.g.info : '' }
  },

  data () {
    return {
      cvloc: false
    }
  },

  methods: {
    closedialog () { this.cvloc = false },
    async validercv (phinfo) {
      if (phinfo) {
        await new MajCvGroupe().run(this.state.g, phinfo)
      }
    }
  },

  setup (props) {
    const $store = useStore()
    const personnes = cfg().personnes.default
    const groupe = computed(() => { return $store.state.db.groupe })
    const state = reactive({
      g: groupe.value
    })

    watch(groupe, (ap, av) => {
      state.g = ap
    })

    return {
      state,
      personnes
    }
  }
})
</script>
<style lang="sass" scoped>
@import '../css/app.sass'
.q-card > div
  box-shadow: inherit !important
</style>
<style lang="css">
@import '../css/cropper.css'
</style>
