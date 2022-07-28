<template>
  <q-card class="petitelargeur q-pa-xs">
    <q-card-section>
      <div class="titre-lg full-width text-center q-mb-lg">Transférer un compte vers cette tribu</div>
      <div v-if="cref.na" class="titre-md">Dernier avatar copié :
        <fiche-avatar :na-avatar="cref.na" />
        <div v-if="cref.na" class="titre-md q-my-sm">Si c'est le compte souhaité souhaitée :
          <q-btn class="q-mr-sm" dense color="primary" size="md" no-caps label="cliquer ici" @click="okcompte"/>
        </div>
        <div class="titre-md">Sinon :</div>
      </div>
      <div v-else class="titre-md">Aucun avatar copiée.</div>
      <div class="titre-md q-ml-md">(1) Ouvrir le répertoire des contacts en appuyant sur ce bouton
        <q-btn class="q-ma-xs" dense color="primary" size="sm" label="Contacts" icon="visibility"
          @click="panelcontacts=true"/>
      </div>
      <div class="titre-md q-ml-md">(2) Rechercher l'avatar souhaité et cliquer sur le bouton
        <q-icon class="qpx-sm" name="content_copy" color="primary" size="sm"/> situé à côté du nom
      </div>
      <div class="titre-md q-ml-md">(3) Fermer le panneau des contacts (chevron en haut à droite)
      </div>
    </q-card-section>
    <q-card-actions>
      <q-btn flat dense color="primary" icon="close" label="Annuler" @click="fermer"/>
      <q-btn flat dense color="warning" icon="check" label="Valider" @click="valider"/>
    </q-card-actions>
  </q-card>

</template>
<script>
import { useStore } from 'vuex'
import { toRef, computed, reactive, watch } from 'vue'
import FicheAvatar from './FicheAvatar.vue'
import { NomAvatar } from '../app/util.mjs'

export default ({
  name: 'ChangerTribu',
  components: { FicheAvatar },
  props: { close: Function },

  data () {
    return {
    }
  },

  methods: {
    okcompte () {
      console.log('ok compte: ', this.cref.na.nom, this.tribu.na.nom)
    },
    valider () {
    }
  },

  setup (props) {
    const close = toRef(props, 'close')
    function fermer () { if (close.value) close.value() }

    const $store = useStore()
    const sessionok = computed(() => $store.state.ui.sessionok)
    const panelcontacts = computed({
      get: () => $store.state.ui.panelcontacts,
      set: (val) => $store.commit('ui/majpanelcontacts', val)
    })

    const tribu = computed(() => $store.state.db.tribu)
    const clipboard = computed({
      get: () => $store.state.ui.clipboard,
      set: (val) => $store.commit('ui/majclipboard', val)
    })

    function setCref () {
      const x = clipboard.value
      cref.na = x && x instanceof NomAvatar ? x : null
    }

    const cref = reactive({ na: null })
    setCref()

    watch(() => clipboard.value, (ap, av) => {
      setCref()
    })

    watch(() => sessionok.value, (ap, av) => {
      fermer()
    })

    return {
      panelcontacts,
      tribu,
      fermer,
      cref
    }
  }
})
</script>
<style lang="sass" scoped>
@import '../css/app.sass'
</style>
