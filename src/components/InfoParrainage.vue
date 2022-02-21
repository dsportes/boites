<template>
  <q-card class="q-ma-xs moyennelargeur fs-md">
    <q-card-actions>
      <q-btn flat @click="fermer" color="primary" icon="close" label="Fermer" class="q-ml-sm" />
      <q-btn flat @click="supprimer" :disabled="repondu" color="warning" label="Supprimer" class="q-ml-sm" />
      <q-btn flat @click="prolonger" :disabled="repondu" color="primary" label="Prolonger" class="q-ml-sm" />
    </q-card-actions>
    <q-card-section>
      <div class="titre-lg">Parrainage {{etat}}</div>
      <div>Disparition dans {{nbj(p.dlv)}} jour(s)</div>
      <div>Phrase de parrainage: <span class="font-mono q-pl-md">{{p.ph}}</span></div>
      <div>Nom de l'avatar: <span class="font-mono q-pl-md">{{p.data.nomf}}</span></div>
      <div>Mot de bienvenue:</div>
      <ShowHtml class="bord1 q-my-sm q-pa-sm" :texte="p.ard" />
      <div>Forfaits attribués au compte:
        <span class="font-mono q-pl-md">{{'v1: ' + p.data.f[0] + 'MB'}}</span>
        <span class="font-mono q-pl-lg">{{'v2: ' + p.data.f[1] + '*100MB'}}</span>
      </div>
      <div v-if="p.data.r !== null">Le compte filleul peut parrainer la création d'autres comptes : ressources attribuables aux filleuls:
        <span class="font-mono q-pl-md">{{'v1: ' + p.data.r[0] + 'MB'}}</span>
        <span class="font-mono q-pl-lg">{{'v2: ' + p.data.r[1] + '*100MB'}}</span>
      </div>
      <div v-else>Le compte filleul ne peut pas parrainer la création d'autres comptes</div>
      <div style="margin-left:-0.8rem" class="text-primary">
        <q-toggle v-model="apsp" size="md" disable :color="apsp ? 'green' : 'grey'"
          :label="'Le parrain ' + (!apsp ? 'n\'accepte pas' : 'accepte') + ' le partage de secrets'"/>
      </div>
      <div style="margin-left:-0.8rem" class="text-primary">
        <q-toggle v-model="apsf" size="md" disable :color="apsf ? 'green' : 'grey'"
          :label="(!apsf ? 'Le filleul n\'accepte pas' : 'Le filleul accepte') + ' le partage de secrets'"/>
      </div>
    </q-card-section>
  </q-card>
</template>

<script>
import { getJourJ } from '../app/util.mjs'
import { SupprParrainage } from '../app/operations.mjs'
import ShowHtml from './ShowHtml.vue'

export default ({
  name: 'InfoParrainage',

  props: { close: Function, p: Object },

  components: { ShowHtml },

  computed: {
    apsp () { return this.p.data.aps },
    apsf () { return this.p.st === 2 },
    repondu () { return this.p.st !== 0 },
    etat () { return ['en attente', 'refusé', 'accepté', 'accepté'][this.p.st] }
  },

  data () {
    return {
    }
  },

  methods: {
    nbj (dlv) { return dlv - getJourJ() },
    fermer () { if (this.close) this.close() },
    async prolonger () {
      const arg = { pph: this.p.pph, dlv: getJourJ() + 28 }
      await new SupprParrainage().run(arg)
      this.fermer()
    },
    async supprimer () {
      const arg = { pph: this.p.pph, dlv: 0 }
      await new SupprParrainage().run(arg)
      this.fermer()
    }
  },

  setup () {
  }
})
</script>
<style lang="sass" scoped>
@import '../css/app.sass'
.bord1
  border: 1px solid $grey-5
</style>
