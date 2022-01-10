<template>
  <q-card class="full-height moyennelargeur fs-md column">
    <q-toolbar class="col-auto bg-primary text-white maToolBar">
      <q-btn flat round dense icon="close" size="md" class="q-mr-sm" @click="fermer" />
      <q-toolbar-title><div class="titre-md tit text-center">{{state.titre}}</div></q-toolbar-title>
      <q-btn v-if="!state.lectureseule" :disable="!modif" class="q-ml-sm" flat dense color="white" label="Annuler" icon="undo" @click="undo"/>
      <q-btn v-if="!state.lectureseule" :disable="!modif" class="q-my-sm" flat dense color="white" :label="state.encreation?'Créer':'Valider'" icon="check" @click="valider"/>
    </q-toolbar>
    <q-toolbar v-if="state.lectureseule" inset :class="'col-auto maToolBar ' + tbclass">
        <q-toolbar-title class="text-center fs-md text-warning">Secret en lecture seule : {{state.lectureseule}}</q-toolbar-title>
    </q-toolbar>
    <q-toolbar v-if="state.encreation" inset :class="'col-auto maToolBar ' + tbclass">
        <q-toolbar-title class="text-center fs-md text-warning">Secret en création</q-toolbar-title>
    </q-toolbar>
    <q-toolbar inset class="col-auto bg-primary text-white maToolBar">
      <div class="full-width font-cf">
        <q-tabs v-model="tabsecret" inline-label no-caps dense>
          <q-tab name="texte" label="Texte" />
          <q-tab name="info" label="+ d'info" />
          <q-tab name="pj" label="Pièces Jointes" />
          <q-tab name="voisins" label="Secrets Voisins" />
        </q-tabs>
      </div>
    </q-toolbar>

    <div v-if="tabsecret==='texte'" class='col column'>
      <div class="col-auto q-pa-xs full-width row justify-between items-center">
        <apercu-motscles class="col" :motscles="state.motscles" :src="mclocal"/>
        <q-btn class="col-auto" color="primary" flat dense label="Mots clés personnels" @click="ouvrirmcl"/>
        <q-btn v-if="!state.lectureseule" :disable="!modifmcl" size="sm" class="col-auto" dense push icon="undo" color="primary" @click="undomcl"/>
      </div>
      <div v-if="state.ts === 2" class="col-auto q-pa-xs full-width row justify-between items-center">
        <apercu-motscles class="col" :motscles="state.motscles" :src="mcglocal"/>
        <q-btn class="col-auto" flat dense color="primary" label="Mots clés du groupe" @click="ouvrirmcg"/>
        <q-btn v-if="!state.lectureseule" :disable="!modifmcg" size="sm" class="col-auto" dense push icon="undo" color="primary" @click="undomcg"/>
      </div>

      <div class="col-auto q-pa-xs full-width row justify-between items-center">
        <div class="col">{{msgtemp}}</div>
        <q-btn v-if="templocal && !state.lectureseule" class="col-auto" flat dense color="primary" label="Le rendre 'PERMANENT'" @click="templocal=false"/>
        <q-btn v-if="!templocal && !state.lectureseule" class="col-auto" flat dense color="primary" label="Le rendre 'TEMPORAIRE'"  @click="templocal=true"/>
        <q-btn v-if="!state.lectureseule" :disable="!modiftp" class="col-auto" size="sm" dense push icon="undo" color="primary" @click="undotp"/>
      </div>

      <div class="col-auto q-pa-xs full-width row justify-between items-center">
        <q-option-group class="col-auto" inline :options="state.ts === 0 ? options1 : options2" dense v-model="oralocal"/>
        <q-btn v-if="!state.lectureseule" :disable="!modifora" class="col-auto" size="sm" dense push icon="undo" color="primary" @click="undoora"/>
      </div>

      <editeur-texte-secret class="col" v-model="textelocal" :texte-ref="secret.txt.t" :editable="!state.lectureseule"/>

      <q-dialog v-model="mcledit">
        <select-motscles :motscles="state.motscles" :src="mclocal" @ok="changermcl" :close="fermermcl"></select-motscles>
      </q-dialog>
      <q-dialog v-model="mcgedit">
        <select-motscles :motscles="state.motscles" :src="mcglocal" @ok="changermcg" :close="fermermcg"></select-motscles>
      </q-dialog>
    </div>

    <div v-if="tabsecret==='info'" class='col'>
      <div v-if="state.encreation" class="titre-lg">Secret en création ...</div>
      <div v-else>
        <div>Dernière modification : {{this.secret.dh}}</div>
      </div>
    </div>

    <div v-if="tabsecret==='pj'" class='col'>
      <div class="titre-lg">Pièces jointes</div>
    </div>

    <div v-if="tabsecret==='voisins'" class='col'>
      <div class="titre-lg">Secrets voisins</div>
    </div>

  </q-card>
