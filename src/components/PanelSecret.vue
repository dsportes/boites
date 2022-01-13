<template>
  <q-card class="full-height moyennelargeur fs-md column">
    <q-toolbar class="col-auto bg-primary text-white maToolBar">
      <q-btn flat round dense icon="close" size="md" class="q-mr-sm" @click="fermer" />
      <q-toolbar-title><div class="titre-md tit text-center">{{state.titre}}</div></q-toolbar-title>
      <q-btn v-if="!state.ro" :disable="!modif" class="q-ml-sm" flat dense color="white" label="Annuler" icon="undo" @click="undo"/>
      <q-btn v-if="!state.ro" :disable="!modif || erreur !== ''" class="q-my-sm" flat dense color="white" :label="state.encreation?'Créer':'Valider'" icon="check" @click="valider"/>
    </q-toolbar>
    <q-toolbar v-if="state.ro" inset :class="'col-auto maToolBar ' + tbclass">
      <q-toolbar-title class="text-center fs-lg text-warning">Secret en lecture seule : {{labelro[state.ro]}}</q-toolbar-title>
    </q-toolbar>
    <q-toolbar v-if="erreur" inset :class="'col-auto maToolBar ' + tbclass">
        <q-toolbar-title class="text-center fs-md text-negative">{{erreur}}</q-toolbar-title>
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
        <q-btn v-if="!state.ro" :disable="!modifmcl" size="sm" class="col-auto" dense push icon="undo" color="primary" @click="undomcl"/>
      </div>
      <div v-if="state.ts === 2" class="col-auto q-pa-xs full-width row justify-between items-center">
        <apercu-motscles class="col" :motscles="state.motscles" :src="mcglocal"/>
        <q-btn class="col-auto" flat dense color="primary" label="Mots clés du groupe" @click="ouvrirmcg"/>
        <q-btn v-if="!state.ro" :disable="!modifmcg" size="sm" class="col-auto" dense push icon="undo" color="primary" @click="undomcg"/>
      </div>

      <div class="col-auto q-pa-xs full-width row justify-between items-center">
        <div class="col">{{msgtemp}}</div>
        <q-btn v-if="templocal && !state.ro" class="col-auto" flat dense color="primary" label="Le rendre 'PERMANENT'" @click="templocal=false"/>
        <q-btn v-if="!templocal && !state.ro" class="col-auto" flat dense color="primary" label="Le rendre 'TEMPORAIRE'"  @click="templocal=true"/>
        <q-btn v-if="!state.ro" :disable="!modiftp" class="col-auto" size="sm" dense push icon="undo" color="primary" @click="undotp"/>
      </div>

      <div class="col-auto q-pa-xs full-width row justify-between items-center">
        <q-option-group class="col-auto" inline :options="state.ts === 0 ? options1 : options2" dense v-model="oralocal"/>
        <q-btn v-if="!state.ro" :disable="!modifora" class="col-auto" size="sm" dense push icon="undo" color="primary" @click="undoora"/>
      </div>

      <editeur-texte-secret class="col" v-model="textelocal" :texte-ref="secret.txt.t" :editable="!state.ro"/>

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
import { toRef, reactive, watch, computed } from 'vue'
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
    modifmcl () { return !equ8(this.state.mclocal, this.secret.ts === 2 ? this.secret.mc[this.state.im] : this.secret.mc) },
    modifmcg () { return this.secret.ts === 2 && !equ8(this.state.mcglocal, this.secret.mc[0]) },
    modifora () { return this.state.oralocal !== this.secret.ora },
    modiftx () { return this.state.textelocal !== this.secret.txt.t },
    modiftp () { return this.state.templocal !== (this.secret.st >= 0 && this.secret.st < 99999) },
    modif () { return this.modifmcl || this.modifmcg || this.modiftx || this.modiftp },
    erreur () { return this.state.ro || this.state.textelocal.length > 9 ? '' : 'Le texte doit contenir au moins 10 signes' },
    msgtemp () {
      if (this.templocal) {
        const n = this.secret.st === 99999 ? this.limjours : this.secret.st - this.jourJ
        return 'Secret auto-détruit ' + (n === 0 ? 'aujourd\'hui' : (n === 1 ? 'demain' : ('dans ' + n + ' jours')))
      }
      return 'Secret permanent'
    },
    dernierauteur () {
      const s = this.secret
      if (!s) return false
      const avid = this.avatar ? this.avatar.id : 0
      if (!avid) return false
      return s.txt.l && s.txt.l.length && s.txt.l[0] === avid
    },
    orapeutchanger () {
      const s = this.secret.value
      if (!s) return false // en déconnexion
      if (s.v === 0) return true // en création, toujours
      if (s.ts === 0) return true // secret perso, toujours
      if (s.ts === 1) { // secret de contact : si restreint et dernier auteur oui, si archivé oui
        return s.ora === 2 || (s.ora === 1 && this.dernierauteur)
      }
      // secret de groupe
      if (!this.state.groupe || !this.state.membre) return false // en déconnexion ?
      if (this.state.groupe.sty === 0) return false // groupe archivé, jamais
      if (this.state.membre.stp === 0) return false // lecteurs jamais
      if (this.state.membre.stp === 2) return false // animateurs toujours
      return s.ora === 1 && this.dernierauteur // si restreint, le dernier auteur peut
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
      ],
      labelro: [
        '',
        'secret "archivé"',
        'seul le propriétaire exclusif peut l\'éditer',
        'non modifiable par les membres du groupe de niveau "lecteur"',
        'groupe "archivé"'
      ]
    }
  },

  methods: {
    fermer () {
      if (this.modif) {
        this.diagnostic = 'Des modifications ont été faites. Avant de fermer ce secret, soit les "Annuler", soit les "Valider"'
      } else {
        this.secret = null
        if (this.close) this.close()
      }
    },

    ouvrirmcl () { this.mcledit = true },
    fermermcl () { this.mcledit = false },
    ouvrirmcg () { this.mcgedit = true },
    fermermcg () { this.mcgedit = false },
    changermcl (mc) { this.state.mclocal = mc },
    changermcg (mc) { this.state.mcglocal = mc },

    async valider () {
      const s = this.secret
      const txts = this.state.textelocal === s.txt.t ? null : await s.toRowTxt(this.state.textelocal, this.state.im)
      let mc = null, mcg = null
      if (s.ts !== 2) {
        mc = equ8(this.state.mclocal, s.mc) ? null : this.state.mclocal
      } else {
        mc = equ8(this.state.mclocal, s.mc[this.state.im]) ? null : this.state.mclocal
        mcg = equ8(this.state.mcglocal, s.mc[0]) ? null : this.state.mcglocal
      }
      const v1 = this.v && this.state.textelocal === s.txt.t ? null : this.state.textelocal.length
      const tempav = this.secret.st > 0 && this.secret.st !== 99999
      const temp = tempav === this.state.templocal ? null : (this.templocal ? this.jourJ + this.limjours : 99999)
      const ora = this.state.oralocal === s.ora ? null : this.state.oralocal
      const arg = { ts: s.ts, id: s.id, ns: s.ns, mc, txts, v1, ora, temp }
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
        const txts = this.state.textelocal === s.txt.t ? null : await s.toRowTxt(this.state.textelocal, this.state.im)
        let mc = null, mcg = null
        if (s.ts !== 2) {
          mc = equ8(this.state.mclocal, s.mc) ? null : this.state.mclocal
        } else {
          mc = equ8(this.state.mclocal, s.mc[this.state.im]) ? null : this.state.mclocal
          mcg = equ8(this.state.mcglocal, s.mc[0]) ? null : this.state.mcglocal
        }
        const v1 = this.v && this.state.textelocal === s.txt.t ? null : this.state.textelocal.length
        const tempav = this.secret.st > 0 && this.secret.st !== 99999
        const temp = tempav === this.state.templocal ? null : (this.templocal ? this.jourJ + this.limjours : 99999)
        const ora = this.state.oralocal === s.ora ? null : this.state.oralocal
        const arg = { ts: s.ts, id: s.id, ns: s.ns, mc, txts, v1, ora, temp }
        if (s.ts === 2) {
          arg.mcg = mcg
          arg.im = this.state.im
        }
        if (s.ts === 1) {
          arg.id2 = s.id2
          arg.ns2 = s.ns2
        }
        await new Maj1Secret().run(arg)
      } else {
        // création
        const txts = await s.toRowTxt(this.state.textelocal, this.state.im)
        const mc = this.state.mclocal
        const v1 = this.state.textelocal.length
        const st = this.templocal ? this.jourJ + this.limjours : 99999
        const ora = this.state.oralocal
        const arg = { ts: s.ts, id: s.id, ns: s.ns, ic: s.ic, mc, txts, v1, ora, st }
        if (s.ts === 2) {
          arg.mcg = this.state.mcglocal
          arg.im = this.state.im
        }
        if (s.ts === 1) {
          arg.id2 = s.id2
          arg.ns2 = s.ns2
          arg.ic2 = s.ic2
          arg.dups = await crypt.crypter(s.cles, serial([arg.id2, arg.ns2]))
          arg.dups2 = await crypt.crypter(s.cles, serial([arg.id, arg.ns]))
        }
        arg.refs = s.ref ? await crypt.crypter(s.cles, serial(s.ref)) : null
        await new NouveauSecret().run(arg)
      }
    }
  },

  setup (props) {
    const $store = useStore()
    const diagnostic = computed({
      get: () => $store.state.ui.diagnostic,
      set: (val) => $store.commit('ui/majdiagnostic', val)
    })
    const prefs = computed(() => { return data.getPrefs() })
    const avatar = computed(() => { return data.getAvatar() })
    const mode = computed(() => $store.state.ui.mode)
    const secret = computed({
      get: () => data.getSecret(),
      set: (val) => data.setSecret(val)
    })

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
      ro: 0,
      titre: '',
      textelocal: '',
      mclocal: null,
      mcglocal: null,
      oralocal: null,
      templocal: null
    })
    const mc = reactive({ categs: new Map(), lcategs: [], st: { enedition: false, modifie: false } })

    function chargerMc () {
      state.motscles = new Motscles(mc, 1, secret.value && secret.value.ts === 2 ? secret.value.id : 0)
      state.motscles.recharger()
    }

    function undomcl () { const s = secret.value; state.mclocal = s.ts === 2 ? s.mc[state.im] : s.mc }

    function undomcg () { const s = secret.value; state.mcglocal = s.ts === 2 ? s.mc[0] : null }

    function undotp () { const st = secret.value.st; state.templocal = st > 0 && st < 99999 }

    function undotx () { state.textelocal = secret.value.txt.t }

    function undoora () { state.oralocal = secret.value.ora }

    function undo () { undomcl(); undomcg(); undotp(); undotx(); undoora() }

    function initState () {
      const s = secret.value
      const avid = avatar.value ? avatar.value.id : 0 // avatar null après déconnexion
      if (s) { // propriétés immuables pour un secret
        state.ts = s.ts
        state.avatar = s.ts === 0 ? avatar : null
        state.groupe = s.ts === 2 ? data.getGroupe(s.id) : null
        state.contact = s.ts === 1 ? data.getContact(s.id, s.ic) : null
        state.im = s.ts === 2 ? state.groupe.imDeId(avid) : (s.ts === 1 ? (state.contact.na.id > avid ? 1 : 2) : 0)
        state.membre = s.ts === 2 && state.im ? data.getMembre(state.groupe.id, state.im) : null
        state.encreation = s.v === 0
        state.ro = 0
        if (s.ts === 2) {
          if (!s.mc[state.im]) s.mc[state.im] = new Uint8Array([])
          if (!s.mc[0]) s.mc[0] = new Uint8Array([])
        } else {
          if (!s.mc) s.mc = new Uint8Array([])
        }
        if (!state.encreation) {
          if (s.ora === 0) { // archivé
            state.ro = 1
          } else if (s.ora !== 999 && s.ora !== state.im) {
            state.ro = 2 // pas proprio
          } else if (s.ts === 2 && state.membre.stp === 0) {
            state.ro = 3 // lecteur
          } else if (s.ts === 2 && state.groupe.sty === 0) {
            state.ro = 4 // groupe archivé
          }
        }
        switch (secret.value.ts) {
          case 0 : { state.titre = 'Secret personnel'; break }
          case 1 : { state.titre = 'Partagé avec ' + state.contact.nom; break }
          case 2 : { state.titre = 'Partagé avec ' + state.groupe.nom; break }
        }
        undo()
      }
    }

    initState()
    chargerMc()

    watch(() => prefs.value, (ap, av) => {
      chargerMc()
    })

    watch(() => secret.value, (ap, av) => {
      initState()
      if (ap && (!av || av.pk !== ap.pk)) chargerMc() // le nouveau peut avoir un autre groupe
    })

    return {
      diagnostic,
      secret,
      u8vide: new Uint8Array([]),
      state,
      mode,
      limjours: cfg().limitesjour[0],
      jourJ: getJourJ(),
      undo,
      undomcl,
      undomcg,
      undotp,
      undotx,
      undoora
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
