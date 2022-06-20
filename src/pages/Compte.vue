<template>
<q-page class="fs-md q-pa-sm">
  <q-card v-if="sessionok" class="moyennelargeur maauto">

    <div class="q-my-md">
      <div class="row justify-between">
        <div class="titre-md">Mémo du compte
          <span v-if="state.memo" class="q-pl-sm font-mno fs-sm">({{state.memo.length + 'c'}})</span>
        </div>
        <q-btn flat dense size="sm" icon="chevron_right" @click="memoedit = !memoedit"/>
      </div>
      <div v-if="!state.memo" class="q-pl-sm">(vide)</div>
      <show-html v-else class="l1 q-pl-sm" :texte="state.memo"/>
    </div>

    <div class="q-my-md">
      <div class="row justify-between">
        <div class="titre-md">Mots clés du compte</div>
        <q-btn flat dense size="sm" icon="chevron_right" @click="mcledit = !mcledit"/>
      </div>
    </div>

    <q-separator/>

    <q-btn class="q-my-sm" size="sm" icon="add" label="Nouvel avatar" color="primary" dense @click="ouvrirnv"/>

    <div v-for="x in state.lst" :key="x.av.id"
      :class="'q-my-md zone row' + (avatar && x.av.id === avatar.id ? ' courant' : '')">
      <identite-cv class="col" :nom-avatar="x.av.na" type="avatar" editable invitable @cv-changee="cvchangee"/>
      <div class="col-auto column justify-center">
        <q-btn dense color="warning" size="sm"
          icon="check" label="Page" @click="toAvatar(x.av)"/>
        <q-btn v-if="x.parrain" flat class="q-mx-xs" dense color="primary" size="sm"
          icon="add" label="Parrainage" @click="ouvrirpar(x.av)"/>
        <q-btn class="q-mx-xs" flat dense color="primary" size="sm"
          icon="add" label="Rencontre" @click="ouvrirpr(x.av)"/>
        <q-btn class="q-mx-xs" flat dense color="primary" size="sm"
          label="Comptabilité" @click="ouvrircompta(x)"/>
      </div>
      <q-separator class="q-my-sm"/>
    </div>

  </q-card>

  <q-dialog v-model="memoedit" full-height position="right">
    <q-card class="petitelargeur q-pa-sm">
      <q-toolbar class="bg-secondary text-white">
        <q-btn class="chl" dense flat size="md" icon="chevron_left" @click="memoedit=false"/>
        <div class="titre-lg full-width text-right">Mémo du compte</div>
      </q-toolbar>
      <editeur-md ref="memoed" class="q-mt-md height-10" :texte="state.memo" editable modetxt label-ok="OK" v-on:ok="memook"></editeur-md>
    </q-card>
  </q-dialog>

  <q-dialog v-model="mcledit" full-height position="right">
    <q-card class="petitelargeur q-pa-sm">
      <q-toolbar class="bg-secondary text-white">
        <q-btn class="chl" dense flat size="md" icon="chevron_left" @click="mcledit=false"/>
        <div class="titre-lg full-width text-right">Mots clés du compte</div>
      </q-toolbar>
      <mots-cles class="q-mt-md full-width" :motscles="motscles" @ok="okmc"></mots-cles>
    </q-card>
  </q-dialog>

  <q-dialog v-if="sessionok" v-model="nvpar" persistent class="moyennelargeur">
    <NouveauParrainage :close="fermerParrain" />
  </q-dialog>

  <q-dialog v-if="sessionok" v-model="phraserenc">
    <panel-rencontre :close="fermerpr"/>
  </q-dialog>

  <q-dialog v-if="sessionok" v-model="comptadial" full-height position="right">
    <q-card class="moyennelargeur q-pa-sm">
      <q-toolbar class="bg-secondary text-white">
        <q-btn class="chl" dense flat size="md" icon="chevron_left" @click="fermercompta"/>
        <div class="titre-lg full-width text-right">Comptabilité de {{cpt.av}}</div>
      </q-toolbar>
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
    </q-card>
  </q-dialog>

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
import { PrefCompte, CreationAvatar, MajCv } from '../app/operations.mjs'
import { computed, ref, reactive, watch } from 'vue'
import { useStore } from 'vuex'
import { onBoot, remplacePage } from '../app/page.mjs'
import EditeurMd from '../components/EditeurMd.vue'
import MotsCles from '../components/MotsCles.vue'
import ChoixForfaits from '../components/ChoixForfaits.vue'
import IdentiteCv from '../components/IdentiteCv.vue'
import NomAvatar from '../components/NomAvatar.vue'
import NouveauParrainage from '../components/NouveauParrainage.vue'
import PanelRencontre from '../components/PanelRencontre.vue'
import ShowHtml from '../components/ShowHtml.vue'
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
  components: { ShowHtml, EditeurMd, MotsCles, IdentiteCv, NomAvatar, ChoixForfaits, NouveauParrainage, PanelRencontre },
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
    toAvatar (av) { this.avatar = av; remplacePage('Avatar') },
    ouvrirpar (av) { this.avatar = av; this.nvpar = true },
    fermerParrain () { this.nvpar = false },
    ouvrirpr (av) { this.avatar = av; this.phraserenc = true },
    fermerpr () { this.phraserenc = false },

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

    async okmc (mmc) {
      const datak = await crypt.crypter(data.clek, serial(mmc))
      await new PrefCompte().run('mc', datak)
    },
    async memook (m) {
      this.memoed.undo()
      const datak = await crypt.crypter(data.clek, serial(m))
      await new PrefCompte().run('mp', datak)
    },

    async cvchangee (cv) {
      await new MajCv().run(cv)
    }
  },

  setup () {
    const memoed = ref(null)
    const nvav = ref(false)
    const nvpar = ref(false)
    const phraserenc = ref(false)
    const comptadial = ref(false)
    const mcledit = ref(false)
    const memoedit = ref(false)
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

    const avatars = computed(() => { return $store.state.db.avatars })
    const comptas = computed(() => { return $store.state.db.comptas })
    const cvs = computed(() => { return $store.state.db.cvs })
    const avatar = computed({
      get: () => $store.state.db.avatar,
      set: (val) => $store.commit('db/majavatar', val)
    })
    const state = reactive({ lst: [], memo: '' })

    function init1 () {
      if (sessionok.value) {
        state.lst = []
        state.cvs = {}
        compte.value.avatarIds().forEach(id => {
          const av = avatars.value[id]
          const cv = cvs.value[id]
          const cp = comptas.value[id]
          const parrain = cp && cp.idp === 0
          state.lst.push({ av, cv, cp, parrain })
        })
        state.lst.sort((a, b) => { return a.av.na.nom < b.av.na.nom ? -1 : (a.av.na.nom > b.av.na.nom ? 1 : 0) })
        if (!avatar.value) avatar.value = state.lst[0].av
      }
    }

    function init2 () {
      if (sessionok.value) {
        motscles.recharger()
        state.memo = prefs.value.memo
      }
    }

    const tabavatar = computed({
      get: () => $store.state.ui.tabavatar,
      set: (val) => $store.commit('ui/majtabavatar', val)
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

    function ouvrircompta (x) {
      avatar.value = x.av
      comptadial.value = true
      cpt.av = x.av.na.nom
      cpt.x = x.cp.compteurs
    }

    function fermercompta () { comptadial.value = false }

    function ed (v) { return edvol(v) }
    function ed1 (v) { return edvol(v * UNITEV1) }
    function ed2 (v) { return edvol(v * UNITEV2) }

    watch(() => prefs.value, (ap, av) => { init2() })

    watch(() => compte.value, (ap, av) => { init1() })

    watch(() => avatars.value, (ap, av) => { init1() })

    watch(() => comptas.value, (ap, av) => { init1() })

    watch(() => sessionok.value, (ap, av) => {
      if (!ap) {
        nvav.value = false
        nvpar.value = false
        phraserenc.value = false
        comptadial.value = false
        mcledit.value = false
        memoedit.value = false
      }
    })

    init1()
    init2()

    return {
      ouvrircompta,
      fermercompta,
      nvpar,
      phraserenc,
      comptadial,
      mcledit,
      memoedit,
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
.q-toolbar
  padding: 2px !important
  min-height: 0 !important
.l1
  max-height: 1.3rem
  overflow: hidden
</style>
