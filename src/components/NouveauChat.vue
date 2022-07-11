<template>
  <q-card class="petitelargeur q-pa-xs">
    <q-card-section>
      <div class="titre-lg q-mb-sm">Écrire un nouveau chat</div>
      <div class="fs-md">Nouveau statut global du chat:</div>
      <div class="q-gutter-md q-ma-sm">
        <q-radio dense v-model="st" :val="0" label="OK, résolu" />
        <q-radio dense v-model="st" :val="1" label="À traiter" />
        <q-radio dense v-model="st" :val="2" label="Urgent" />
      </div>
      <editeur-md class="q-ma-sm" texte="" v-model="texte" editable modetxt style="height:8rem"></editeur-md>
    </q-card-section>
    <q-card-actions>
      <q-btn class="q-ma-xs" dense color="primary" size="sm" label="Contacts" icon="visibility"
        @click="panelcontacts=true"/>

      <q-btn flat dense color="primary" icon="close" label="Annuler" @click="fermer"/>
      <q-btn flat dense color="warning" icon="check" label="Valider" @click="valider"/>
    </q-card-actions>
  </q-card>
</template>

<script>

import { useStore } from 'vuex'
import { ref, computed } from 'vue'
import EditeurMd from './EditeurMd.vue'
import { NouveauChat } from '../app/operations.mjs'

export default ({
  name: 'NouveauChat',
  props: { close: Function, parComptable: Boolean },
  components: { EditeurMd },
  computed: { },
  data () {
    return {
      texte: ''
    }
  },
  methods: {
    fermer () { if (this.close) this.close() },
    async valider () {
      await new NouveauChat().run(this.chat, this.st, this.parComptable, this.texte, null)
      this.fermer()
    }
  },
  setup (props) {
    const $store = useStore()
    const chat = computed(() => $store.state.db.chat)
    const panelcontacts = computed({
      get: () => $store.state.ui.panelcontacts,
      set: (val) => $store.commit('ui/majpanelcontacts', val)
    })

    const st = ref(0)
    if (chat.value) st.value = chat.value.st

    return {
      panelcontacts,
      st,
      chat
    }
  }
})
</script>

<style lang="css" scoped>
.markdown-body {
  font-family:  Calibri-Light !important;
  background-color: transparent !important;
  color: white !important;
}
@import 'github-markdown-css/github-markdown-dark.css'
</style>

<style lang="sass">
.markdown-body h1, .markdown-body h2, .markdown-body h3, .markdown-body h4, .markdown-body h5
  font-family: Comfortaa
</style>
