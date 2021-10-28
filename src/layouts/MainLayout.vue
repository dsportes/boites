<template>
  <q-layout view="hHh lpR fFf">
    <q-header reveal elevated>
      <q-toolbar>
        <q-btn flat dense round icon="menu" aria-label="Menu" @click="$store.commit('ui/majmenuouvert', true)"/>
        <q-btn flat dense round icon="home" aria-label="Accueil" @click="accueil"/>

        <q-toolbar-title>
          <img class="imgstd" :src="orgicon">
          <span :class="labelorgclass">{{ $store.getters['ui/labelorg'] }}</span>
        </q-toolbar-title>

        <q-btn v-if="$store.getters['ui/modeincognito'] || $store.getters['ui/modesync']" flat dense round icon="autorenew" aria-label="Etat synchronisation"
          @click="infosync = true"
          :class="$store.state.ui.statuslogin ? 'vert' : ($store.state.ui.sessionerreur ? 'rouge' : 'gris')"
        />
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

    <dialogue-crypto></dialogue-crypto>
    <dialogue-erreur></dialogue-erreur>

    <q-dialog v-model="infomode">
      <q-card>
        <q-card-section>
          <div class="titre-2">Les modes inconnu, synchronisé, incognito, avion</div>
        </q-card-section>
        <q-card-section :class="'q-pt-none' + ($store.getters['ui/modeinconnu'] ? 'text-body-1 text-weight-bold' : 'text-body-2 text-weight-regular')">
          <q-icon class="iconstd" name="info"/><span class="titre-2 q-px-sm">Inconnu :</span>
          Le mode n'a pas encore été choisi.
        </q-card-section>
        <q-card-section :class="'q-pt-none' + ($store.getters['ui/modesync'] ? 'text-body-1 text-weight-bold' : 'text-body-2 text-weight-regular')">
          <q-icon class="iconstd" name="sync_alt"/><span class="titre-2 q-px-sm">Synchronisé :</span>
          L'application accède au serveur central pour obtenir les données et les synchronise sur un stockage local crypté.
        </q-card-section>
        <q-card-section :class="'q-pt-none' + ($store.getters['ui/modeincognito'] ? 'text-body-1 text-weight-bold' : 'text-body-2 text-weight-regular')">
          <img class="imgstd" src="~assets/incognito.svg"><span class="titre-2 q-px-sm">Incognito :</span>
          L'application accède au serveur central pour obtenir les données mais n'accède pas au stockage local et n'y laisse pas de trace d'exécution.
        </q-card-section>
        <q-card-section :class="'q-pt-none' + ($store.getters['ui/modeavion'] ? 'text-body-1 text-weight-bold' : 'text-body-2 text-weight-regular')">
          <q-icon class="iconstd" name="airplanemode_active"/><span class="titre-2 q-px-sm">Avion :</span>
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
          <div class="titre-2">Etat d'accès au réseau (mode synchronisé et incognito)</div>
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

    <q-dialog v-model="infosync">
      <q-card>
        <q-card-section>
          <div class="titre-2">État courant de la synchronisation (mode synchronisé et incognito)</div>
        </q-card-section>
        <q-card-section v-if="!$store.state.ui.statuslogin" class="q-pt-none">
          La synchronisation n'est activé qu'après s'être connecté.
        </q-card-section>
        <q-card-section v-else class="q-pt-none">
          {{ labelerreursync }}
        </q-card-section>
        <q-card-actions align="right">
          <q-btn flat label="J'ai lu" color="primary" v-close-popup />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <q-dialog v-model="reqencours" seamless position="top" persistent transition-show="scale" transition-hide="scale">
      <q-card class="reqencours row items-center justify-between no-wrap bg-amber-2 q-pa-sm">
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

    <q-dialog v-model="diagnosticvisible">
      <q-card>
        <q-card-section class="q-pa-md diag"><div v-html="$store.state.ui.diagnostic"></div></q-card-section>
        <q-card-actions align="right">
          <q-btn flat label="J'ai lu" color="primary" v-close-popup @click="$store.commit('ui/razdiagnostic')"/>
        </q-card-actions>
      </q-card>
    </q-dialog>

  </q-layout>
