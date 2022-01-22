<template>
<q-card :class="cl">
  <q-card-section v-if="secret.v" class="row justify-between">
    <apercu-motscles :motscles="motscles" :src="locsecret.mc" court></apercu-motscles>
    <div>
      <span class="dh">{{locsecret.dh}}</span>
      <q-btn v-if="locsecret.nbpj" size="sm" color="warning" flat dense icon="attach_file" :label="locsecret.nbpj" @click="clickpj"></q-btn>
      <q-btn v-if="nbj" size="sm" color="warning" flat dense icon="auto_delete" :label="nbj" @click="temporaire=true"></q-btn>
    </div>
  </q-card-section>

  <q-card-section v-if="locsecret.v !== 0 || enedition">
    <q-expansion-item dense v-model="ouvert" expand-separator :header-class="'titre-3' + (enedition ? ' text-warning' :'')" :label="locsecret.titre">
      <div class="column q-pa-xs btns">
        <div class="row justify-evenly">
          <q-btn v-if="locsecret.v!==0" :disable="enedition" flat dense color="warning" size="md" icon="mode_edit" label="Modifier" @click="editer"/>
          <q-btn :disable="!enedition" dense color="primary" size="md" icon="undo" label="Annuler" @click="annuler"/>
          <q-btn :disable="!enedition || !modifie" dense color="warning" size="md" icon="check" :label="!locsecret.v ? 'Créer' : 'Valider'" @click="valider"/>
        </div>
        <div v-if="enedition" class="titre-4 text-italic">Cliquer ci-dessous pour changer les mots clés</div>
        <apercu-motscles v-if="enedition" class="mced" :motscles="motscles" :src="mclocal" :argsClick="{}" @click="ouvrirmc"></apercu-motscles>
        <apercu-motscles v-if="!enedition" :motscles="motscles" :src="locsecret.mc || u8vide"></apercu-motscles>
        <div v-if="locsecret.v===0" class="mced">
          <span>Par défaut ce secret s'auto détruira au bout de {{limjours}} jours. </span>
          <q-checkbox left-label size="sm" color="primary" v-model="permlocal" label="Le créer 'PERMANENT'" />
        </div>
        <editeur-md v-model="textelocal" :idx="idx" :modetxt="enedition" :texte="locsecret.txt.t" :editable="enedition" taille-m></editeur-md>
      </div>
    </q-expansion-item>
  </q-card-section>

  <q-card-section>
    <q-dialog v-model="mcedit">
      <select-motscles :motscles="motscles" :src="mclocal" @ok="changermc" :close="fermermc"></select-motscles>
    </q-dialog>

    <q-dialog v-model="temporaire">
      <q-card>
        <q-card-section class="q-pa-md diag"><div>{{msgtemp}}</div></q-card-section>
        <q-card-actions align="right">
          <q-btn flat label="Le laisser temporaire" color="primary" v-close-popup/>
          <q-btn label="Le rendre 'PERMANENT'" color="warning" v-close-popup @click="rendrepermanent"/>
        </q-card-actions>
      </q-card>
    </q-dialog>

    <q-dialog v-model="alertesaisie">
      <q-card>
        <q-card-section class="q-pa-md diag"><div>Le secret a été fermé alors qu'il y a des saisies non validées.</div></q-card-section>
        <q-card-actions align="right">
          <q-btn flat label="Je sais, le fermer quand-même" color="primary" v-close-popup/>
          <q-btn label="Le rouvrir" color="warning" v-close-popup @click="ouvert=true"/>
        </q-card-actions>
      </q-card>
    </q-dialog>
  </q-card-section>
</q-card>
</template>

<script>
import { toRef, onMounted, ref } from 'vue'
import ApercuMotscles from './ApercuMotscles.vue'
import SelectMotscles from './SelectMotscles.vue'
import EditeurMd from './EditeurMd.vue' // props: { modelValue: String, texte: String, labelOk: String, editable: Boolean, tailleM: Boolean },
import { equ8, getJourJ, cfg, serial } from '../app/util.mjs'
import { NouveauSecret, Maj1Secret } from '../app/operations.mjs'
import { crypt } from '../app/crypto.mjs'

export default ({
  name: 'VueSecret',

  components: { ApercuMotscles, SelectMotscles, EditeurMd },

  props: { motscles: Object, secret: Object, idx: Number, close: Function, im: Number },
  // im : l'indice de membre de l'avatar du compte dans le groupe dont les secrets sont listés

  computed: {
    cl () {
      if (this.$q.dark.isActive) return this.idx ? 'sombre' + (this.idx % 2) : 'sombre0'
      return this.idx ? 'clair' + (this.idx % 2) : 'clair0'
    },
    modifie () {
      return (this.textelocal !== this.locsecret.txt.t) || !equ8(this.mclocal, this.locsecret.mc)
    },
    nbj () {
      const st = this.locsecret.st; return st === 99999 || st === 0 ? 0 : st - this.jourJ
    },
    msgtemp () { return 'Ce secret s\'auto-détruira ' + (this.nbj === 1 ? 'aujourd\'hui' : 'dans ' + this.nbj + ' jours') }
  },

  watch: {
    ouvert (val) {
      if (!val && this.enedition && this.modifie) this.alertesaisie = true
    }
  },

  data () {
    return {
      mcedit: false,
      temporaire: false,
      permlocal: false,
      alertesaisie: false
    }
  },

  methods: {
    ouvrirmc () { this.mcedit = true },
    fermermc () { this.mcedit = false },
    changermc (mc) { this.mclocal = mc },

    clickpj () { this.ouvert = true },

    rendrepermanent () {
      console.log('Rendre le secret permanent')
    },

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
        arg.st = this.permlocal ? 99999 : (this.jourJ + cfg().limitesjour.secrettemp)
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
    }
  },

  setup (props) {
    const enedition = ref(false)
    const ouvert = ref(false)
    const textelocal = ref('')
    const mclocal = ref(null)
    const mcglocal = ref(null)
    const oralocal = ref(null)

    toRef(props, 'motscles')
    toRef(props, 'close')
    const im = toRef(props, 'im')
    const locsecret = toRef(props, 'secret')
    const jourJ = getJourJ()
    const limjours = cfg().limitesjour.secrettemp

    function editer () {
      const s = locsecret.value
      ouvert.value = true
      enedition.value = true
      oralocal.value = s.ora
      textelocal.value = s.txt.t
      mclocal.value = s.ts === 2 ? s.mc[im.value] : s.mc
      mcglocal.value = s.ts === 2 ? s.mc[0] : null
    }

    function annuler () {
      enedition.value = false
      if (!locsecret.value.v) {
        ouvert.value = false
        if (close.value) close.value()
      }
    }

    onMounted(() => {
      if (!locsecret.value.v) editer()
    })

    return {
      u8vide: new Uint8Array([]),
      locsecret,
      limjours,
      jourJ,
      enedition,
      ouvert,
      textelocal,
      mclocal,
      mcglocal,
      oralocal,
      editer,
      annuler
    }
  }
})
</script>

<style lang="sass" scoped>
@import '../css/app.sass'
.q-toolbar
  padding: 2px !important
  min-height: 0 !important
.q-card
  padding: 2px
.q-btn
  height: 2rem !important
.dh
  font-family: 'Roboto Mono'
  font-size: 0.6rem
.btns
  border-top: 1px solid grey
.mced
  padding: 3px
  border-radius: 5px
  border: 1px solid grey
</style>
