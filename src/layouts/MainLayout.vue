<template>
  <q-layout view="hHh lpR fFf">
    <q-header reveal elevated>
      <q-toolbar>
        <q-toolbar-title>
          <span :class="compte == null ? 'cursor-pointer' : 'no-pointer-events'" @click="toorg">
            <q-avatar round size="sm">
              <img :src="orgicon">
            </q-avatar>
            <span :class="orglabelclass">{{ orglabel }}</span>
            <q-tooltip>Changer d'organisation</q-tooltip>
          </span>
          <span v-if="org != null && compte == null && page === 'Login'" class="q-px-sm"  @click="login">Connexion ...</span>
          <span v-if="org != null && compte != null" class="labeltitre q-px-sm">{{ compte.titre }}</span>
        </q-toolbar-title>

        <q-btn v-if="org != null && compte != null" dense size="md" color="warning" icon="logout" @click="logout">
          <q-tooltip>Déconnexion du compte</q-tooltip>
        </q-btn>

        <div class="cursor-pointer q-px-xs" @click="infoidb = true">
          <q-avatar v-if="mode === 0 || mode === 2 || !compte" round size="md">
              <img src="~assets/database_gris.svg">
          </q-avatar>
          <div v-else>
            <q-avatar v-if="modeleactif" round size="md">
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
              <q-avatar v-if="modeleactif" round color="green" size="md"/>
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
          <span v-if="page === 'Synchro'" class="q-px-xs">Chargement / Synchronisation</span>
          <q-btn v-if="page === 'Synchro'" dense size="md" color="warning" icon="stop" @click="confirmstopchargement = true">
            <q-tooltip>Interrompre le chargement des données</q-tooltip>
          </q-btn>
          <span v-if="page !== 'Synchro' && compte != null" class="cursor-pointer q-px-xs" @click="tocompte">Synthèse</span>
          <q-icon v-if="page !== 'Synchro' && (avatar != null || groupe != null)" class="q-px-xs" size="md" name="label_important"/>
          <q-avatar v-if="page !== 'Synchro' && avatar != null" round size="md">
            <img v-if="avatar.icone.length !== 0" :src="avatar.icone">
            <q-icon v-else size="md" name="face"/>
          </q-avatar>
          <q-avatar v-if="page !== 'Synchro' && groupe != null" round size="md">
            <img v-if="groupe.icone.length !== 0" :src="groupe.icone">
            <q-icon v-else size="md" name="group"/>
          </q-avatar>
          <span v-if="page !== 'Synchro' && avatar != null">{{avatar.label}}</span>
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
    <dialogue-test-ping></dialogue-test-ping>

    <q-dialog v-model="infomode">
      <q-card>
        <q-card-section>
          <div class="titre-2">Les modes inconnu, synchronisé, incognito, avion</div>
        </q-card-section>
        <q-card-section>
          <q-icon size="md" name="info"/>
          <span :class="(mode === 0 ? 'text-bold text-primary ' : '') + 'titre-2 q-px-sm'">Inconnu :</span>
          <span :class="mode === 0 ? 'text-bold text-primary' : ''">
            Le mode n'a pas encore été choisi.
          </span>
        </q-card-section>
        <q-card-section>
          <q-icon size="md" name="sync_alt"/>
          <span :class="(mode === 1 ? 'text-bold text-primary ' : '') + 'titre-2 q-px-sm'">Synchronisé :</span>
          <span :class="mode === 1 ? 'text-bold text-primary' : ''">
            L'application accède au serveur central pour obtenir les données et les synchronise sur un stockage local crypté.
          </span>
        </q-card-section>
        <q-card-section>
          <q-avatar round size="md"><img src="~assets/incognito_blanc.svg"></q-avatar>
          <span :class="(mode === 2 ? 'text-bold text-primary ' : '') + 'titre-2 q-px-sm'">Incognito :</span>
          <span :class="mode === 2 ? 'text-bold text-primary' : ''">
            L'application accède au serveur central pour obtenir les données mais n'accède pas au stockage local et n'y laisse pas de trace d'exécution.
          </span>
        </q-card-section>
        <q-card-section>
          <q-icon size="md" name="airplanemode_active"/>
          <span :class="(mode === 3 ? 'text-bold text-primary ' : '') + 'titre-2 q-px-sm'">Avion :</span>
          <span :class="mode === 3 ? 'text-bold text-primary' : ''">
            L'application n'accède pas au réseau, elle obtient ses données depuis le stockage local crypté où elles ont été mises à jour lors de la dernière session en mode synchronisé.
          </span>
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
        <q-card-section>
          <q-avatar round color="grey-5" size="md"/>
          <span :class="mode === 0 || mode === 3 || compte == null  ? 'text-bold text-primary' : ''">
            Le réseau et le serveur central ne sont pas accédés avant connexion à un compte ou en mode avion.
          </span>
        </q-card-section>
        <q-card-section>
          <q-icon size="md" name="autorenew"/>
          <span :class="syncencours  ? 'text-bold text-primary' : ''">
            Une phase de synchronisation avec le serveur central est en cours.
          </span>
        </q-card-section>
        <q-card-section>
          <q-avatar round color="green" size="md"/>
          <span :class="compte != null && (mode === 1 || mode === 2) && modelactif  ? 'text-bold text-primary' : ''">
            Les échanges / synchronisations avec le serveur sont opérationnels.
          </span>
        </q-card-section>
        <q-card-section>
          <q-icon name="visibility" size="md" color="warning"/>
          <span :class="compte != null && (mode === 1 || mode === 2) && !modelactif  ? 'text-bold text-primary' : ''">
            Les échanges / synchronisations avec le serveur ont été interrompus :
            les opérations de mise à jour sont interdites jusqu'à ce que la session ait été resynchronisée.
          </span>
        </q-card-section>
        <q-card-actions align="left">
          <q-btn v-if="(mode === 1 || mode === 2) && !modelactif" dense size="md" color="warning"
            icon="logout" label="Déconnexion du compte" @click="logout" v-close-popup/>
          <q-btn v-if="(mode === 1 || mode === 2) && !modelactif" dense size="md" color="Primary"
            icon="logout" label="Tentativee de reconnexion au compte" @click="reconnexion" v-close-popup/>
          <q-btn v-if="(mode === 1 || mode === 2) && !modelactif" dense size="md" color="Primary"
            icon="logout" label="Tests d'accès à la base et au serveur" @click="dialoguetestping = true" v-close-popup/>
        </q-card-actions>
        <q-card-actions align="right">
          <q-btn flat label="J'ai lu" color="primary" v-close-popup />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <q-dialog v-model="infoidb">
      <q-card>
        <q-card-section>
          <div class="titre-2">Accès à la base locale</div>
        </q-card-section>
        <q-card-section>
          <q-avatar round size="md">
            <img src="~assets/database_gris.svg">
          </q-avatar>
          <span :class="mode == 2 || mode == 0 || compte == null ? 'text-bold text-primary' : ''">
            Il n'y a pas d'accès à la base locale avant connexion à un compte ou en mode incognito
          </span>
        </q-card-section>
        <q-card-section>
          <q-avatar round size="md">
            <img src="~assets/database_vert.svg">
          </q-avatar>
          <span :class="(mode == 1 || mode == 3) && idberreur == null && compte != null ? 'text-bold text-primary' : ''">
              La base locale est accessible : un compte est connecté en mode synchronisé ou avion
          </span>
        </q-card-section>
        <q-card-section>
          <q-avatar round size="md">
            <img src="~assets/database_rouge.svg">
          </q-avatar>
          <span :class="(mode == 1 || mode == 3) && idberreur != null && compte != null ? 'text-bold text-primary' : ''">
              Erreur d'accès à la base locale (corrompue ? détruite ?) : un compte est connecté en mode synchronisé ou avion.
              Les opérations de mise à jour sont interdites jusqu'à ce que la session ait été resynchronisée.
          </span>
        </q-card-section>
        <q-card-actions align="left">
          <q-btn v-if="(mode === 1 || mode === 2) && !modelactif" dense size="md" color="warning"
            icon="logout" label="Déconnexion du compte" @click="logout" v-close-popup/>
          <q-btn v-if="(mode === 1 || mode === 2) && !modelactif" dense size="md" color="Primary"
            icon="logout" label="Tentativee de reconnexion au compte" @click="reconnexion" v-close-popup/>
          <q-btn dense size="md" color="primary" label="Tests d'accès à la base et au serveur" @click="dialoguetestping = true" v-close-popup/>
        </q-card-actions>
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

    <q-dialog v-model="confirmstopchargement">
      <q-card>
        <q-card-section class="q-pa-md diag">
          Interrompre le chargement des données de la base locale affichera des données
          incomplètes en mode avion et allongera la synchronisation en mode synchro.
        </q-card-section>
        <q-card-actions align="right">
          <q-btn flat label="Confirmer l'interruption" color="warning" v-close-popup @click="stop"/>
          <q-btn flat label="Laisser le chargement se poursuivre" color="primary" v-close-popup/>
        </q-card-actions>
      </q-card>

    </q-dialog>

    <dialogue-creation-compte></dialogue-creation-compte>

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
import { onRuptureSession, remplacePage, onBoot, data } from '../app/modele'
import { deconnexion, reconnexion } from '../app/operations'
import DialogueCreationCompte from 'components/DialogueCreationCompte.vue'
import DialogueTestPing from 'components/DialogueTestPing.vue'

