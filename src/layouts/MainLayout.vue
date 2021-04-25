<template>
  <q-layout view="hHh lpR fFf">
    <q-header reveal elevated>
      <q-toolbar>
        <q-btn flat dense round icon="menu" aria-label="Menu" @click="toggleLeftDrawer"/>
        <q-btn flat dense round icon="check" aria-label="Test" @click="test3"/>

        <q-toolbar-title>
          <span class="font-antonio-l">{{ cfgorg.code }}</span>
        </q-toolbar-title>
      </q-toolbar>
    </q-header>

    <q-drawer v-model="leftDrawerOpen" side="left" overlay elevated class="bg-grey-1" >
      <q-list>
        <q-item-label>Quasar v{{ $cfg.app.version + ' - ' + $q.version }}</q-item-label>
        <q-item-label header class="text-grey-8" >Essential Links </q-item-label>
        <EssentialLink v-for="link in essentialLinks" :key="link.title" v-bind="link" />
      </q-list>
    </q-drawer>

    <q-page-container>
      <router-view />
    </q-page-container>

    <q-footer reveal elevated class="bg-grey-8 text-white">
      <q-toolbar>
        <q-btn flat dense round icon="folder" aria-label="Stockage local" @click="infolocal = true" :class="$store.state.ui.statuslocal ? 'colorA1': 'colorA0'"/>
        <q-btn flat dense round icon="cloud" aria-label="Accès serveur" @click="inforeseau = true" :class="'colorB' + $store.state.ui.statusreseau"/>

        <q-toolbar-title>
          <span class="text-body2">{{ $store.state.ui.textestatus }}</span>
        </q-toolbar-title>

      </q-toolbar>
    </q-footer>

    <q-dialog v-model="infolocal">
      <q-card>
        <q-card-section>
          <div class="text-h6">Stockage local</div>
        </q-card-section>
        <q-card-section v-if="$store.state.ui.statuslocal" class="q-pt-none">
          Le stockge local est activé sur cet appareil.
          Vos informations y sont conservées cryptées et sont utilisables en l'absence de réseau.
        </q-card-section>
        <q-card-section v-else class="q-pt-none">
          Le stockage local est n'est pas activé sur cet appareil.
          Aucune de vos informations n'y sont enregistrées.
          L'accès au réseau est requis.
        </q-card-section>
        <q-card-actions align="right">
          <q-btn flat label="J'ai lu" color="primary" v-close-popup />
        </q-card-actions>
      </q-card>
    </q-dialog>

  <q-dialog v-model="inforeseau">
      <q-card>
        <q-card-section>
          <div class="text-h6">Accès au réseau</div>
        </q-card-section>
        <q-card-section v-if="$store.state.ui.statusreseau === 0" class="q-pt-none">
          L'application fonctionne en local pur sans accéder au réseau.
          Vos informations ne sont pas toutes visibles, seulement celles que vous avez décidé de synchroniser sur le stockage local.
          Les mises à jour sont restreintes et ne seront appliquer qu'une fois l'accès au réseau autorisé.
        </q-card-section>
        <q-card-section v-if="$store.state.ui.statusreseau === 1" class="q-pt-none">
          L'application accède par le réseau aux données sur le serveur.
        </q-card-section>
        <q-card-section v-if="$store.state.ui.statusreseau === 2" class="q-pt-none">
          L'application accède par le réseau aux données sur le serveur.
          Toutefois la dernière requête a rencontré un incident.
        </q-card-section>
        <q-card-actions align="right">
          <q-btn v-if="$store.state.ui.statusreseau === 2" flat label="Voir la dernière erreur" color="accent" v-close-popup @click="voirderniereerreur"/>
          <q-btn flat label="J'ai lu" color="primary" v-close-popup />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <q-dialog v-model="reqencours" seamless position="bottom">
      <q-card style="width:15rem;height:3rem;overflow:hidden" class="row items-center justify-between no-wrap bg-amber-2 q-pa-sm">
          <div class="text-weight-bold">Annuler la requête</div>
          <q-spinner color="primary" size="2rem" :thickness="3" />
          <q-btn flat round icon="stop" class="text-red" @click="clicAbort" />
      </q-card>
    </q-dialog>

    <q-dialog v-model="enerreur">
      <q-card  style="width:500px;max-width:80vw;">
        <q-card-section>
          <div class="text-h6">{{erreur.majeur}}</div>
        </q-card-section>
        <q-card-section class="q-pt-none">
          <div>Code : {{ erreur.code }}</div>
          <div v-if="erreur.message">{{ erreur.message }}</div>
          <div v-if="erreur.detail">
            Détail <q-toggle v-model="errdetail"/>
            <div v-if="errdetail">{{ erreur.detail }}</div>
          </div>
          <div v-if="erreur.stack">
            Stack <q-toggle v-model="errstack"/>
            <q-input v-if="errstack" type="textarea" v-model="erreur.stack" style="height:150px;"/>
          </div>
        </q-card-section>
        <q-card-actions align="right">
          <q-btn flat label="J'ai lu" color="primary" @click="fermererreur" />
        </q-card-actions>
      </q-card>
    </q-dialog>

  </q-layout>
