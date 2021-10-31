<template>
  <q-layout view="hHh lpR fFf">
    <q-header reveal elevated>
      <q-toolbar>
        <q-toolbar-title>
          <span :class="compte == null ? 'cursor-pointer' : 'no-pointer-events'" @click="toorg">
            <q-avatar round size="md">
              <img :src="orgicon">
            </q-avatar>
            <span :class="orglabelclass">{{ orglabel }}</span>
          </span>
          <q-btn v-if="org != null && compte == null && page !== 'Login'" color="warning" dense icon="login" label="Connexion" @click="login"/>
          <span v-if="org != null && compte == null && page === 'Login'" class="q-px-sm">Connexion ...</span>
          <span v-if="org != null && compte != null" class="font-antonio-l q-px-sm">{{ compte.titre }}</span>
          <q-btn v-if="org != null && compte != null" class="btnsm" dense size="sm" color="warning" icon="logout" label="Déconnexion" @click="logout"/>
        </q-toolbar-title>

        <div class="cursor-pointer q-px-xs" @click="infoidb = true">
          <q-avatar v-if="mode === 0 || mode === 2 || !compte" round size="md">
              <img src="~assets/database_gris.svg">
            </q-avatar>
          <div v-else>
            <q-avatar v-if="!idberreur" round size="md">
              <img src="~assets/database_vert.svg">
            </q-avatar>
            <q-avatar v-else round size="md">
              <img src="~assets/database_rouge.svg">
            </q-avatar>
          </div>
        </div>

        <div class="cursor-pointer q-px-xs" @click="inforeseau = true">
          <q-avatar v-if="mode === 0 || mode === 3 || !compte" round color="grey-5" size="md"/>
          <div v-else>
            <q-icon v-if="syncencours" size="md" icon="autorenew"/>
            <div v-else>
              <q-avatar v-if="modelactif" round color="green" size="md"/>
              <q-icon v-else name="visibility" size="md" color="warning"/>
            </div>
          </div>
        </div>

        <div class="cursor-pointer q-px-xs" @click="infomode = true">
          <q-avatar v-if="$store.getters['ui/modeincognito']" round size="md">
            <img src="~assets/incognito_blanc.svg">
          </q-avatar>
          <q-icon v-else round size="md" :name="['info','sync_alt','info','airplanemode_active'][$store.state.ui.mode]" />
        </div>

      </q-toolbar>
        <q-toolbar inset>
          <q-toolbar-title>
          <span v-if="compte != null" class="cursor-pointer q-pr-md" @click="tocompte">Synthèse</span>
          <q-avatar v-if="avatar != null || groupe != null" class="q-px-md" round size="md">
            <q-icon round size="md" name="label_important"/>
          </q-avatar>
          <q-avatar v-if="avatar != null" round size="md">
            <img v-if="avatar.icone.length !== 0" :src="avatar.icone">
            <q-icon v-else round size="md" name="face"/>
          </q-avatar>
          <q-avatar v-if="groupe != null" round size="md">
            <img v-if="groupe.icone.length !== 0" :src="groupe.icone">
            <q-icon v-else round size="md" name="group"/>
          </q-avatar>
          <span v-if="avatar != null">{{avatar.label}}</span>
          </q-toolbar-title>
          <q-btn flat dense round icon="people" aria-label="Contacts"/>
          <q-btn flat dense round icon="menu" aria-label="Menu" @click="$store.commit('ui/majmenuouvert', true)"/>
        </q-toolbar>
    </q-header>

    <q-drawer v-model="menuouvert" side="right" overlay elevated class="bg-grey-1" >
      <panel-menu></panel-menu>
    </q-drawer>

    <q-page-container>
      <router-view v-slot="{ Component }">
        <transition appear name="fade" mode="out-in">
          <component :is="Component" />
        </transition>
      </router-view>
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
          <q-icon size="md" name="sync_alt"/><span class="titre-2 q-px-sm">Synchronisé :</span>
          L'application accède au serveur central pour obtenir les données et les synchronise sur un stockage local crypté.
        </q-card-section>
        <q-card-section :class="'q-pt-none' + ($store.getters['ui/modeincognito'] ? 'text-body-1 text-weight-bold' : 'text-body-2 text-weight-regular')">
          <q-avatar round size="md"><img src="~assets/incognito_blanc.svg"></q-avatar>
          <span class="titre-2 q-px-sm">Incognito :</span>
          L'application accède au serveur central pour obtenir les données mais n'accède pas au stockage local et n'y laisse pas de trace d'exécution.
        </q-card-section>
        <q-card-section :class="'q-pt-none' + ($store.getters['ui/modeavion'] ? 'text-body-1 text-weight-bold' : 'text-body-2 text-weight-regular')">
          <q-icon size="md" name="airplanemode_active"/><span class="titre-2 q-px-sm">Avion :</span>
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
          <q-btn flat label="J'ai lu" color="primary" v-close-popup />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <q-dialog v-model="infoidb">
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
import { cancelRequest, ping /*, cfg */ } from '../app/util'
import { useQuasar } from 'quasar'
import { computed } from 'vue'
import { useStore } from 'vuex'
import { onRuptureSession, remplacePage, onBoot } from '../app/modele'
import { deconnexion } from '../app/operations'

