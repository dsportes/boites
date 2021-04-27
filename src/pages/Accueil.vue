<template>
  <q-page class="column align-start items-center">

    <q-btn v-if="modeorgfixes" flat color="info" class="q-ma-sm" icon="edit" label="Changer le mode et/ou l'organisation" @click="changermo"/>

    <q-btn v-if="connecte" class="q-ma-sm" color="primary" icon-right="logout" label="Se déconnecter" @click="sedeconnecter"/>

    <q-btn v-if="modeorgfixes" size="xl" class="q-ma-sm" color="primary" icon="login" label="Se connecter" @click="seconnecter"/>

    <q-btn class="q-ma-sm" color="warning" icon="fiber_new" label="Créer un compte" @click="creercompte"/>

    <q-dialog v-model="nonconnecte">
      <q-card>
        <q-card-section>
          <div class="text-h6">Choix du mode et de l'organisation</div>
        </q-card-section>
        <q-card-section>
          <div class="q-gutter-sm">
            <q-radio dense v-model="locmode" :val="1" label="Synchronisé" />
            <q-radio dense v-model="locmode" :val="2" label="Incognito" />
            <q-radio dense v-model="locmode" :val="3" label="Avion" />
          </div>
        </q-card-section>
        <q-card-section>
          <q-input outlined v-model="locorg" label="Code de l'organisation" />
        </q-card-section>
        <q-card-section>
          <div class="text-body-2 text-negative">{{ diag }}</div>
        </q-card-section>
        <q-card-actions align="right">
          <q-btn flat label="OK" color="primary" @click="fixemodeorg" />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </q-page>
</template>

<script>
import { computed } from 'vue'
import { useStore } from 'vuex'
import { gp, orgicon } from '../app/util'
import * as CONST from '../store/constantes'

const orginc1 = 'Organisation non reconnue par le serveur'
const orginc2 = 'Organisation inconnue sur cet appareil'
const modeinc = 'Choisir un mode : synchronisé, incognito ou avion'

export default ({
  name: 'Accueil',

  data () {
    return {
      locmode: 1,
      locorg: this.org,
      diag: '',
      orgicon: null
    }
  },

  watch: {
    // changement d'organisation
    '$route.params.org': function (neworg) {
      this.$store.commit('ui/majorg', neworg)
    }
  },

  methods: {
    async fixemodeorg () {
      let ic
      if (this.locmode === CONST.MODE_SYNC || this.locmode === CONST.MODE_INCOGNITO) {
        try {
          ic = await orgicon(this.locorg)
          if (ic.length < 4) {
            this.diag = orginc1
            return
          } else {
            if (this.locmode === CONST.MODE_SYNC) {
              localStorage.setItem(this.locorg, ic)
            }
          }
        } catch (e) {
          this.diag = orginc1
          return
        }
      } else {
        ic = localStorage.getItem(this.locorg)
        if (!ic) {
          this.diag = orginc2
          return
        }
      }
      if (this.locmode === CONST.MODE_INCONNU) {
        this.diag = modeinc
        return
      }
      console.log('statuslogin ' + this.$store.state.ui.statuslogin + ' ' + this.modeorgfixes)
      this.$store.commit('ui/majstatuslogin', CONST.LOGIN_MODEORGFIXES)
      console.log('statuslogin ' + this.$store.state.ui.statuslogin + ' ' + this.modeorgfixes)
      this.$store.commit('ui/majorgicon', ic)
      this.$store.commit('ui/majmode', this.locmode)
      this.$router.replace('/' + this.locorg)
    },
    changermo () {
      this.$store.commit('ui/majstatuslogin', CONST.LOGIN_NONCONNECTE)
      this.$store.commit('ui/majorgicon', null)
      this.$store.commit('ui/majmode', CONST.MODE_INCONNU)
      this.$router.replace('/')
      this.locorg = this.org
      this.diag = ''
      this.locmode = this.$store.state.ui.mode
      this.orgicon = null
    },
    sedeconnecter () {
    },
    seconnecter () {
    },
    creercompte () {
    }
  },

  setup () {
    const $store = useStore()
    const org = computed(() => $store.state.ui.org)
    const nonconnecte = computed(() => $store.state.ui.statuslogin === CONST.LOGIN_NONCONNECTE)
    const modeorgfixes = computed(() => $store.state.ui.statuslogin === CONST.LOGIN_MODEORGFIXES)
    const connecte = computed(() => $store.state.ui.statuslogin === CONST.LOGIN_CONNECTE)

    const x = gp().$route.params.org
    if (!x) {
      $store.commit('ui/majorg', 'anonyme')
    } else {
      if (x !== 'anonyme') $store.commit('ui/majorg', x)
    }
    return {
      org,
      nonconnecte,
      modeorgfixes,
      connecte
    }
  }

})
</script>
