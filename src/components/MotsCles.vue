<template>
<div ref="root" class='colomn' style="width:100%">
  <div class="q-pa-md">
    <q-btn v-if="!mc.st.enedition" flat dense size="md" color="warning" label="Editer" @click="startEdit"/>
    <q-btn v-if="mc.st.enedition" dense size="md" color="primary" label="Ajouter un mot clé" @click="ajoutermc"/>
    <q-btn v-if="mc.st.enedition" flat dense size="md" color="primary" label="Annuler" @click="cancelEdit"/>
    <q-btn v-if="mc.st.enedition" :disable="!mc.st.modifie" flat dense size="md" color="warning" label="Valider" @click="okEdit"/>
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
        <q-tab v-for="categ in mc.lcategs" :key="categ" :name="categ" :label="categ" />
      </q-tabs>
    </template>
    <template v-slot:after>
      <q-tab-panels v-model="tab" animated swipeable vertical transition-prev="jump-up" transition-next="jump-up" >
        <q-tab-panel v-for="categ in mc.lcategs" :key="categ" :name="categ">
          <div v-for="item in mc.categs.get(categ)" :key="item[1]+item[0]" style="width:100%">
            <span class="nom">{{item[0]}}</span><span class="idx font-mono">[{{item[1]}}]</span>
            <span v-if="mc.st.enedition && item[1] < 200">
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
</div>
</template>
<script>
import { useStore } from 'vuex'
import { computed, ref, reactive, watch, onMounted } from 'vue'
import { data, Motscles } from '../app/modele.mjs'
import { afficherdiagnostic } from '../app/util.mjs'
import { VuemojiPicker } from 'vuemoji-picker'

export default ({
  name: 'MotsCles',

  components: { VuemojiPicker },

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
        if (this.mc.categs.has(categ)) {
          this.tab = categ
        } else {
          this.tab = this.mc.lcategs[0]
        }
      }
    },
    emojiclick (emoji) {
      const code = emoji.emoji.unicode
      const inp = this.root.querySelector('#ta').querySelector('input')
      this.nom = inp.value.substring(0, inp.selectionStart) + code + inp.value.substring(inp.selectionEnd, inp.value.length)
      this.emoji = false
    },
    okEdit () {
      // simulation du retour sync de maj serveur
      const mmc = this.motscles.finEdition()
      const c = this.compte.clone
      c.mmc = mmc
      c.v++
      data.setCompte(c)
    }
  },

  setup () {
    const root = ref(null)
    const tab = ref('')
    const $store = useStore()
    const compte = computed(() => $store.state.db.compte)
    const mc = reactive({ categs: new Map(), lcategs: [], st: { enedition: false, modifie: false } })
    const motscles = new Motscles(mc, 1)

    onMounted(() => {
      motscles.recharger()
      tab.value = mc.lcategs[0]
    })

    watch(
      () => mc,
      (val, prevVal) => {
        // console.log(val.categs.size)
      },
      { deep: true }
    )

    return {
      root,
      compte,
      mc,
      motscles,
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