</template>

<script>
import PanelMenu from 'components/PanelMenu.vue'
import DialogueErreur from 'components/DialogueErreur.vue'
import DialogueCrypto from 'components/DialogueCrypto.vue'
import { cancelRequest, ping } from '../app/util'
import { useQuasar } from 'quasar'
import { computed } from 'vue'
import { useStore } from 'vuex'
import { onRuptureSession } from '../app/modele'

export default ({
  name: 'MainLayout',

  components: {
    PanelMenu, DialogueErreur, DialogueCrypto
  },

  data () {
    return {
      cancelRequest // fonction de util.js
    }
  },

  watch: {
    '$store.state.ui.sessionerreur': function (newp, oldp) {
      console.log('Session erreur : ' + (newp ? newp.message : 'x') + ' / ' + (oldp ? oldp.message : 'x'))
      if (newp) {
        this.$store.commit('ui/razdialogues')
        onRuptureSession(newp)
      }
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
    }
  },

  setup () {
    const $q = useQuasar()
    $q.dark.set(true)
    const $store = useStore()
    const menuouvert = computed({
      get: () => $store.state.ui.menuouvert,
      set: (val) => $store.commit('ui/majmenuouvert', val)
    })
    const infomode = computed({
      get: () => $store.state.ui.infomode,
      set: (val) => $store.commit('ui/majinfomode', val)
    })
    const inforeseau = computed({
      get: () => $store.state.ui.inforeseau,
      set: (val) => $store.commit('ui/majinforeseau', val)
    })
    const infosync = computed({
      get: () => $store.state.ui.infosync,
      set: (val) => $store.commit('ui/majinfosync', val)
    })
    const org = computed(() => $store.state.ui.org)
    const orgicon = computed(() => $store.state.ui.orgicon)
    const mode = computed(() => $store.state.ui.mode)
    const reseauok = computed(() => $store.getters['ui/reseauok'])
    const messagevisible = computed(() => $store.getters['ui/messagevisible'])
    const diagnosticvisible = computed(() => $store.getters['ui/diagnosticvisible'])
    const reqencours = computed(() => $store.state.ui.reqencours)
    const derniereerreur = computed(() => $store.state.ui.derniereerreur)
    const sessionerreur = computed(() => $store.state.ui.sessionerreur)
    const labelorgclass = computed(() => 'font-antonio-l q-px-sm ' + ($store.state.ui.org == null ? 'labelorg2' : 'labelorg1'))
    const lerr = [
      'La synchronisation fonctionne normalement.',
      'La liaison avec le serveur n\'a pas pu s\'établir au moment de commencer la synchronisation',
      'La liaison avec le serveur a été interrompue en cours de synchronisation'
    ]
    const labelerreursync = computed(() => lerr[$store.state.ui.sessionerreur])
    /* alternative au watch dans page
    $store.watch(
      () => $store.getters['ui/sessionerreurmsg'],
      sessionerreurmsg => {
        console.log('<<<<' + sessionerreurmsg)
      }
    )
    */
    return {
      menuouvert,
      infomode,
      inforeseau,
      infosync,
      org,
      orgicon,
      labelorgclass,
      mode,
      messagevisible,
      diagnosticvisible,
      reqencours,
      derniereerreur,
      sessionerreur,
      labelerreursync,
      reseauok
    }
  }
})
</script>

<style lang="sass" scpoed>
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

.reqencours
  width: 15rem
  height: 4rem
  color: black
  overflow: hidden

.msgstd
  background-color: $grey-9
  color: white
  cursor: pointer

.msgimp
  background-color: $grey-2
  color: $warning
  font-weight: bold
  cursor: pointer
  border: 2px solid $warning

.diag
  font-size: 1rem
  text-align: center

.vert
  color: $green
.rouge
  color: $red
.gris
  color: $grey-6
</style>
