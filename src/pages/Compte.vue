<template>
<q-page class="fs-md q-pa-sm">
  <tab-tribus v-if="sessionok && tabavatar === 'tribus'"></tab-tribus>

  <q-card v-if="sessionok && tabavatar !== 'tribus'" class="moyennelargeur maauto">
    <div v-if="!compte.estComptable" class="q-my-md">
      <div class="row justify-between">
        <div class="titre-md">A propos de ma tribu {{compte.nat.nom}}
          <span v-if="compte.estParrain" class="q-ml-sm titre-md text-warning text-bold">(PARRAIN)</span>
        </div>
        <q-btn flat dense size="sm" icon="chevron_right" @click="ouvrirtribu"/>
      </div>
    </div>

    <div v-if="!compte.estComptable && !compte.estParrain" class="titre-md">Les ressources du compte sont imputées à la tribu {{compte.nat.nom}}</div>

    <div class="q-my-sm">
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
    <div class="row justify-start items-center q-my-sm">
      <q-btn size="md" icon="add" label="Nouvel avatar" color="primary" no-caps dense @click="ouvrirnv"/>
      <q-btn v-if="state.lst.length > 1" class="q-ml-sm" size="md" icon="manage_accounts" no-caps
        label="Répartir les forfaits entre les avatars" color="primary" dense @click="ouvrirrf"/>
      <q-btn class="q-ml-sm" size="md" icon="manage_accounts" no-caps
        label="Changer la phrase secrète" color="warning" dense @click="ouvrirchgps"/>
    </div>
    <div v-for="(x, idx) in state.lst" :key="x.av.id">
      <q-card class="q-ma-sm moyennelargeur zone">
        <fiche-avatar :na-avatar="x.av.na" :idx="idx" cv-editable compta actions>
          <template v-slot:actions>
            <q-btn dense color="warning" size="md"
              icon="open_in_new" label="Vers page" @click="toAvatar(x.av)"/>
            <q-btn v-if="x.av.estParrain" flat class="q-mx-xs" dense color="primary" size="sm"
              icon="add" label="Parrainage" @click="ouvrirpar(x.av)"/>
            <q-btn class="q-mx-xs" flat dense color="primary" size="sm"
              icon="add" label="Rencontre" @click="ouvrirpr(x.av)"/>
          </template>
        </fiche-avatar>
      </q-card>
    </div>

  </q-card>

  <q-dialog v-model="memoedit" full-height position="right">
    <q-card class="petitelargeur q-pa-sm">
      <q-toolbar class="bg-secondary text-white">
        <q-toolbar-title class="titre-lg full-width">Mémo du compte</q-toolbar-title>
        <q-btn class="chl" dense flat size="md" icon="chevron_right" @click="memoedit=false"/>
      </q-toolbar>
      <editeur-md ref="memoed" class="q-mt-md height-10" :texte="state.memo" editable modetxt label-ok="OK" v-on:ok="memook"></editeur-md>
    </q-card>
  </q-dialog>

  <q-dialog v-model="mcledit" full-height position="right">
    <q-card class="petitelargeur q-pa-sm">
      <q-toolbar class="bg-secondary text-white">
        <q-toolbar-title class="titre-lg full-width">Mots clés du compte</q-toolbar-title>
        <q-btn class="chl" dense flat size="md" icon="chevron_right" @click="mcledit=false"/>
      </q-toolbar>
      <mots-cles class="q-mt-md full-width" :motscles="motscles" @ok="okmc"></mots-cles>
    </q-card>
  </q-dialog>

  <q-dialog v-model="tribdial" full-height position="right">
    <q-card class="petitelargeur q-pa-sm">
      <q-toolbar class="bg-secondary text-white">
        <q-toolbar-title class="titre-lg full-width">A propos de la tribu {{tribu.nom}}</q-toolbar-title>
        <q-btn class="chl" dense flat size="md" icon="chevron_right" @click="tribdial=false"/>
      </q-toolbar>
      <q-card-section v-if="compte.estParrain" class="fs-md">
        <div class="q-my-sm">{{tribu.nbc}} compte(s)</div>
        <div class="q-my-sm">Forfaits déjà attribués aux comptes</div>
        <div class="q-ml-md font-mono">V1 : {{tribu.f1}}<span class="q-ml-lg">{{ed1(tribu.f1)}}</span></div>
        <div class="q-ml-md font-mono">V2 : {{tribu.f2}}<span class="q-ml-lg">{{ed2(tribu.f2)}}</span></div>
        <div class="q-my-sm">Réserves disponibles pour attribution aux comptes</div>
        <div class="q-ml-md font-mono">V1 : {{tribu.r1}}<span class="q-ml-lg">{{ed1(tribu.r1)}}</span></div>
        <div class="q-ml-md font-mono">V2 : {{tribu.r2}}<span class="q-ml-lg">{{ed2(tribu.r2)}}</span></div>
      </q-card-section>
      <q-separator/>
      <q-card-section>
        <div class="titre-lg text-bold q-mb-sm">Parrains</div>
        <fiche-avatar v-for="nap in naps" :key="nap.id" :na-avatar="nap" contacts groupes />
      </q-card-section>
    </q-card>
  </q-dialog>

  <q-dialog v-if="sessionok" v-model="nvpar" persistent class="moyennelargeur">
    <nouveau-parrainage :close="fermerParrain" />
  </q-dialog>

  <q-dialog v-if="sessionok" v-model="repfor" persistent full-height class="moyennelargeur">
    <repartir-forfait :close="fermerrf" />
  </q-dialog>

  <q-dialog v-if="sessionok" v-model="phraserenc">
    <panel-rencontre :close="fermerpr"/>
  </q-dialog>

  <q-dialog v-if="sessionok" v-model="comptadial" full-height position="right">
    <panel-compta :cpt="cpt" :close="fermercompta"/>
  </q-dialog>

  <q-dialog v-if="sessionok" v-model="tabtribus" full-height position="right">
    <tab-tribus :close="fermertabtribus"></tab-tribus>
  </q-dialog>

  <q-dialog v-if="sessionok" v-model="chgps">
    <q-card class="q-mt-lg petitelargeur">
      <q-card-section>
        <div class="titre-lg text-center q-ma-md">Changement de la phrase secrète de connexion au compte</div>
        <phrase-secrete class="q-ma-xs" v-on:ok-ps="okps" verif icon-valider="check" label-valider="Continuer"></phrase-secrete>
      </q-card-section>
      <q-card-actions>
        <q-btn dense label="Je renonce" color="primary" icon="close" v-close-popup/>
        <q-btn dense :disable="ps===null" label="Je change la phrase" color="warning" icon="check" v-close-popup @click="changerps"/>
      </q-card-actions>
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
import { PrefCompte, CreationAvatar, ChangementPS, GetCVs } from '../app/operations.mjs'
import { computed, ref, reactive, watch } from 'vue'
import { useStore } from 'vuex'
import { onBoot, remplacePage } from '../app/page.mjs'
import EditeurMd from '../components/EditeurMd.vue'
import MotsCles from '../components/MotsCles.vue'
import ChoixForfaits from '../components/ChoixForfaits.vue'
import NomAvatar from '../components/NomAvatar.vue'
import NouveauParrainage from '../components/NouveauParrainage.vue'
import PanelRencontre from '../components/PanelRencontre.vue'
import ShowHtml from '../components/ShowHtml.vue'
import PanelCompta from '../components/PanelCompta.vue'
import PhraseSecrete from '../components/PhraseSecrete.vue'
import FicheAvatar from '../components/FicheAvatar.vue'
import TabTribus from '../components/TabTribus.vue'
import RepartirForfait from '../components/RepartirForfait.vue'
import { Motscles, afficherdiagnostic, edvol, dhstring, NomAvatar as NomAvatarObj } from '../app/util.mjs'
import { crypt } from '../app/crypto.mjs'
import { data } from '../app/modele.mjs'
import { serial } from '../app/schemas.mjs'
import { UNITEV1, UNITEV2, Compteurs } from '../app/api.mjs'

