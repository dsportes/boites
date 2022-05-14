<template>
<q-page class="fs-md row">
  <div v-if="sessionok" class="col-12 col-md-7 q-pa-xs">
    <q-expansion-item label="Sélectionner un des avatars du compte" default-opened
        header-class="expansion-header-class-1 titre-lg bg-primary text-white">
      <q-btn class="q-my-sm" size="md" icon="add" label="Nouvel avatar" color="primary" dense @click="ouvrirnv"/>
      <div v-for="na in state.lst" :key="na.id" class="full-width">
        <identite-cv :nom-avatar="na" type="avatar" invitable clickable @identite-click="toAvatar"/>
        <q-separator class="q-ma-sm"/>
      </div>
    </q-expansion-item>
  </div>
  <div v-if="sessionok" class="col-12 col-md-5 q-px-xs">
    <q-expansion-item label="Identité, mémo du compte" default-opened  group="groupeetc"
      header-class="expansion-header-class-1 titre-lg bg-secondary text-white">
      <div class="q-pa-sm column justify-center petitelargeur maauto">
        <div class="row justify-between items-center q-my-md"><span class="titre-md ">Code du compte : {{compte.sid}}</span><bouton-help page="page1"/></div>
        <editeur-md ref="memoed" style="height:10rem" :texte="state.memo" editable modetxt label-ok="OK" v-on:ok="memook"></editeur-md>
      </div>
    </q-expansion-item>
    <q-separator/>
    <q-expansion-item class="q-mt-xs" label="Mots clés" group="groupeetc"
      header-class="expansion-header-class-1 titre-lg bg-secondary text-white">
      <div class="fake"><mots-cles class="petitelargeur maauto" :motscles="motscles" @ok="okmc"></mots-cles></div>
    </q-expansion-item>
    <q-separator/>
    <q-expansion-item class="q-mt-xs" label="Comptabilité des volumes" group="groupeetc"
      header-class="expansion-header-class-1 titre-lg bg-secondary text-white">
      <div class="fake">
        <q-btn class="col-auto" label="Choisir un avatar ..." dense push size="md" icon="menu">
          <q-menu transition-show="scale" transition-hide="scale">
            <q-list dense style="min-width: 10rem">
              <q-item v-for="na in state.lst" :key="na.id" clickable v-close-popup @click="choixAv(na)">
                <q-item-section class="text-italic">{{na.nom}}</q-item-section>
              </q-item>
            </q-list>
          </q-menu>
        </q-btn>
        <span class="titre-md q-ml-xl">{{cpt.av}}</span>
        <div class="fullwidth">
          <div class="row items-start">
            <div class="col-5 text-right text-italic">Jour de calcul</div>
            <div class="col-7 font-mono fs-md text-center">{{cpt.x.j}}</div>
          </div>
          <div class="row items-start">
            <div class="col-5 text-right text-italic">Forfaits V1 / V2</div>
            <div class="col-3 font-mono fs-md text-center">[{{cpt.x.f1}}]  {{ed1(cpt.x.f1)}}</div>
            <div class="col-1 font-mono fs-md text-center">/</div>
            <div class="col-3 font-mono fs-md text-center">[{{cpt.x.f2}}]  {{ed2(cpt.x.f2)}}</div>
          </div>
          <div class="row items-start">
            <div class="col-5 text-right text-italic">Réserve de forfaits V1 / V2 (parrain)</div>
            <div class="col-3 font-mono fs-md text-center">[{{cpt.x.res1}}]  {{ed1(cpt.x.res1)}}</div>
            <div class="col-1 font-mono fs-md text-center">/</div>
            <div class="col-3 font-mono fs-md text-center">[{{cpt.x.res2}}]  {{ed2(cpt.x.res2)}}</div>
          </div>
          <div class="row items-start">
            <div class="col-5 text-right text-italic">Forfaits V1 / V2 attribués aux filleuls (parrain)</div>
            <div class="col-3 font-mono fs-md text-center">[{{cpt.x.t1}}]  {{ed1(cpt.x.t1)}}</div>
            <div class="col-1 font-mono fs-md text-center">/</div>
            <div class="col-3 font-mono fs-md text-center">[{{cpt.x.t2}}]  {{ed2(cpt.x.t2)}}</div>
          </div>
          <div class="row items-start">
            <div class="col-5 text-right text-italic">Forfaits V1 / v2</div>
            <div class="col-3 font-mono fs-md text-center">[{{cpt.x.f1}}]  {{ed1(cpt.x.f1)}}</div>
            <div class="col-1 font-mono fs-md text-center">/</div>
            <div class="col-3 font-mono fs-md text-center">[{{cpt.x.f2}}]  {{ed2(cpt.x.f2)}}</div>
          </div>
          <div class="row items-start">
            <div class="col-5 text-right text-italic">V1 actuel / moyenne du mois</div>
            <div class="col-3 font-mono fs-md text-center">{{ed(cpt.x.v1)}}</div>
            <div class="col-1 font-mono fs-md text-center">/</div>
            <div class="col-3 font-mono fs-md text-center">{{ed(cpt.x.v1m)}}</div>
          </div>
          <div class="row items-start">
            <div class="col-5 text-right text-italic">V2 actuel / moyenne du mois</div>
            <div class="col-3 font-mono fs-md text-center">{{ed(cpt.x.v2)}}</div>
            <div class="col-1 font-mono fs-md text-center">/</div>
            <div class="col-3 font-mono fs-md text-center">{{ed(cpt.x.v2m)}}</div>
          </div>
          <div class="row items-start">
            <div class="col-5 text-right text-italic">Moy. journalière de transfert dans le mois</div>
            <div class="col-7 font-mono fs-md text-center">{{ed(cpt.x.trm)}}</div>
          </div>
          <div class="row items-start">
            <div class="col-5 text-right text-italic">Ratio des transferts 1-14 jours / forfait v2</div>
            <div class="col-7 font-mono fs-md text-center">{{cpt.x.rtr}}%</div>
          </div>
          <div class="row items-start">
            <div class="col-5 text-right text-italic">Total transféré sur 7 jours</div>
            <div class="col-1 font-mono fs-md text-center q-pl-sm">{{ed(cpt.x.tr[0])}}</div>
            <div class="col-1 font-mono fs-md text-center">{{ed(cpt.x.tr[1])}}</div>
            <div class="col-1 font-mono fs-md text-center">{{ed(cpt.x.tr[2])}}</div>
            <div class="col-1 font-mono fs-md text-center">{{ed(cpt.x.tr[3])}}</div>
            <div class="col-1 font-mono fs-md text-center">{{ed(cpt.x.tr[4])}}</div>
            <div class="col-1 font-mono fs-md text-center">{{ed(cpt.x.tr[5])}}</div>
            <div class="col-1 font-mono fs-md text-center">{{ed(cpt.x.tr[6])}}</div>
          </div>
          <div class="row items-start">
            <div class="col-5 text-right text-italic">Total transféré sur 8-14 jours</div>
            <div class="col-1 font-mono fs-md text-center q-pl-sm">{{ed(cpt.x.tr[7])}}</div>
            <div class="col-1 font-mono fs-md text-center">{{ed(cpt.x.tr[8])}}</div>
            <div class="col-1 font-mono fs-md text-center">{{ed(cpt.x.tr[9])}}</div>
            <div class="col-1 font-mono fs-md text-center">{{ed(cpt.x.tr[10])}}</div>
            <div class="col-1 font-mono fs-md text-center">{{ed(cpt.x.tr[11])}}</div>
            <div class="col-1 font-mono fs-md text-center">{{ed(cpt.x.tr[12])}}</div>
            <div class="col-1 font-mono fs-md text-center">{{ed(cpt.x.tr[13])}}</div>
          </div>
        </div>
      </div>
    </q-expansion-item>
  </div>

  <q-dialog v-if="sessionok" v-model="nvav" persistent>
    <q-card class="moyennelargeur shadow-8">
      <q-card-section>
        <div class="titre-lg">Création d'un nouvel avatar</div>
        <nom-avatar icon-valider="check" verif label-valider="Valider" @ok-nom="oknom" />
        <q-separator/>
        <div v-if="nomav">
          <div class="titre-md">Forfaits attribués</div>
          <div :class="'font-mono' + (mx1 ? ' text-negative bg-yellow-5' : '')">Maximum V1 attribuable : {{mxff[0]}}</div>
          <div :class="'font-mono' + (mx2 ? ' text-negative bg-yellow-5' : '')">Maximum V2 attribuable : {{mxff[1]}}</div>
          <choix-forfaits v-model="forfaits" :f1="1" :f2="1"/>
        </div>
      </q-card-section>
      <q-card-actions>
        <q-btn flat dense color="primary" icon="close" label="renoncer" @click="nvav=false" />
        <q-btn flat dense color="warning" :disable="!nomav || mx1 || mx2 || err" icon="add" label="Créer l'avatar" @click="nvAvatar"/>
      </q-card-actions>
    </q-card>
  </q-dialog>
