<template>
  <q-card class="full-height moyennelargeur fs-md column">
    <q-toolbar class="col-auto bg-primary text-white">
      <q-btn flat round dense icon="close" size="md" class="q-mr-sm" @click="fermer" />
      <q-toolbar-title><div class="titre-md tit">{{state.titre}}</div></q-toolbar-title>
      <q-btn class="q-ml-sm" flat dense color="white" label="Annuler" icon="undo"/>
      <q-btn class="q-my-sm" flat dense color="white" :label="state.encreation?'Créer':'Valider'" icon="check" @click="valider"/>
    </q-toolbar>
    <div v-if="enedition" class="titre-md text-italic">Cliquer ci-dessous pour changer les mots clés</div>
    <apercu-motscles v-if="enedition" class="mced" :motscles="state.motscles" :src="mclocal" :argsClick="{}" @click="ouvrirmc"></apercu-motscles>
    <apercu-motscles v-if="!enedition" :motscles="state.motscles" :src="secret.mc || u8vide"></apercu-motscles>
    <div v-if="state.encreation" class="mced">
      <span>Par défaut ce secret s'auto détruira au bout de {{limjours}} jours. </span>
      <q-checkbox left-label size="sm" color="primary" v-model="permlocal" label="Le créer 'PERMANENT'" />
    </div>
    <editeur-md class="col" v-model="textelocal" :modetxt="enedition" :texte="secret.txt.t" :editable="enedition" nozoom></editeur-md>

    <q-dialog v-model="mcedit">
      <select-motscles :motscles="state.motscles" :src="mclocal" @ok="changermc" :close="fermermc"></select-motscles>
    </q-dialog>
  </q-card>
</template>

<script>
import { toRef, onMounted, ref, reactive, watch, computed } from 'vue'
import { useStore } from 'vuex'
import ApercuMotscles from './ApercuMotscles.vue'
import SelectMotscles from './SelectMotscles.vue'
import EditeurMd from './EditeurMd.vue'
import { equ8, getJourJ, cfg, serial, Motscles } from '../app/util.mjs'
import { NouveauSecret, Maj1Secret } from '../app/operations.mjs'
import { data } from '../app/modele.mjs'
import { crypt } from '../app/crypto.mjs'

