<template>
<q-page>
  <q-card v-if="tabcompte === 'avatars' && compte" class="column align-start items-start">
    <div v-for="e in compte.mac" :key="e.na.id" class="full-width">
      <apercu-avatar page editer :avatar-id="e.na.id"/>
    </div>
  </q-card>

  <q-card v-if="tabcompte === 'etc' && compte" class="column align-start items-start q-pa-xs">
    <q-list bordered class="full-width">
      <q-expansion-item group="etc" label="Identité" default-opened header-class="titre-2 bg-secondary text-white">
        <div class="titre q-my-md"><span>Code du compte : {{compte.sid}}</span><bouton-help page="page1"/></div>
        <div style="width:100%">
          <editeur-md ref="memoed" :texte="compte.memo" :sid="compte.sid" taille-m editable label-ok="OK" v-on:ok="memook"></editeur-md>
        </div>
      </q-expansion-item>
      <q-expansion-item group="etc" label="Mots clés" header-class="titre-2 bg-secondary text-white">
        <mots-cles :motscles="motscles"></mots-cles>
      </q-expansion-item>
    </q-list>
  </q-card>
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

<style lang="sass">
@import '../css/app.sass'
</style>
