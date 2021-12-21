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

  <q-card-section v-if="locsecret.v === 0">
    <q-btn size="md" color="primary" dense icon="add_circle_outline" label="Nouveau secret" style="width:100%" @click="ouvert=true;editer()"></q-btn>
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
        <apercu-motscles v-if="!enedition" :motscles="motscles" :src="locsecret.mc"></apercu-motscles>
        <div v-if="locsecret.v===0" class="mced">
          <span>Par défaut ce secret s'auto détruira au bout de {{limjours}} jours. </span>
          <q-checkbox left-label size="sm" color="primary" v-model="permlocal" label="Le créer 'PERMANENT'" />
        </div>
        <editeur-md v-model="textelocal" :idx="idx" :modetxt="enedition" :texte="!enedition ? locsecret.txt.t : textelocal" :editable="enedition" taille-m></editeur-md>
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
import { toRef } from 'vue'
import ApercuMotscles from './ApercuMotscles.vue'
import SelectMotscles from './SelectMotscles.vue'
import EditeurMd from './EditeurMd.vue' // props: { modelValue: String, texte: String, labelOk: String, editable: Boolean, tailleM: Boolean },
import { equ8, getJourJ, cfg } from '../app/util.mjs'
import { Secret } from '../app/modele.mjs'
import { NouveauSecretP } from '../app/operations.mjs'

export default ({
  name: 'VueSecret',

  components: { ApercuMotscles, SelectMotscles, EditeurMd },

  props: { motscles: Object, secret: Object, idx: Number },

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
      ouvert: false,
      mcedit: false,
      enedition: false,
      textelocal: '',
      temporaire: false,
      permlocal: false,
      alertesaisie: false,
      mclocal: null
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

    editer () {
      this.enedition = true
      this.textelocal = this.locsecret.txt.t
      this.mclocal = this.locsecret.mc
    },

    annuler () {
      this.enedition = false
      if (!this.locsecret.v) this.ouvert = false
    },

    async valider () {
      this.enedition = false
      const s = this.locsecret
      if (s.v) {
        // aj
      } else {
        // création : ts, id, nr, txt, mc, temp
        const sec = new Secret().nouveauP(s.ts, s.id, s.nr, this.textelocal, this.mclocal, this.permlocal)
        const rowSecret = await sec.toRow()
        await new NouveauSecretP().run(rowSecret)
      }
      this.ouvert = false
    }
  },

  setup (props) {
    toRef(props, 'motscles')
    const locsecret = toRef(props, 'secret')
    const jourJ = getJourJ()
    const limjours = cfg().limitesjour[0]

    return {
      locsecret,
      limjours,
      jourJ
    }
  }
})
</script>

<style lang="sass" scoped>
.q-card
  padding: 10px 0
.q-card__section
  padding: 1px !important
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