export default ({
  name: 'PanelSecret',

  components: { ApercuMotscles, SelectMotscles, EditeurMd },

  props: { secret: Object, close: Function },

  data () {
    return {
      mcedit: false,
      temporaire: false,
      permlocal: false,
      alertesaisie: false
    }
  },

  methods: {
    fermer () {
      if (this.close) this.close()
    },
    ouvrirmc () { this.mcedit = true },
    fermermc () { this.mcedit = false },
    changermc (mc) { this.mclocal = mc },
    async valider () { // secret de couple à traiter et ref
      this.enedition = false
      const s = this.locsecret
      const txts = this.textelocal === s.txt.t ? new Uint8Array([0]) : await s.toRowTxt(this.textelocal, this.im)
      let mc = null, mcg = null
      if (s.ts !== 2) {
        mc = equ8(this.mclocal, s.mc) ? new Uint8Array([0]) : (!this.mclocal || !this.mclocal.length ? null : this.mclocal)
      } else {
        mc = equ8(this.mclocal, s.mc[this.im]) ? new Uint8Array([0]) : (!this.mclocal || !this.mclocal.length ? null : this.mclocal)
        mcg = equ8(this.mcglocal, s.mc[0]) ? new Uint8Array([0]) : (!this.mcglocal || !this.mcglocal.length ? null : this.mcglocal)
      }
      const v1 = this.v && this.textelocal === s.txt.t ? s.v1 : this.textelocal.length
      const arg = { ts: s.ts, id: s.id, ns: s.ns, mc: mc, txts: txts, v1: v1 }
      if (s.ts === 2) {
        arg.mcg = mcg
        arg.im = this.im
      }
      if (s.ts === 1) {
        arg.id2 = s.id2
        arg.ns2 = s.ns2
      }
      if (s.v) {
        // maj
        await new Maj1Secret().run(arg)
      } else {
        // création
        arg.ic = 0
        arg.st = this.permlocal ? 99999 : (this.jourJ + this.limjours)
        arg.ora = this.oralocal || 0
        if (s.ts === 1) {
          arg.ic2 = s.ic2
          arg.dups = await crypt.crypter(s.cles, serial([arg.id2, arg.ns2]))
          arg.dups2 = await crypt.crypter(s.cles, serial([arg.id, arg.ns]))
        }
        arg.refs = arg.ref ? await crypt.crypter(s.cles, serial(arg.ref)) : null
        await new NouveauSecret().run(arg)
      }
      this.ouvert = false
      if (this.close) this.close()
    },
    annuler () {
      this.enedition = false
      if (this.close) close.value()
    }
  },

  setup (props) {
    const $store = useStore()
    const compte = computed(() => { return $store.state.db.compte })
    const avatar = computed(() => { return $store.state.db.avatar })
    const mode = computed(() => $store.state.ui.mode)

    const enedition = ref(false)
    // const ouvert = ref(false)
    const textelocal = ref('')
    const mclocal = ref(null)
    const mcglocal = ref(null)
    const oralocal = ref(null)

    const secret = toRef(props, 'secret')
    toRef(props, 'close')

    const state = reactive({
      motcles: null,
      contact: null,
      groupe: null,
      avatar: null,
      im: 0,
      ts: 0,
      encreation: false,
      titre: ''
    })
    const mc = reactive({ categs: new Map(), lcategs: [], st: { enedition: false, modifie: false } })

    function chargerMc () {
      state.motscles = new Motscles(mc, 1, secret.value && secret.value.ts === 2 ? secret.value.id : 0)
      state.motscles.recharger()
    }

    function initState () {
      if (secret.value) { // propriétés immuables pour un secret
        state.ts = secret.value.ts
        state.avatar = secret.value.ts === 0 ? avatar : null
        state.groupe = secret.value.ts === 2 ? data.getGroupe(secret.value.id) : null
        state.contact = secret.value.ts === 1 ? data.getContact(secret.value.id, secret.value.ic) : null
        state.im = secret.value.ts === 2 ? state.groupe.imDeId(avatar.value.id) : 0
        state.encreation = secret.value.v === 0
        if (secret.value.ts === 0) {
          state.titre = 'Secret personnel'
        } else if (secret.value.ts === 1) {
          state.titre = 'Partagé avec ' + state.contact.nom
        } else {
          state.titre = 'Partagé avec ' + state.groupe.nom
        }
      }
    }

    watch(() => compte.value, (ap, av) => { chargerMc() })

    watch(() => secret.value, (ap, av) => {
      initState()
      if (ap && (!av || av.sidc !== ap.sidc)) chargerMc()
    })

    function editer () {
      const s = secret.value
      // ouvert.value = true
      enedition.value = true
      oralocal.value = s.ora
      textelocal.value = s.txt.t
      mclocal.value = s.ts === 2 ? s.mc[state.im] : s.mc
      mcglocal.value = s.ts === 2 ? s.mc[0] : null
    }

    initState()
    chargerMc()
    editer()

    onMounted(() => {
    })

    const jourJ = getJourJ()
    const limjours = cfg().limitesjour[0]

    return {
      u8vide: new Uint8Array([]),
      state,
      mode,
      limjours,
      jourJ,
      enedition,
      textelocal,
      mclocal,
      mcglocal,
      oralocal,
      editer
    }
  }
})
</script>
<style lang="sass" scoped>
@import '../css/app.sass'
.q-toolbar
  padding: 2px !important
  max-height: 2rem
.tit
  max-height: 1.3rem
  text-overflow: ellipsis
.mced
  padding: 3px
  border-radius: 5px
  border: 1px solid grey
</style>
