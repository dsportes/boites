<template>
  <q-layout view="hHh lPr ffr">
    <q-header elevated>
      <q-toolbar>
        <q-toolbar-title>
          <span :class="!sessionok ? 'cursor-pointer' : 'no-pointer-events'" @click="toorg">
            <q-avatar size="sm"><img :src="orgicon()"></q-avatar>
            <span v-if="page === 'Login'" :class="orglabelclass()">{{ orglabel() }}
              <q-tooltip>Changer d'organisation</q-tooltip>
            </span>
          </span>
          <info-ico v-if="sessionok && compte.estComptable" size="sm" color="secondary" icon="savings" info="Compte Comptable"/>
          <span v-if="sessionok">
            <q-btn :class="page!=='Avatar' ? 'disabled' : ''" flat dense size="md"
              icon="home" no-caps label="Compte" @click="tocompte"/>
            <titre-banner class-titre="titre-md" :titre="prefs.titre" :id-objet="compte.id"/>
          </span>
        </q-toolbar-title>

        <q-btn v-if="sessionok" dense size="sm" color="warning" icon="logout" @click="confirmerdrc = true">
          <q-tooltip>Déconnexion / Reconnexion du compte</q-tooltip>
        </q-btn>

        <div class="cursor-pointer q-px-xs" @click="infoidb = true">
          <q-avatar v-if="!sessionok || mode === 0 || mode === 2" size="sm">
            <img src="~assets/database_gris.svg">
          </q-avatar>
          <div v-else>
            <q-avatar v-if="sessionok && (mode == 1 || mode == 3) && statutidb != 0" size="sm">
              <img src="~assets/database_vert.svg">
            </q-avatar>
            <q-avatar v-else square size="sm">
              <img src="~assets/database_rouge.svg" class="bord">
            </q-avatar>
          </div>
        </div>

        <div class="cursor-pointer q-px-xs" @click="inforeseau = true">
           <q-icon size="sm" name="sync_alt" :color="['grey-4','green','warning'][statutnet]" />
         </div>

        <div class="cursor-pointer q-px-xs" @click="infomode = true">
          <q-avatar size="sm" :color="sessionok && mode !== 0 && mode !== modeInitial ? 'warning' : 'primary'">
            <q-icon v-if="mode === 0" size="sm" name="info"/>
            <q-icon v-if="mode === 1 && !dlattente && !dlechecs" size="sm" name="autorenew"/>
            <img v-if="mode === 2" src="~assets/incognito_blanc.svg">
            <q-icon v-if="mode === 3 && !dlattente && !dlechecs" size="sm" name="airplanemode_active"/>
            <q-icon v-if="mode === 4" size="sm" name="visibility"/>
            <q-icon v-if="dlattente && !dlechecs" size="sm" name="download"/>
            <q-icon v-if="dlechecs" size="sm" name="download" color="negative"/>
          </q-avatar>
        </div>

        <q-btn class="q-pr-sm" flat dense round size="sm" icon="settings" aria-label="Menu" @click="menuouvert = !menuouvert"/>

      </q-toolbar>

      <q-toolbar inset :class="tbclass">
        <q-btn v-if="sessionok && (page==='Compte' || page==='Avatar')" class="q-pr-sm" dense color="primary" round size="md" icon="people"
          aria-label="Mes contacts" @click="panelcontacts = !panelcontacts"/>
        <q-btn v-if="sessionok && (page==='Compte' || page==='Avatar')" class="q-pr-sm" dense color="primary" round size="md" icon="save"
          aria-label="Fichiers hors ligne" @click="fichiersavion = !fichiersavion"/>
        <q-toolbar-title class="text-center fs-md">
          <div v-if="page==='Org'" class="tbpage">Choix de l'organisation</div>
          <div v-if="page==='Login'" class="tbpage">Connexion à un compte</div>
          <div v-if="page==='Synchro'" class="tbpage">Synchronisation des données</div>
          <div v-if="sessionok && page==='Compte'" class="tbpage fs-md">
            <span class="q-pr-sm titre-md">Compte {{compte.estParrain ? '(parrain):' :':'}}</span>
            <titre-banner class-titre="titre-md" :titre="prefs ? prefs.titre : compte.sid" :id-objet="compte.id"/>
          </div>

          <div v-if="sessionok && page==='Avatar' && avatar" class="tbpage titre-lg">
            <div class="row justify-center no-wrap">
              <img class="photo" :src="avphoto()"/>
              <titre-banner class-titre="titre-md" :titre="avatar.na.noml"
                :titre2="avatar.na.noml + ' [' + avatar.na.nomc + ']'" :id-objet="avatar.id"/>
            </div>
          </div>

        </q-toolbar-title>
      </q-toolbar>

      <q-toolbar inset v-if="page === 'Avatar'">
        <div class="window-width font-cf">
          <q-tabs class="" v-model="tabavatar" inline-label no-caps dense>
            <q-btn class="btx" v-if="tabavatar==='secrets' && $q.screen.lt.md" size="md" dense icon="search" color="secondary" @click="avatarscrech = !avatarscrech"/>
            <q-btn class="btx" v-if="tabavatar==='secrets'" size="md" dense :icon="avatarscform ? 'view_list' : 'wysiwyg'" color="secondary" @click="togglescform"/>
            <q-tab name="secrets" label="Secrets" />
            <q-btn class="btx" v-if="tabavatar==='couples' && $q.screen.lt.md" size="md" dense icon="search" color="secondary" @click="avatarcprech = !avatarcprech"/>
            <q-btn class="btx" v-if="tabavatar==='couples'" size="md" dense :icon="avatarcpform ? 'view_list' : 'wysiwyg'" color="secondary" @click="togglecpform"/>
            <q-tab name="couples" label="Contacts" />
            <q-btn class="btx" v-if="tabavatar==='groupes' && $q.screen.lt.md" size="md" dense icon="search" color="secondary" @click="avatargrrech = !avatargrrech"/>
            <q-btn class="btx" v-if="tabavatar==='groupes'" size="md" dense :icon="avatargrform ? 'view_list' : 'wysiwyg'" color="secondary" @click="togglegrform"/>
            <q-tab name="groupes" label="Groupes" />
            <q-btn class="btx" v-if="compte.estComptable && tabavatar==='tribus'" size="md" dense :icon="avatargrform ? 'view_list' : 'wysiwyg'" color="secondary" @click="togglegrform"/>
            <q-tab v-if="compte.estComptable" name="tribus" label="Tribus" />
          </q-tabs>
        </div>
      </q-toolbar>
    </q-header>

    <q-drawer v-model="menuouvert" :breakpoint="200" overlay elevated side="right" style="padding:0.5rem"><panel-menu></panel-menu></q-drawer>

    <q-drawer v-model="panelcontacts" :width="330" elevated side="left">
      <panel-contacts/>
    </q-drawer>

    <q-drawer v-model="fichiersavion" :width="330" elevated side="left">
      <fichiers-avion/>
    </q-drawer>

    <q-page-container>
      <router-view v-slot="{ Component }">
        <transition appear name="fade" mode="out-in">
          <component :is="Component" />
        </transition>
      </router-view>
      <q-page-sticky v-if="invitationattente" position="bottom-right" :offset="[2, 2]">
        <q-btn label="Cliquer pour annuler l\'invitation en cours" color="accent" icon-right="arrow_forward" @click="toInvit"/>
      </q-page-sticky>
    </q-page-container>

    <q-dialog v-model="confirmerdrc">
      <q-card  class="q-ma-xs moyennelargeur">
        <q-card-section>
            <div class="titre fs-lg">Déconnexion / <span v-if="sessionok && mode !== 0 && mode !== modeInitial">Reconnexion /</span>Continuation</div>
            <div v-if="sessionok && mode !== 0 && mode !== modeInitial" class="titre fs-md bg-warning">{{msgdegrade()}}</div>
        </q-card-section>
        <q-card-actions  v-if="sessionok" align="center">
          <q-btn class="q-ma-xs" dense size="md" color="warning"
            icon="logout" label="Déconnexion du compte" @click="deconnexion" v-close-popup/>
          <q-btn class="q-ma-xs" v-if="mode !== 0 && mode !== modeInitial" dense size="md" color="warning"
            icon="logout" label="Tentative de reconnexion au compte" @click="reconnexion" v-close-popup/>
          <q-btn class="q-ma-xs" dense size="md" color="primary"
            label="J'ai lu, la session continue" v-close-popup/>
        </q-card-actions>
      </q-card>
    </q-dialog>

    <q-dialog v-model="aunmessage" seamless position="bottom">
      <div :class="'q-pa-sm cursor-pointer ' + (message.important ? 'msgimp' : 'text-white bg-grey-9')"  @click="aunmessage = false">
        {{ message.texte }}
      </div>
    </q-dialog>

    <q-dialog v-model="auneop" seamless position="top" persistent transition-show="scale" transition-hide="scale">
      <q-card class="opencours row items-center justify-between no-wrap bg-amber-2 q-pa-sm">
        <div class="text-weight-bold">Interrompre l'opération</div>
        <div v-if="opencours != null" class="text-weight-bold">{{opencours.nom}}</div>
        <q-spinner color="primary" size="2rem" :thickness="3" />
        <q-btn flat round icon="stop" class="text-negative" @click="confirmstopop = true"/>
      </q-card>
    </q-dialog>

    <q-dialog v-model="confirmstopop">
      <q-card>
        <q-card-section v-if="opencours != null && opencours.sync" class="q-pa-md fs-md text-center">
          Interrompre l'opération de connexion qui charge les données de la base locale et/ou du serveur
          passera la session en mode dégradé.
        </q-card-section>
        <q-card-section v-else class="q-pa-md fs-md text-center">
          Interrompre une opération n'est jamais souhaitable. Ne le faire que quand il y a suspicion
          qu'elle ne se terminera pas normalement d'elle-même.
        </q-card-section>
        <q-card-actions align="right">
          <q-btn flat label="Confirmer l'interruption" color="warning" v-close-popup @click="stop;auneop=false"/>
          <q-btn flat label="Laisser l'opération se poursuivre" color="primary" v-close-popup/>
        </q-card-actions>
      </q-card>
    </q-dialog>

    <q-dialog v-model="aundiagnostic">
      <q-card>
        <q-card-section class="q-pa-md diag"><div v-html="diagnostic"></div></q-card-section>
        <q-card-actions align="right">
          <q-btn flat label="J'ai lu" color="primary" v-close-popup @click="aundiagnostic=false"/>
        </q-card-actions>
      </q-card>
    </q-dialog>

    <q-dialog v-model="dialoguesynchro">
      <rapport-synchro jailu></rapport-synchro>
    </q-dialog>

    <dialogue-help></dialogue-help>
    <dialogue-crypto></dialogue-crypto>
    <dialogue-erreur></dialogue-erreur>
    <dialogue-test-ping></dialogue-test-ping>
    <dialogue-info-mode></dialogue-info-mode>
    <dialogue-info-reseau></dialogue-info-reseau>
    <dialogue-info-idb></dialogue-info-idb>
    <dialogue-creation-compte></dialogue-creation-compte>

    <q-footer></q-footer>
  </q-layout>
