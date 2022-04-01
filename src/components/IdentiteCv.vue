<template>
<q-card v-if="sessionok && nomAvatar" class="full-width fs-md shadow-8">
  <div class="row justify-between items-center full-width">
    <div :class="'col row justify-start items-center full-width' + (clickable ? ' ligne cursor-pointer' : '')" @click="click">
      <img class="col-auto photomax" :src="a.photo"/>
      <div class="col q-px-sm">
        <span class='titre-md text-bold'>{{a.na.noml}}</span><span class='titre-sm q-pl-sm'>[id: {{a.na.sid}}]</span>
      </div>
    </div>
    <q-btn class="col-auto" v-if="editable" flat dense size="md" color="primary" icon="edit" @click="cvloc=true"/>
  </div>
  <div v-if="a.info" class="full-width overflow-y-auto height-2 shadow-8">
    <show-html :texte="a.info"/>
  </div>
  <q-btn v-if="invitable && nomAvatar && typeN === 'avatar' && invitationattente" class="titre-lg text-bold text-grey-8 bg-yellow-4 q-mx-sm"
    label="[Contact !]" dense flat @click="copier"/>

  <q-dialog v-model="cvloc">
    <carte-visite :na="a.na" :close="closedialog" :photo-init="a.photo" :info-init="a.info" @ok="cvchangee"/>
  </q-dialog>
</q-card>
</template>

<script>
import { useStore } from 'vuex'
import { watch, toRef, reactive, computed, ref } from 'vue'
import CarteVisite from './CarteVisite.vue'
import ShowHtml from './ShowHtml.vue'
import { data, Cv } from '../app/modele.mjs'
import { retourInvitation } from '../app/page.mjs'
import { cfg } from '../app/util.mjs'
export default ({
  name: 'IdentiteCv',

  props: {
    nomAvatar: Object,
    type: String, // 'avatar' (par défaut), 'groupe', 'couple'
    editable: Boolean,
    clickable: Boolean,
    invitable: Boolean
  },

  components: { ShowHtml, CarteVisite },

  computed: { },

  watch: { },

  data () { return { } },

  methods: {
    click () { if (this.clickable && this.a && this.a.na) this.$emit('identite-click', this.a.na) },
    closedialog () { this.cvloc = false },
    cvchangee (res) {
      if (res && this.nomAvatar) {
        const cv = new Cv().init(this.nomAvatar.id, res.ph, res.info)
        this.$emit('cv-changee', cv)
      }
    },
    copier () { if (this.typeN === 'avatar') retourInvitation(data.getAvatars(this.a.na.id)) }
  },

  setup (props) {
    const $store = useStore()
    const type = toRef(props, 'type')
    const typeN = type.value === 'groupe' ? 'groupe' : (type.value === 'couple' ? 'couple' : 'avatar')
    const phdef = cfg()[typeN]
    const sessionok = computed(() => $store.state.ui.sessionok)
    const cvloc = ref(false)

    const a = reactive({ photo: phdef, info: '' })
    const na = toRef(props, 'nomAvatar')
    const invitationattente = computed({
      get: () => $store.state.ui.invitationattente,
      set: (val) => $store.commit('ui/majinvitationattente', val)
    })

    const cvs = computed(() => { return $store.state.db.cvs })

    function init () {
      if (!sessionok.value || !na.value) return
      const cv = cvs.value[na.value.id]
      a.photo = cv && cv[0] ? cv[0] : phdef
      a.info = cv && cv[1] ? cv[1] : ''
      a.na = na.value
    }

    watch(() => na.value, (ap, av) => {
      init()
    })

    watch(() => cvs.value, (ap, av) => {
      init()
    })

    watch(() => sessionok.value, (ap, av) => {
      cvloc.value = false
    })

    if (na.value) init()

    return {
      cvloc,
      typeN,
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
