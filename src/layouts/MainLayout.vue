<template>
  <q-layout view="hHh lPr ffr">
    <q-header elevated>
      <q-toolbar>
        <q-toolbar-title>
          <span :class="sessionId == null ? 'cursor-pointer' : 'no-pointer-events'" @click="toorg">
            <q-avatar size="sm"><img :src="orgicon"></q-avatar>
            <span v-if="page === 'Login'" :class="orglabelclass">{{ orglabel }}
              <q-tooltip>Changer d'organisation</q-tooltip>
            </span>
          </span>
          <span v-if="compte != null && !compte.ko" :class="page!=='Avatar' ? 'disabled' : 'cursor-pointer'" @click="tocompte">
            <q-icon size="sm" name="home" aria-label="Accueil du compte"/>
            <span class="labeltitre q-px-sm">{{ compte.titre }}</span>
          </span>
        </q-toolbar-title>

        <q-btn v-if="org != null && sessionId != null" dense size="sm" color="warning" icon="logout" @click="confirmerdrc = true">
          <q-tooltip>Déconnexion / Reconnexion du compte</q-tooltip>
        </q-btn>

        <div class="cursor-pointer q-px-xs" @click="infoidb = true">
          <q-avatar v-if="mode === 0 || mode === 2 || sessionId == null" size="sm">
              <img src="~assets/database_gris.svg">
          </q-avatar>
          <div v-else>
            <q-avatar v-if="(mode == 1 || mode == 3) && statutidb != 0 && sessionId != null" size="sm">
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
          <q-avatar size="sm" :color="mode !== 0 && sessionId != null && mode !== modeInitial ? 'warning' : 'primary'">
            <q-icon v-if="mode === 0" size="sm" name="info"/>
            <q-icon v-if="mode === 1" size="sm" name="autorenew"/>
            <img v-if="mode === 2" src="~assets/incognito_blanc.svg">
            <q-icon v-if="mode === 3" size="sm" name="airplanemode_active"/>
            <q-icon v-if="mode === 4" size="sm" name="visibility"/>
          </q-avatar>
        </div>

        <q-btn class="q-pr-sm" flat dense round size="sm" icon="settings" aria-label="Menu" @click="$store.commit('ui/togglemenuouvert')"/>

      </q-toolbar>

      <q-toolbar inset :class="tbclass">
        <q-toolbar-title class="text-center">
          <div v-if="page==='Org'" class="tbpage">Choix de l'organisation</div>
          <div v-if="page==='Login'" class="tbpage">Connexion à un compte</div>
          <div v-if="page==='Synchro'" class="tbpage">Synchronisation des données</div>
          <div v-if="page==='Compte' && compte != null && !compte.ko" class="tbpage">Compte : {{ compte.titre }}</div>

          <div v-if="page==='Avatar'" class="row">
            <div class="col-8 col-sm-4 row justify-start tbpage">
              <span class="q-px-sm text-italic">Avatar :</span>
              <span class="q-px-sm">{{avatar && avatar.na ? avatar.na.nom : ''}}</span>
              <img class="photo q-ml-sm" :src="avatar && avatar.photo ? avatar.photo : personne"/>
            </div>
            <div class="col-6 col-sm-4 row justify-start tbpage2">
              <span class="q-px-sm text-italic">Contact :</span>
              <span class="q-px-sm">Victor Hugo</span>
            </div>
            <div class="col-6 col-sm-4 row justify-start tbpage2">
              <span class="q-px-sm text-italic">Groupe :</span>
              <span class="q-px-sm">Duke Orchestra</span>
            </div>

          </div>

        </q-toolbar-title>
      </q-toolbar>

      <q-toolbar inset v-if="page === 'Compte'">
        <div class="window-width">
        <q-tabs v-model="tabcompte" inline-label no-caps dense>
          <q-tab name="avatars" label="Avatars" />
          <q-tab name="etc" label="Etc." />
        </q-tabs>
        </div>
      </q-toolbar>

      <q-toolbar inset v-if="page === 'Avatar'">
        <div class="row window-width justify-center">
          <q-tabs class="" v-model="tabavatar" inline-label no-caps dense>
            <q-btn-dropdown v-if="tabavatar==='secrets'" size="md" dense dropdown-icon="change_history" color="secondary" v-model="menugauche1">
              <div class="clair1 column items-start q-pa-sm">
                <q-btn class="q-pa-sm" flat dense icon="search" no-caps label="Recherche" @click="menugauche1=false;optAvatar('recherche')"/>
                <q-btn class="q-pa-sm" flat dense icon="search" no-caps label="Plus" @click="menugauche1=false;optAvatar('plus')"/>
                <q-btn class="q-pa-sm" flat dense icon="search" no-caps label="Moins" @click="menugauche1=false;optAvatar('moins')"/>
                <q-btn class="q-pa-sm" flat dense icon="add_circle_outline" no-caps label="Nouveau secret" @click="menugauche1=false;optAvatar('nouveau')"/>
              </div>
            </q-btn-dropdown>
            <q-tab name="secrets" label="Secrets" />
            <q-tab name="contacts" label="Contacts" />
            <q-btn-dropdown class="q-ml-sm" v-if="(tabavatar=='groupes' ? 'disabled' : '')" size="md" dense dropdown-icon="change_history" color="secondary" v-model="menugauche4">
              <div class="clair1 column items-start q-pa-sm">
                <q-btn class="q-pa-sm" flat dense icon="search" no-caps label="Recherche" @click="menugauche4=false;optAvatar('recherche')"/>
                <q-btn class="q-pa-sm" flat dense icon="search" no-caps label="Plus" @click="menugauche4=false;optAvatar('plus')"/>
                <q-btn class="q-pa-sm" flat dense icon="search" no-caps label="Moins" @click="menugauche4=false;optAvatar('moins')"/>
                <q-btn class="q-pa-sm" flat dense icon="add_circle_outline" no-caps label="Nouveau secret" @click="menugauche4=false;optAvatar('nouveau')"/>
              </div>
            </q-btn-dropdown>
            <q-tab name="groupes" label="Groupes" />
            <q-tab name="etc" label="Etc." />
          </q-tabs>
        </div>
      </q-toolbar>
    </q-header>

    <q-drawer v-model="menuouvert"  :breakpoint="200" overlay elevated side="right" style="padding:0.5rem"><panel-menu></panel-menu></q-drawer>

    <q-drawer elevated side="left"></q-drawer>

    <q-page-container>
      <router-view v-slot="{ Component }">
        <transition appear name="fade" mode="out-in">
          <component :is="Component" />
        </transition>
      </router-view>
    </q-page-container>

    <q-dialog v-model="confirmerdrc">
      <q-card  class="q-ma-xs moyennelargeur">
        <q-card-section>
            <div class="titre-2">Déconnexion / <span v-if="sessionId != null && mode !== 0 && mode !== modeInitial">Reconnexion /</span>Continuation</div>
            <div v-if="sessionId != null && mode !== 0 && mode !== modeInitial" class="titre-5 bg-warning">{{msgdegrade()}}</div>
        </q-card-section>
        <q-card-actions  v-if="sessionId != null" align="center">
          <q-btn class="q-ma-xs" dense size="md" color="warning"
            icon="logout" label="Déconnexion du compte" @click="deconnexion" v-close-popup/>
          <q-btn class="q-ma-xs" v-if="sessionId != null && mode !== 0 && mode !== modeInitial" dense size="md" color="warning"
            icon="logout" label="Tentative de reconnexion au compte" @click="reconnexion" v-close-popup/>
          <q-btn class="q-ma-xs" dense size="md" color="primary"
            label="J'ai lu, la session continue" v-close-popup/>
        </q-card-actions>
      </q-card>
    </q-dialog>

    <q-dialog v-model="messagevisible" seamless position="bottom">
      <div :class="'q-pa-sm ' + ($store.state.ui.message.important ? 'msgimp' : 'msgstd')"  @click="$store.commit('ui/razmessage')">
        {{ $store.state.ui.message.texte }}
      </div>
    </q-dialog>

    <q-dialog v-model="auneop" seamless position="top" persistent transition-show="scale" transition-hide="scale">
      <q-card class="opencours row items-center justify-between no-wrap bg-amber-2 q-pa-sm">
        <div class="text-weight-bold">Interrompre l'opération</div>
        <div v-if="opencours != null" class="text-weight-bold">{{opencours.nom}}</div>
        <q-spinner color="primary" size="2rem" :thickness="3" />
        <q-btn flat round icon="stop" class="text-red" @click="confirmstopop = true"/>
      </q-card>
    </q-dialog>

    <q-dialog v-model="confirmstopop">
      <q-card>
        <q-card-section v-if="opencours != null && opencours.sync" class="q-pa-md diag">
          Interrompre l'opération de connexion qui charge les données de la base locale et/ou du serveur, affichera des données
          incomplètes et passera la session en mode dégradé.
        </q-card-section>
        <q-card-section v-else class="q-pa-md diag">
          Interrompre une opération n'est jamais souhaitable. Ne le faire que quand il y a suspicion
          qu'elle ne se terminera pas normalement d'elle-même.
        </q-card-section>
        <q-card-actions align="right">
          <q-btn flat label="Confirmer l'interruption" color="warning" v-close-popup @click="stop;auneop=false"/>
          <q-btn flat label="Laisser l'opération se poursuivre" color="primary" v-close-popup/>
        </q-card-actions>
      </q-card>
    </q-dialog>

    <q-dialog v-model="diagnosticvisible">
      <q-card>
        <q-card-section class="q-pa-md diag"><div v-html="$store.state.ui.diagnostic"></div></q-card-section>
        <q-card-actions align="right">
          <q-btn flat label="J'ai lu" color="primary" v-close-popup @click="$store.commit('ui/razdiagnostic')"/>
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
import { data, MODES } from '../app/modele.mjs'
import { cfg } from '../app/util.mjs'
import { remplacePage, onBoot } from '../app/page.mjs'
import { deconnexion, reconnexion } from '../app/operations.mjs'

