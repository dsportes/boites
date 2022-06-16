<template>
  <q-card v-if="sessionok && groupe" class="full-height full-width fs-md column">
    <div style="min-height:35px"></div>

    <identite-cv v-if="state.g" :nom-avatar="state.g.na" type="groupe" :editable="anim" @cv-changee="cvchangee"/>

    <div class="titre-md">
      <q-toggle v-model="state.arch" left-label :disable="!anim" size="sm" :color="state.arch ? 'warning' : 'green'"
        :label="state.arch ? 'Création de secrets et mises à jour bloquées' : 'Création de secrets et mises à jour libres'"/>
    </div>

    <div v-if="state.g && state.g.stx === 2">
      <div class="text-bold text-warning titre-md">Invitations encore bloquées par :</div>
      <div class="row items-center">
        <div v-for="m in state.votes" :key="m.pkv" class="q-px-md">
          <span>{{m.namb.nom}}</span>
          <q-btn v-if="m.estAc" class="q-ml-xs" dense size="sm" color="primary" label="débloquer" @click="debloquer(m)"/>
        </div>
      </div>
    </div>
    <div v-if="state.g && state.g.stx === 1">
      <div class="titre-md">Les invitations sont libres
        <q-btn v-if="anim" class="q-ml-md" size="md" flat text-color="primary" dense icon="lock" label="Les bloquer" @click="bloquer" />
      </div>
    </div>

    <div v-if="state.g">
      <div class="row justify-between">
        <div class="titre-md">
          <span v-if="state.g.dfh" class="text-negative bg-yellow-4 text-bold q-ml-sm q-px-xs">PAS D'HEBERGEMENT - </span>
          <span v-else>Hébergement - </span>
          <span :class="state.g.pc1 > 80 || state.g.pc2 > 80 ? 'text-warning bg-yellow-4' : ''">Volumes : {{state.g.pc1}}% / {{state.g.pc2}}%</span>
        </div>
        <q-btn flat dense size="sm" icon="chevron_right" @click="hebedit = !hebedit"/>
      </div>
    </div>

    <q-dialog v-model="hebedit" full-height position="right">
      <q-card class="petitelargeur q-pa-sm">
        <q-toolbar class="bg-secondary text-white">
          <q-btn class="chl" dense flat size="md" icon="chevron_left" @click="hebedit=false"/>
          <div class="titre-lg">
            <span v-if="state.g.dfh" class="text-negative bg-yellow-4 text-bold q-ml-sm q-px-xs">PAS D'HEBERGEMENT - </span>
            <span v-else>Hébergement - </span>
            <span :class="state.g.pc1 > 80 || state.g.pc2 > 80 ? 'text-warning bg-yellow-4' : ''">Volumes : {{state.g.pc1}}% / {{state.g.pc2}}%</span>
          </div>
        </q-toolbar>
        <div class="q-my-md titre-md">Volumes occupés - V1: {{edvol(state.g.v1)}} / V2: {{edvol(state.g.v2)}}</div>
        <div v-if="state.g.pc1 > 80 || state.g.pc2 > 80" class="q-ma-xs">
          <q-icon name="warning" size="md" color="warning"/>
          <span class="text-warning q-px-sm text-bold">Alerte sur les volumes - v1: {{state.g.pc1}}% / v2: {{state.g.pc2}}%</span>
        </div>

        <div v-if="state.g.dfh" class="q-mt-md text-negative bg-yellow-4 text-bold q-mx-xs q-pa-xs">
          Le groupe n'a pas d'avatar qui l'héberge. Mises à jour et créations de secrets bloquées.
          S'auto-détruira dans {{nbj(state.g.dfh)}} jour(s).
          <q-btn dense color="primary" label="Héberger le groupe" @click="debheb"/>
        </div>
        <q-btn v-if="state.g.estHeb(avatar.id)" dense color="secondary" class="q-mt-md" label="Fin d'hébergement du groupe" @click="finheb"/>
        <div class="q-my-md">
          <div class="titre-md">Forfaits attribués</div>
          <choix-forfaits v-model="state.forfaits" :lecture="!state.g.estHeb(avatar.id)" :f1="state.g.f1" :f2="state.g.f2" :v1="state.g.v1" :v2="state.g.v2"
            label-valider="Changer les volumes maximum autorisés" @valider="chgvolmax"/>
        </div>
      </q-card>
    </q-dialog>

    <div v-if="state.g" class="q-my-sm">
      <div class="row justify-between">
        <div class="titre-md">Mots clés spécifiques du groupe</div>
        <q-btn flat dense size="sm" icon="chevron_right" @click="mcgedit = !mcgedit"/>
      </div>
    </div>

    <q-dialog v-model="mcgedit" full-height position="right">
      <q-card class="petitelargeur q-pa-sm">
        <q-toolbar class="bg-secondary text-white">
          <q-btn class="chl" dense flat size="md" icon="chevron_left" @click="mcgedit=false"/>
          <div class="titre-lg">Mots clés spécifiques du groupe</div>
        </q-toolbar>
        <mots-cles class="q-mt-md" :motscles="state.motsclesGr" :lecture="!anim" @ok="changermcl"/>
      </q-card>
    </q-dialog>

    <div v-if="state.g" class="bg-secondary text-white q-my-sm row justify-between">
      <div class="titre-lg ">Membres du groupe</div>
      <q-btn v-if="state.g && state.g.maxStp() >= 1" size="sm" dense color="primary" icon="add"
        label="Ajouter un contact" @click="panelinvit=true"/>
    </div>

    <div v-if="state.g" class="q-mt-md">
      <div v-for="(m, idx) in state.lst" :key="m.pkv">
        <panel-membre :groupe="state.g" :membre="m" :idx="idx"/>
        <q-separator v-if="idx !== state.lst.length - 1" class="q-my-md"/>
      </div>
    </div>

    <q-dialog v-if="sessionok" v-model="panelinvit" full-height position="right">
      <q-card class="petitelargeur q-pa-sm">
        <q-toolbar class="bg-secondary text-white">
          <q-btn class="chl" dense flat size="md" icon="chevron_left" @click="panelinvit=false"/>
          <div class="titre-lg">Enregistrement d'un membre pressenti (pas encore "invité") du groupe</div>
        </q-toolbar>
      <q-card-section>
        <div v-if="clipboard === null">
          <div class="text-italic titre-md">Sélectionner dans les listes de contacts ou des membres des groupes l'avatar à enregistrer comme simple contact du groupe.</div>
          <div class="titre-md">L'option de menu <span class="titre-lg text-bold text-grey-8 bg-yellow-4 q-mx-sm">[Contact !]</span> ramènera à ce dialogue pour valider (ou non) l'inscription du contact.</div>
        </div>
      </q-card-section>
      <q-card-section v-if="state.diagInvit !== null">
        <div :class="state.diagInvit[0] >= 2 ? 'text-negative text-bold fs-lg':''">{{state.diagInvit[1]}}</div>
      </q-card-section>
      <q-card-section v-if="state.nacopie !== null">
        <div class="titre-lg">Avatar sélectionné : {{state.nacopie.nom}}</div>
        <div class="q-my-sm row">
          <img class="col-auto photomax" :src="state.nacopie.photo || phdefa"/>
          <show-html class="col q-ml-md bord1 height-6" :texte="state.nacopie.info || ''"/>
        </div>
      </q-card-section>
      <q-card-actions align="center" vertical>
        <q-btn flat dense color="primary" icon="close" label="Je renonce" @click="fermerPanelInvit"/>
        <q-btn v-if="clipboard !== null" flat dense color="warning" icon="undo" label="Je veux rechercher un autre contact" @click="inviterAtt"/>
        <q-btn v-if="clipboard !== null" :disable="state.diagInvit && state.diagInvit[0] >= 2" dense color="warning"
          icon="check" label="Je valide ce nouveau contact" @click="validerContact"/>
        <q-btn v-if="clipboard === null" dense color="warning" label="J'ai compris, je vais chercher mon contact" @click="inviterAtt"/>
      </q-card-actions>
      </q-card>
    </q-dialog>

    <q-dialog v-if="sessionok" v-model="nouvgr" class="petitelargeur">
      <nouveau-groupe :close="closegrp"/>
    </q-dialog>

  <q-page-sticky class="full-width" position="top-left" expand :offset="[50,0]">
    <q-toolbar :class="tbc">
      <q-btn :disable="!precedent" flat round dense icon="first_page" size="sm" @click="prec(0)" />
      <q-btn :disable="!precedent" flat round dense icon="arrow_back_ios" size="sm" @click="prec(1)" />
      <span class="fs-sm">{{index + 1}}/{{sur}}</span>
      <q-btn :disable="!suivant" flat round dense icon="arrow_forward_ios" size="sm" @click="suiv(1)" />
      <q-btn :disable="!suivant" flat round dense icon="last_page" size="sm" @click="suiv(0)" />
      <q-toolbar-title>
        <titre-banner v-if="state.g" class-titre="titre-md" :titre="state.g.nomEd"
          :titre2="state.g.nomEd + ' [' + state.g.na.nom + '#' + state.g.na.sfx + ']'" :id-objet="state.g.id"/>
      </q-toolbar-title>
      <q-btn dense flat icon="add" label="Nouveau" size="md"
        text-color="white" @click="nouvgr = true"/>

      <q-btn size="md" color="white" icon="menu" flat dense>
        <q-menu touch-position transition-show="scale" transition-hide="scale">
          <q-list dense style="min-width: 10rem">
            <q-item clickable v-close-popup @click="avatargrform = false">
              <q-item-section>Liste des groupes</q-item-section>
            </q-item>
            <q-separator />
            <q-item clickable v-close-popup @click="voirsecrets">
              <q-item-section>Voir les secrets du groupe</q-item-section>
            </q-item>
            <q-separator />
            <q-item clickable v-close-popup @click="nouveausecret">
              <q-item-section>Nouveau secret de groupe</q-item-section>
            </q-item>
          </q-list>
        </q-menu>
      </q-btn>
    </q-toolbar>

  </q-page-sticky>
  </q-card>
