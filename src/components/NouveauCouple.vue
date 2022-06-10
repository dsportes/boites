<template>
  <q-card class="q-ma-xs moyennelargeur fs-md">
    <q-card-section class="column items-center">
      <div class="titre-lg text-center">Nouveau contact avec {{s.na1.noml}}</div>
      <q-btn flat @click="close" color="primary" label="Renoncer" class="q-ml-sm" />
      <q-select v-model="s.nomavatar" class="full-width" :options="s.avatars" dense options-dense label="Choisir mon avatar concerné"
        popup-content-style="border:1px solid #777777;border-radius:3px"/>
      <div v-if="s.deja === 0">{{s.na1.noml}} et {{s.nomavatar}} ne sont pas encore en contact</div>
      <div v-else class="text-bold text-warning">{{s.na1.noml}} et avec {{s.nomavatar}} sont déjà en contact {{s.deja}} fois</div>
    </q-card-section>

    <q-card-section v-if="sessionok">
      <q-stepper v-model="step" vertical color="primary" animated>
        <q-step :name="1" title="Mot de bienvenue sur l'ardoise du couple" icon="settings" :done="step > 1" >
          <editeur-md :texte="'Bonjour ' + s.na1.nom + ' !'" v-model="mot" editable modetxt style="height:8rem"></editeur-md>
          <div v-if="diagmot" class="fs-sm text-warning">De 10 à 140 signes ({{mot.length}})</div>
          <q-stepper-navigation>
            <q-btn flat @click="okmot" color="primary" label="Suivant" :disable="mot.length<10" class="q-ml-sm" />
          </q-stepper-navigation>
        </q-step>

        <q-step :name="2" title="Maximum d'espace attribués pour les secrets du contact" icon="settings" :done="step > 2" >
          <div>Mettre 0 pour ne PAS partager de secrets</div>
          <choix-forfaits v-model="max" :f1="1" :f2="1"/>
          <q-stepper-navigation>
            <q-btn flat @click="step = 1" color="primary" label="Précédent" class="q-ml-sm" />
            <q-btn flat @click="step = 3" color="primary" label="Suivant" class="q-ml-sm" />
          </q-stepper-navigation>
        </q-step>

        <q-step :name="3" title="Confirmation" icon="check" :done="step > 3" >
          <div>Nom de l'avatar sollicité: <span class="font-mono q-pl-md">{{s.na1.nom}}</span></div>
          <div>Mot de bienvenue: <span class="font-mono q-pl-md">{{mot}}</span></div>
          <div>Volumes maximum attribués aux secret du contact :
            <span class="font-mono q-pl-md">v1: {{ed1(max[0])}}</span>
            <span class="font-mono q-pl-lg">v2: {{ed2(max[1])}}</span>
          </div>
          <q-stepper-navigation>
            <q-btn flat @click="corriger" color="primary" label="Corriger" class="q-ml-sm" />
            <q-btn @click="confirmer" color="warning" label="Confirmer" icon="check" class="q-ml-sm" />
          </q-stepper-navigation>
        </q-step>

      </q-stepper>
    </q-card-section>
  </q-card>
</template>

<script>
import { useStore } from 'vuex'
import { computed, toRef, watch, reactive } from 'vue'
import ChoixForfaits from './ChoixForfaits.vue'
import EditeurMd from './EditeurMd.vue'
import { NouveauCouple } from '../app/operations.mjs'
import { edvol } from '../app/util.mjs'
import { UNITEV1, UNITEV2 } from '../app/api.mjs'
import { data } from '../app/modele.mjs'

export default ({
  name: 'NouveauCouple',

  props: { id1: Number, close: Function },

  components: { ChoixForfaits, EditeurMd },

  computed: {
    dlclass () { return this.$q.dark.isActive ? 'sombre' : 'clair' }
  },

  data () {
    return {
      step: 1,
      max: [1, 1],
      mot: '',
      diagmot: false,
      encours: false
    }
  },

  watch: {
    mot (ap, av) {
      this.diagmot = ap.length < 10 || ap.length > 140
    }
  },

  methods: {
    ed1 (f) { return edvol(f * UNITEV1) },
    ed2 (f) { return edvol(f * UNITEV2) },
    okmot () {
      if (this.mot.length > 0) {
        this.mot = this.mot.substring(0, 140)
        this.step = 2
      }
    },
    async confirmer () {
      await new NouveauCouple().run(this.avatar.na, this.s.na1, this.max, this.mot)
      this.mot = ''
      this.max = [1, 1]
      if (this.close) this.close()
    },
    corriger () {
      this.step = 1
    }
  },

  setup (props) {
    const $store = useStore()
    const avatar = computed({
      get: () => $store.state.db.avatar,
      set: (val) => $store.commit('db/majavatar', val)
    })
    const compte = computed(() => { return $store.state.db.compte })
    const sessionok = computed(() => { return $store.state.ui.sessionok })
    const id1 = toRef(props, 'id1')
    const tousAx = computed(() => { return $store.state.db.tousAx })

    const s = reactive({
      avatars: [],
      singl: true,
      deja: 0,
      na1: null,
      nomavatar: ''
    })

    const close = toRef(props, 'close')
    watch(() => sessionok.value, (ap, av) => {
      if (close.value) close.value()
    })

    function listeAvatars () {
      const c = compte.value
      s.avatars = c.avatars()
      s.singl = s.avatars.length === 1
      if (avatar.value) {
        s.nomavatar = avatar.value.na.nom
      } else {
        s.nomavatar = s.avatars[0]
        avatar.value = data.getAvatar(c.avatarDeNom(s.nomavatar))
      }
    }

    function onId1 () {
      s.na1 = data.repertoire.na(id1.value)
      const avid = avatar.value.id
      const ax = tousAx.value[id1.value]
      const lcpl = ax ? ax.c : new Set()
      s.deja = 0
      lcpl.forEach(idc => {
        const c = data.getCouple(idc)
        if (c.idI === avid || c.idE === avid) s.deja++
      })
    }

    watch(() => tousAx.value, (ap, av) => { onId1() })
    watch(() => avatar.value, (ap, av) => { onId1() })
    watch(() => s.nomavatar, (ap, av) => {
      avatar.value = data.getAvatar(data.getCompte().avatarDeNom(ap))
    })

    listeAvatars()
    onId1()

    return {
      sessionok,
      avatar,
      s
    }
  }
})
</script>

<style lang="sass" scoped>
@import '../css/app.sass'
@import '../css/input.sass'
.ta
  margin: 0
  border-top: 1px solid $grey-5
  border-bottom: 1px solid $grey-5
  overflow-y: auto
.q-dialog__inner
  padding: 0 !important
</style>

<style lang="sass">
.q-stepper--vertical
  padding: 4px !important
.q-stepper--bordered
  border: none
.q-stepper__tab
  padding: 2px 0 !important
.q-stepper__step-inner
  padding: 0px 2px 2px 18px !important
.q-stepper__nav
  padding: 0 !important
</style>
