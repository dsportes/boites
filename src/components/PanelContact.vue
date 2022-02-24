<template>
  <q-card class="full-height moyennelargeur fs-md column">
    <q-toolbar class="col-auto bg-primary text-white maToolBar">
      <q-btn flat round dense icon="close" size="md" class="q-mr-sm" @click="fermer" />
      <q-toolbar-title><div class="titre-md tit text-center">{{contact ? contact.nom : ''}}</div></q-toolbar-title>
      <q-btn v-if="mode <= 2" :disable="!modif" class="q-ml-sm" flat dense color="white" icon="undo" @click="initState"/>
      <q-btn v-if="mode <= 2" :disable="!modif || erreur !== ''" class="q-my-sm"
        flat dense color="white" :label="'Valider'" icon="check" @click="valider"/>
    </q-toolbar>

    <q-card-section>
      <div class="q-my-sm row">
        <img class="col-auto photomax" :src="contact ? contact.ph : ''"/>
        <show-html class="col q-ml-md bord1 height-6" :texte="contact ? contact.cv.info : ''"/>
      </div>
    </q-card-section>

    <q-card-section>
      <div style="margin-left:-0.8rem" class="text-primary">
        <q-toggle v-model="state.aps" size="md" :color="state.aps ? 'green' : 'grey'"
          :label="'' + (!state.aps ? 'Je n\'accepte pas' : 'J\'accepte') + ' le partage de secrets avec ce contact'"/>
      </div>
      <div style="margin-left:-0.8rem" class="text-primary">
        <q-toggle v-model="state.apsb" size="md" disable :color="state.apsb ? 'green' : 'grey'"
          :label="(!state.apsb ? 'Le contact n\'accepte pas' : 'Le contact accepte') + ' le partage de secrets avec moi'"/>
      </div>
    </q-card-section>

    <q-card-section>
      <div class="titre-md">Ardoise commune avec le contact</div>
      <editeur-md class="height-8" v-model="state.ard" :texte="contact ? contact.ard : ''" editable/>
    </q-card-section>

    <q-card-section>
      <div class="titre-md">Commentaires personnels</div>
      <editeur-md class="height-8" v-model="state.info" :texte="contact ? contact.info : ''" editable/>
    </q-card-section>

    <q-card-section>
      <div class="titre-md">Mots clés qualifiant le contact</div>
      <apercu-motscles :motscles="state.motscles" :src="state.mc" :args-click="{}" @click-mc="mcledit=true"/>
    </q-card-section>

    <q-dialog v-model="mcledit">
      <select-motscles :motscles="state.motscles" :src="state.mc" @ok="changermcl" :close="fermermcl"></select-motscles>
    </q-dialog>

  </q-card>
</template>
<script>
import { computed, reactive, watch } from 'vue'
import { useStore } from 'vuex'
import { Motscles, equ8 } from '../app/util.mjs'
import { data } from '../app/modele.mjs'
import { MajContact } from '../app/operations.mjs'
import ShowHtml from './ShowHtml.vue'
import EditeurMd from './EditeurMd.vue'
import ApercuMotscles from './ApercuMotscles.vue'
import SelectMotscles from './SelectMotscles.vue'

export default ({
  name: 'PanelContacts',

  components: { ShowHtml, EditeurMd, ApercuMotscles, SelectMotscles },

  props: { close: Function },

  computed: {
    modif () {
      const c = this.contact
      if (!c) return false
      const s = this.state
      return c.info !== s.info || c.ard !== s.ard || !equ8(c.mc, s.mc) || s.aps !== (c.stx === 1)
    }
  },

  data () {
    return {
      erreur: '',
      mcledit: false
    }
  },

  methods: {
    fermermcl () { this.mcledit = false },
    changermcl (mc) { this.state.mc = mc },
    async valider () {
      await new MajContact().run(this.contact, this.state)
    },
    fermer () { if (this.close) this.close() }
  },

  setup () {
    const $store = useStore()
    const diagnostic = computed({
      get: () => $store.state.ui.diagnostic,
      set: (val) => $store.commit('ui/majdiagnostic', val)
    })
    const contact = computed(() => { return $store.state.db.contact })
    const mode = computed(() => $store.state.ui.mode)
    const prefs = computed(() => { return data.getPrefs() })

    const state = reactive({
      motcles: null,
      mc: null,
      aps: false,
      apsb: false,
      info: '',
      ard: ''
    })

    const mc = reactive({ categs: new Map(), lcategs: [], st: { enedition: false, modifie: false } })

    function chargerMc () {
      state.motscles = new Motscles(mc, 1, 0)
      state.motscles.recharger()
    }

    function initState () {
      const c = contact.value
      state.aps = c ? c.stx === 1 : false
      state.apsb = c ? c.sty === 1 : false
      state.info = c ? c.info : ''
      state.ard = c ? c.ard : ''
      state.mc = c ? c.mc : new Uint8Array([])
    }

    initState()
    chargerMc()

    watch(() => prefs.value, (ap, av) => {
      chargerMc()
    })

    watch(() => contact.value, (ap, av) => {
      initState()
    })

    return {
      initState,
      state,
      diagnostic,
      contact,
      mode
    }
  }
})
</script>
<style lang="sass" scoped>
@import '../css/app.sass'
.bord1
  border:  1px solid $grey-5
</style>