</template>

<script>
import { useQuasar } from 'quasar'
import { computed } from 'vue'
import { useStore } from 'vuex'
import DialogueCreationCompte from 'components/DialogueCreationCompte.vue'
import DialogueInfoMode from 'components/DialogueInfoMode.vue'
import DialogueInfoReseau from 'components/DialogueInfoReseau.vue'
import DialogueInfoIdb from 'components/DialogueInfoIdb.vue'
import DialogueTestPing from 'components/DialogueTestPing.vue'
import PanelMenu from 'components/PanelMenu.vue'
import DialogueErreur from 'components/DialogueErreur.vue'
import DialogueCrypto from 'components/DialogueCrypto.vue'
import RapportSynchro from 'components/RapportSynchro.vue'
import DialogueHelp from 'components/DialogueHelp.vue'
import PanelContacts from 'components/PanelContacts.vue'
import FichiersAvion from 'components/FichiersAvion.vue'
import TitreBanner from '../components/TitreBanner.vue'
import InfoIco from '../components/InfoIco.vue'
import { data, MODES } from '../app/modele.mjs'
import { cfg } from '../app/util.mjs'
import { remplacePage, onBoot, retourInvitation } from '../app/page.mjs'
import { reconnexion } from '../app/operations.mjs'

export default {
  name: 'MainLayout',

  components: {
    FichiersAvion, TitreBanner, InfoIco, RapportSynchro, PanelMenu, PanelContacts, DialogueErreur, DialogueCrypto, DialogueCreationCompte, DialogueTestPing, DialogueInfoMode, DialogueInfoReseau, DialogueInfoIdb, DialogueHelp
  },

  computed: {
    tbclass () { return this.$q.dark.isActive ? ' sombre1' : ' clair1' },
    estcomptable () { return data.estComptable }
  },

  data () {
    return {
      idbs: ['~assets/database_gris.svg', '~assets/database_vert.svg', '~assets/database_rouge.svg'],
      console: console,
      menugauche1: false,
      menugauche4: false
    }
  },

  methods: {
    login () { remplacePage('Login') },
    toorg () { remplacePage('Org') },
    tocompte () { remplacePage('Compte') },
    async deconnexion () { await data.deconnexion() },
    async reconnexion () { await reconnexion() },

    optAvatarSc (opt) { this.$store.commit('ui/majevtavatarsc', opt) },

    togglecpform () { this.avatarcpform = !this.avatarcpform },
    togglegrform () { this.avatargrform = !this.avatargrform },
    togglescform () { this.avatarscform = !this.avatarscform },
    toInvit () { retourInvitation('KO') },

    stop () { data.stopOp() }
  },

  setup () {
    const $q = useQuasar()
    $q.dark.set(true)
    onBoot()
    const phdef = cfg().avatar

    const $store = useStore()
    const sessionok = computed(() => $store.state.ui.sessionok)
    const statutnet = computed(() => $store.state.ui.statutnet)
    const statutidb = computed(() => $store.state.ui.statutidb)

    const org = computed(() => $store.state.ui.org)
    function orgicon () { return org.value ? cfg().orgs[org.value].icon : cfg().logo }
    function orglabel () { return org.value || 'Organisation non saisie' }
    function orglabelclass () { return 'font-antonio-l fs-md ' + (!org.value ? 'text-negative' : 'q-pr-xs text-white') }

    const mode = computed(() => $store.state.ui.mode)
    const modeInitial = computed(() => $store.state.ui.modeinitial)
    const page = computed(() => $store.state.ui.page)

    const compte = computed(() => $store.state.db.compte)
    const prefs = computed(() => $store.state.db.prefs)
    const avatar = computed(() => $store.state.db.avatar)
    const cvs = computed(() => { return $store.state.db.cvs })

    function avphoto () {
      const cv = avatar.value ? cvs.value[avatar.value.id] : null
      return cv ? cv[0] : phdef
    }

    const dlattente = computed({
      get: () => $store.state.ui.chargements.length
    })
    const dlechecs = computed({
      get: () => $store.state.ui.echecs.length
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
      get: () => $store.state.ui.infoidb,
      set: (val) => $store.commit('ui/majinfoidb', val)
    })
    const confirmerdrc = computed({
      get: () => $store.state.ui.confirmerdrc,
      set: (val) => $store.commit('ui/majconfirmerdrc', val)
    })
    const confirmstopop = computed({
      get: () => $store.state.ui.confirmstopop,
      set: (val) => $store.commit('ui/majconfirmstopop', val)
    })
    const menuouvert = computed({
      get: () => $store.state.ui.menuouvert,
      set: (val) => $store.commit('ui/majmenuouvert', val)
    })
    const panelcontacts = computed({
      get: () => $store.state.ui.panelcontacts,
      set: (val) => $store.commit('ui/majpanelcontacts', val)
    })
    const fichiersavion = computed({
      get: () => $store.state.ui.fichiersavion,
      set: (val) => $store.commit('ui/majfichiersavion', val)
    })
    const tabavatar = computed({
      get: () => $store.state.ui.tabavatar,
      set: (val) => $store.commit('ui/majtabavatar', val)
    })
    const avatarcprech = computed({
      get: () => $store.state.ui.avatarcprech,
      set: (val) => $store.commit('ui/majavatarcprech', val)
    })
    const avatarcpform = computed({
      get: () => $store.state.ui.avatarcpform,
      set: (val) => $store.commit('ui/majavatarcpform', val)
    })
    const avatargrrech = computed({
      get: () => $store.state.ui.avatargrrech,
      set: (val) => $store.commit('ui/majavatargrrech', val)
    })
    const avatargrform = computed({
      get: () => $store.state.ui.avatargrform,
      set: (val) => $store.commit('ui/majavatargrform', val)
    })
    const avatarscrech = computed({
      get: () => $store.state.ui.avatarscrech,
      set: (val) => $store.commit('ui/majavatarscrech', val)
    })
    const avatarscform = computed({
      get: () => $store.state.ui.avatarscform,
      set: (val) => $store.commit('ui/majavatarscform', val)
    })

    const invitationattente = computed(() => $store.state.ui.invitationattente)

    const message = computed(() => $store.state.ui.message)
    const aunmessage = computed({
      get: () => $store.state.ui.message != null,
      set: (val) => $store.commit('ui/razmessage')
    })

    const diagnostic = computed(() => $store.state.ui.diagnostic)
    const aundiagnostic = computed({
      get: () => $store.state.ui.diagnostic != null,
      set: (val) => $store.commit('ui/razdiagnostic')
    })

    const opencours = computed(() => $store.state.ui.opencours)
    const auneop = computed({
      get: () => $store.state.ui.opencours != null,
      set: (val) => $store.commit('ui/majopencours', null)
    })

    const dialoguesynchro = computed({
      get: () => $store.state.ui.dialoguesynchro,
      set: (val) => $store.commit('ui/majdialoguesynchro', val)
    })

    function msgdegrade () {
      return 'Suite à un incident réseau ou d\'accès à la base locale, le mode a été dégradé de "' +
      MODES[data.modeInitial] + '" à "' + MODES[data.mode] + '".'
    }

    return {
      org,
      orgicon,
      orglabel,
      orglabelclass,
      mode,
      modeInitial,
      page,
      dlattente,
      dlechecs,
      sessionok,
      statutnet,
      statutidb,
      tabavatar,
      avatarcprech,
      avatarcpform,
      avatargrrech,
      avatargrform,
      avatarscrech,
      avatarscform,
      invitationattente,

      compte,
      prefs,
      avatar,

      avphoto,
      msgdegrade,

      menuouvert,
      panelcontacts,
      fichiersavion,
      confirmerdrc,
      infomode,
      inforeseau,
      infoidb,

      aunmessage,
      message,

      diagnostic,
      aundiagnostic,

      opencours,
      auneop,
      confirmstopop,

      dialoguesynchro
    }
  }
}
</script>

<style lang="sass" scoped>
@import '../css/app.sass'
.fade-enter-active, .fade-leave-active
  transition: all 0.2s ease-in-out
.fade-enter, .fade-leave-active
  opacity: 0
  transform: translateX(50%) /* CA BUG : Login ne se réaffichae pas */

.q-tabs--dense .q-tab
  min-height: 20px !important

.q-toolbar
  padding: 2px !important
  min-height: 0 !important

.tbpage
  height: 1.7rem
  overflow: hidden

.msgimp
  background-color: $grey-2
  color: $negative
  font-weight: bold
  border: 2px solid $negative

.opencours
  width: 15rem
  height: 4rem
  color: black
  overflow: hidden

.bord
  border: 2px solid $negative

.photo
  width: 1.8rem
  height: 1.8rem
  border-radius: 0.9rem
  border: 1px solid $grey-5

.btx
  position: relative
  margin-left: 2px
  left: 1.2rem
  z-index: 10
</style>