</template>
<script>
import { computed, reactive, watch, toRef, onMounted, ref } from 'vue'
import { useStore } from 'vuex'
import { useQuasar } from 'quasar'
import { Motscles, cfg, edvol, FiltreMbr, getJourJ, afficherdiagnostic } from '../app/util.mjs'
import { data } from '../app/modele.mjs'
import { MajMcGroupe, MajArchGroupe, MajBIGroupe, MajDBIGroupe, FinHebGroupe, DebHebGroupe, MajvmaxGroupe, ContactGroupe, MajCv } from '../app/operations.mjs'
import ShowHtml from './ShowHtml.vue'
import IdentiteCv from './IdentiteCv.vue'
import PanelMembre from './PanelMembre.vue'
import MotsCles from './MotsCles.vue'
import ChoixForfaits from './ChoixForfaits.vue'
import NouveauGroupe from './NouveauGroupe.vue'
import TitreBanner from '../components/TitreBanner.vue'

export default ({
  name: 'PanelGroupe',

  components: { TitreBanner, ShowHtml, MotsCles, ChoixForfaits, IdentiteCv, PanelMembre, NouveauGroupe },

  props: { groupe: Object, suivant: Function, precedent: Function, index: Number, sur: Number },

  computed: {
    tbc () { return 'bg-primary text-white' + (this.$q.screen.gt.sm ? ' ml23' : '') },
    anim () { return this.state.maxstp === 2 }
  },

  data () {
    return {
      edvol: edvol,
      nouvgr: false
    }
  },

  methods: {
    closegrp () { this.nouvgr = false },
    dkli (idx) { return this.$q.dark.isActive ? (idx ? 'sombre' + (idx % 2) : 'sombre0') : (idx ? 'clair' + (idx % 2) : 'clair0') },
    nbj (j) { return j - getJourJ() },

    voirsecrets () {
      this.tabavatar = 'secrets'
      setTimeout(() => {
        this.evtfiltresecrets = { cmd: 'fsg', arg: this.groupe }
      }, 100)
    },

    nouveausecret () {
      this.tabavatar = 'secrets'
      setTimeout(() => {
        this.evtfiltresecrets = { cmd: 'nvg', arg: this.groupe }
      })
    },

    async cvchangee (cv) {
      await new MajCv().run(cv)
    },
    async changermcl (mmc) {
      new MajMcGroupe().run(this.state.g, mmc)
      this.mcgedit = false
    },
    async bloquer () {
      await new MajBIGroupe().run(this.state.g)
    },
    async debloquer (m) {
      await new MajDBIGroupe().run(m)
    },

    suiv (n) { if (this.suivant) this.suivant(n) },
    prec (n) { if (this.precedent) this.precedent(n) },

    inviterAtt () {
      this.clipboard = null
      this.state.nacopie = null
      this.panelinvit = false
      const avid = this.avatar.id
      const grid = this.state.g.id
      this.invitationattente = { avid, grid }
    },

    fermerPanelInvit () {
      this.clipboard = null
      this.state.nacopie = null
      this.panelinvit = false
    },

    async debheb () {
      const m = this.state.g.membreParId(this.avatar.id)
      if (!m) return
      if (m.stp !== 2) {
        afficherdiagnostic('Seul un animateur peut être hébergeur du groupe')
      } else {
        await new DebHebGroupe().run(this.state.g, m.im)
      }
    },
    async finheb () {
      const imh = this.state.g.imDeId(this.avatar.id)
      await new FinHebGroupe().run(this.state.g, imh)
    },
    async chgvolmax (f) {
      const imh = this.state.g.imDeId(this.avatar.id)
      await new MajvmaxGroupe().run(this.state.g, imh, f)
    },
    async validerContact () {
      const na = this.state.nacopie
      this.state.nacopie = null
      this.clipboard = null
      this.invitationattente = null
      await new ContactGroupe().run(this.state.g.id, na, this.avatar.id)
      this.panelinvit = false
    }
  },

  setup (props) {
    const $q = useQuasar()
    const $store = useStore()
    const hebedit = ref(false)
    const mcgedit = ref(false)
    const sessionok = computed(() => { return $store.state.ui.sessionok })
    const tabavatar = computed({
      get: () => $store.state.ui.tabavatar,
      set: (val) => $store.commit('ui/majtabavatar', val)
    })
    const evtfiltresecrets = computed({ // secret courant
      get: () => $store.state.ui.evtfiltresecrets,
      set: (val) => $store.commit('ui/majevtfiltresecrets', val)
    })
    const groupe = toRef(props, 'groupe')
    const avatargrform = computed({
      get: () => $store.state.ui.avatargrform,
      set: (val) => $store.commit('ui/majavatargrform', val)
    })

    const phdefg = cfg().groupe
    const phdefa = cfg().avatar
    const avatar = computed(() => { return $store.state.db.avatar })

    const panelinvit = computed({
      get: () => $store.state.ui.panelinvit,
      set: (val) => $store.commit('ui/majpanelinvit', val)
    })
    const clipboard = computed({
      get: () => $store.state.ui.clipboard,
      set: (val) => $store.commit('ui/majclipboard', val)
    })
    const invitationattente = computed({
      get: () => $store.state.ui.invitationattente,
      set: (val) => $store.commit('ui/majinvitationattente', val)
    })
    const mode = computed(() => $store.state.ui.mode)
    const prefs = computed(() => { return data.getPrefs() })
    const membres = computed(() => { return groupe.value ? data.getMembre(groupe.value.id) : {} })
    const cvs = computed(() => { return $store.state.db.cvs })

    const state = reactive({
      filtre: { p: true, i: true, a: true, n: true, dh: false, asc: true },
      forfaits: [0, 0],
      motcles: null,
      g: null,
      arch: false,
      m: null,
      lst: [], // liste des membres
      lstAc: [], // parmi les membres celui / ceux avatar du compte
      nbanim: 0,
      nbvote: 0,
      maxstp: 0, // statut lecteur / auteur / animateur max des avaters du compte membres du groupe
      motclesGr: null,
      diagInvit: null,
      nacopie: null
    })

    const mc = reactive({ categs: new Map(), lcategs: [], st: { enedition: false, modifie: false } })

    function chargerMc () {
      state.motscles = new Motscles(mc, 3, groupe.value ? groupe.value.id : 0)
      state.motscles.recharger()
    }

    const mcGr = reactive({ categs: new Map(), lcategs: [], st: { enedition: false, modifie: false } })

    function chargerMcGr () {
      state.motsclesGr.recharger()
    }

    const recherche = reactive({ // doit correspondre au Filtre par défaut
      a: new FiltreMbr().etat(),
      p: new FiltreMbr().etat()
    })

    function initState () {
      state.filtre = new FiltreMbr()
      const g = groupe.value
      state.motsclesGr = new Motscles(mcGr, 2, g ? g.id : 0)
      if (g) {
        state.g = g
        state.arch = g.sty === 1
        state.forfaits = [g.f1, g.f2]
      }
    }

    function getMembres () {
      const f = state.filtre
      f.debutFiltre()
      const lst = []
      const lstAc = []
      let maxstp = 0
      let nbanim = 0
      const votes = []
      let mbav = null
      const bl = state.g.stx === 2
      for (const im in membres.value) {
        const m = membres.value[im]
        if (m.namb.id === avatar.value.id) mbav = m
        if (f.filtre(m)) lst.push(m)
        if (m.estAc) { lstAc.push(m); if (m.stp > maxstp) maxstp = m.stp }
        if (m.stp === 2) nbanim++
        if (bl && m.stp === 2 && m.vote === 1) votes.push(m)
      }
      state.lst = lst
      state.lstAc = lstAc
      state.maxstp = maxstp
      state.nbanim = nbanim
      state.votes = votes
      state.mbav = mbav
    }

    function trier () {
      const l = []; state.lst.forEach(x => l.push(x))
      l.sort((a, b) => { return state.filtre.fntri(a, b) })
      state.lst = l
    }

    function traiterClipboard () {
      const na = clipboard.value
      if (!na) return
      if (na === 'KO') {
        state.nacopie = null
        state.diagInvit = [3, 'Sélection annulée']
        return
      }
      state.nacopie = na
      const nom = na.nom
      for (const im in membres.value) {
        const m = membres.value[im]
        if (na.id === m.namb.id) {
          if (m.stx === 2) {
            state.diagInvit = [2, `${nom} est déjà un membre actif du groupe`]
            return
          }
          if (m.stx === 0) {
            state.diagInvit = [2, `${nom} est déjà un membre contacté du groupe, mais n'a pas encore été "invité"`]
            return
          }
          if (m.stx === 3) {
            state.diagInvit = [1, `Pour information, ${nom} a déjà été invité mais avait décliné l'invitation`]
            return
          }
          if (m.stx === 4) {
            state.diagInvit = [1, `Pour information, ${nom} a été membre actif puis a été "résilié"`]
            return
          }
        }
      }
      state.diagInvit = null
    }

    function confirmer () {
      $q.dialog({
        dark: true,
        title: 'Confirmer',
        message: state.arch ? 'Voulez-vous vraiement INTERDIRE la mise à jour et la création de secrets ?'
          : 'Voulez-vous vraiement AUTORISER A NOUVEAU la mise à jour et la création de secrets ?',
        cancel: { label: 'Je Renonce', color: 'primary' },
        ok: { color: 'warning', label: state.arch ? 'Je veux interdire' : 'Je veux autoriser' },
        persistent: true
      }).onOk(async () => {
        await new MajArchGroupe().run(state.g, state.arch)
      }).onCancel(() => {
        state.arch = !state.arch
      }).onDismiss(() => {
        // console.log('I am triggered on both OK and Cancel')
      })
    }

    function tousleswatch () {
      watch(state, async (ap, av) => {
        if (!sessionok.value) return
        if (state.g) {
          const avant = state.g.sty === 1
          if (ap.arch !== avant) {
            confirmer()
          }
        }
      })

      watch(() => prefs.value, (ap, av) => {
        if (!sessionok.value) return
        chargerMc()
      })

      watch(() => membres.value, (ap, av) => {
        if (!sessionok.value) return
        getMembres()
        trier()
      })

      watch(() => groupe.value, (ap, av) => {
        if (!sessionok.value) return
        initState()
        chargerMcGr()
        chargerMc()
        getMembres()
        trier()
      })

      watch(() => cvs.value, (ap, av) => {
        if (!sessionok.value) return
        getMembres()
        trier()
      })

      watch(() => clipboard.value, (ap, av) => {
        if (!sessionok.value) return
        traiterClipboard()
      })

      watch(() => sessionok.value, (ap, av) => {
        if (ap) {
          panelinvit.value = false
          hebedit.value = false
          mcgedit.value = false
        }
      })
    }

    onMounted(() => {
      /* Lors de l'opération de "copier / coller" d'un avatar / contact externe pour inscription à un groupe
      le panel disparaît, ses watchs sont interrompus.
      Au retour il faut donc a) reconstituer l'état des données, recaler le groupe courant et
      refaire les watchs perdus. Il faut également traiter le clipboard courant
      qui contient ou non un NomAvatar copié : la watch sur le clipboard étant perdu durant
      durant le temps de la phase de copie, il faut explicitement le traiter (sans watch).
      */
      tousleswatch()
      initState()
      chargerMcGr()
      chargerMc()
      getMembres()
      trier()
      traiterClipboard()
    })

    return {
      hebedit,
      mcgedit,
      sessionok,
      tabavatar,
      evtfiltresecrets,
      avatargrform,
      phdefa,
      phdefg,
      avatar,
      recherche,
      state,
      mode,
      options: ['Tous', 'Pressentis', 'Invités', 'Actifs', 'Inactivés', 'Refusés', 'Résiliés', 'Disparus'],
      statuts: ['simple contact', 'invité', 'actif', 'refusé', 'résilié', 'disparu'],
      invitationattente,
      panelinvit,
      clipboard
    }
  }
})
</script>
<style lang="sass" scoped>
@import '../css/app.sass'
.bord1
  border:  1px solid $grey-5
.q-toolbar
  padding: 2px !important
  min-height: 0 !important
.chl
  position: relative
  left: -10px
.photomax
  position: relative
  top: 5px
.ml20
  width: 100%
  padding: 0.2rem 0.2rem 0.2rem 23rem
.itemcourant:hover
  border: 1px solid $warning
.itemcourant
  border: 1px solid transparent
.ml23
  margin-left: 23rem
</style>
