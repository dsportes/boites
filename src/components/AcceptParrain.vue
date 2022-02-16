<template>
  <q-card class="q-ma-xs petitelargeur fs-md">
    <q-card-section class="column items-center">
      <div class="titre-lg text-center">{{'Acceptation du parrainage d\'un compte '+ (estpar ? 'PARRAIN' : 'filleul standard')}}</div>
    </q-card-section>

    <q-card-section>
      <q-stepper v-model="step" vertical color="primary" animated>
        <q-step :name="1" title="Proposition de parrainage" icon="settings" :done="step > 1">
          <div>Premier avatar du nouveau compte: <span class="font-mono q-pl-md">{{parrain.data.nomf}}</span></div>
          <div>Nom du parrain: <span class="font-mono q-pl-md">{{parrain.data.nomp}}</span></div>
          <div>Forfaits du compte:
            <span class="font-mono q-pl-md">{{'v1: ' + parrain.data.f[0] + 'MB'}}</span>
            <span class="font-mono q-pl-lg">{{'v2: ' + parrain.data.f[1] + '*100MB'}}</span>
          </div>
          <div v-if="estpar">Ressources attribuables aux futurs filleuls:
            <div>
            <span class="font-mono q-pl-md">{{'v1: ' + parrain.data.r[0] + 'MB'}}</span>
            <span class="font-mono q-pl-lg">{{'v2: ' + parrain.data.r[1] + '*100MB'}}</span>
            </div>
          </div>
          <div class="t1">Validité: <span class="sp1">{{parrain.dlv - jourJ}}</span> jour(s)</div>
          <div style="margin-left:-0.8rem" class="text-primary">
            <q-toggle v-model="apsp" size="md" disable :color="apsp ? 'green' : 'grey'"
              :label="'Le parrain ' + (!apsp ? 'n\'accepte pas' : 'accepte') + ' le partage de secrets avec cet avatar'"/>
          </div>
          <show-html class="full-width height-6" :texte="parrain.ard" />
          <q-stepper-navigation>
            <q-btn flat @click="fermer()" color="primary" label="Renoncer" class="q-ml-sm" />
            <q-btn flat @click="step=5" color="primary" label="Refuser" class="q-ml-sm" />
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

        <q-step :name="3" title="Message de remerciement" icon="settings" :done="step > 3" >
          <editeur-md class="full-width height-8" v-model="texte" :texte="parrain.ard" editable modetxt/>
          <q-stepper-navigation>
            <q-btn flat @click="step=2" color="primary" label="Corriger" class="q-ml-sm" />
            <q-btn flat @click="fermer()" color="primary" label="Renoncer" class="q-ml-sm" />
            <q-btn flat @click="step=5" color="primary" label="Refuser" class="q-ml-sm" />
            <q-btn flat @click="step=4" color="warning" label="Continuer" class="q-ml-sm" />
          </q-stepper-navigation>
        </q-step>

        <q-step :name="4" title="Confirmation" icon="check" :done="step > 5" >
          <q-icon :name="isPwd ? 'visibility_off' : 'visibility'" class="cursor-pointer" @click="isPwd = !isPwd"/>
          <div>Phrase secrète (ligne 1): <span class="font-mono q-pl-md">{{isPwd ? '***' : ps.debut}}</span></div>
          <div>Phrase secrète (ligne 2): <span class="font-mono q-pl-md">{{isPwd ? '***' : ps.fin}}</span></div>
          <div style="margin-left:-0.8rem" class="text-primary">
            <q-toggle v-model="apsp" size="md" disable :color="apsp ? 'green' : 'grey'"
              :label="'Le parrain ' + (!apsp ? 'n\'accepte pas' : 'accepte') + ' le partage de secrets avec cet avatar'"/>
          </div>
          <div style="margin-left:-0.8rem" class="text-primary">
            <q-toggle v-model="apsf" size="md" :color="apsf ? 'green' : 'grey'"
              :label="(!apsf ? 'Ne pas accepter' : 'Accepter') + ' le partage de secrets avec cet avatar'"/>
          </div>

          <q-stepper-navigation>
            <q-btn flat @click="step=1" color="primary" label="Corriger" class="q-ml-sm" />
            <q-btn flat @click="fermer()" color="primary" label="Renoncer" class="q-ml-sm" />
            <q-btn flat @click="step=5" color="primary" label="Refuser" class="q-ml-sm" />
            <q-btn @click="confirmer" color="warning" label="Confirmer la création du compte" icon="check" class="q-ml-sm" />
          </q-stepper-navigation>
        </q-step>

        <q-step :name="5" title="Remerciement / explication (pourquoi décliner)" icon="check" :done="step > 3" >
          <editeur-md class="full-width height-8" v-model="texte" :texte="parrain.ard" editable modetxt/>
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
import { AcceptationParrainage, RefusParrainage } from '../app/operations.mjs'
import { getJourJ } from '../app/util.mjs'

export default ({
  name: 'AcceptParrain',

  props: { parrain: Object, pph: Number, close: Function },

  components: { PhraseSecrete, EditeurMd, ShowHtml },

  computed: {
    estpar () { return this.parrain.data.r !== null }
  },

  data () {
    return {
      isPwd: false,
      jourJ: getJourJ(),
      apsp: this.parrain ? this.parrain.data.aps : false,
      step: 1,
      ps: null,
      apsf: false,
      texte: ''
    }
  },

  methods: {
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
      // eslint-disable-next-line no-unused-vars
      const arg = { ps: this.ps, ard: this.texte, pph: this.pph, aps: this.apsf }
      this.razps()
      await new AcceptationParrainage().run(this.parrain, arg)
      this.fermer()
    },
    async refuser () {
      this.razps()
      await new RefusParrainage().run(this.parrain, this.texte)
      this.fermer()
    }
  },

  setup () {
  }
})
</script>

<style lang="sass" scoped>
@import '../css/app.sass'
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