</template>

<script>
import { toRef, ref, reactive, watch, computed } from 'vue'
import { useStore } from 'vuex'
import ApercuMotscles from './ApercuMotscles.vue'
import SelectMotscles from './SelectMotscles.vue'
import EditeurTexteSecret from './EditeurTexteSecret.vue'
import { equ8, getJourJ, cfg, serial, Motscles } from '../app/util.mjs'
import { NouveauSecret, Maj1Secret } from '../app/operations.mjs'
import { data } from '../app/modele.mjs'
import { crypt } from '../app/crypto.mjs'

export default ({
  name: 'PanelSecret',

  components: { ApercuMotscles, SelectMotscles, EditeurTexteSecret },

  props: { close: Function },

  computed: {
    tbclass () { return this.$q.dark.isActive ? ' sombre' : ' clair' },
    modifmcl () { return !equ8(this.mclocal, this.secret.ts === 2 ? this.secret.mc[this.state.im] : this.secret.mc) },
    modifmcg () { return this.secret.ts === 2 && !equ8(this.mcglocal, this.secret.mc[0]) },
    modifora () { return this.oralocal !== this.secret.ora },
    modiftx () { return this.textelocal !== this.secret.txt.t },
    modiftp () { return this.templocal !== (this.secret.st >= 0 && this.secret.st < 99999) },
    modif () { return this.modifmcl || this.modifmcg || this.modiftx || this.modiftp },
    nbj () { const st = this.secret.st; return st === 99999 || st === 0 ? 0 : st - this.jourJ },
    msgtemp () {
      if (this.templocal) return 'Secret auto-détruit ' + (this.nbj === 1 ? 'aujourd\'hui' : 'dans ' + this.nbj + ' jours')
      return 'Secret permanent'
    }
  },

  data () {
    return {
      tabsecret: 'texte',
      mcledit: false,
      mcgedit: false,
      temporaire: false,
      alertesaisie: false,
      options1: [
        { label: 'modifiable', value: 0 },
        { label: 'non modifiable (archivé)', value: 2 }
      ],
      options2: [
        { label: 'modifiable par tous', value: 0 },
        { label: 'le dernier auteur', value: 2 },
        { label: 'personne (archivé)', value: 2 }
      ]
    }
  },

  methods: {
    fermer () {
      this.secret = null
      if (this.close) this.close()
    },
    ouvrirmcl () { this.mcledit = true },
    fermermcl () { this.mcledit = false },
    ouvrirmcg () { this.mcgedit = true },
    fermermcg () { this.mcgedit = false },
    changermcl (mc) { this.mclocal = mc },
    changermcg (mc) { this.mcglocal = mc },
    async valider () { // secret de couple à traiter et ref
      const s = this.secret
      const txts = this.textelocal === s.txt.t ? new Uint8Array([0]) : await s.toRowTxt(this.textelocal, this.state.im)
      let mc = null, mcg = null
      if (s.ts !== 2) {
        mc = equ8(this.mclocal, s.mc) ? new Uint8Array([0]) : (!this.mclocal || !this.mclocal.length ? null : this.mclocal)
      } else {
        mc = equ8(this.mclocal, s.mc[this.state.im]) ? new Uint8Array([0]) : (!this.mclocal || !this.mclocal.length ? null : this.mclocal)
        mcg = equ8(this.mcglocal, s.mc[0]) ? new Uint8Array([0]) : (!this.mcglocal || !this.mcglocal.length ? null : this.mcglocal)
      }
      const v1 = this.v && this.textelocal === s.txt.t ? s.v1 : this.textelocal.length
      const tempav = this.secret.st >= 0 && this.secret.st < 99999
      let temp = 0 // inchangé
      if (tempav !== this.templocal) {
        temp = this.templocal ? this.jourJ + this.limjours : 99999
      }
      const arg = { ts: s.ts, id: s.id, ns: s.ns, mc: mc, txts: txts, v1: v1, ora: this.oralocal, temp: temp }
      if (s.ts === 2) {
        arg.mcg = mcg
        arg.im = this.state.im
      }
      if (s.ts === 1) {
        arg.id2 = s.id2
        arg.ns2 = s.ns2
      }
      if (s.v) {
        // maj
        // templocal à gérer
        await new Maj1Secret().run(arg)
      } else {
        // création
        arg.ic = s.ic
        arg.st = !this.templocal ? 99999 : (this.jourJ + this.limjours)
        if (s.ts === 1) {
          arg.ic2 = s.ic2
          arg.dups = await crypt.crypter(s.cles, serial([arg.id2, arg.ns2]))
          arg.dups2 = await crypt.crypter(s.cles, serial([arg.id, arg.ns]))
        }
        arg.refs = arg.ref ? await crypt.crypter(s.cles, serial(arg.ref)) : null
        await new NouveauSecret().run(arg)
      }
    }
  },

  setup (props) {
    const $store = useStore()
    const compte = computed(() => { return $store.state.db.compte })
    const avatar = computed(() => { return $store.state.db.avatar })
    const mode = computed(() => $store.state.ui.mode)
    const secret = computed({
      get: () => $store.state.db.secret,
      set: (val) => $store.commit('db/majsecret', val)
    })

    const textelocal = ref('')
    const mclocal = ref(null)
    const mcglocal = ref(null)
    const oralocal = ref(null)
    const templocal = ref(false)

    toRef(props, 'close')

    const state = reactive({
      motcles: null,
      contact: null,
      groupe: null,
      avatar: null,
      membre: null,
      im: 0,
      ts: 0,
      encreation: false,
      lectureseule: '',
      titre: ''
    })
    const mc = reactive({ categs: new Map(), lcategs: [], st: { enedition: false, modifie: false } })

    function chargerMc () {
      state.motscles = new Motscles(mc, 1, secret.value && secret.value.ts === 2 ? secret.value.id : 0)
      state.motscles.recharger()
    }

    function undomcl () { const s = secret.value; mclocal.value = s.ts === 2 ? s.mc[state.im] : s.mc }

    function undomcg () { const s = secret.value; mcglocal.value = s.ts === 2 ? s.mc[0] : null }

    function undotp () { const st = secret.value.st; templocal.value = st >= 0 && st < 99999 }

    function undotx () { textelocal.value = secret.value.txt.t }

    function undoora () { oralocal.value = secret.value.ora }

    function undo () { undomcl(); undomcg(); undotp(); undotx(); undoora() }

    function initState () {
      const s = secret.value
      const avid = avatar.value.id
      if (s) { // propriétés immuables pour un secret
        state.ts = s.ts
        state.avatar = s.ts === 0 ? avatar : null
        state.groupe = s.ts === 2 ? data.getGroupe(s.id) : null
        state.contact = s.ts === 1 ? data.getContact(s.id, s.ic) : null
        state.im = s.ts === 2 ? state.groupe.imDeId(avid) : 0
        state.membre = state.im ? data.getMembre(state.groupe.id, state.im) : null
        state.encreation = s.v === 0
        state.lectureseule = ''
        if (!state.encreation) {
          if (s.ora === 2) {
            state.lectureseule = 'secret "archivé"'
          } else if (s.ora === 1 && s.txt.l && s.txt.l.length && s.txt.l[0] !== avid) {
            state.lectureseule = 'secret "restreint", seul le dernier auteur peut l\'éditer'
          } else if (s.ts === 2 && state.membre.stp === 0) {
            state.lectureseule = 'non modifiable par les membres du groupe de niveau "lecteur"'
          } else if (s.ts === 2 && state.groupe.sty === 0) {
            state.lectureseule = 'groupe "archivé"'
          }
        }
        switch (secret.value.ts) {
          case 0 : {
            state.titre = 'Secret personnel'
            break
          }
          case 1 : {
            state.titre = 'Partagé avec ' + state.contact.nom
            break
          }
          case 2 : {
            state.titre = 'Partagé avec ' + state.groupe.nom
            break
          }
        }
        undo()
      }
    }

    initState()
    chargerMc()

    watch(() => compte.value, (ap, av) => { chargerMc() })

    watch(() => secret.value, (ap, av) => {
      initState()
      if (ap && (!av || av.sidc !== ap.sidc)) chargerMc()
    })

    const jourJ = getJourJ()
    const limjours = cfg().limitesjour[0]

    return {
      secret,
      u8vide: new Uint8Array([]),
      state,
      mode,
      limjours,
      jourJ,
      undo,
      undomcl,
      undomcg,
      undotp,
      undotx,
      undoora,
      textelocal,
      mclocal,
      mcglocal,
      oralocal,
      templocal
    }
  }
})
</script>
<style lang="sass" scoped>
@import '../css/app.sass'
.maToolBar
  padding: 0 !important
  min-height: 1.1rem !important
  max-height: 1.6rem !important
.tit
  max-height: 1.3rem
  text-overflow: ellipsis
.mced
  padding: 3px
  border-radius: 5px
  border: 1px solid grey
</style>