export default ({
  name: 'Compte',
  components: { RepartirForfait, TabTribus, FicheAvatar, PhraseSecrete, PanelCompta, ShowHtml, EditeurMd, MotsCles, NomAvatar, ChoixForfaits, NouveauParrainage, PanelRencontre },
  data () {
    return {
      nomav: '',
      chgps: false,
      repfor: false,
      ps: null,
      forfaits: [1, 1],
      mxff: [0, 0],
      mx1: false,
      mx2: false,
      err: false
    }
  },

  computed: {
    m () { return this.cpt.av.estPrimaire && this.cpt.x.s1 !== 0 }
  },

  watch: {
    forfaits (f) {
      this.mx1 = f[0] > this.mxff[0]
      this.mx2 = f[1] > this.mxff[1]
      this.err = f[0] < 0 || f[0] > 255 || f[1] < 0 || f[1] > 255
    }
  },

  methods: {
    dh (t) { return !t ? '(na)' : dhstring(new Date(t * 1000)) },
    toAvatar (av) { this.avatar = av; remplacePage('Avatar') },
    ouvrirpar (av) { this.avatar = av; this.nvpar = true },
    fermerParrain () { this.nvpar = false },
    ouvrirpr (av) { this.avatar = av; this.phraserenc = true },
    fermerpr () { this.phraserenc = false },
    ouvrirrf () { this.repfor = true },
    fermerrf () { this.repfor = false },
    ouvrirtabtribus () { this.tabtribus = true },
    fermertabtribus () { this.tabtribus = false },
    async ouvrirtribu () {
      if (this.mode > 2) {
        afficherdiagnostic('Informations sur la tribu disponibles seulement en mode synchronisé ou incognito')
        return
      }
      const x = Object.values(this.tribu.mncp)
      this.naps = []
      const l2 = new Set()
      x.forEach(nr => {
        const na = new NomAvatarObj(nr[0], nr[1])
        data.repertoire.setNa(na)
        if (!data.getCv(na.id)) l2.add(na.id)
        this.naps.push(na)
      })
      if (l2.size) await new GetCVs().run(l2) // chargement des Cv éventuellement manquantes (parrains inconnus)
      this.tribdial = true
    },
    ouvrirchat () {
      this.chatdial = true
    },
    ouvrirnv () {
      this.nvav = true
      const c = this.state.cprim.compteurs
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
      await new CreationAvatar().run(this.nomav, this.forfaits)
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

    ouvrirchgps () {
      this.chgps = true
      this.ps = null
    },

    okps (ps) {
      this.ps = ps
    },

    async changerps () {
      await new ChangementPS().run(this.ps)
      this.ps = null
      this.chgps = false
    }
  },

  setup () {
    const memoed = ref(null)
    const nvav = ref(false)
    const nvpar = ref(false)
    const phraserenc = ref(false)
    const comptadial = ref(false)
    const tribdial = ref(false)
    const mcledit = ref(false)
    const memoedit = ref(false)
    const tabtribus = ref(false)
    onBoot()

    const $store = useStore()
    const sessionok = computed(() => { return $store.state.ui.sessionok })
    // En déconnexion, compte passe à null et provoque un problème dans la page. Un getter ne marche pas ?!
    /*
    const dialoguechat = computed({
      get: () => $store.state.ui.dialoguechat,
      set: (val) => $store.commit('ui/majdialoguechat', val)
    })
    */
    const compte = computed(() => $store.state.db.compte)
    const prefs = computed(() => $store.state.db.prefs)
    const tribu = computed(() => $store.state.db.tribu)
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
    const state = reactive({ lst: [], memo: '', cprim: null, cvs: {}, estParrain: false })

    function init1 () {
      if (sessionok.value) {
        const lst = []
        state.cvs = {}
        state.estParrain = compte.value.estParrain
        compte.value.avatarIds().forEach(id => {
          const av = avatars.value[id]
          const cv = cvs.value[id]
          const cp = comptas.value[id]
          if (cp.id === compte.value.id) state.cprim = cp
          lst.push({ av, cv, cp })
        })
        lst.sort((a, b) => {
          return a.av.estPrimaire ? -1 : (b.av.estPrimaire ? 1 : (a.av.na.nom < b.av.na.nom ? -1 : (a.av.na.nom > b.av.na.nom ? 1 : 0)))
        })
        state.lst = lst
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
    const cpt = reactive({ av: null, x: new Compteurs() })

    function ouvrircompta (x) {
      avatar.value = x.av
      comptadial.value = true
      cpt.av = x.av
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
        tribdial.value = false
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
      tribdial,
      mcledit,
      memoedit,
      tabtribus,
      ed,
      ed1,
      ed2,
      cpt,
      nvav,
      avatar,
      tribu,
      state,
      tabavatar,
      sessionok,
      motscles,
      memoed,
      compte,
      prefs,
      mode
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
  max-height: 1.8rem
  overflow: hidden
</style>
