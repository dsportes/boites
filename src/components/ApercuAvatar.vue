<template>
<div class="column q-pa-sm q-my-md top">
  <div class="row">
    <div><img class="ph" :src="photo"/></div>
    <div class="col column items-center q-pl-md">
      <div><span class='titre-3'>{{ids[1]}}</span><span class='titre-5'>@{{ids[2]}}</span><bouton-help page="p1"/></div>
      <div>Identifiant: <span class='font-mono'>{{ids[0]}}</span></div>
      <q-btn flat dense size="md" color="primary" label="Editer la carte de visite" @click="cvloc=true"/>
    </div>
  </div>
  <div class="showhtml">
    <show-html :texte="info"/>
  </div>
  <q-dialog v-model="cvloc">
    <carte-visite :nomc="nomc" :photo-init="photo" :info-init="info" @ok="validercv" @annuler="annulercv"/>
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
import { data } from '../app/modele.mjs'
import { CvAvatar } from '../app/operations.mjs'

export default ({
  name: 'ApercuAvatar',

  props: {
    avatarId: Number
  },

  components: {
    BoutonHelp, ShowHtml, CarteVisite
  },

  computed: {
    photo () {
      return this.a.av && this.a.av.photo ? this.a.av.photo : this.personne
    },
    ids () {
      if (this.a.av) return [this.a.av.sid, this.a.av.na.nom, this.a.av.na.sfx]
      else return ['', '', '']
    },
    nomc () {
      return this.a.av ? this.a.av.na.nomc : ''
    },
    info () {
      return this.a.av ? this.a.av.info : ''
    }
  },

  watch: {
  },

  data () {
    return {
      cvloc: false
    }
  },

  methods: {
    async validercv (resultat) {
      this.cvloc = false
      // console.log('CV changée : ' + resultat.info + '\n' + resultat.ph.substring(0, 30))
      const cvinfo = await this.a.av.cvToRow(resultat.ph, resultat.info)
      await new CvAvatar().run(this.a.av.id, cvinfo)
    },
    annulercv () {
      this.cvloc = false
    }
  },

  setup (props) {
    const $store = useStore()

    function avatarDeId (id) {
      return data.avatar(id)
    }

    const personne = cfg().personne.default
    const a = reactive({ av: null })
    const avatarId = toRef(props, 'avatarId')

    const avatars = computed({ // Pour tracker les retours mettant à jour l'avatar
      get: () => { return $store.state.db.avatars }
    })

    onMounted(() => {
      if (avatarId.value) a.av = avatarDeId(avatarId.value)
    })

    watch(avatarId, (ap, av) => {
      a.av = avatarDeId(ap)
    })

    watch(
      () => avatars.value,
      (ap, av) => {
        a.av = avatarDeId(avatarId.value)
      }
    )

    return {
      a,
      avatarDeId,
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
  border-radius: 32px
  border: 1px solid grey
  width: 64px
  height: 64px
.showhtml
  width: 100%
  height: 3rem
  overflow: hidden
</style>
