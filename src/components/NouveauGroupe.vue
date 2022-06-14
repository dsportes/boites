<template>
  <q-card class="petitelargeur shadow-8">
    <q-card-section>
      <div class="titre-lg q-my-md">Création d'un nouveau groupe</div>
      <nom-avatar icon-valider="check" verif groupe label-valider="Valider" @ok-nom="oknom" />
      <q-separator/>
      <div v-if="nomgr">
        <div class="titre-md">Forfaits attribués</div>
        <choix-forfaits v-model="forfaits" :f1="1" :f2="1"/>
      </div>
    </q-card-section>
    <q-card-actions>
      <q-btn flat dense color="primary" icon="close" label="renoncer" @click="fermer" />
      <q-btn flat dense color="warning" :disable="!nomgr" icon="check" label="Créer le groupe" @click="creergroupe"/>
    </q-card-actions>
  </q-card>
</template>

<script>
import { CreationGroupe } from '../app/operations.mjs'
import ChoixForfaits from './ChoixForfaits.vue'
import NomAvatar from './NomAvatar.vue'
import { computed } from 'vue'
import { useStore } from 'vuex'

export default ({
  name: 'NouveauGroupe',

  props: { close: Function },

  components: { ChoixForfaits, NomAvatar },

  computed: { },

  data () {
    return {
      nomgr: '',
      forfaits: [1, 1]
    }
  },

  methods: {
    oknom (nom) { this.nomgr = nom },
    async creergroupe () {
      await new CreationGroupe().run(this.avatar, this.nomgr, this.forfaits)
      this.fermer()
    },
    fermer () { if (this.close) this.close() }
  },

  setup () {
    const $store = useStore()
    const avatar = computed(() => { return $store.state.db.avatar })
    return {
      avatar
    }
  }
})
</script>
<style lang="sass" scoped>
@import '../css/app.sass'
.bord1
  border: 1px solid $grey-5
</style>