export default {
  name: 'MainLayout',

  components: {
    RapportSynchro, PanelMenu, DialogueErreur, DialogueCrypto, DialogueCreationCompte, DialogueTestPing, DialogueInfoMode, DialogueInfoReseau, DialogueInfoIdb, DialogueHelp
  },

  computed: {
    tbclass () { return this.$q.dark.isActive ? ' sombre1' : ' clair1' }
  },

  data () {
    return {
      idbs: ['~assets/database_gris.svg', '~assets/database_vert.svg', '~assets/database_rouge.svg'],
      console: console,
      tabavatarsec: false,
      menugauche1: false,
      menugauche4: false
    }
  },

  methods: {
    login () {
      remplacePage('Login')
    },

    toorg () {
      remplacePage('Org')
    },

    optAvatar (opt) {
      this.tabavatarsec = false
      this.$store.commit('ui/majevtavatar', opt)
    },

    tocompte () {
      remplacePage('Compte')
    },

    toavatar () {
      if (this.avatar) {
        remplacePage('Avatar')
        return
      }
      const la = this.compte.avatars // leurs na
      if (la.length === 1) {
        const na = la[0]
        const av = data.getAvatar(na.id)
        this.$store.commit('db/majavatar', av)
        remplacePage('Avatar')
      } else {
        this.tabcompte = 'avatars'
        remplacePage('Compte')
      }
    },

    togroupe () {
      if (this.page === 'Synchro' || !this.compte) return
      if (this.groupe) {
        remplacePage('Groupe')
        return
      }
      this.tabcompte = 'groupes'
      remplacePage('Compte')
    },

    deconnexion () { deconnexion() },

    reconnexion () { reconnexion() },

    stop () {
      data.stopOp()
    }
  },

  setup () {
    const $q = useQuasar()
    $q.dark.set(true)
    onBoot()

    const personne = cfg().personne.default
    const personnes = cfg().personnes.default

    const $store = useStore()
    const menuouvert = computed({
      get: () => $store.state.ui.menuouvert,
      set: (val) => $store.commit('ui/majmenuouvert', val)
    })
    const auneop = computed({
      get: () => $store.state.ui.opencours != null,
      set: (val) => $store.commit('ui/majopencours', null)
    })
    const confirmstopop = computed({
      get: () => $store.state.ui.confirmstopop,
      set: (val) => $store.commit('ui/majconfirmstopop', val)
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
    const dialoguetestping = computed({
      get: () => $store.state.ui.dialoguetestping,
      set: (val) => $store.commit('ui/majdialoguetestping', val)
    })
    const dialoguesynchro = computed({
      get: () => $store.state.ui.dialoguesynchro,
      set: (val) => $store.commit('ui/majdialoguesynchro', val)
    })
    const org = computed({
      get: () => $store.state.ui.org,
      set: (val) => $store.commit('ui/majorg', val)
    })
    const tabcompte = computed({
      get: () => $store.state.ui.tabcompte,
      set: (val) => $store.commit('ui/majtabcompte', val)
    })
    const tabavatar = computed({
      get: () => $store.state.ui.tabavatar,
      set: (val) => $store.commit('ui/majtabavatar', val)
    })

    const page = computed(() => $store.state.ui.page)
    const orgicon = computed(() => $store.getters['ui/orgicon'])
    const orglabel = computed(() => $store.getters['ui/orglabel'])
    const orglabelclass = computed(() => 'font-antonio-l ' + ($store.state.ui.org == null ? 'labelorg2' : 'labelorg1'))
    const compte = computed(() => $store.state.db.compte)
    const avatar = computed(() => $store.state.db.avatar)
    const groupe = computed(() => $store.state.db.groupe)
    const mode = computed(() => $store.state.ui.mode)
    const modeInitial = computed(() => $store.state.ui.modeinitial)
    const messagevisible = computed(() => $store.getters['ui/messagevisible'])
    const diagnosticvisible = computed(() => $store.getters['ui/diagnosticvisible'])
    const opencours = computed(() => $store.state.ui.opencours)
    const statutnet = computed(() => $store.state.ui.statutnet)
    const statut = computed(() => $store.state.ui.statutsession)
    const statutidb = computed(() => $store.state.ui.statutidb)
    const sessionId = computed(() => $store.state.ui.sessionid)

    function msgdegrade () {
      return 'Suite à un incident réseau ou d\'accès à la base locale, le mode a été dégradé de "' +
      MODES[data.modeInitial] + '" à "' + MODES[data.mode] + '".'
    }

    return {
      personne,
      personnes,
      page,
      menuouvert,
      confirmerdrc,
      infomode,
      inforeseau,
      infoidb,
      confirmstopop,
      dialoguetestping,
      dialoguesynchro,
      org,
      orgicon,
      orglabel,
      orglabelclass,
      compte,
      avatar,
      groupe,
      mode,
      modeInitial,
      messagevisible,
      diagnosticvisible,
      opencours,
      auneop,
      statutnet,
      statutidb,
      sessionId,
      msgdegrade,
      statut,
      tabcompte,
      tabavatar
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
  transform: translateX(50%) /* CA BUG : Login ne se réaffichae pas */

.q-tabs--dense .q-tab
  min-height: 20px !important

.q-toolbar
  padding: 2px !important
  min-height: 0 !important

.btntab2
  padding: 0 2px !important

.cag
  text-align: center
  padding: 2px 0
  max-height: 2rem
  font-family: Calibri-Light
  font-size: 1.2rem
  overflow: hidden
  text-overflow: ellipsis
  cursor: pointer

.labeltitre
  padding: 0 2px
  color: white
  font-size: 1rem

.labelorg1
  padding: 0 2px
  color: white
  font-size: 1rem

.labelorg2
  color: $negative
  font-size: 1rem

.opencours
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

.bord
  border: 2px solid warning

.photo
  width: 1.8rem
  height: 1.8rem
  border-radius: 0.9rem
  border: 1px solid grey

.tbpage
  font-family: Comfortaa
  font-size: 1.1rem

.tbpage2
  font-family: Comfortaa
  font-size: 0.9rem

.btntab
  position: relative
  left: 30px
  z-index: 2
</style>
