<template>
<div class="fs-md">
  <div class="top bg-secondary text-white">
    <q-toolbar>
      <q-btn dense size="md" icon="chevron_left" @click="panelcontacts=false"/>
      <q-toolbar-title class="titre-lg full-width text-right q-pr-sm">Tous les contacts</q-toolbar-title>
    </q-toolbar>
    <div class="column justify-center">
      <div class="row items-end">
        <q-radio v-model="opt" val="c" label="contient" />
        <q-radio v-model="opt" val="d" label="débute par" />
        <q-input v-model="txt" class="q-ml-lg" style="width:4rem" label="abc"/>
      </div>
    </div>
  </div>

  <div class="filler"></div>

  <div v-for="(ax, idx) in s.lst" :key="ax.na.id" :class="dkli(idx) + ' zone cursor-pointer full-width q-mb-sm'" @click="detail(ax)">
    <q-card class="row justify-start items-center">
      <img class="col-auto photomax q-mr-md" :src="ax.na.photoDef"/>
      <div class="col column">
        <div class="titre-md">{{ax.noml}}</div>
        <div class="fs-sm">
          <span v-if="ax.c.size" class="q-mr-sm">{{ax.c.size + (ax.c.size>1?' contacts':' contact')}}</span>
          <span v-if="ax.m.size">{{ax.m.size + (ax.m.size>1?' groupes':' groupe')}}</span>
        </div>
      </div>
    </q-card>
    <q-separator class="q-my-xs"/>
  </div>

  <q-dialog v-model="detaildial">
    <q-card class="shadow-8 petitelargeur">
      <q-card-section>
        <identite-cv :nom-avatar="ax.na" :invitable="invit != null" type="avatar"/>
      </q-card-section>
      <q-card-section>
        <div v-if="lstc.length">
          <span class="titre-sm text-italic">En contact avec:</span>
          <span class="q-ml-md" v-for="c in lstc" :key="c.id">{{c.naI.nom}}</span>
        </div>
        <div v-else class="titre-md text-italic">En contact avec personne</div>
      </q-card-section>
      <q-card-section>
        <div v-if="lstg.length">
          <div class="titre-sm text-italic">Membre de:</div>
          <div class="q-ml-lg" v-for="g in lstg" :key="g.id">{{g.nomEd}}</div>
        </div>
        <div v-else class="titre-md text-italic">Membre d'aucun groupe</div>
      </q-card-section>
      <q-card-actions>
        <q-btn flat dense color="primary" icon="close" label="Fermer" v-close-popup/>
        <q-btn flat dense color="primary" icon="add" label="Nouveau Contact" v-close-popup @click="nvcouple=true"/>
      </q-card-actions>
    </q-card>
  </q-dialog>

  <q-dialog v-model="nvcouple">
    <nouveau-couple :id1="ax.na.id" :close="closenvcouple" />
  </q-dialog>
</div>
</template>

<script>
import { useStore } from 'vuex'
import { computed, reactive, watch, ref } from 'vue'
import IdentiteCv from '../components/IdentiteCv.vue'
import NouveauCouple from './NouveauCouple.vue'
import { data } from '../app/modele.mjs'

export default ({
  name: 'PanelContacts',

  components: { IdentiteCv, NouveauCouple },

  data () {
    return {
      nac: null,
      naI: null,
      naE: null,
      nvcouple: false,
      avatars: [],
      nomavatar: '',
      ax: null,
      lstc: [],
      lstg: []
    }
  },

  watch: {
    nomavatar (ap, av) { this.avatar = data.getAvatar(data.getCompte().avatarDeNom(ap)) }
  },

  methods: {
    dkli (idx) { return this.$q.dark.isActive ? (idx ? 'sombre' + (idx % 2) : 'sombre0') : (idx ? 'clair' + (idx % 2) : 'clair0') },
    detail (ax) {
      this.ax = ax
      this.lstc = []
      this.lstg = []
      ax.c.forEach(id => { this.lstc.push(data.getCouple(id)) })
      ax.m.forEach(k => { this.lstg.push(data.getGroupe(k[0])) })
      this.detaildial = true
    },
    na (id) { return data.repertoire.na(id) },
    closenvcouple () { this.nvcouple = false; this.detaildial = false }
  },

  setup () {
    const $store = useStore()
    const opt = ref('c')
    const txt = ref('')
    const cvident = ref(false)
    const cpident = ref(false)
    const grident = ref(false)
    const detaildial = ref(false)
    const panelcontacts = computed({
      get: () => $store.state.ui.panelcontacts,
      set: (val) => $store.commit('ui/majpanelcontacts', val)
    })
    const mode = computed(() => $store.state.ui.mode)
    const invit = computed(() => { return $store.state.ui.invitationattente })
    const tousAx = computed(() => { return $store.state.db.tousAx })
    const cvs = computed(() => { return $store.state.db.cvs })
    const avatar = computed({
      get: () => $store.state.db.avatar,
      set: (val) => $store.commit('db/majavatar', val)
    })

    const s = reactive({
      blst: [],
      lst: []
    })

    function init1 () {
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
        cvident.value = false
        cpident.value = false
        grident.value = false
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
      cvident,
      cpident,
      grident,
      detaildial
    }
  }
})
</script>

<style lang="sass" scoped>
@import '../css/app.sass'
@import '../css/input.sass'
$haut: 5.5rem
$larg: 330px
.top
  position: absolute
  top: 0
  left: 0
  height: $haut
  width: $larg
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
