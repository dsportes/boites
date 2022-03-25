<template>
    <q-dialog v-model="infomode">
      <q-card class="q-ma-xs petitelargeur fs-md">
        <q-card-section>
          <div class="titre-lg text-center">Les modes inconnu, synchronisé, incognito, avion, visio</div>
          <div v-if="sessionok" class="titre-md">{{'Une session est en cours (#' + sessionId + ')'}}</div>
          <div v-if="sessionId != null && mode !== 0 && mode !== modeInitial" class="bg-negative">{{msgdegrade()}}</div>
        </q-card-section>
        <q-card-actions  v-if="sessionok && mode != 0 && mode != modeInitial" align="center">
          <q-btn dense size="md" color="warning" class="q-ma-xs"
            icon="autorenew" label="Tenter de reconnecter le compte" @click="reconnexion" v-close-popup/>
          <q-btn dense size="md" color="primary" class="q-ma-xs"
            icon="done" label="Continuer dans le mode actuel" v-close-popup/>
        </q-card-actions>

        <q-card-section>
          <q-icon size="md" name="info"/>
          <span :class="(mode === 0 ? 'text-bold text-primary ' : '') + 'titre-lg q-px-sm'">Inconnu :</span>
          <span :class="mode === 0 ? 'texte1' : 'texte2'">
            Le mode n'a pas encore été choisi.
          </span>
        </q-card-section>
        <q-card-section>
          <q-icon size="md" name="autorenew"/>
          <span :class="(mode === 1 ? 'text-bold text-primary ' : '') + 'titre-lg q-px-sm'">Synchronisé :</span>
          <span :class="mode === 1 ? 'texte1' : 'texte2'">
            L'application accède au serveur central pour obtenir les données et les synchronise sur un stockage local crypté.
          </span>
        </q-card-section>
        <q-card-section>
          <q-avatar round size="md"><img src="~assets/incognito_blanc.svg"></q-avatar>
          <span :class="(mode === 2 ? 'text-bold text-primary ' : '') + 'titre-lg q-px-sm'">Incognito :</span>
          <span :class="mode === 2 ? 'texte1' : 'texte2'">
            L'application accède au serveur central pour obtenir les données mais n'accède pas au stockage local et n'y laisse pas de trace d'exécution.
          </span>
        </q-card-section>
        <q-card-section>
          <q-icon size="md" name="airplanemode_active"/>
          <span :class="(mode === 3 ? 'text-bold text-primary ' : '') + 'titre-lg q-px-sm'">Avion :</span>
          <span :class="mode === 3 ? 'texte1' : 'texte2'">
            L'application n'accède pas au réseau, elle obtient ses données depuis le stockage local crypté où elles ont été mises à jour lors de la dernière session en mode synchronisé.
          </span>
        </q-card-section>
        <q-card-section>
          <q-icon name="visibility" size="md" color="warning"/>
          <span :class="(mode === 4 ? 'text-bold text-primary ' : '') + 'titre-lg q-px-sm'">Visio :</span>
          <span :class="mode === 4 ? 'texte1' : 'texte2'">
            Mode dégradé suite à une erreur réseau ou d'accès à la base locale :
            l'application ne peut que visualiser que les données mais pas les mettre à jour.
          </span>
        </q-card-section>
        <q-card-actions align="right">
          <q-btn flat label="J'ai lu" color="primary" v-close-popup />
        </q-card-actions>
      </q-card>
    </q-dialog>
</template>

<script>
import { useStore } from 'vuex'
import { computed } from 'vue'
import { MODES, data } from '../app/modele.mjs'
import { reconnexion } from '../app/operations.mjs'

export default ({
  name: 'DialogueInfoMode',

  data () {
    return {
    }
  },

  methods: {
    async deconnexion () { await data.deconnexion() },
    async reconnexion () { await reconnexion() }
  },

  setup () {
    const $store = useStore()
    const sessionok = computed(() => $store.state.ui.sessionok)
    const sessionId = computed(() => $store.state.ui.sessionid)
    const mode = computed(() => $store.state.ui.mode)
    const modeInitial = computed(() => $store.state.ui.modeinitial)
    const infomode = computed({
      get: () => $store.state.ui.infomode,
      set: (val) => $store.commit('ui/majinfomode', val)
    })
    function msgdegrade () {
      return 'Suite à un incident réseau ou d\'accès à la base locale, le mode a été dégradé de "' +
      MODES[data.modeInitial] + '" à "' + MODES[data.mode] + '".'
    }

    return {
      sessionok,
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
.texte1
  font-size: 0.9rem
  font-weight: bold
  color: $primary

.texte2
  font-size: 0.8rem
</style>
