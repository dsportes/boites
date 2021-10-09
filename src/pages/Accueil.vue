<template>
  <q-page class="column align-start items-center">

    <q-btn v-if="connecte" class="q-ma-sm" color="primary" icon-right="logout" label="Se déconnecter" @click="sedeconnecter"/>

    <div v-else class="column align-start items-center">
      <q-card flat class="q-ma-xs petitelargeur">
        <q-card-section>
          <div class="titre-2">Choix du mode</div>
        </q-card-section>
      <q-card-section>
          <div class="q-gutter-sm">
            <q-radio dark dense v-model="locmode" :val="1" label="Synchronisé" />
            <q-radio dark dense v-model="locmode" :val="2" label="Incognito" />
            <q-radio dark dense v-model="locmode" :val="3" label="Avion" />
          </div>
      </q-card-section>
      </q-card>

      <q-card flat v-if="locmode != 0" class="q-ma-xs petitelargeur">
        <q-card-section>
          <div class="titre-2">Phrase secrète de connexion</div>
        </q-card-section>
        <phrase-secrete label-valider="Se connecter" icon-valider="send" v-on:ok-ps="connecteroucreer"></phrase-secrete>
      </q-card>

      <q-card flat v-if="locmode != 0" class="q-ma-xs petitelargeur">
        <q-card-section>
          <q-btn flat color="warning" icon="add_circle" label="Nouveau compte parrainé" />
          <q-btn flat color="primary" icon="add_circle" label="Nouveau compte (sans parrain)" @click="$store.commit('ui/majdialoguecreationcompte', true)"/>
        </q-card-section>
      </q-card>
    </div>

    <q-dialog v-model="erreurconnexion">
      <q-card>
        <q-card-section class="q-pa-md diag"><div v-html="diag"></div></q-card-section>
        <q-card-actions align="right">
          <q-btn flat label="J'ai lu" color="primary" v-close-popup @click="diag = null" />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <dialogue-creation-compte></dialogue-creation-compte>

  </q-page>
</template>

<script>
import { computed } from 'vue'
import { useStore } from 'vuex'
import { gp, cfg } from '../app/util'
import { connexion } from '../app/db'
import * as CONST from '../store/constantes'
import PhraseSecrete from '../components/PhraseSecrete.vue'
import DialogueCreationCompte from '../components/DialogueCreationCompte.vue'

export default ({
  name: 'Accueil',
  components: { PhraseSecrete, DialogueCreationCompte },
  data () {
    return {
      locmode: 0,
      ps: null,
      erreurconnexion: false,
      diag: ''
    }
  },

  watch: {
    // changement d'organisation directement sur l'URL
    '$route.params.org': function (neworg) {
      const x = cfg().orgs[neworg]
      if (!x) {
        this.$store.commit('ui/majorg', null)
        this.$store.commit('ui/majorgicon', cfg().logo)
        setTimeout(() => { this.$router.replace('/') }, 10)
      } else {
        this.$store.commit('ui/majorg', neworg)
        this.$store.commit('ui/majorgicon', x.icon)
      }
    },
    locmode: async function (m) {
      this.$store.commit('ui/majmode', m)
    }
  },

  methods: {
    sedeconnecter () {
    },

    async connecteroucreer (ps) {
      if (!ps) return
      const ret = await connexion(ps)
      console.log(JSON.stringify(ret))
      if (ret.status === -1) {
        this.diag = 'Erreur technique, tenter à nouveau l\'opération'
        this.erreurconnexion = true
        return
      }
      if (ret.status === 0) {
        if (this.mode !== CONST.MODE_AVION) {
          this.diag = '<p>Aucun compte n\'est enregistré sur cet appareil avec cette phrase secréte</p>'
        } else {
          this.diag = '<p>a) Aucun compte n\'est enregistré avec cette phrase secréte<br>' +
            'b) Aucun parrainage pour création de compte n\'est enregistré avec cette prase de rencontre<br>' +
            'c) Cette phrase ne permet pas non plus de créer un compte privilégié</p>'
        }
        this.erreurconnexion = true
      } else {
        switch (ret.status) {
          case 1: {
            this.compteouvert(ret)
            break
          }
          case 2: {
            this.creationpriv(ret)
            break
          }
          case 3: {
            this.creationstd(ret)
            break
          }
        }
      }
    },

    compteouvert () { // ret, args
      this.$store.commit('ui/nouveaumessage', { texte: 'Compte en cours d\'ouverture' })
      this.$store().commit('ui/majstatuslogin', true)
    },

    creationpriv () { // ret, args
      this.$store.commit('ui/nouveaumessage', { texte: 'Création d\'un nouveau compte privilégié' })
    },

    creationstd () { // ret, args
      this.$store.commit('ui/nouveaumessage', { texte: 'Création d\'un nouveau compte parrainé' })
    }

  },

  setup () {
    const $store = useStore()
    const org = computed(() => $store.state.ui.org)
    const orgicon = computed(() => $store.state.ui.orgicon)
    const connecte = computed(() => $store.state.ui.statuslogin)

    // org reçue sur l'URL, soit directement soit parce que routée par la vue Org
    const localorg = computed(() => gp().$route.params.org)

    const x = cfg().orgs[localorg.value]
    if (!x) {
      // org reçue sur l'URL non contrôlée par la vue Org et non définie. Retour à la page Org
      $store.commit('ui/majorg', null)
      $store.commit('ui/majorgicon', cfg().logo)
      setTimeout(() => { gp().$router.replace('/') }, 10)
    } else {
      // org valide
      $store.commit('ui/majorg', localorg.value)
      $store.commit('ui/majorgicon', x.icon)
    }

    return {
      org,
      orgicon,
      connecte
    }
  }

})
</script>

<style lang="sass">
@import '../css/app.sass'
.diag
  font-size: 1.1rem
  text-align: center
.rouge
  color: $warning
.petitelargeur
  width: 25rem
</style>
<style lang="sass" scoped>
::v-deep(.q-card__section)
  padding: 2px
</style>
