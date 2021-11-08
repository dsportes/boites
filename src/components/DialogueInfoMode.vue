<template>
    <q-dialog v-model="infomode">
      <q-card class="q-ma-xs moyennelargeur">
        <q-card-section>
          <div class="titre-2">Les modes inconnu, synchronisé, incognito, avion, visio</div>
          <div v-if="sessionId != null" class="titre-3">{{'Une session est en cours (#' + sessionId + ')'}})</div>
          <div v-if="sessionId != null && mode !== 0 && mode !== modeInitial" class="titre-5 bg-warning">{{msgdegrade()}}</div>
        </q-card-section>

        <q-card-section>
          <q-icon size="md" name="info"/>
          <span :class="(mode === 0 ? 'text-bold text-primary ' : '') + 'titre-2 q-px-sm'">Inconnu :</span>
          <span :class="mode === 0 ? 'text-bold text-primary' : ''">
            Le mode n'a pas encore été choisi.
          </span>
        </q-card-section>
        <q-card-section>
          <q-icon size="md" name="autorenew"/>
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
        <q-card-section>
          <q-icon name="visibility" size="md" color="warning"/>
          <span :class="(mode === 4 ? 'text-bold text-primary ' : '') + 'titre-2 q-px-sm'">Visio :</span>
          <span :class="mode === 4 ? 'text-bold text-primary' : ''">
            Mode dégradé d'un des précédents : suite à une erreur réseau ou d'accès à la base locale,
            l'application ne peut visualiser que les données mais pas les mettre à jour.
            On peut tenter de revenir au mode initial par une "reconnexion" (ou se déconnecter).
          </span>
        </q-card-section>
        <q-card-actions  v-if="sessionId != null" align="left">
          <q-btn dense size="md" color="warning"
            icon="logout" label="Déconnexion du compte" @click="deconnexion" v-close-popup/>
          <q-btn v-if="mode != 0 && mode != modeInitial" dense size="md" color="warning"
            icon="logout" label="Tentative de reconnexion au compte" @click="reconnexion" v-close-popup/>
          <q-btn v-if="mode != 0 && mode != modeInitial" dense size="md" color="primary"
            label="Poursuivre la session dans le mode actuel" v-close-popup/>
        </q-card-actions>
        <q-card-actions align="right">
          <q-btn flat label="J'ai lu" color="primary" v-close-popup />
        </q-card-actions>
      </q-card>
    </q-dialog>
</template>

<script>
import { useStore } from 'vuex'
import { computed } from 'vue'
import { MODES, data } from '../app/modele'

export default ({
  name: 'DialogueInfoMode',

  data () {
    return {
    }
  },

  methods: {
    deconnexion () {
      data.deconnexion()
    },

    reconnexion () {
      data.reconnexion()
    }
  },

  setup () {
    const $store = useStore()
    const sessionId = computed(() => $store.state.ui.sessionId)
    const mode = computed(() => $store.state.ui.mode)
    const modeInitial = computed(() => $store.state.ui.modeinitial)
    const infomode = computed({
      get: () => $store.state.ui.infomode,
      set: (val) => $store.commit('ui/majinfomode', val)
    })
    function msgdegrade () {
      return 'Un incident (réseau, accès à la base locale, interruption d\'une opération de connexion) a conduit à dégrader le mode de "' +
      MODES[this.modeInitial] + '" à "' + MODES[this.mode] + '". Possibilité d\'actions : conserver le mode actuel, se reconnecter, se déconnecter.'
    }

    return {
      sessionId,
      mode,
      modeInitial,
      infomode,
      msgdegrade
    }
  }
})
</script>

<style lang="sass" scoped>
@import '../css/app.sass'
</style>
