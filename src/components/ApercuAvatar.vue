<template>
<div class="column q-pa-sm q-my-md top">
  <div class="row">
    <div><img class="ph" :src="photo"/></div>
    <div class="col column items-center q-pl-md">
      <div><span class='titre-3'>{{ids[1]}}</span><span class='titre-5'>@{{ids[2]}}</span><bouton-help page="p1"/></div>
      <div>Identifiant: <span class='font-mono'>{{ids[0]}}</span></div>
      <div class="row q-px-md">
        <q-btn v-if="editer" class="q-px-md" flat dense size="sm" color="primary" icon="edit" label="Editer" @click="cvloc=true"/>
        <q-btn v-if="page" class="q-px-md" flat dense size="sm" color="primary" icon="navigate_next" label="Page" @click="toAvatar"/>
      </div>
    </div>
  </div>
  <div class="showhtml">
    <show-html :texte="info"/>
  </div>
  <q-dialog v-model="cvloc">
    <carte-visite :nomc="nomc" :close="closedialog" :photo-init="photo" :info-init="info" @ok="validercv"/>
  </q-dialog>
</div>
</template>

<script>
import { useStore } from 'vuex'
import { onMounted, watch, toRef, reactive, computed } from 'vue'
import BoutonHelp from './BoutonHelp.vue'
import ShowHtml from './ShowHtml.vue'
import CarteVisite from './CarteVisite.vue'
import { cfg } from '../app/util.mjs'
import { data, remplacePage } from '../app/modele.mjs'
import { CvAvatar } from '../app/operations.mjs'

export default ({
  name: 'ApercuAvatar',

  props: {
    avatarId: Number,
    editer: Boolean,
    page: Boolean
  },

  components: {
    BoutonHelp, ShowHtml, CarteVisite
  },

  computed: {
    photo () { return this.a.av && this.a.av.photo ? this.a.av.photo : this.personne },
    ids () { return this.a.av ? [this.a.av.sid, this.a.av.na.nom, this.a.av.na.sfx] : ['', '', ''] },
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
      this.avatar = this.a.av
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

    const avatars = computed({ // Pour tracker les retours mettant à jour l'avatar
      get: () => { return $store.state.db.avatars }
    })

    const avatar = computed({
      get: () => { const a = $store.state.db.avatar; return a || { ko: true } },
      set: (val) => $store.commit('db/majavatar', val)
    })

    onMounted(() => {
      if (avatarId.value) a.av = data.getAvatar(avatarId.value)
    })

    watch(avatarId, (ap, av) => {
      a.av = data.getAvatar(ap)
    })

    watch(
      () => avatars.value,
      (ap, av) => {
        a.av = data.getAvatar(avatarId.value)
      }
    )

    return {
      a,
      avatar,
      personne
    }
  }
})
</script>
<style lang="css">
@import '../css/cropper.css'
</style>

<style lang="sass">
@import '../css/app.sass'
.top
  width: 100%
  border-radius: 5px
  border: 1px solid grey
.ph
  border-radius: $tphradius
  border: 1px solid grey
  width: $tph
  height: $tph
.showhtml
  width: 100%
  height: 3rem
  overflow: hidden
</style>
