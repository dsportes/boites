<template>
  <q-layout view="hHh lpR fFf">
    <q-header reveal elevated>
      <q-toolbar>
        <q-btn flat dense round icon="menu" aria-label="Menu" @click="menuouvert = !menuouvert"/>
        <q-btn flat dense round icon="home" aria-label="Accueil" @click="accueil"/>
        <q-btn flat dense round icon="check" aria-label="Test" @click="test2"/>

        <q-toolbar-title>
          <img v-if="orgicon == null" class="imgstd" src="~assets/anonymous.png">
          <img v-else class="imgstd" :src="orgicon">
          <span :class="labelorgclass">{{ $store.getters['ui/labelorg'] }}</span>
        </q-toolbar-title>

        <q-btn v-if="$store.getters['ui/enligne']" flat dense round icon="cloud" aria-label="Accès serveur"
          @click="inforeseau = true"
          :class="$store.getters['ui/reseauok'] ? 'vert' : 'rouge'"
        />
        <div v-if="$store.getters['ui/modeincognito']" @click="infomode = true">
          <img class="imgstd" src="~assets/incognito.svg">
        </div>
        <q-icon  v-else class="iconstd" @click="infomode = true"
        :name="['info','sync_alt','info','airplanemode_active'][$store.state.ui.mode]" />

      </q-toolbar>
    </q-header>

    <q-drawer v-model="menuouvert" side="left" overlay elevated class="bg-grey-1" >
      <panel-menu></panel-menu>
    </q-drawer>

    <q-page-container>
      <router-view />
    </q-page-container>

    <dialogue-erreur></dialogue-erreur>

    <q-dialog v-model="infomode">
      <q-card>
        <q-card-section>
          <div class="text-h6">Les modes inconnu, synchronisé, incognito, avion</div>
        </q-card-section>
        <q-card-section :class="'q-pt-none' + ($store.getters['ui/modeinconnu'] ? 'text-body-1 text-weight-bold' : 'text-body-2 text-weight-regular')">
          <q-icon class="iconstd" name="info"/><span class="text-h6 q-px-sm">Inconnu :</span>
          Le mode n'a pas encore été choisi.
        </q-card-section>
        <q-card-section :class="'q-pt-none' + ($store.getters['ui/modesync'] ? 'text-body-1 text-weight-bold' : 'text-body-2 text-weight-regular')">
          <q-icon class="iconstd" name="sync_alt"/><span class="text-h6 q-px-sm">Synchronisé :</span>
          L'application accède au serveur central pour obtenir les données et les synchronise sur un stockage local crypté.
        </q-card-section>
        <q-card-section :class="'q-pt-none' + ($store.getters['ui/modeincognito'] ? 'text-body-1 text-weight-bold' : 'text-body-2 text-weight-regular')">
          <img class="imgstd" src="~assets/incognito.svg"><span class="text-h6 q-px-sm">Incognito :</span>
          L'application accède au serveur central pour obtenir les données mais n'accède pas au stockage local et n'y laisse pas de trace d'exécution.
        </q-card-section>
        <q-card-section :class="'q-pt-none' + ($store.getters['ui/modeavion'] ? 'text-body-1 text-weight-bold' : 'text-body-2 text-weight-regular')">
          <q-icon class="iconstd" name="airplanemode_active"/><span class="text-h6 q-px-sm">Avion :</span>
          L'application n'accède pas au réseau, il obtient les données depuis le stockage local crypté où elles ont été mises à jour lors de la dernière session en mode synchronisé.
        </q-card-section>
        <q-card-actions align="right">
          <q-btn flat label="J'ai lu" color="primary" v-close-popup />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <q-dialog v-model="inforeseau">
      <q-card>
        <q-card-section>
          <div class="text-h6">Etat d'accès au réseau (mode synchronisé et incognito)</div>
        </q-card-section>
        <q-card-section v-if="$store.getters['ui/reseauok']" class="q-pt-none">
          L'application accède par le réseau aux données sur le serveur, la dernière requête s'est terminée normalement.
        </q-card-section>
        <q-card-section v-else class="q-pt-none">
          L'application accède par le réseau aux données sur le serveur, toutefois la dernière requête a rencontré un incident.
        </q-card-section>
        <q-card-actions align="right">
          <q-btn flat label="Tester l'accès au serveur" color="accent" v-close-popup @click="ping"/>
          <q-btn v-if="$store.getters['ui/aeuuneerreur']" flat label="Voir la dernière erreur" color="accent" v-close-popup
           @click="$store.commit('ui/majerreur', this.derniereerreur)"/>
          <q-btn flat label="J'ai lu" color="primary" v-close-popup />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <q-dialog v-model="reqencours" seamless position="top">
      <q-card style="width:15rem;height:3rem;overflow:hidden" class="row items-center justify-between no-wrap bg-amber-2 q-pa-sm">
          <div class="text-weight-bold">Annuler la requête</div>
          <q-spinner color="primary" size="2rem" :thickness="3" />
          <q-btn flat round icon="stop" class="text-red" @click="cancelRequest" />
      </q-card>
    </q-dialog>

    <q-dialog v-model="messagevisible" seamless position="bottom">
      <div :class="'q-pa-sm ' + ($store.state.ui.message.important ? 'msgimp' : 'msgstd')"  @click="$store.commit('ui/razmessage')">
        {{ $store.state.ui.message.texte }}
      </div>
    </q-dialog>

  </q-layout>
