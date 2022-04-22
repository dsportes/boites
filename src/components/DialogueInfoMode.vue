<template>
    <q-dialog v-model="infomode">
      <q-card class="moyennelargeur fs-md">
        <q-toolbar>
          <q-toolbar-title>
            <div class="titre-md">Modes synchronisé, incognito, avion ...</div>
          </q-toolbar-title>
          <q-btn icon="close" dense size="sm" color="primary" v-close-popup />
        </q-toolbar>

        <q-card-section class="column justify-center">
          <div v-if="sessionok" class="titre-md">{{'Une session est en cours (#' + sessionId + ')'}}</div>
          <div v-if="sessionId != null && mode !== 0 && mode !== modeInitial" class="bg-negative">{{msgdegrade()}}</div>
          <q-btn v-if="sessionok && mode != 0 && mode != modeInitial" dense size="md" color="warning" class="q-ma-xs"
            icon="autorenew" label="Tenter de reconnecter le compte" @click="reconnexion" v-close-popup/>
          <q-btn v-if="sessionok && mode != 0 && mode != modeInitial" dense size="md" color="primary" class="q-ma-xs"
            icon="done" label="Continuer dans le mode actuel" v-close-popup/>
        </q-card-section>

        <q-expansion-item group="etc" class="col" switch-toggle-side default-opened
          header-class="expansion-header-class-1 titre-md bg-primary text-white" label="A propos">
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
        </q-expansion-item>
        <q-separator/>

        <q-expansion-item group="etc" class="col" switch-toggle-side :disable="dlattente.length===0"
          header-class="expansion-header-class-1 titre-md bg-secondary text-white">
          <template v-slot:header>
            <q-item-section>
              <div class="titre-lg text-bold">Téléchargements en cours : {{dlattente.length}}</div>
            </q-item-section>
          </template>
          <q-card-section v-for="f in s.la" :key="f.id" class="ma-qcard-section">
            <div class="row justify-between items-center">
              <div class="col">
                <span class="font-mono fs-md">{{Sid(f.id)}}</span>
                <span :class="'text-bold q-px-lg ' + (f.courant?'text-warning':'')" >{{f.nom + '#' + f.info}}</span>
                <span class="font-mono fs-md">{{edvol(f.lg)}}</span>
              </div>
              <div class="col-auto">
                <span class="font-mono fs-sm q-ml-sm">{{dhstring(f.dhd)}}</span>
              </div>
            </div>
          </q-card-section>
        </q-expansion-item>
        <q-separator/>

        <q-expansion-item group="etc" class="col" switch-toggle-side :disable="dlechecs.length===0"
          header-class="expansion-header-class-1 titre-md bg-secondary text-white">
          <template v-slot:header>
            <q-item-section>
              <div class="titre-lg text-bold">Téléchargements en échecs : {{dlechecs.length}}</div>
            </q-item-section>
          </template>
          <q-card-section v-for="f in s.le" :key="f.id" class="ma-qcard-section">
            <div class="row justify-between items-center">
              <div class="col">
                <span class="font-mono fs-md">{{Sid(f.id)}}</span>
                <span class="text-bold q-px-lg">{{f.nom + '#' + f.info}}</span>
                <span class="fs-md">{{edvol(f.lg)}}</span>
              </div>
              <div class="col-auto">
                <span class="font-mono fs-sm q-ml-sm">{{dhstring(f.dhd)}}</span>
                <q-btn dense flat size="md" icon="menu">
                  <q-menu transition-show="scale" transition-hide="scale">
                    <q-list dense style="min-width: 15rem">
                      <q-item clickable v-close-popup @click="retry(f.id)">
                        <q-item-section>Ré-essayer</q-item-section>
                      </q-item>
                      <q-item clickable v-close-popup @click="abandon(f.id)">
                        <q-item-section>Rénoncer à accéder à ce fichier en mode avion</q-item-section>
                      </q-item>
                    </q-list>
                  </q-menu>
                </q-btn>
              </div>
            </div>
            <div class="row justify-between items-center q-pl-lg">
              <div class="col font-mono fs-md">{{f.err}}</div>
              <div class="col-auto font-mono fs-sm q-ml-sm">{{dhstring(f.dhx)}}</div>
            </div>
          </q-card-section>
        </q-expansion-item>

      </q-card>
    </q-dialog>
</template>

<script>
import { useStore } from 'vuex'
import { computed, reactive, watch } from 'vue'
import { MODES, data } from '../app/modele.mjs'
import { reconnexion } from '../app/operations.mjs'
import { Sid, dhstring, edvol } from '../app/util.mjs'

export default ({
  name: 'DialogueInfoMode',

  data () {
    return {
      Sid: Sid,
      edvol: edvol,
      dhstring: dhstring
    }
  },

  methods: {
    async deconnexion () { await data.deconnexion() },
    async reconnexion () { await reconnexion() },
    async retry (idf) {
      const e = data.getFetat(idf)
      await e.retry()
    },
    async abandon (idf) {
      const e = data.getFetat(idf)
      await e.abandon()
    }
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

    const dlattente = computed({ get: () => $store.state.ui.chargements })
    const dlechecs = computed({ get: () => $store.state.ui.echecs })
    const dlencours = computed({ get: () => $store.state.ui.dlencours })
    const fetats = computed({ get: () => $store.state.db.fetats })

    const s = reactive({ la: [], le: [] })

    function init () {
      s.la = []
      s.le = []
      for (const idf of dlattente.value) {
        const e = { ...data.getFetat(idf) }
        e.courant = e.id === dlencours.value
        s.la.push(e)
      }
      for (const idf of dlechecs.value) {
        const e = { ...data.getFetat(idf) }
        s.le.push(e)
      }
    }

    watch(() => dlattente.value, (ap, av) => { init() })
    watch(() => dlechecs.value, (ap, av) => { init() })
    watch(() => fetats.value, (ap, av) => { init() })
    watch(() => dlencours.value, (ap, av) => { init() })

    init()

    return {
      sessionok,
      sessionId,
      mode,
      modeInitial,
      infomode,
      msgdegrade,
      dlattente,
      dlechecs,
      dlencours,
      s
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
.ma-qcard-section
  padding: 0 !important
</style>
