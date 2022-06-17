<template>
  <q-scroll-area style="height:80vh;width:22rem">
  <q-card class="shadow-8">
    <q-toolbar dense class="bg-primary text-white">
      <q-btn v-if="$q.screen.lt.md" size="md" flat dense icon="chevron_left" @click="fermeture" />
      <q-space/>
      <q-btn :disable="!modifie" size="md" dense class="q-mr-sm" icon="undo" @click="annuler" />
      <q-btn :disable="!modifie" size="md" dense color="warning" icon="search" label="Rechercher" @click="ok" />
    </q-toolbar>
    <div class="q-pa-sm column justify-start ful-width">
        <q-checkbox v-model="state.a.perso" dense size="md" label="Secrets personnels" />
        <div class="row items-center">
          <div class="titre-sm">Contacts: </div>
          <q-radio left-label size="sm" dense class="q-ml-sm col-auto" v-model="state.a.cp" :val="-1" label="Tous" />
          <q-radio left-label size="sm" dense class="q-ml-sm col-auto" v-model="state.a.cp" :val="0" label="Aucun" />
          <q-select class="col q-ml-sm" dense options-dense popup-content-style="border:1px solid grey" v-model="selcp" :options="lru.cp" label="Récents" />
        </div>
        <div class="row items-center">
          <div class="titre-sm">Groupes: </div>
          <q-radio left-label size="sm" dense class="q-ml-sm col-auto" v-model="state.a.gr" :val="-1" label="Tous" />
          <q-radio left-label size="sm" dense class="q-ml-sm col-auto" v-model="state.a.gr" :val="0" label="Aucun" />
          <q-select class="col q-ml-sm" dense options-dense popup-content-style="border:1px solid grey" v-model="selgr" :options="lru.gr" label="Récents" />
        </div>
    </div>
    <q-separator/>
    <div class="q-pa-sm column justify-start">
      <div class="titre-4 text-primary">Ayant TOUS les mots clés suivants :</div>
      <apercu-motscles :motscles="motscles" :src="state.a.mc1" :args-click="{n:2}" @click-mc="mcedit1 = true"></apercu-motscles>
      <div class="titre-4 text-primary">MAIS n'ayant AUCUN des mots clés suivants :</div>
      <apercu-motscles :motscles="motscles" :src="state.a.mc2" :args-click="{n:2}" @click-mc="mcedit2 = true" ></apercu-motscles>
      <q-dialog v-model="mcedit1">
        <select-motscles :motscles="motscles" :src="state.a.mc1" @ok="changermc1" :close="mcedit1cl"></select-motscles>
      </q-dialog>
      <q-dialog v-model="mcedit2">
        <select-motscles :motscles="motscles" :src="state.a.mc2" @ok="changermc2" :close="mcedit2cl"></select-motscles>
      </q-dialog>
    </div>
    <q-separator/>
    <div class="q-pa-sm colmun justify-start">
      <q-checkbox v-model="state.a.perm" size="md" dense label="Secrets permanents" />
      <div class="row">
        <q-btn-dropdown size="md" dense color="primary" label="Temporaires" v-model="menudd1">
          <div class="clair1 column">
            <q-btn flat dense no-caps :label="labelt['p0']" @click="menudd1=false;state.a.temp=0"/>
            <q-btn flat dense no-caps :label="labelt['p99998']" @click="menudd1=false;state.a.temp=99998"/>
            <q-btn flat dense no-caps :label="labelt['p7']" @click="menudd1=false;state.a.temp=7"/>
            <q-btn flat dense no-caps :label="labelt['p30']" @click="menudd1=false;state.a.temp=30"/>
          </div>
        </q-btn-dropdown>
        <div class="q-pl-md">{{labelt['p' + state.a.temp]}}</div>
      </div>
    </div>
    <q-separator/>
    <div class="q-pa-sm row">
      <q-btn-dropdown size="md" dense color="primary" label="Modifiés depuis" v-model="menudd2">
        <div class="clair1 column">
          <q-btn flat dense no-caps :label="labelm['p0']" @click="menudd2=false;state.a.modif=0"/>
          <q-btn flat dense no-caps :label="labelm['p1']" @click="menudd2=false;state.a.modif=1"/>
          <q-btn flat dense no-caps :label="labelm['m1']" @click="menudd2=false;state.a.modif=-1"/>
          <q-btn flat dense no-caps :label="labelm['p7']" @click="menudd2=false;state.a.modif=7"/>
          <q-btn flat dense no-caps :label="labelm['m7']" @click="menudd2=false;state.a.modif=-7"/>
          <q-btn flat dense no-caps :label="labelm['p30']" @click="menudd2=false;state.a.modif=30"/>
          <q-btn flat dense no-caps :label="labelm['m30']" @click="menudd2=false;state.a.modif=-30"/>
          <q-btn flat dense no-caps :label="labelm['p90']" @click="menudd2=false;state.a.modif=90"/>
          <q-btn flat dense no-caps :label="labelm['m90']" @click="menudd2=false;state.a.modif=-90"/>
          <q-btn flat dense no-caps :label="labelm['p360']" @click="menudd2=false;state.a.modif=360"/>
          <q-btn flat dense no-caps :label="labelm['m360']" @click="menudd2=false;state.a.modif=-360"/>
        </div>
      </q-btn-dropdown>
      <div class="q-pl-md">{{labelm[state.a.modif >= 0 ? 'p' + state.a.modif : 'm' + (-state.a.modif)]}}</div>
    </div>
    <q-separator/>
    <div class="q-pa-sm column justify-start">
      <q-input v-model="state.a.texte" dense label="Dont le titre contient :" style="width:10rem"></q-input>
      <q-checkbox v-model="state.a.corps" dense size="md" label="Chercher aussi dans le texte du secret"/>
    </div>
   <q-separator/>
    <div class="q-pa-sm row">
      <q-btn-dropdown size="md" dense color="primary" label="Triés par" v-model="menudd3">
        <div class="clair1 column">
        <q-btn flat dense no-caps :label="labeltri['p0']" @click="menudd3=false;state.a.tri=0"/>
        <q-btn flat dense no-caps :label="labeltri['p1']" @click="menudd3=false;state.a.tri=1"/>
        <q-btn flat dense no-caps :label="labeltri['m1']" @click="menudd3=false;state.a.tri=-1"/>
        <q-btn flat dense no-caps :label="labeltri['p2']" @click="menudd3=false;state.a.tri=2"/>
        <q-btn flat dense no-caps :label="labeltri['m2']" @click="menudd3=false;state.a.tri=-2"/>
        <q-btn flat dense no-caps :label="labeltri['p3']" @click="menudd3=false;state.a.tri=3"/>
        <q-btn flat dense no-caps :label="labeltri['m3']" @click="menudd3=false;state.a.tri=-3"/>
        </div>
      </q-btn-dropdown>
      <div class="q-pl-md">{{labeltri[state.a.tri >= 0 ? 'p' + state.a.tri : 'm' + (-state.a.tri)]}}</div>
    </div>
  </q-card>
