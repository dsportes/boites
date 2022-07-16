<template>
<q-card class="fs-md moyennelargeur">
  <div class="top bg-secondary text-white full-width">
    <q-toolbar class="q-px-xs">
      <q-btn dense size="md" icon="chevron_left" @click="panelcontacts=false"/>
      <q-toolbar-title class="titre-lg full-width text-right q-pr-sm">Tous les contacts</q-toolbar-title>
    </q-toolbar>
    <div class="q-px-xs column justify-center">
      <div class="row items-end">
        <q-radio v-model="opt" val="c" label="contient" />
        <q-radio v-model="opt" val="d" label="débute par" />
        <q-input v-model="txt" class="q-ml-lg" style="width:4rem" label="abc"/>
      </div>
    </div>
  </div>

  <div class="q-pa-sm scroll" style="max-height:100vh;">
    <div class="filler"></div>
    <div>
      <span class="titre-md text-italic q-pr-sm">Avatars du compte :</span>
      <span v-for="(na, idx) in s.lavc" :key="idx" class="q-mr-md">
        <span :class="(idx === 0 ? 'text-bold' : '') + ' font-mono q-mr-xs'">{{na.nom}}</span>
        <q-btn dense size="sm" icon="content_copy" color="primary" @click="copier(na)"/>
      </span>
    </div>
    <q-separator/>
    <div v-for="(ax, idx) in s.lst" :key="ax.na.id">
      <q-card class="q-ma-sm">
        <fiche-avatar :na-avatar="ax.na" :idx="idx" contacts groupes>
        </fiche-avatar>
      </q-card>
    </div>
  </div>

  <q-dialog v-model="nvcouple">
    <nouveau-couple :id1="ax.na.id" :close="closenvcouple" />
  </q-dialog>
</q-card>
</template>

<script>
import { useStore } from 'vuex'
import { computed, reactive, watch, ref } from 'vue'
import NouveauCouple from './NouveauCouple.vue'
import FicheAvatar from './FicheAvatar.vue'
import { data } from '../app/modele.mjs'
import { affichermessage } from '../app/util.mjs'

export default ({
  name: 'PanelContacts',

  components: { FicheAvatar, NouveauCouple },

  data () {
    return {
      nvcouple: false,
      avatars: [],
      nomavatar: '',
      ax: null
    }
  },

  watch: {
    nomavatar (ap, av) { this.avatar = data.getAvatar(data.getCompte().avatarDeNom(ap)) }
  },

  methods: {
    na (id) { return data.repertoire.na(id) },
    ouvrirnvcouple (ax) { this.ax = ax; this.nvcouple = true },
    closenvcouple () { this.nvcouple = false },
    copier (na) {
      affichermessage(na.nom + ' copié')
      this.$store.commit('ui/majclipboard', na)
    }
  },

  setup () {
    const $store = useStore()
    const opt = ref('c')
    const txt = ref('')
    const detaildial = ref(false)
    const panelcontacts = computed({
      get: () => $store.state.ui.panelcontacts,
      set: (val) => $store.commit('ui/majpanelcontacts', val)
    })
    const mode = computed(() => $store.state.ui.mode)
    const invit = computed(() => { return $store.state.ui.invitationattente })
    const tousAx = computed(() => { return $store.state.db.tousAx })
    const cvs = computed(() => { return $store.state.db.cvs })
    const compte = computed(() => $store.state.db.compte)
    const avatar = computed({
      get: () => $store.state.db.avatar,
      set: (val) => $store.commit('db/majavatar', val)
    })

    const s = reactive({
      blst: [],
      lst: [],
      lavc: []
    })

    function init1 () {
      const lavc = Array.from(compte.value.avatarNas())
      const nomp = compte.value.naprim.nom
      lavc.sort((a, b) => { return a.nom === nomp ? -1 : (a.nom < b.nom ? -1 : 1) })
      s.lavc = lavc
      const lst = []
      for (const id in tousAx.value) {
        const ax = tousAx.value[id]
        if (!ax.x) lst.push({ na: ax.na, c: ax.c, m: ax.m, noml: ax.na.noml })
      }
      lst.sort((a, b) => { return a.noml < b.noml ? -1 : (b.noml > a.noml ? 1 : 0) })
      s.blst = lst
    }

    function filtre () {
      const lst = []
      const c = opt.value === 'c'
      const t = txt.value
      s.blst.forEach(ax => {
        if (!t) {
          lst.push(ax)
        } else {
          if (c) {
            if (ax.noml.indexOf(t) !== -1) lst.push(ax)
          } else {
            if (ax.noml.startsWith(t)) lst.push(ax)
          }
        }
      })
      s.lst = lst
    }

    watch(() => tousAx.value, (ap, av) => { init1(); filtre() })
    watch(() => cvs.value, (ap, av) => { init1(); filtre() })
    watch(() => opt.value, (ap, av) => { filtre() })
    watch(() => txt.value, (ap, av) => { filtre() })
    watch(() => panelcontacts.value, (ap, av) => {
      if (!ap) {
        detaildial.value = false
      }
    })

    init1()
    filtre()

    return {
      invit,
      panelcontacts,
      opt,
      txt,
      s,
      avatar,
      mode,
      detaildial
    }
  }
})
</script>

<style lang="sass" scoped>
@import '../css/app.sass'
@import '../css/input.sass'
$haut: 5.5rem
.top
  position: absolute
  top: 0
  left: 0
  height: $haut
  overflow: hidden
  background-color: $secondary
.filler
  height: $haut
  width: 100%
.q-toolbar
  padding: 2px !important
  min-height: 0 !important
.photomax
  margin-top: 4px
.q-card > div
  box-shadow: inherit !important
</style>
