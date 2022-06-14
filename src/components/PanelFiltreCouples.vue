<template>
  <q-scroll-area style="height:80vh;width:22rem">
  <q-card class="shadow-8">
    <q-card-actions align="between">
      <q-btn v-if="$q.screen.lt.md" size="md" flat dense color="negative" icon="close" @click="fermeture" />
      <q-btn :disable="!modifie" size="md" flat dense color="primary" icon="undo" label="Annuler" @click="annuler" />
      <q-btn :disable="!modifie" size="md" flat dense color="warning" icon="search" label="Rechercher" @click="ok" />
    </q-card-actions>
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
    <div class="q-pa-sm column justify-start">
      <q-input v-model="state.a.texte" dense label="Dont le nom contient :" style="width:10rem"></q-input>
      <q-checkbox v-model="state.a.corps" dense size="md" label="Chercher aussi dans les ardoises et notes personnelles"/>
    </div>
    <q-separator/>
    <div class="q-pa-sm colmun justify-start">
      <div class="row">
        <q-btn-dropdown size="md" dense color="primary" label="Etat du contact" v-model="menudd1">
          <div class="clair1 column">
            <q-btn flat dense no-caps :label="labelphase['0']" @click="menudd1=false;state.a.phase=0"/>
            <q-btn flat dense no-caps :label="labelphase['1']" @click="menudd1=false;state.a.phase=1"/>
            <q-btn flat dense no-caps :label="labelphase['2']" @click="menudd1=false;state.a.phase=2"/>
            <q-btn flat dense no-caps :label="labelphase['3']" @click="menudd1=false;state.a.phase=3"/>
            <q-btn flat dense no-caps :label="labelphase['4']" @click="menudd1=false;state.a.phase=4"/>
            <q-btn flat dense no-caps :label="labelphase['5']" @click="menudd1=false;state.a.phase=5"/>
          </div>
        </q-btn-dropdown>
        <div class="q-pl-md">{{labelphase['' + state.a.phase]}}</div>
      </div>
    </div>
    <q-separator/>
    <div class="q-pa-sm row">
      <q-btn-dropdown size="md" dense color="primary" label="Triés par" v-model="menudd3">
        <div class="clair1 column">
        <q-btn flat dense no-caps :label="labeltri['p0']" @click="menudd3=false;state.a.tri=0"/>
        <q-btn flat dense no-caps :label="labeltri['p1']" @click="menudd3=false;state.a.tri=1"/>
        <q-btn flat dense no-caps :label="labeltri['m1']" @click="menudd3=false;state.a.tri=-1"/>
        <q-btn flat dense no-caps :label="labeltri['p2']" @click="menudd3=false;state.a.tri=2"/>
        <q-btn flat dense no-caps :label="labeltri['m2']" @click="menudd3=false;state.a.tri=-2"/>       </div>
      </q-btn-dropdown>
      <div class="q-pl-md">{{labeltri[state.a.tri >= 0 ? 'p' + state.a.tri : 'm' + (-state.a.tri)]}}</div>
    </div>
  </q-card>
</q-scroll-area>
</template>

<script>
import { toRef } from 'vue'
import { FiltreCp } from '../app/util.mjs'
import { serial, deserial } from '../app/schemas.mjs'
import ApercuMotscles from './ApercuMotscles.vue'
import SelectMotscles from './SelectMotscles.vue'

const vars = ['mc1', 'mc2', 'aps', 'texte', 'corps', 'tri']

export default ({
  name: 'PanelFiltreCouples',

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
      menudd3: false
    }
  },

  methods: {
    mcedit1cl () { this.mcedit1 = false },
    mcedit2cl () { this.mcedit2 = false },
    changermc1 (mc) { this.state.a.mc1 = mc },
    changermc2 (mc) { this.state.a.mc2 = mc },
    ok () {
      const f = new FiltreCp().depuisEtat(this.state.a)
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
    const state = toRef(props, 'etatInterne')
    toRef(props, 'motscles')

    const labelphase = {
      0: 'Indifférent',
      1: 'En attente de réponse',
      2: 'Hors délai',
      3: 'Refusé',
      4: 'Actif',
      5: 'Contact disparu'
    }
    const labeltri = {
      p0: 'Ne pas trier les contacts',
      p1: 'Ordre alphabétique du nom',
      m1: 'Ordre alphabétique inverse du nom',
      p2: 'Dates de modification croissantes de l\'ardoise',
      m2: 'Dates de modification décroissantes de l\'ardoise'
    }

    return {
      labelphase,
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
</style>