</q-scroll-area>
</template>

<script>
import { useStore } from 'vuex'
import { computed, toRef, watch, reactive } from 'vue'
import { Filtre } from '../app/util.mjs'
import { data } from '../app/modele.mjs'
import { serial, deserial } from '../app/schemas.mjs'
import ApercuMotscles from './ApercuMotscles.vue'
import SelectMotscles from './SelectMotscles.vue'

const vars = ['perso', 'ct', 'gr', 'mc1', 'mc2', 'perm', 'temp', 'modif', 'texte', 'corps', 'tri']

export default ({
  name: 'PanelFiltre',

  props: { fermer: Function, etatInterne: Object, motscles: Object },

  components: { ApercuMotscles, SelectMotscles },

  computed: {
    modifie () {
      let m = false
      vars.forEach(v => { if (this.state.a[v] !== this.state.p[v]) m = true })
      return m
    }
  },

  watch: {
    selcp (ap, av) { this.state.a.cp = ap.value },
    selgr (ap, av) { this.state.a.gr = ap.value }
  },

  data () {
    return {
      selcp: null,
      selgr: null,
      mcedit1: false,
      mcedit2: false,
      menudd1: false,
      menudd2: false,
      menudd3: false
    }
  },

  methods: {
    mcedit1cl () { this.mcedit1 = false },
    mcedit2cl () { this.mcedit2 = false },
    changermc1 (mc) { this.state.a.mc1 = mc },
    changermc2 (mc) { this.state.a.mc2 = mc },
    ok () {
      const f = new Filtre(this.avatar ? this.avatar.id : 0).depuisEtat(this.state.a)
      this.state.p = deserial(serial(this.state.a))
      this.$emit('ok', f)
      if (this.fermer) this.fermer()
    },
    annuler () {
      this.state.a = deserial(serial(this.state.p))
      if (this.fermer) this.fermer()
    },
    fermeture () {
      if (this.fermer) this.fermer()
    }
  },

  setup (props) {
    const $store = useStore()
    const avatar = computed(() => { return $store.state.db.avatar })
    const mode = computed(() => $store.state.ui.mode)
    const couple = computed(() => { return $store.state.db.couple })
    const groupe = computed(() => { return $store.state.db.groupe })
    const LRUcp = computed(() => { return $store.state.db.LRUcp })
    const LRUgr = computed(() => { return $store.state.db.LRUgr })

    const state = toRef(props, 'etatInterne')
    toRef(props, 'motscles')

    const labelm = {
      p0: 'N\'importe quand', p1: 'Plus d\'un jour', p7: 'Plus d\'une semaine', p30: 'Plus d\'un mois', p90: 'Plus d\'un trimestre', p360: 'Plus d\'un an', m1: 'Moins d\'un jour', m7: 'Moins d\'une semaine', m30: 'Moins d\'un mois', m90: 'Plus d\'un trimestre', m360: 'Moins d\'un an'
    }
    const labelt = {
      p0: 'Aucun',
      p99998: 'Tous',
      p7: 'Autodétruits dans la semaine',
      p30: 'Autodétruits dans le mois'
    }
    const labeltri = {
      p0: 'Ne pas trier les secrets',
      p1: 'Dates de modification croissantes',
      m1: 'Dates de modification décroissantes',
      p2: 'Dates de destruction croissantes',
      m2: 'Dates de destruction décroissantes',
      p3: 'Ordre alphabétique du titre',
      m3: 'Ordre alphabétique inverse du titre'
    }

    const lru = reactive({ cp: [], gr: [] })

    function initLRUs () {
      lru.cp.length = 0
      LRUcp.value.forEach(id => {
        const cp = data.getCouple(id)
        lru.cp.push({ label: cp.nomEd, value: id })
      })
      lru.gr.length = 0
      LRUgr.value.forEach(id => {
        const gr = data.getGroupe(id)
        lru.gr.push({ label: gr.nomEd, value: id })
      })
    }

    watch(() => LRUcp.value, (ap, av) => { initLRUs() })
    watch(() => LRUgr.value, (ap, av) => { initLRUs() })

    watch(() => state.value, (ap, av) => {
      console.log(ap.a.coupleId)
    })

    initLRUs()

    return {
      lru,
      avatar,
      mode,
      couple,
      groupe,
      labelm,
      labelt,
      labeltri,
      state
    }
  }

})
</script>
<style lang="sass" scoped>
@import '../css/app.sass'
.q-btn--dense
  padding: 1px !important
.q-toolbar
  padding: 2px !important
  min-height: 0 !important
</style>