</template>

<script>
import EssentialLink from 'components/EssentialLink.vue'
import { gp, cancelRequest, testreq, ping, post } from '../app/util'
import { ref, computed } from 'vue'
import { useStore } from 'vuex'

const linksList = [
  { title: 'Docs', caption: 'quasar.dev', icon: 'school', link: 'https://quasar.dev' },
  { title: 'Github', caption: 'github.com/quasarframework', icon: 'code', link: 'https://github.com/quasarframework' }
]

export default ({
  name: 'MainLayout',

  components: {
    EssentialLink
  },

  data () {
    return {
      infolocal: false,
      inforeseau: false,
      errdetail: false,
      errstack: false
    }
  },

  methods: {
    clicAbort () {
      cancelRequest()
    },
    fermererreur () {
      this.errstack = false
      this.errdetail = false
      this.$store.commit('ui/reseterreur')
    },
    voirderniereerreur () {
      const x = this.derniereerreur
      this.$store.commit('ui/seterreur', x)
    },
    async test1 () {
      console.log('avant ' + this.$store.state.ui.textestatus)
      await testreq(4000)
      console.log('après ' + this.$store.state.ui.textestatus)
    },
    async ping () {
      const r = await ping()
      console.log('ping ' + r)
    },
    async test2 () {
      try {
        const r = await post('m1', 'echo', { a: 1, b: 'toto' }, 'test2')
        console.log('test2ok ' + JSON.stringify(r))
      } catch (e) {
        console.log('test2ko ' + JSON.stringify(e))
      }
    },
    async test3 () {
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
    const leftDrawerOpen = ref(false)
    const textestatus = computed({
      get: () => $store.state.ui.textestatus
    })
    const org = gp().$route.params.org
    $store.commit('ui/setcfgorg', gp().$cfg[org])
    const cfgorg = computed({
      get: () => $store.state.ui.cfgorg
    })
    const reqencours = computed({
      get: () => $store.state.ui.reqencours
    })
    const erreur = computed({
      get: () => $store.state.ui.erreur
    })
    const enerreur = computed({
      get: () => $store.state.ui.erreur != null
    })
    const derniereerreur = computed({
      get: () => $store.state.ui.derniereerreur
    })

    return {
      essentialLinks: linksList,
      leftDrawerOpen,
      textestatus,
      cfgorg,
      reqencours,
      erreur,
      enerreur,
      derniereerreur,
      toggleLeftDrawer () {
        leftDrawerOpen.value = !leftDrawerOpen.value
      }
    }
  }
})
</script>

<style lang="sass">
@import '../css/app.sass'

.colorA0
  color: $grey-5
.colorA1
  color: $green
.colorB0
  color: $grey-5
.colorB1
  color: $green
.colorB2
  color: $red
</style>