export default {
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
    /*
    Traitement d'un changement d'organisation directement sur l'URL
    Quand une URL n'est pas reconnue par le router (l'utilisateur a frappé n'importe quoi), newp est null.
    On le déconnecte s'il était connecté et on le ramène au tout début (bien fait !)
    */
    '$route.params': function (newp, oldp) {
      console.log(JSON.stringify(newp) + ' -- ' + JSON.stringify(oldp))
      /*
      if (newp.org === this.org) return
      if (!cfg().orgs[newp.org]) {
        this.org = null
        if (this.compte) {
          deconnexion() // renverra sur Org
        } else {
          remplacePage('Org')
        }
      } else {
        if (this.compte) {
          deconnexion() // renverra sur Login
        } else {
          remplacePage('Login')
        }
      }
      */
    },
    '$store.state.ui.sessionerreur': function (newp, oldp) {
      console.log('Session erreur : ' + (newp ? newp.message : 'x') + ' / ' + (oldp ? oldp.message : 'x'))
      if (newp) {
        this.$store.commit('ui/razdialogues')
        onRuptureSession(newp)
      }
    }
  },

  methods: {
    login () {
      remplacePage('Login')
    },

    toorg () {
      remplacePage('Org')
    },

    tocompte () {
      remplacePage('Compte')
    },

    logout () {
      deconnexion()
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
    onBoot()

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
    const infoidb = computed({
      get: () => $store.state.ui.infosync,
      set: (val) => $store.commit('ui/majinfoidb', val)
    })
    const org = computed({
      get: () => $store.state.ui.org,
      set: (val) => $store.commit('ui/majorg', val)
    })
    const page = computed(() => $store.state.ui.page)
    const orgicon = computed(() => $store.getters['ui/orgicon'])
    const orglabel = computed(() => $store.getters['ui/orglabel'])
    const orglabelclass = computed(() => 'font-antonio-l q-px-sm ' + ($store.state.ui.org == null ? 'labelorg2' : 'labelorg1'))
    const compte = computed(() => $store.state.db.compte)
    const avatar = computed(() => $store.state.db.avatar)
    const groupe = computed(() => $store.state.db.groupe)
    const mode = computed(() => $store.state.ui.mode)
    const reseauok = computed(() => $store.getters['ui/reseauok'])
    const messagevisible = computed(() => $store.getters['ui/messagevisible'])
    const diagnosticvisible = computed(() => $store.getters['ui/diagnosticvisible'])
    const reqencours = computed(() => $store.state.ui.reqencours)
    const syncencours = computed(() => $store.state.ui.syncencours)
    const derniereerreur = computed(() => $store.state.ui.derniereerreur)
    const sessionerreur = computed(() => $store.state.ui.sessionerreur)
    const modeleactif = computed(() => $store.state.ui.modeleactif)
    const idberreur = computed(() => $store.state.ui.idberreur)

    console.log('Page:' + page.value)
    return {
      page,
      menuouvert,
      infomode,
      inforeseau,
      infoidb,
      org,
      orgicon,
      orglabel,
      orglabelclass,
      compte,
      avatar,
      groupe,
      mode,
      messagevisible,
      diagnosticvisible,
      reqencours,
      derniereerreur,
      sessionerreur,
      syncencours,
      idberreur,
      modeleactif,
      reseauok
    }
  }
}
</script>

<style lang="sass" scpoed>
@import '../css/app.sass'
.fade-enter-active, .fade-leave-active
  transition: all 0.2s ease-in-out
.fade-enter, .fade-leave-active
  opacity: 0
  transform: translateX(50%)

.btnsm
  position: relative
  top: -3px

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

.q-toolbar
  padding: 2px !important
  min-height: 0 !important
</style>
