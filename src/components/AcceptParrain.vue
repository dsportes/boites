<template>
  <q-card class="q-ma-xs moyennelargeur fs-md">
    <q-card-section class="column items-center">
      <div class="titre-lg text-center">{{'Acceptation du parrainage d\'un compte '+ (estpar ? 'PARRAIN LUI-MEME' : 'filleul standard')}}</div>
    </q-card-section>

    <q-card-section>
      <q-stepper v-model="step" vertical color="primary" animated>
        <q-step :name="1" title="Proposition de parrainage" icon="settings" :done="step > 1">
          <div>Avatar primaire du nouveau compte: <span class="font-mono q-pl-md">{{couple.nomI}}</span></div>
          <div>Nom du parrain: <span class="font-mono q-pl-md">{{couple.nomE}}</span></div>
          <div>Forfaits du compte:
            <span class="font-mono q-pl-md">v1: {{ed1(couple.data.f1)}}</span>
            <span class="font-mono q-pl-lg">v2: {{ed2(couple.data.f2)}}</span>
          </div>
          <div v-if="estpar">Le nouveau compte est lui-même parrain: ressources pour les filleuls:
            <span class="font-mono q-pl-md">v1: {{ed1(couple.data.r1)}}</span>
            <span class="font-mono q-pl-lg">v2: {{ed2(couple.data.r2)}}</span>
          </div>
          <div class="t1">Validité: <span class="sp1">{{couple.dlv - jourJ}}</span> jour(s)</div>
          <show-html class="full-width height-6 border1" :texte="couple.ard" />
          <q-stepper-navigation>
            <q-btn flat @click="fermer()" color="primary" label="Renoncer" class="q-ml-sm" />
            <q-btn flat @click="step=9" color="primary" label="Refuser" class="q-ml-sm" />
            <q-btn flat @click="step=2" color="warning" label="Continuer" class="q-ml-sm" />
          </q-stepper-navigation>
        </q-step>

        <q-step :name="2" title="Phrase secrète du compte" icon="settings" :done="step > 2">
          <span class="fs-sm q-py-sm">Saisir et confirmer la phrase secrète du compte qui permettra de s'authentifier pour y accéder.</span>
          <phrase-secrete :init-val="ps" class="q-ma-xs" v-on:ok-ps="okps" verif icon-valider="check" label-valider="Continuer"></phrase-secrete>
          <q-stepper-navigation>
            <q-btn flat @click="fermer()" color="primary" label="Renoncer" class="q-ml-sm" />
            <q-btn flat @click="refuser()" color="primary" label="Refuser" class="q-ml-sm" />
          </q-stepper-navigation>
        </q-step>

        <q-step :name="3" title="Maximum d'espace attribués pour les secrets partagés par ce contact" icon="settings" :done="step > 3" >
          <div v-if="couple.stE===1">Le parrain a choisi de partager des secrets :<br>
            <span class="font-mono q-pl-md">Maximum v1: {{ed1(couple.mx10)}}</span><br>
            <span class="font-mono q-pl-lg">Maximum v2: {{ed2(couple.mx11)}}</span>
          </div>
          <div v-else>Le parrain a choisi de NE PAS PARTAGER de secrets</div>
          <div class="titre-md text-warning">Mettre 0 pour NE PAS PARTAGER de secrets</div>
          <choix-forfaits v-model="max" :f1="couple.mx10 || 1" :f2="couple.mx11 || 1"/>
          <q-stepper-navigation>
            <q-btn flat @click="step = 2" color="primary" label="Précédent" class="q-ml-sm" />
            <q-btn flat @click="step = 4" color="primary" label="Suivant" class="q-ml-sm" />
          </q-stepper-navigation>
        </q-step>

        <q-step :name="4" title="Rermerciement et acceptation" icon="check" :done="step > 3" >
          <editeur-md class="full-width height-8" v-model="texte" :texte="textedef" editable modetxt hors-session/>
          <q-icon :name="isPwd ? 'visibility_off' : 'visibility'" class="cursor-pointer" @click="isPwd = !isPwd"/>
          <div>Phrase secrète (ligne 1): <span class="font-mono q-pl-md">{{isPwd ? '***' : ps.debut}}</span></div>
          <div>Phrase secrète (ligne 2): <span class="font-mono q-pl-md">{{isPwd ? '***' : ps.fin}}</span></div>
          <q-stepper-navigation>
            <q-btn flat @click="step=1" color="primary" label="Corriger" class="q-ml-sm" />
            <q-btn flat @click="fermer()" color="primary" label="Renoncer" class="q-ml-sm" />
            <q-btn flat @click="step=5" color="primary" label="Refuser" class="q-ml-sm" />
            <q-btn @click="confirmer" color="warning" label="Confirmer la création du compte" icon="check" class="q-ml-sm" />
          </q-stepper-navigation>
        </q-step>

        <q-step :name="5" title="Remerciement / explication (pourquoi décliner)" icon="check" :done="step > 6" >
          <editeur-md class="full-width height-8" v-model="texte" :texte="couple.ard" editable modetxt hors-session/>
          <q-stepper-navigation>
            <q-btn flat @click="step=1" color="primary" label="Corriger" class="q-ml-sm" />
            <q-btn flat @click="fermer()" color="primary" label="Renoncer" class="q-ml-sm" />
            <q-btn flat @click="refuser()" color="warning" label="Décliner définitivement ce parrainage" class="q-ml-sm" />
          </q-stepper-navigation>
        </q-step>

      </q-stepper>
    </q-card-section>
  </q-card>
