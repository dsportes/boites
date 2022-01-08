<template>
<q-page class="fs-md q-pa-xs">
  <div v-if="tabcompte === 'avatars' && compte" class="row justify-evenly">
    <div v-for="e in compte.mac" :key="e.na.id" style="width:25rem">
      <apercu-avatar page editer selectionner :avatar-id="e.na.id"/>
    </div>
  </div>

  <div v-if="tabcompte === 'etc' && compte">
    <q-list class="full-width">
      <q-expansion-item label="Identité, mémo du compte" default-opened
        header-class="expansion-header-class-1 titre-lg bg-secondary text-white">
        <div class="q-pa-sm column justify-center petitelargeur maauto">
          <div class="row justify-between items-center q-my-md"><span class="titre-md ">Code du compte : {{compte.sid}}</span><bouton-help page="page1"/></div>
          <editeur-md ref="memoed" style="height:10rem" :texte="compte.memo" :sid="compte.sid" editable label-ok="OK" v-on:ok="memook"></editeur-md>
        </div>
      </q-expansion-item>
      <q-expansion-item class="q-mt-xs" label="Mots clés"
        header-class="expansion-header-class-1 titre-lg bg-secondary text-white">
        <div class="fake"><mots-cles class="petitelargeur maauto" :motscles="motscles"></mots-cles></div>
      </q-expansion-item>
    </q-list>
  </div>
</q-page>
</template>

<script>
import { MemoCompte } from '../app/operations.mjs'
import { computed, ref, reactive, /* onMounted, */ watch } from 'vue'
import { useStore } from 'vuex'
import { onBoot } from '../app/page.mjs'
import EditeurMd from '../components/EditeurMd.vue'
import BoutonHelp from '../components/BoutonHelp.vue'
import MotsCles from '../components/MotsCles.vue'
import ApercuAvatar from '../components/ApercuAvatar.vue'
import { Motscles } from '../app/util.mjs'

export default ({
  name: 'Compte',
  components: { EditeurMd, BoutonHelp, MotsCles, ApercuAvatar },
  data () {
    return {
      u8mc: new Uint8Array([200, 202, 1, 203, 2]),
      court: false,
      selecteur: false
    }
  },

  methods: {
    closeSel () {
      this.selecteur = false
    },
    mcclick (args) {
      console.log('mcclick', JSON.stringify(args))
      this.selecteur = true
    },
    async memook (m) {
      this.memoed.undo()
      await new MemoCompte().run(m)
    },
    selection (u8) {
      this.u8mc = u8
    }
  },

  setup () {
    const memoed = ref(null)
    onBoot()
    const $store = useStore()
    const org = computed(() => $store.state.ui.org)
    // En déconnexion, compte passe à null et provoque un problème dans la page. Un getter ne marche pas ?!
    const compte = computed(() => $store.state.db.compte)
    const tabcompte = computed(() => $store.state.ui.tabcompte)
    const cvs = computed(() => $store.state.db.cvs)
    const mode = computed(() => $store.state.ui.mode)

    const mc = reactive({ categs: new Map(), lcategs: [], st: { enedition: false, modifie: false } })
    const motscles = new Motscles(mc, 1)
    motscles.recharger()

    // onMounted(() => { console.log('onMounted Compte: ' + motscles.mapAll.size) })

    watch(
      () => compte.value, // OUI .value !!!
      (ap, av) => {
        if (ap && ap.v > av.v) {
          motscles.recharger()
          console.log('watch compte Compte: ' + motscles.mapAll.size)
        }
      }
    )

    return {
      motscles,
      memoed,
      org,
      compte,
      mode,
      cvs,
      tabcompte
    }
  }

})
</script>

<style lang="sass" scoped>
@import '../css/app.sass'
</style>