</q-page>
</template>

<script>
import { PrefCompte, CreationAvatar } from '../app/operations.mjs'
import { computed, ref, reactive, watch } from 'vue'
import { useStore } from 'vuex'
import { onBoot, remplacePage } from '../app/page.mjs'
import EditeurMd from '../components/EditeurMd.vue'
import BoutonHelp from '../components/BoutonHelp.vue'
import MotsCles from '../components/MotsCles.vue'
import ChoixForfaits from '../components/ChoixForfaits.vue'
import IdentiteCv from '../components/IdentiteCv.vue'
import NomAvatar from '../components/NomAvatar.vue'
import { Motscles, afficherdiagnostic, edvol } from '../app/util.mjs'
import { crypt } from '../app/crypto.mjs'
import { data } from '../app/modele.mjs'
import { serial } from '../app/schemas.mjs'
import { UNITEV1, UNITEV2, Compteurs } from '../app/api.mjs'

/** Compteurs ***************************
- `j` : jour de calcul
- `v1 v1m` : volume v1 actuel et total du mois
- `v2 v2m` : volume v2 actuel et total du mois
- `trm` : volume transféré dans le mois
- `f1 f2` : forfait de v1 et v2
- `tr` : array de 14 compteurs (les 14 derniers jours) de volume journalier de transfert
- `rtr` : ratio de la moyenne des tr / forfait v2
- `hist` : array de 12 éléments, un par mois. 4 bytes par éléments.
  - `f1 f2` : forfaits du mois
  - `r1` : ratio du v1 du mois par rapport à son forfait.
  - `r2` : ratio du v2 du mois par rapport à son forfait.
  - `r3` : ratio des transferts cumulés du mois / volume du forfait v2
- `res1 res2` : pour un parrain, réserve de forfaits v1 et v2.
- `t1 t2` : pour un parrain, total des forfaits 1 et 2 attribués aux filleuls.
*/

