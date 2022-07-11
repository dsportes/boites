<template>
  <q-card class="petitelargeur q-pa-xs">
    <q-card-section>
      <div class="titre-lg q-mb-sm">Écrire un nouveau chat</div>
      <div class="titre-md">Nouveau statut global du chat:</div>
      <div class="q-gutter-md q-mx-sm">
        <q-radio dense v-model="st" :val="0" label="OK, résolu" />
        <q-radio dense v-model="st" :val="1" label="À traiter" />
        <q-radio dense v-model="st" :val="2" label="Urgent" />
      </div>

      <editeur-md class="q-ma-sm" texte="" v-model="texte" editable modetxt style="height:8rem"></editeur-md>

      <q-expansion-item header-class="bg-secondary text-white" label="Attacher des références d'avatars">
        <div class="titre-md">1 - Copier une référence :</div>
        <div class="titre-md q-ml-sm">- Ouvrir le répertoire des contacts en appuyant sur ce bouton
          <q-btn class="q-ma-xs" dense color="primary" size="sm" label="Contacts" icon="visibility"
            @click="panelcontacts=true"/>
        </div>
        <div class="titre-md q-ml-sm">- Rechercher l'avatar souhaité et cliquer sur le bouton
          <q-icon class="qpx-sm" name="content_copy" color="primary" size="sm"/> situé à côté du nom
        </div>
        <div class="titre-md">2 - Fermer le panneau des contacts (chevron en haut à droite)
        </div>
        <div class="titre-md">3 - Coller la référence en appuyant sue ce bouton
          <q-btn class="q-ma-xs" dense color="primary" size="sm" label="Coller" icon="content_paste"
            @click="collerref"/>
        </div>
        <div><span :class="'titre-md text-italic text-bold' + (lrefs.length ? ' text-warning' : ' text-primary')">Références attachées:</span>
          <span v-if="lrefs.length===0" class="q-ml-md font-mono">(aucune)</span>
          <span class="q-ml-md font-mono" v-for="(x, idx) in lrefs" :key="idx">{{x[0]}}
            <q-btn dense color="primary" size="sm" icon="delete" @click="supref(idx)"/>
          </span>
        </div>
      </q-expansion-item>
      </q-card-section>
    <q-card-actions>
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
import { affichermessage } from '../app/util.mjs'

export default ({
  name: 'NouveauChat',
  props: { close: Function, parComptable: Boolean },
  components: { EditeurMd },
  computed: { },
  data () {
    return {
      texte: '',
      lrefs: []
    }
  },
  methods: {
    fermer () { if (this.close) this.close() },
    async valider () {
      await new NouveauChat().run(this.chat, this.st, this.parComptable, this.texte, this.lrefs)
      this.fermer()
    },
    collerref () {
      const c = this.clipboard
      if (!c) { affichermessage('Rien n\'avait été copié !'); return }
      this.lrefs.push([c.nom, c.rnd])
      this.clipboard = null
    },
    supref (idx) {
      this.lrefs.splice(idx, 1)
    }
  },
  setup (props) {
    const $store = useStore()
    const chat = computed(() => $store.state.db.chat)
    const panelcontacts = computed({
      get: () => $store.state.ui.panelcontacts,
      set: (val) => $store.commit('ui/majpanelcontacts', val)
    })
    const clipboard = computed({
      get: () => $store.state.ui.clipboard,
      set: (val) => $store.commit('ui/majclipboard', val)
    })

    const st = ref(0)
    if (chat.value) st.value = chat.value.st

    return {
      clipboard,
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
.q-item
  min-height: 0 !important
  padding: 2px !important
</style>