</template>

<script>
import PhraseSecrete from './PhraseSecrete.vue'
import EditeurMd from './EditeurMd.vue'
import ShowHtml from './ShowHtml.vue'
import { AcceptationParrainage, RefusRencontre } from '../app/operations.mjs'
import { getJourJ, edvol } from '../app/util.mjs'
import ChoixForfaits from './ChoixForfaits.vue'
import { UNITEV1, UNITEV2 } from '../app/api.mjs'

export default ({
  name: 'AcceptParrain',

  props: { couple: Object, phch: Number, close: Function },

  components: { PhraseSecrete, EditeurMd, ShowHtml, ChoixForfaits },

  computed: {
    estpar () { return this.couple && this.couple.data.r1 },
    textedef () { return 'Merci ' + this.couple.nomE + ',\n\n' + this.couple.ard }
  },

  data () {
    return {
      isPwd: false,
      jourJ: getJourJ(),
      max: [1, 1],
      step: 1,
      ps: null,
      apsf: false,
      texte: ''
    }
  },

  methods: {
    ed1 (f) { return edvol(f * UNITEV1) },
    ed2 (f) { return edvol(f * UNITEV2) },
    fermer () {
      this.razps()
      this.texte = ''
      this.apsf = false
      this.step = 1
      this.isPwd = false
      this.ps = null
      if (this.close) this.close()
    },
    razps () {
      if (this.ps) {
        this.ps.debut = ''
        this.ps.fin = ''
      }
    },
    okps (ps) {
      if (ps) {
        this.ps = ps
        this.step = 3
      }
    },
    async confirmer () {
      const arg = { ps: this.ps, ard: this.texte, phch: this.phch, max: this.max, estpar: this.estpar }
      this.razps()
      await new AcceptationParrainage().run(this.couple, arg)
      this.fermer()
    },
    async refuser () {
      this.razps()
      await new RefusRencontre().run(this.couple, this.texte, this.phch)
      this.fermer()
    }
  },

  setup () {
  }
})
</script>

<style lang="sass" scoped>
@import '../css/app.sass'
.border1
  border: 1px solid grey
.q-dialog__inner
  padding: 0 !important
</style>
<style lang="sass">
.q-stepper--vertical
  padding: 4px !important
.q-stepper--bordered
  border: none
.q-stepper__tab
  padding: 2px 0 !important
.q-stepper__step-inner
  padding: 0px 2px 2px 18px !important
.q-stepper__nav
  padding: 0 !important
</style>
