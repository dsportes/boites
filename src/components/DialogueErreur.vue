<template>
    <q-dialog v-model="enerreur">
      <q-card class="q-ma-xs moyennelargeur">
        <q-card-section>
          <div class="titre-2">{{erreur.majeur}}</div>
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
            <q-input v-if="errstack" type="textarea" v-model="erreur.stack" class="stackclass"/>
          </div>
        </q-card-section>
        <q-card-actions align="right">
          <q-btn flat label="J'ai lu" color="primary" @click="fermererreur" />
        </q-card-actions>
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
      errdetail: false,
      errstack: false
    }
  },

  methods: {
    fermererreur () {
      this.errstack = false
      this.errdetail = false
      this.$store.commit('ui/razerreur')
    }
  },

  setup () {
    const $store = useStore()
    const erreur = computed(() => $store.state.ui.erreur)
    const enerreur = computed(() => $store.getters['ui/enerreur'])

    return {
      erreur,
      enerreur
    }
  }
})
</script>

<style lang="sass" scoped>
@import '../css/app.sass'
.stackclass
  height: 15rem
  border: 1px solid black
</style>
