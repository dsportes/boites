<template>
    <q-dialog v-model="dialogueerreur" persistent>
      <q-card class="q-ma-xs moyennelargeur">
        <q-card-section>
          <div class="titre-5">{{labels['x'+erreur.code]}}</div>
        </q-card-section>
        <q-card-section>
          <div class="msg">{{erreur.message}}</div>
        </q-card-section>
        <q-card-section v-if="erreur.conseil != null">
          <div class="msg">{{erreur.conseil}}</div>
        </q-card-section>
        <q-card-actions align="right">
          <q-btn v-for="(item, index) in erreur.options" :key="index" flat :label="item.label" :color="item.color"
          @click="fermererreur(item.code)" />
        </q-card-actions>
        <q-card-section class="q-pt-none">
          <div v-if="erreur.stack">
            Stack <q-toggle v-model="errstack"/>
            <q-input v-if="errstack" type="textarea" autogrow v-model="erreur.stack" class="q-pa-xs stackclass font-mono"/>
          </div>
        </q-card-section>
      </q-card>
    </q-dialog>
</template>

<script>
import { useStore } from 'vuex'
import { computed } from 'vue'

export default ({
  name: 'DialogueErreur',

  data () {
    return {
      errstack: false
    }
  },

  methods: {
    fermererreur (code) {
      this.$store.commit('ui/majdialogueerreur', false)
      this.erreur.resolve(code)
    }
  },

  setup () {
    /*
    exports.E_BRK = -1 // Interruption volontaire de l'opération
    exports.E_WS = -2 // Toutes erreurs de réseau
    exports.E_DB = -3 // Toutes erreurs d'accès à la base locale
    exports.E_BRO = -4 // Erreur inattendue trappée sur le browser
    exports.E_SRV = -5 // Erreur inattendue trappée sur le serveur
    exports.X_SRV = -6 // Erreur fonctionnelle trappée sur le serveur transmise en exception
    exports.F_BRO = 1 // Erreur fonctionnelle trappée sur le browser
    exports.F_SRV = 2 // Erreur fonctionnelle trappée sur le serveur transmise en résultat
    */
    const labels = {
      'x-1': 'Interruption volontaire (appui sur le bouton rouge)',
      'x-2': 'Erreur d`accès au serveur, réseau indisponible ?',
      'x-3': 'Erreur d\'accès à la base locale',
      'x-4': 'Erreur inattendue survenue dans l\'exécution sur le poste',
      'x-5': 'Erreur inattendue survenue dans le traitement sur le serveur',
      'x-6': 'Erreur fonctionnelle : données transmises au serveur non acceptables',
      x1: 'Erreur fonctionnelle : données détectées localement non admissibles',
      x2: 'Erreur fonctionnelle : données transmises au serveur non acceptables'
    }
    const $store = useStore()
    const erreur = computed(() => $store.state.ui.erreur)
    const dialogueerreur = computed({
      get: () => $store.state.ui.dialogueerreur,
      set: (val) => $store.commit('ui/majdialogueerreur', false)
    })

    return {
      erreur,
      labels,
      dialogueerreur
    }
  }
})
</script>

<style lang="sass" scoped>
@import '../css/app.sass'
.stackclass
  height: 15rem
  border: 1px solid black
  font-size: 0.8rem

.msg
  font-size: 0.9rem
</style>