export default ({
  name: 'Compte',
  components: { EditeurMd, BoutonHelp, MotsCles, IdentiteCv, NomAvatar, ChoixForfaits },
  data () {
    return {
      nomav: '',
      forfaits: [1, 1],
      mxff: [0, 0],
      mx1: false,
      mx2: false,
      err: false
    }
  },

  watch: {
    forfaits (f) {
      this.mx1 = f[0] > this.mxff[0]
      this.mx2 = f[1] > this.mxff[1]
      this.err = f[0] < 0 || f[0] > 255 || f[1] < 0 || f[1] > 255
    }
  },

  methods: {
    ouvrirnv () {
      this.nvav = true
      this.prim = data.getComptaPrimitif()
      const c = this.prim.compteurs
      this.mxff[0] = Math.floor(((c.f1 * UNITEV1) - c.v1) / UNITEV1) - 1
      this.mxff[1] = Math.floor(((c.f2 * UNITEV2) - c.v2) / UNITEV2) - 1
    },
    oknom (nom) {
      const ida = this.compte.avatarDeNom(nom)
      if (ida) {
        afficherdiagnostic('Ce nom est déjà celui d\'un de vos avatars. En choisir un autre.')
      } else this.nomav = nom
    },

    async nvAvatar () {
      await new CreationAvatar().run(this.nomav, this.forfaits, this.prim.id)
      this.nvav = false
    },

    toAvatar (na) {
      this.avatar = data.getAvatar(na.id)
      remplacePage('Avatar')
    },
    async okmc (mmc) {
      const datak = await crypt.crypter(data.clek, serial(mmc))
      await new PrefCompte().run('mc', datak)
    },
    async memook (m) {
      this.memoed.undo()
      const datak = await crypt.crypter(data.clek, serial(m))
      await new PrefCompte().run('mp', datak)
    }
  },

  setup () {
    const memoed = ref(null)
    const nvav = ref(false)
    onBoot()
    const $store = useStore()
    const sessionok = computed(() => { return $store.state.ui.sessionok })
    // En déconnexion, compte passe à null et provoque un problème dans la page. Un getter ne marche pas ?!
    const compte = computed(() => $store.state.db.compte)
    const prefs = computed(() => $store.state.db.prefs)
    // const cvs = computed(() => $store.state.db.cvs)
    const mode = computed(() => $store.state.ui.mode)

    const mc = reactive({ categs: new Map(), lcategs: [], st: { enedition: false, modifie: false } })
    const motscles = new Motscles(mc, 1)
    const state = reactive({ lst: [], memo: '' })

    const tabavatar = computed({
      get: () => $store.state.ui.tabavatar,
      set: (val) => $store.commit('ui/majtabavatar', val)
    })
    const avatar = computed({
      get: () => $store.state.db.avatar,
      set: (val) => $store.commit('db/majavatar', val)
    })

    /** Compteurs ***************************
    - `j` : jour de calcul
    - `v1 v1m` : volume v1 actuel et total du mois
    - `v2 v2m` : volume v2 actuel et total du mois
    - `trm` : volume transféré dans le mois
    - `f1 f2` : forfait de v1 et v2
    - `tr` : array de 14 compteurs (les 14 derniers jours) de volume journalier de transfert
    - `rtr` : ratio de la moyenne des tr / forfait v2
    - `hist` : array de 12 éléments, un par mois. 4 bytes par éléments.
      - `f1 f2` : forfaits du mois
      - `r1` : ratio du v1 du mois par rapport à son forfait.
      - `r2` : ratio du v2 du mois par rapport à son forfait.
      - `r3` : ratio des transferts cumulés du mois / volume du forfait v2
    - `res1 res2` : pour un parrain, réserve de forfaits v1 et v2.
    - `t1 t2` : pour un parrain, total des forfaits 1 et 2 attribués aux filleuls.
    */
    const cpt = reactive({ av: '', x: new Compteurs() })

    function choixAv (na) {
      cpt.av = na.nom
      const c = data.getCompta(na.id)
      cpt.x = c.compteurs
    }

    function ed (v) { return edvol(v) }
    function ed1 (v) { return edvol(v * UNITEV1) }
    function ed2 (v) { return edvol(v * UNITEV2) }
    function init1 () {
      if (sessionok.value) {
        state.lst = compte.value.avatarNas()
        choixAv(Array.from(state.lst)[0])
      }
    }

    function init2 () {
      if (sessionok.value) {
        motscles.recharger()
        state.memo = prefs.value.memo
      }
    }

    watch(() => prefs.value, (ap, av) => {
      if (ap && ap.v > av.v) init2()
    })

    watch(() => compte.value, (ap, av) => {
      if (ap && ap.v > av.v) init1()
    })

    watch(() => sessionok.value, (ap, av) => {
      nvav.value = false
    })

    init1()
    init2()

    return {
      choixAv,
      ed,
      ed1,
      ed2,
      cpt,
      nvav,
      avatar,
      state,
      tabavatar,
      sessionok,
      motscles,
      memoed,
      compte,
      prefs,
      mode
      // cvs
    }
  }

})
</script>

<style lang="sass" scoped>
@import '../css/app.sass'
</style>
