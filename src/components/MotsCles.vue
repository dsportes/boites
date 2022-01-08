<template>
<q-card ref="root" class="colomn shadow-8 petitelargeur">
  <div class="q-pa-md">
    <bouton-help page="page1"/>
    <q-btn v-if="!motscles.mc.st.enedition" flat dense size="md" color="warning" label="Editer" @click="startEdit"/>
    <q-btn v-if="motscles.mc.st.enedition" dense size="md" color="primary" label="Ajouter un mot clé" @click="ajoutermc"/>
    <q-btn v-if="motscles.mc.st.enedition" flat dense size="md" color="primary" label="Annuler" @click="cancelEdit"/>
    <q-btn v-if="motscles.mc.st.enedition" :disable="!motscles.mc.st.modifie" flat dense size="md" color="warning" label="Valider" @click="okEdit"/>
  </div>
  <div v-if="ajouter" class="column q-px-sm q-pb-md" style="width:100%">
    <div class="row justify-end">
      <q-btn size="sm" icon="close" dense color="primary" label="Renoncer" @click="undo"></q-btn>
      <q-btn class="q-ml-md" size="sm" icon="check" dense color="primary" label="OK" @click="ok"></q-btn>
    </div>
    <q-input class="inp" v-model="categ" label="Catégorie" counter placeholder="Par exemple: Sections">
      <template v-slot:hint>3 à 12 lettres, première majuscule. Vide pour 'obsolète'</template>
    </q-input>
    <div id="ta"><q-input class="inp" v-model="nom" label="Nom" counter maxlength="12" placeholder="Par exemple: Ecologie">
      <template v-slot:hint>3 à 12 lettres, émoji conseillé en tête</template>
      <template v-slot:append>
        <q-btn icon="face" size="sm" dense @click="emoji=true"></q-btn>
      </template>
    </q-input></div>
   </div>
  <q-splitter v-model="splitterModel" class="col" style="width:100%">
    <template v-slot:before>
      <q-tabs v-model="tab" no-caps vertical >
        <q-tab v-for="categ in motscles.mc.lcategs" :key="categ" :name="categ" :label="categ" />
      </q-tabs>
    </template>
    <template v-slot:after>
      <q-tab-panels v-model="tab" animated swipeable vertical transition-prev="jump-up" transition-next="jump-up" >
        <q-tab-panel v-for="categ in motscles.mc.lcategs" :key="categ" :name="categ">
          <div v-for="item in motscles.mc.categs.get(categ)" :key="item[1]+item[0]" style="width:100%">
            <span class="nom">{{item[0]}}</span><span class="idx font-mono">[{{item[1]}}]</span>
            <span v-if="motscles.mc.st.enedition && item[1] < 200">
              <q-btn icon="mode_edit" size="sm" dense @click="edit(categ, item[0], item[1])"></q-btn>
              <q-btn v-if="categ === 'obsolète'" icon="close" size="sm" dense @click="suppr(categ, item[0], item[1])"></q-btn>
            </span>
          </div>
        </q-tab-panel>
      </q-tab-panels>
    </template>
  </q-splitter>
  <q-dialog v-model="emoji">
    <VuemojiPicker @emojiClick="emojiclick" data-source="emoji.json"/>
  </q-dialog>
</q-card>
</template>
<script>
import { MmcCompte } from '../app/operations'
import { useStore } from 'vuex'
import { computed, ref, toRef, onMounted, watch } from 'vue'
import { afficherdiagnostic } from '../app/util.mjs'
import { VuemojiPicker } from 'vuemoji-picker'
import BoutonHelp from './BoutonHelp.vue'

export default ({
  name: 'MotsCles',

  props: { motscles: Object },

  components: { VuemojiPicker, BoutonHelp },

  data () {
    return {
      ajouter: false,
      emoji: false,
      idx: 0,
      nom: '',
      categ: ''
    }
  },

  methods: {
    startEdit () {
      this.motscles.debutEdition()
    },
    cancelEdit () {
      this.motscles.finEdition()
    },
    ajoutermc () {
      this.idx = 0
      this.categ = ''
      this.nom = ''
      this.ajouter = true
    },
    edit (categ, nom, idx) {
      this.idx = idx
      this.categ = categ
      this.nom = nom
      this.ajouter = true
    },
    ok () {
      const nc = (this.categ ? this.categ + '/' : '') + this.nom
      const err = this.motscles.changerMC(this.idx, nc)
      if (err) {
        afficherdiagnostic(err)
      } else {
        this.ajouter = false
        this.tab = this.categ ? this.categ : 'obsolète'
      }
    },
    undo () {
      this.idx = 0
      this.categ = ''
      this.nom = ''
      this.ajouter = false
    },
    suppr (categ, nom, idx) {
      if (categ !== 'obsolète') {
        afficherdiagnostic('Seuls les mots clés obsolètes peuvent être supprimés')
        return
      }
      const err = this.motscles.changerMC(this.idx)
      if (err) {
        afficherdiagnostic(err)
      } else {
        if (this.motscles.mc.categs.has(categ)) {
          this.tab = categ
        } else {
          this.tab = this.motscles.mc.lcategs[0]
        }
      }
    },
    emojiclick (emoji) {
      const code = emoji.emoji.unicode
      const inp = this.root.querySelector('#ta').querySelector('input')
      this.nom = inp.value.substring(0, inp.selectionStart) + code + inp.value.substring(inp.selectionEnd, inp.value.length)
      this.emoji = false
    },
    async okEdit () {
      const mmc = this.motscles.finEdition()
      await new MmcCompte().run(mmc)
    }
  },

  setup (props) {
    const motscles = toRef(props, 'motscles')
    const root = ref(null)
    const tab = ref('')
    const $store = useStore()
    const compte = computed(() => $store.state.db.compte)

    onMounted(() => {
      tab.value = motscles.value.mc.lcategs[0]
    })

    watch(
      () => motscles.value,
      (ap, av) => { tab.value = motscles.value.mc.lcategs[0] }
    )

    return {
      root,
      compte,
      tab,
      splitterModel: ref(33) // start at 33%
    }
  }
})
</script>

<style lang="sass" scoped>
@import '../css/app.sass'
.idx
  font-size: 0.7rem
.nom
  font-size: 1rem
  padding-right: 1rem
.inp
  width: 80%
  max-width: 20rem
</style>
