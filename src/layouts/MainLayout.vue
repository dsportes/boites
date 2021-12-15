<template>
  <q-layout view="hHh lpR fFf">
    <q-header reveal elevated>
      <q-toolbar>
        <q-toolbar-title>
          <span :class="sessionId == null ? 'cursor-pointer' : 'no-pointer-events'" @click="toorg">
            <q-avatar size="sm">
              <img :src="orgicon">
            </q-avatar>
            <span :class="orglabelclass">{{ orglabel }}</span>
            <q-tooltip>Changer d'organisation</q-tooltip>
          </span>
          <span v-if="org != null && sessionId == null && page === 'Login'" class="q-px-sm"  @click="login">Connexion ...</span>
          <span v-if="org != null && statut != 0 && compte != null" class="labeltitre q-px-sm">{{ compte.titre }}</span>
        </q-toolbar-title>

        <q-btn v-if="org != null && sessionId != null" dense size="md" color="warning" icon="logout" @click="confirmerdrc = true">
          <q-tooltip>Déconnexion / Reconnexion du compte</q-tooltip>
        </q-btn>

        <div class="cursor-pointer q-px-xs" @click="infoidb = true">
          <q-avatar v-if="mode === 0 || mode === 2 || sessionId == null" size="md">
              <img src="~assets/database_gris.svg">
          </q-avatar>
          <div v-else>
            <q-avatar v-if="(mode == 1 || mode == 3) && statutidb != 0 && sessionId != null" size="md">
              <img src="~assets/database_vert.svg">
            </q-avatar>
            <q-avatar v-else square size="md">
              <img src="~assets/database_rouge.svg" class="bord">
            </q-avatar>
          </div>
        </div>

        <div class="cursor-pointer q-px-xs" @click="inforeseau = true">
           <q-icon size="md" name="sync_alt" :color="['grey-4','green','warning'][statutnet]" />
         </div>

        <div class="cursor-pointer q-px-xs" @click="infomode = true">
          <q-avatar size="md" :color="mode !== 0 && sessionId != null && mode !== modeInitial ? 'warning' : 'primary'">
            <q-icon v-if="mode === 0" size="md" name="info"/>
            <q-icon v-if="mode === 1" size="md" name="autorenew"/>
            <img v-if="mode === 2" src="~assets/incognito_blanc.svg">
            <q-icon v-if="mode === 3" size="md" name="airplanemode_active"/>
            <q-icon v-if="mode === 4" size="md" name="visibility"/>
          </q-avatar>
        </div>

      </q-toolbar>

      <q-toolbar inset>
        <q-toolbar-title class="row no-wrap justify-around">
          <div :class="'col-4 cag ' + (page === 'Synchro' || compte == null ? 'disabled' : '')" @click="tocompte">Compte</div>
          <div :class="'row items-center col-4 cag ' + (page === 'Synchro' || compte == null ? 'disabled' : '')" @click="toavatar">
            <img class="photo" :src="avatar && avatar.photo ? avatar.photo : personne"/>
            <span>{{avatar && avatar.label ? avatar.label : 'Avatar'}}</span>
          </div>
          <div :class="'col-4 cag ' + (page === 'Synchro' || compte == null ? 'disabled' : '')" @click="togroupe">
            {{ groupe != null ? groupe.label : 'Groupe' }}
          </div>
        </q-toolbar-title>
        <q-btn flat dense round icon="people" aria-label="Contacts"/>
        <q-btn flat dense round icon="menu" aria-label="Menu" @click="$store.commit('ui/majmenuouvert', true)"/>
      </q-toolbar>

      <q-toolbar v-if="page === 'Compte'">
        <div style="width:100vw;">
        <q-tabs v-model="tabcompte" inline-label no-caps dense>
          <q-tab name="etc" label="Etc." />
          <q-tab name="avatars" label="Avatars" />
          <q-tab name="groupes" label="Groupes" />
        </q-tabs>
        </div>
      </q-toolbar>

      <q-toolbar v-if="page === 'Avatar'">
        <div style="width:100vw;">
        <q-tabs v-model="tabavatar" inline-label no-caps dense>
          <q-tab name="etc" label="Etc." />
          <q-tab name="contacts" label="Contacts" />
          <q-tab name="secrets" label="Secrets" />
        </q-tabs>
        </div>
      </q-toolbar>

      <q-toolbar v-if="page === 'Groupe'">
        <div style="width:100vw;">
        <q-tabs v-model="tabgroupe" inline-label no-caps dense>
          <q-tab name="etc" label="Etc." />
          <q-tab name="membres" label="Membres" />
          <q-tab name="secrets" label="Secrets" />
        </q-tabs>
        </div>
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

  </q-layout>
</template>

<script>
import { useQuasar } from 'quasar'
import { computed } from 'vue'
import { useStore } from 'vuex'
import { remplacePage, onBoot, data, MODES } from '../app/modele.mjs'
import { cfg } from '../app/util.mjs'
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

export default {
  name: 'MainLayout',

  components: {
    RapportSynchro, PanelMenu, DialogueErreur, DialogueCrypto, DialogueCreationCompte, DialogueTestPing, DialogueInfoMode, DialogueInfoReseau, DialogueInfoIdb, DialogueHelp
  },

  data () {
    return {
      idbs: ['~assets/database_gris.svg', '~assets/database_vert.svg', '~assets/database_rouge.svg']
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
      if (this.page === 'Synchro' || !this.compte) return
      remplacePage('Compte')
    },

    toavatar () {
      if (this.page === 'Synchro' || !this.compte) return
      if (this.avatar) {
        remplacePage('Avatar')
        return
      }
      const la = this.compte.avatars // leurs na
      if (la.length === 1) {
        const na = la[0]
        const av = data.avatar(na.id)
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

    deconnexion () {
      data.deconnexion()
    },

    reconnexion () {
      data.reconnexion()
    },

    stop () {
      data.stopOp()
    }
  },

  setup () {
    const $q = useQuasar()
    $q.dark.set(true)
    onBoot()

    const personne = cfg().personne.default
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
    const tabgroupe = computed({
      get: () => $store.state.ui.tabgroupe,
      set: (val) => $store.commit('ui/majtabgroupe', val)
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
      tabavatar,
      tabgroupe
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

.cag
  text-align: center
  padding: 2px 0
  max-height: 1.5rem
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

.q-toolbar
  padding: 2px !important
  min-height: 0 !important

.bord
  border: 2px solid warning

.photo
  width: 24px
  height: 24px
  border-radius: 12px
  border: 1px solid grey
</style>