export default {
  name: 'MainLayout',

  components: {
    PanelMenu, DialogueErreur, DialogueCrypto, DialogueCreationCompte, DialogueTestPing
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
    '$route.params': function (newp, oldp) {
      console.log(JSON.stringify(newp) + ' -- ' + JSON.stringify(oldp))
    },
    */
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

    reconnexion () {
      reconnexion()
    },

    stop () {
      this.confirmstopchargement = true
      data.stopChargt = true
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
    const confirmstopchargement = computed({
      get: () => $store.state.ui.confirmstopchargement,
      set: (val) => $store.commit('ui/majconfirmstopchargement', val)
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
    const dialoguetestping = computed({
      get: () => $store.state.ui.dialoguetestping,
      set: (val) => $store.commit('ui/majdialoguetestping', val)
    })
    const org = computed({
      get: () => $store.state.ui.org,
      set: (val) => $store.commit('ui/majorg', val)
    })
    const page = computed(() => $store.state.ui.page)
    const orgicon = computed(() => $store.getters['ui/orgicon'])
    const orglabel = computed(() => $store.getters['ui/orglabel'])
    const orglabelclass = computed(() => 'font-antonio-l ' + ($store.state.ui.org == null ? 'labelorg2' : 'labelorg1'))
    const compte = computed(() => $store.state.db.compte)
    const avatar = computed(() => $store.state.db.avatar)
    const groupe = computed(() => $store.state.db.groupe)
    const mode = computed(() => $store.state.ui.mode)
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
      confirmstopchargement,
      dialoguetestping,
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
      modeleactif
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
