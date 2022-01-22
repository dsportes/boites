<template>
<q-card class="q-pa-sm petitelargeur maauto fs-md shadow-8">
  <div class="row justify-between full-width q-pa-xs">
    <bouton-help page="p1"/>
    <q-btn v-if="selectionner" dense size="md" color="secondary" icon="navigate_next" label="Sélectionner" @click="toAvatar"/>
    <q-btn v-if="editer" flat dense size="md" color="primary" icon="edit" label="Editer" @click="cvloc=true"/>
  </div>
  <div class="row justify-between items-center full-width q-my-sm">
    <img class="col-auto photomax" :src="photo"/>
    <div class="col text-center">
      <span class='titre-lg text-bold'>{{ids[1]}}</span><span class='titre-sm q-pl-sm'>@{{ids[0]}}</span>
    </div>
  </div>
  <div class="full-width overflow-y-auto height-8 shadow-8"><show-html :texte="info"/></div>
  <q-dialog v-model="cvloc">
    <carte-visite :nomc="nomc" :close="closedialog" :photo-init="photo" :info-init="info" @ok="validercv"/>
  </q-dialog>
</q-card>
</template>

<script>
import { useStore } from 'vuex'
import { watch, toRef, reactive, computed } from 'vue'
import BoutonHelp from './BoutonHelp.vue'
import ShowHtml from './ShowHtml.vue'
import CarteVisite from './CarteVisite.vue'
import { cfg } from '../app/util.mjs'
import { data } from '../app/modele.mjs'
import { remplacePage } from '../app/page.mjs'
import { CvAvatar } from '../app/operations.mjs'

export default ({
  name: 'ApercuAvatar',

  props: {
    avatarId: Number,
    editer: Boolean,
    selectionner: Boolean
  },

  components: {
    BoutonHelp, ShowHtml, CarteVisite
  },

  computed: {
    photo () { return this.a.av && this.a.av.photo ? this.a.av.photo : this.personne },
    ids () { return this.a.av ? [this.a.av.sid, this.a.av.na.nom] : ['', ''] },
    nomc () { return this.a.av ? this.a.av.na.nomc : '' },
    info () { return this.a.av ? this.a.av.info : '' }
  },

  watch: { },

  data () {
    return {
      cvloc: false
    }
  },

  methods: {
    toAvatar () {
      this.$store.commit('db/majavatar', this.a.av)
      remplacePage('Avatar')
    },
    closedialog () { this.cvloc = false },
    async validercv (resultat) {
      if (resultat) {
        // console.log('CV changée : ' + resultat.info + '\n' + resultat.ph.substring(0, 30))
        const cvinfo = await this.a.av.cvToRow(resultat.ph, resultat.info)
        await new CvAvatar().run(this.a.av.id, cvinfo)
      }
    }
  },

  setup (props) {
    const $store = useStore()

    const personne = cfg().personne.default
    const a = reactive({ av: null })
    const avatarId = toRef(props, 'avatarId')

    // Pour tracker les retours mettant à jour l'avatar
    const avatars = computed(() => { return $store.state.db.avatars })

    if (avatarId.value) a.av = data.getAvatar(avatarId.value)

    watch(avatarId, (ap, av) => {
      a.av = data.getAvatar(ap)
    })

    watch(() => avatars.value, (ap, av) => {
      a.av = data.getAvatar(avatarId.value)
    })

    return {
      a,
      personne
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
