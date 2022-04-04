<template>
  <q-menu transition-show="scale" transition-hide="scale">
    <q-list dense style="min-width: 10rem">
      <q-item v-if="c" clickable v-close-popup @click="detail">
        <q-item-section>Détail et édition du couple</q-item-section>
      </q-item>
      <q-item v-if="!c" clickable v-close-popup @click="liste">
        <q-item-section>Liste des couples</q-item-section>
      </q-item>
      <q-separator />
      <q-item v-if="invitationattente" clickable v-close-popup @click="copier">
        <q-item-section class="titre-lg text-bold text-grey-8 bg-yellow-4 q-mx-sm text-center">[Contact !]</q-item-section>
      </q-item>
      <q-separator v-if="invitationattente"/>
      <q-item clickable v-close-popup @click="prolonger">
        <q-item-section>Prolonger la proposition faite à {{nom}}</q-item-section>
      </q-item>
      <q-separator />
      <q-item clickable v-close-popup @click="supprimer">
        <q-item-section>Supprimer le couple</q-item-section>
      </q-item>
      <q-separator />
      <q-item clickable v-close-popup @click="quitter">
        <q-item-section>Quitter le couple</q-item-section>
      </q-item>
      <q-separator />
      <q-item clickable v-close-popup @click="relancer">
        <q-item-section>Relancer une proposition pour {{nom}}</q-item-section>
      </q-item>
      <q-separator />
      <q-item clickable v-close-popup @click="voirsecrets">
        <q-item-section>Voir les secrets partagés</q-item-section>
      </q-item>
      <q-separator />
      <q-item clickable v-close-popup @click="nouveausecret">
        <q-item-section>Nouveau secret partagé</q-item-section>
      </q-item>
    </q-list>
  </q-menu>
</template>
<script>
import { computed } from 'vue'
import { useStore } from 'vuex'
import { retourInvitation } from '../app/page.mjs'

export default ({
  name: 'MenuCouple',
  components: { },
  props: { c: Object },
  computed: {
    nom () { const x = this.c ? this.c : this.couple; return x.nomE }
  },

  data () {
    return {
    }
  },

  methods: {
    detail () {
      if (this.c) this.couple = this.c
      this.avatarcpform = true
    },

    liste () {
      this.avatarcpform = false
    },

    voirsecrets () {
      if (this.c) this.couple = this.c
      this.evtfiltresecrets = { cmd: 'fs', arg: this.c ? this.c : this.couple }
    },

    nouveausecret () {
      if (this.c) this.couple = this.c
      this.evtfiltresecrets = { cmd: 'nv', arg: this.c ? this.c : this.couple }
    },

    copier () {
      retourInvitation(this.c ? this.c : this.couple)
    },

    prolonger () { },
    quitter () {},
    supprimer () {},
    relancer () {}
  },
  setup (props) {
    const $store = useStore()
    const avatarcpform = computed({
      get: () => $store.state.ui.avatarcpform,
      set: (val) => $store.commit('ui/majavatarcpform', val)
    })
    const invitationattente = computed({
      get: () => $store.state.ui.invitationattente,
      set: (val) => $store.commit('ui/majinvitationattente', val)
    })
    const evtfiltresecrets = computed({ // secret courant
      get: () => $store.state.ui.evtfiltresecrets,
      set: (val) => $store.commit('ui/majevtfiltresecrets', val)
    })
    const couple = computed({ // couple courant
      get: () => $store.state.db.couple,
      set: (val) => $store.commit('db/majcouple', val)
    })

    return {
      couple,
      avatarcpform,
      evtfiltresecrets,
      invitationattente
    }
  }
})
</script>
<style lang="sass" scoped>
@import '../css/app.sass'
.q-list
  border: 3px solid $grey !important
</style>
