<template>
<q-card v-if="sessionok && avatarId" class="q-pa-sm full-width fs-md shadow-8">
  <div class="row justify-between items-center full-width">
    <div class="col row justify-start items-center full-width ligne cursor-pointer" @click="toAvatar">
      <img class="col-auto photomax" :src="a.photo"/>
      <div class="col q-px-sm">
        <span class='titre-lg text-bold'>{{a.av.na.noml}}</span><span class='titre-sm q-pl-sm'>[id: {{a.av.sid}}]</span>
      </div>
    </div>
    <q-btn class="col-auto" v-if="editer" flat dense size="md" color="primary" icon="edit" @click="cvloc=true"/>
  </div>
  <div v-if="info" class="full-width overflow-y-auto height-4 shadow-8"><show-html :texte="info"/></div>
  <q-btn v-if="invitationattente" class="titre-lg text-bold text-grey-8 bg-yellow-4 q-mx-sm" label="[Contact !]" dense flat @click="copier"/>

  <q-dialog v-model="cvloc">
    <carte-visite :na="a.av.na" :close="closedialog" :photo-init="photo" :info-init="info" @ok="validercv"/>
  </q-dialog>
</q-card>
</template>

<script>
import { useStore } from 'vuex'
import { watch, toRef, reactive, computed, ref } from 'vue'
import ShowHtml from './ShowHtml.vue'
import CarteVisite from './CarteVisite.vue'
import { data } from '../app/modele.mjs'
import { remplacePage, retourInvitation } from '../app/page.mjs'
import { CvAvatar } from '../app/operations.mjs'

export default ({
  name: 'ApercuAvatar',

  props: {
    avatarId: Number,
    editer: Boolean,
    selectionner: Boolean
  },

  components: { ShowHtml, CarteVisite },

  computed: { },

  watch: { },

  data () { return { } },

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
    },
    copier () {
      retourInvitation(this.a.av)
    }
  },

  setup (props) {
    const $store = useStore()
    const phdef = '~assets/avatar.jpg'
    const sessionok = computed(() => $store.state.ui.sessionok)
    const cvloc = ref(false)

    const a = reactive({ av: null, photo: phdef, memo: '' })
    const avatarId = toRef(props, 'avatarId')
    const invitationattente = computed({
      get: () => $store.state.ui.invitationattente,
      set: (val) => $store.commit('ui/majinvitationattente', val)
    })

    const cvs = computed(() => { return $store.state.db.cvs })

    // Pour tracker les retours mettant à jour l'avatar
    const avatars = computed(() => { return $store.state.db.avatars })

    function init () {
      a.av = data.getAvatar(avatarId.value)
      const cv = a.av ? cvs.value(a.av.id) : null
      a.photo = cv && cv.photo ? cv.photo : phdef
      a.memo = cv && cv.memo ? cv.memo : ''
    }

    watch(avatarId, (ap, av) => {
      a.av = data.getAvatar(ap)
      init()
    })

    watch(() => avatars.value, (ap, av) => {
      a.av = data.getAvatar(avatarId.value)
      init()
    })

    watch(() => sessionok.value, (ap, av) => {
      cvloc.value = false
    })

    if (avatarId.value) init()

    return {
      cvloc,
      a,
      sessionok,
      invitationattente
    }
  }
})
</script>
<style lang="sass" scoped>
@import '../css/app.sass'
.ligne:hover
  background-color: rgba(130, 130, 130, 0.5)
.q-card > div
  box-shadow: inherit !important
</style>
<style lang="css">
@import '../css/cropper.css'
</style>
