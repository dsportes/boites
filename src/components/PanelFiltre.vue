<template>
  <q-scroll-area style="height:80vh;width:22rem">
  <q-card class="shadow-8">
    <!--
    <q-card-actions vertical>
      <q-btn flat dense color="primary" size="md" icon="add" label="Nouveau secret personnel" @click="action(0)"/>
      <q-btn v-if="couple" flat dense size="md" color="primary" icon="add" :label="'Nouveau secret du couple ' +  couple.nom" @click="action(1)"/>
      <q-btn v-if="groupe" flat dense size="md" color="primary" icon="add" :label="'Nouveau secret du groupe ' +  groupe.nom" @click="action(2)"/>
      <div class="row justify-center">
        <q-input flat dense label="Port d'upload local" style="width:5rem" v-model="port" />
        <q-btn class="q-ml-sm" flat dense icon="save" label="Upload local" @click="action(3, port)" />
      </div>
    </q-card-actions>
    <q-separator/>
    -->
    <q-card-actions align="between">
      <q-btn v-if="$q.screen.lt.md" size="md" flat dense color="negative" icon="close" @click="fermeture" />
      <q-btn :disable="!modifie" size="md" flat dense color="primary" icon="undo" label="Annuler" @click="annuler" />
      <q-btn :disable="!modifie" size="md" flat dense color="warning" icon="search" label="Rechercher" @click="ok" />
    </q-card-actions>
    <q-separator/>
    <div class="q-pa-sm column justify-start ful-width">
        <q-checkbox v-model="state.a.perso" dense size="md" label="Secrets personnels" />
        <q-option-group :options="couple ? optionscp2 : optionscp1" dense v-model="state.a.cp"/>
        <q-option-group :options="groupe ? optionsgr2 : optionsgr1" dense v-model="state.a.gr"/>
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
import { computed, toRef, watch } from 'vue'
import { Filtre } from '../app/util.mjs'
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

  data () {
    return {
      mcedit1: false,
      mcedit2: false,
      menudd1: false,
      menudd2: false,
      menudd3: false,
      port: 8000
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
    },
    action (n, p) {
      this.$emit('action', n, p)
      if (this.fermer) this.fermer()
    }
  },

  setup (props) {
    const $store = useStore()
    const avatar = computed(() => { return $store.state.db.avatar })
    const mode = computed(() => $store.state.ui.mode)
    const couple = computed(() => { return $store.state.db.couple })
    const groupe = computed(() => { return $store.state.db.groupe })
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
    const optionscp1 = [
      { label: 'Aucun secret partagé en couple', value: 0 },
      { label: 'Secrets partagés en couple avec n\'importe qui', value: -1 }
    ]
    const optionscp2 = [
      { label: 'Aucun secret partagé en couple', value: 0 },
      { label: 'Secrets partagés en couple avec n\'importe qui', value: -1 }
    ]
    const optionsgr1 = [
      { label: 'Aucun secret partagé avec un groupe', value: 0 },
      { label: 'Secrets partagés avec n\'importe quel groupe', value: -1 }
    ]
    const optionsgr2 = [
      { label: 'Aucun partagé avec un groupe', value: 0 },
      { label: 'Secrets partagés avec n\'importe quel groupe', value: -1 }
    ]

    watch(() => groupe.value, (ap, av) => {
      optionsgr2.splice(2, 1, { label: 'Secrets partagés avec le groupe ' + groupe.value.nom, value: groupe.value.id })
    })
    watch(() => couple.value, (ap, av) => {
      optionscp2.splice(2, 1, { label: 'Secrets partagés avec ' + couple.value.nom, value: couple.value.id })
    })

    if (couple.value) {
      optionscp2.splice(2, 1, { label: 'Secrets partagés avec ' + couple.value.nom, value: couple.value.id })
    }
    if (groupe.value) {
      optionsgr2.splice(2, 1, { label: 'Secrets partagés avec le groupe ' + groupe.value.nom, value: groupe.value.id })
    }

    watch(() => state.value, (ap, av) => {
      console.log(ap.a.coupleId)
    })

    return {
      avatar,
      mode,
      couple,
      groupe,
      labelm,
      labelt,
      labeltri,
      optionscp1,
      optionscp2,
      optionsgr1,
      optionsgr2,
      state
    }
  }

})
</script>
<style lang="sass" scoped>
@import '../css/app.sass'
.q-btn--dense
  padding: 1px !important
</style>
