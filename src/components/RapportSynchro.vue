<template>
  <q-card class="q-pa-xs fs-md moyennelargeur"> <!-- na pas mettre de marges haute / basse dans un q-page -->
    <q-card-actions v-if="jailu" align="right">
      <q-btn flat label="J'ai lu" color="primary" @click="$store.commit('ui/majdialoguesynchro', false)"/>
    </q-card-actions>
    <q-card-section>
      <div class="titre-lg text-center">Chargement et synchronisation</div>
    </q-card-section>
    <q-separator />
    <q-card-section style="max-height:70vh;overflow:auto">
      <div v-if="!$store.getters['ui/modeincognito']">
        <div class="titre-lg">Chargement des données stockées en local</div>
        <div v-for="(label, key) in labels" :key="key" class="row no-wrap items-start">
          <q-icon class="col-1" size="sm" :name="idb[t[key]].st ? 'done' : 'arrow_right'"/>
          <div class="col-8">{{label}}</div>
          <div class="col-1">{{idb[t[key]].nbl ? idb[t[key]].nbl : ''}}</div>
          <div class="col-2">{{idb[t[key]].vol ? ed(idb[t[key]].vol) : ''}}</div>
        </div>
      </div>
      <div v-if="!$store.getters['ui/modeavion']">
        <div v-if="$store.getters['ui/modeincognito']" class="titre-lg">Chargement des données depuis le serveur</div>
        <div v-else class="titre-lg">Synchronisation depuis les données du serveur</div>
      </div>
        <div v-for="(rec, sid) in sync" :key="sid" class="row no-wrap items-start">
          <q-icon class="col-1" size="sm" :name="rec.st ? 'done' : 'arrow_right'"/>
          <div class="col-9">{{rec.nom}}</div>
          <div class="col-1">{{rec.nbl}}</div>
        </div>
    </q-card-section>
  </q-card>
</template>

<script>
import { useStore } from 'vuex'
import { computed } from 'vue'
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

const tables = ['avatar', 'invitgr', 'contact', 'invitct', 'parrain', 'rencontre', 'groupe', 'membre', 'secret', 'purgeav', 'purgegr', 'cv', 'purgecv']

export default ({
  name: 'RapportSynchro',

  components: { },

  props: {
    jailu: Boolean
  },

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
    const $store = useStore()
    return {
      idb: computed({
        get: () => $store.state.ui.idblec
      }),
      sync: computed({
        get: () => $store.state.ui.synclec
      })
    }
  }
})
</script>

<style lang="sass" scoped>
@import '../css/app.sass'
</style>
