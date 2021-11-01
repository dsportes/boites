<template>
    <q-page>
    <q-card class="q-pa-xs"> <!-- na pas mettre de marges haute / basse dans un q-page -->
      <q-card-section>
        <div class="titre-2">Chargement et synchronisation</div>
      </q-card-section>
      <q-separator />
      <q-card-section style="max-height:70vh;overflow:auto">
        <div v-if="!$store.getters['ui/modeincognito']">
          <div class="titre-2">Chargement des données stockées en local</div>
          <div v-for="(label, key) in labels" :key="key" class="row no-wrap items-start">
            <q-icon class="col-1" size="sm" :name="idb[t[key]].st ? 'done' : 'arrow_right'"/>
            <div class="col-8">{{label}}</div>
            <div class="col-1">{{idb[t[key]].nbl ? idb[t[key]].nbl : ''}}</div>
            <div class="col-2">{{idb[t[key]].vol ? ed(idb[t[key]].vol) : ''}}</div>
          </div>
        </div>
        <div v-if="!$store.getters['ui/modeavion']">
          <div v-if="$store.getters['ui/modeincognito']" class="titre-2">Chargement des données depuis le serveur</div>
          <div v-else class="titre-2">Synchronisation des données du serveur en local</div>
        </div>
        <p>En chantier ...</p>
      </q-card-section>
      <q-separator />
    </q-card>

  </q-page>
</template>

<script>
import { useStore } from 'vuex'
import { computed } from 'vue'
import { onBoot } from '../app/modele'
import { edvol } from '../app/util'

const labels = [
  'Avatars des comptes',
  'Invitations reçues à être membre de groupes',
  'Contacts des avatars',
  'Invitations reçues à être contact',
  'Parrainages de nouveaux comptes',
  'Rencontres avec un compte existant',
  'Groupes accédés',
  'Membres de ces groupes',
  'Secrets',
  'Purge des avatars obsolètes',
  'Purge des groupes obsolètes',
  'Cartes de visite',
  'Purge des cartes de visite obsolètes'
]

const tables = ['avatar', 'invitgr', 'contact', 'invitct', 'parrain', 'rencontre', 'groupe', 'membre', 'secrets', 'purgeav', 'purgegr', 'cv', 'purgecv']

export default ({
  name: 'Synchro',

  components: { },

  data () {
    return {
      ed: edvol,
      labels: labels,
      t: tables
    }
  },

  methods: {
  },

  setup () {
    onBoot()
    const $store = useStore()
    return {
      idb: computed({
        get: () => $store.state.ui.idblec
      })
    }
  }
})
</script>

<style lang="sass">
@import '../css/app.sass'
.t1
  font-size: 1.1rem
  font-weight: bold
  font-style: italic
.t2
  font-size: 1rem
  font-family: 'Roboto Mono'
</style>
