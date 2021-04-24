<template>
  <q-layout view="hHh lpR fFf">
    <q-header reveal elevated>
      <q-toolbar>
        <q-btn flat dense round icon="menu" aria-label="Menu" @click="toggleLeftDrawer"/>
        <q-btn flat dense round icon="check" aria-label="Test" @click="test1"/>

        <q-toolbar-title>
          <span class="font-antonio-l">Quasar App</span>
        </q-toolbar-title>

        <div>Quasar v{{ $cfg.app.version + ' - ' + $q.version }}</div>
      </q-toolbar>
    </q-header>

    <q-drawer v-model="leftDrawerOpen" side="left" overlay elevated class="bg-grey-1" >
      <q-list>
        <q-item-label
          header
          class="text-grey-8"
        >
          Essential Links
        </q-item-label>

        <EssentialLink
          v-for="link in essentialLinks"
          :key="link.title"
          v-bind="link"
        />
      </q-list>
    </q-drawer>

    <q-page-container>
      <router-view />
    </q-page-container>

    <q-footer reveal elevated class="bg-grey-8 text-white">
      <q-toolbar>
          <div>{{ $store.state.ui.textestatus }}</div>
      </q-toolbar>
    </q-footer>

    <q-dialog v-model="$store.state.ui.reqencours" seamless position="top">
      <q-card style="width: 350px">
        <q-card-section class="row items-center no-wrap">
          <div>
            <div class="text-weight-bold">Je ne veux plus attendre</div>
            <div class="text-weight-bold">J'annule ma demande</div>
          </div>
          <q-space />
          <q-spinner color="primary" size="3em" :thickness="2" />
          <q-btn flat round icon="close" @click="clicAbort" />
        </q-card-section>
      </q-card>
    </q-dialog>

    <q-dialog v-model="$store.state.ui.erreur">
      <q-card  style="width:500px;max-width:80vw;">>
        <q-card-section>
          <div class="text-h6">{{$store.state.ui.erreur.majeur}}</div>
        </q-card-section>
        <q-card-section class="q-pt-none">
          <div>Code : {{ $store.state.ui.erreur.code }}</div>
          <div v-if="$store.state.ui.erreur.message">{{ $store.state.ui.erreur.message }}</div>
          <div v-if="$store.state.ui.erreur.detail">
            Détail <q-toggle v-model="$store.state.ui.errdetail"/>
            <span v-if="$store.state.ui.errdetail">{{ $store.state.ui.erreur.detail }}</span>
          </div>
          <div v-if="erreur.stack">
            Stack <q-toggle v-model="$store.state.ui.errstack"/>
            <q-input v-if="$store.state.ui.errstack" type="textarea" v-model="$store.state.ui.erreur.stack" style="height:150px;"/>
          </div>
        </q-card-section>
        <q-card-actions align="right">
          <q-btn flat label="j'ai lu" color="primary" @click="fermerErreur" />
        </q-card-actions>
      </q-card>
    </q-dialog>

  </q-layout>
</template>

<script>
import EssentialLink from 'components/EssentialLink.vue'
import { gp, cancelRequest, testreq } from '../app/util'
import { ref, computed } from 'vue'

const linksList = [
  {
    title: 'Docs',
    caption: 'quasar.dev',
    icon: 'school',
    link: 'https://quasar.dev'
  },
  {
    title: 'Github',
    caption: 'github.com/quasarframework',
    icon: 'code',
    link: 'https://github.com/quasarframework'
  },
  {
    title: 'Discord Chat Channel',
    caption: 'chat.quasar.dev',
    icon: 'chat',
    link: 'https://chat.quasar.dev'
  },
  {
    title: 'Forum',
    caption: 'forum.quasar.dev',
    icon: 'record_voice_over',
    link: 'https://forum.quasar.dev'
  },
  {
    title: 'Twitter',
    caption: '@quasarframework',
    icon: 'rss_feed',
    link: 'https://twitter.quasar.dev'
  },
  {
    title: 'Facebook',
    caption: '@QuasarFramework',
    icon: 'public',
    link: 'https://facebook.quasar.dev'
  },
  {
    title: 'Quasar Awesome',
    caption: 'Community Quasar projects',
    icon: 'favorite',
    link: 'https://awesome.quasar.dev'
  }
]

export default ({
  name: 'MainLayout',

  components: {
    EssentialLink
  },

  methods: {
    clicAbort () {
      cancelRequest()
      this.$store.commit('ui/finreq', '')
    },
    fermerErreur () {
      this.$store.commit('ui/reseterreur')
    },
    async test1 () {
      console.log('avant ' + this.$store.state.ui.textestatus)
      await testreq(4000)
      console.log('après ' + this.$store.state.ui.textestatus)
    }
  },

  setup () {
    const leftDrawerOpen = ref(false)
    const textestatus = computed({
      get: gp().$store.state.ui.textestatus
    })

    return {
      essentialLinks: linksList,
      leftDrawerOpen,
      textestatus,
      toggleLeftDrawer () {
        leftDrawerOpen.value = !leftDrawerOpen.value
      }
    }
  }
})
</script>

<style lang="sass">
@import '../css/app.sass'

</style>