</template>

<script>
import PanelMenu from 'src/components/PanelMenu.vue'
import DialogueErreur from 'components/DialogueErreur.vue'
// import * as CONST from '../store/constantes'
import { cancelRequest, ping, post, affichermessage } from '../app/util'
import { computed } from 'vue'
import { useStore } from 'vuex'

export default ({
  name: 'MainLayout',

  components: {
    PanelMenu, DialogueErreur
  },

  data () {
    return {
      cancelRequest,
      menuouvert: false,
      infomode: false,
      inforeseau: false,
      n: 1
    }
  },

  methods: {
    accueil () {
      this.$router.replace('/' + this.org)
    },
    async ping () {
      try {
        await ping()
      } catch (e) {
        console.log('Erreur ping ' + JSON.stringify(e))
      }
    },
    test0 () {
      affichermessage('toto est beau ' + this.n++, this.n % 2)
    },
    async test1 () {
      try {
        const r = await post('m1', 'echo', { a: 1, b: 'toto' }, 'test2')
        console.log('test2ok ' + JSON.stringify(r))
      } catch (e) {
        console.log('test2ko ' + JSON.stringify(e))
      }
    },
    async test2 () {
      try {
        const r = await post('m1', 'erreur', { c: 99, m: 'erreur volontaire', d: 'détail ici', s: 'trace back' }, 'test3')
        console.log('test3ok ' + JSON.stringify(r))
      } catch (e) {
        console.log('test3ko ' + JSON.stringify(e))
      }
    }
  },

  setup () {
    const $store = useStore()

    const org = computed(() => $store.state.ui.org)
    const orgicon = computed(() => $store.state.ui.orgicon)
    const mode = computed(() => $store.state.ui.mode)
    const reseauok = computed(() => $store.getters['ui/reseauok'])
    const messagevisible = computed(() => $store.getters['ui/messagevisible'])
    const reqencours = computed(() => $store.state.ui.reqencours)
    const derniereerreur = computed(() => $store.state.ui.derniereerreur)
    const labelorgclass = computed(() => 'font-antonio-l q-px-sm ' + ($store.state.ui.orgicon == null ? 'labelorg2' : 'labelorg1'))

    return {
      org,
      orgicon,
      labelorgclass,
      mode,
      messagevisible,
      reqencours,
      derniereerreur,
      reseauok
    }
  }
})
</script>

<style lang="sass">
@import '../css/app.sass'
.iconstd
  font-size: $iconsize !important
  background-color: white
  color: black
  border-radius: 12px
  cursor: pointer

.imgstd
  width: $iconsize
  background-color: white
  color: black
  border-radius: $iconsize / 2
  cursor: pointer
  position: relative
  top: 4px

.labelorg1
  color: white

.labelorg2
  color: $negative

.msgstd
  background-color: $grey-9
  color: white
  cursor: pointer

.msgimp
  background-color: $grey-2
  color: $red
  font-weight: bold
  cursor: pointer
  border: 2px solid $red

.vert
  color: $green
.rouge
  color: $red
</style>
