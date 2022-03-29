<template>
<q-card v-if="sessionok && avatarId" class="q-pa-sm full-width fs-md shadow-8">
  <div class="row justify-between items-center full-width">
    <div class="col row justify-start items-center full-width ligne cursor-pointer" @click="click">
      <img class="col-auto photomax" :src="a.photo"/>
      <div class="col q-px-sm">
        <span class='titre-lg text-bold'>{{a.na.noml}}</span><span class='titre-sm q-pl-sm'>[id: {{a.na.sid}}]</span>
      </div>
    </div>
    <q-btn class="col-auto" v-if="editer" flat dense size="md" color="primary" icon="edit" @click="cvloc=true"/>
  </div>
  <div v-if="a.info" class="full-width overflow-y-auto height-4 shadow-8"><show-html :texte="a.info"/></div>
  <q-btn v-if="invitationattente" class="titre-lg text-bold text-grey-8 bg-yellow-4 q-mx-sm" label="[Contact !]" dense flat @click="copier"/>

  <q-dialog v-model="cvloc">
    <carte-visite :na="a.na" :close="closedialog" :photo-init="a.photo" :info-init="a.info" @ok="validercv"/>
  </q-dialog>
</q-card>
</template>

<script>
import { useStore } from 'vuex'
import { watch, toRef, reactive, computed, ref } from 'vue'
import ShowHtml from './ShowHtml.vue'
import CarteVisite from './CarteVisite.vue'
import { data, Cv } from '../app/modele.mjs'
import { retourInvitation } from '../app/page.mjs'
import { MajCv } from '../app/operations.mjs'
import { cfg } from '../app/util.mjs'

export default ({
  name: 'ApercuAvatar',

  props: {
    avatarId: Number,
    editer: Boolean
  },

  components: { ShowHtml, CarteVisite },

  computed: { },

  watch: { },

  data () { return { } },

  methods: {
    click () {
      this.$emit('click-apercu', this.avatarId)
    },
    closedialog () { this.cvloc = false },
    async validercv (resultat) {
      if (resultat) {
        // console.log('CV changée : ' + resultat.info + '\n' + resultat.ph.substring(0, 30))
        const cv = new Cv().init(this.a.na.id, resultat.ph, resultat.info)
        await new MajCv().run(cv)
      }
    },
    copier () {
      retourInvitation(this.a.av)
    }
  },

  setup (props) {
    const $store = useStore()
    const phdef = cfg().avatar
    const sessionok = computed(() => $store.state.ui.sessionok)
    const cvloc = ref(false)

    const a = reactive({ na: null, photo: phdef, info: '' })
    const avatarId = toRef(props, 'avatarId')
    const invitationattente = computed({
      get: () => $store.state.ui.invitationattente,
      set: (val) => $store.commit('ui/majinvitationattente', val)
    })

    const cvs = computed(() => { return $store.state.db.cvs })

    function init () {
      if (!sessionok.value) return
      const cv = cvs.value[avatarId.value]
      a.na = data.repertoire.na(avatarId.value)
      a.photo = cv && cv[0] ? cv[0] : phdef
      a.info = cv && cv[1] ? cv[1] : ''
    }

    watch(avatarId, (ap, av) => {
      init()
    })

    watch(() => cvs.value, (ap, av) => {
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
