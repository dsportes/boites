<template>
  <q-card v-if="sessionok && groupe" class="full-height full-width fs-md column">
    <q-toolbar class="bg-primary text-white">
      <q-btn :disable="!precedent" flat round dense icon="first_page" size="md" class="q-mr-sm" @click="prec(0)" />
      <q-btn :disable="!precedent" flat round dense icon="arrow_back_ios" size="md" class="q-mr-sm" @click="prec(1)" />
      <span class="q-pa-sm">{{index + 1}} sur {{sur}}</span>
      <q-btn :disable="!suivant" flat round dense icon="arrow_forward_ios" size="md" class="q-mr-sm" @click="suiv(1)" />
      <q-btn :disable="!suivant" flat round dense icon="last_page" size="md" class="q-mr-sm" @click="suiv(0)" />
      <q-toolbar-title></q-toolbar-title>
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

    <q-btn v-if="state.g && state.g.maxStp() >= 1" class="q-ma-xs" flat dense color="primary" icon="add"
        label="Ajouter un nouveau Membre" @click="panelinvit=true"/>
    <q-separator/>

    <q-expansion-item v-if="state.g" group="etc" default-opened
        header-class="expansion-header-class-1 titre-md bg-secondary text-white">
      <template v-slot:header>
        <q-item-section>
          <div>{{state.g.na.noml}}</div>
        </q-item-section>
      </template>
      <identite-cv :nom-avatar="state.g.na" type="groupe" :editable="anim" @cv-changee="cvchangee"/>

      <q-toggle v-model="state.arch" :disable="!anim" size="md" :color="state.arch ? 'warning' : 'green'"
          :label="state.arch ? 'Création de secrets et mises à jour bloquées' : 'Création de secrets et mises à jour libres'"/>
      <div v-if="state.g.stx === 2">
        <div class="text-italic text-bold" color="warning">Invitation bloquées - {{state.nbvote}} vote(s) pour le déblocage sur {{state.nbanim}}</div>
        <q-btn v-if="anim" class="q-ma-xs" size="md" dense icon="lock_open" label="Débloquer les invitations" @click="debloquer" />
      </div>
      <div v-if="state.g.stx === 1">
        <div class="text-italic">Les invitations sont libres</div>
        <q-btn v-if="anim" class="q-ma-xs" size="md" dense icon="lock" label="Bloquer les invitations" @click="bloquer" />
      </div>
    </q-expansion-item>
    <q-separator/>

    <q-expansion-item v-if="state.g" group="etc" color="secondary"
        header-class="expansion-header-class-1 bg-primary text-white">
      <template v-slot:header>
        <q-item-section>
        <div class="titre-lg text-white">
          <span v-if="state.g.dfh" class="text-negative bg-yellow-4 text-bold q-ml-sm q-px-xs">PAS D'HEBERGEMENT - </span>
          <span v-else>Hébergement - </span>
          <span :class="state.g.pc1 > 80 || state.g.pc2 > 80 ? 'text-warning bg-yellow-4' : ''">Volumes : {{state.g.pc1}}% / {{state.g.pc2}}%</span>
        </div>
        </q-item-section>
      </template>
      <q-card class="shadow-8 q-ma-sm">
        <div v-if="state.g.dfh" class="text-negative bg-yellow-4 text-bold q-mx-xs q-pa-xs">
          Le groupe n'a pas de compte qui l'héberge. Mises à jour et créations de secrets bloquées.
          S'auto-détruira dans {{nbj(state.g.dfh)}} jour(s).
          <q-btn dense color="primary" label="Héberger le groupe" @click="debheb"/>
        </div>
        <q-btn v-if="state.g.estHeb" dense color="secondary" class="q-ma-xs" label="Fin d'hébergement du groupe" @click="finheb"/>
        <div>Volumes occupés (arrondis en Mo): {{Math.round(state.g.v1 / 1000000)}}Mo / {{Math.round(state.g.v2 / 1000000)}}Mo</div>
        <div v-if="state.g.pc1 > 80 || state.g.pc2 > 80" class="q-ma-xs">
          <q-icon name="warning" size="md" color="warning"/>
          <span class="text-warning q-px-sm text-bold">Alerte sur les volumes - v1: {{state.g.pc1}}% / v2: {{state.g.pc2}}%</span>
        </div>
        <div>
          <div class="titre-md">Forfaits attribués</div>
          <choix-forfaits v-model="state.forfaits" :lecture="!state.g.estHeb" :f1="state.g.f1" :f2="state.g.f2" :v1="state.g.v1" :v2="state.g.v2"
            label-valider="Changer les volumes maximum autorisés" @valider="chgvolmax"/>
        </div>
      </q-card>
    </q-expansion-item>
    <q-separator/>

    <q-expansion-item v-if="state.g" group="etc" label="Mots clés spécifiques du groupe" color="secondary"
        header-class="expansion-header-class-1 titre-lg bg-primary text-white">
      <mots-cles :motscles="state.motsclesGr" :lecture="!anim" @ok="changermcl"/>
    </q-expansion-item>
    <q-separator/>

    <q-expansion-item v-if="state.g" group="etc" label="Liste des membres du groupe" color="secondary"
        header-class="expansion-header-class-1 titre-lg bg-primary text-white">
      <div v-for="(m, idx) in state.lst" :key="m.pkv">
        <q-card class="shadow-8">
          <div :class="dkli(idx) + ' zone q-px-xs full-width row items-start cursor-pointer'">
            <div class="col-auto column justify-center q-px-xs">
              <img class="col-auto photomax" :src="m.ph || phdefa"/>
              <q-btn size="md" color="primary" icon="menu" flat dense class="q-mt-sm"/>
              <q-menu touch-position transition-show="scale" transition-hide="scale">
                <q-list dense style="min-width: 10rem">
                  <q-item v-if="invitationattente" clickable v-ripple v-close-popup @click="copier(m)">
                    <q-item-section class="titre-lg text-bold text-grey-8 bg-yellow-4 q-mx-sm text-center">[Contact !]</q-item-section>
                  </q-item>
                  <q-separator v-if="m.stx === 0 && state.g.maxStp() === 2"/>
                  <q-item v-if="m.stx === 0 && state.g.maxStp() === 2" clickable v-ripple v-close-popup @click="ouvririnvitcontact(m)">
                    <q-item-section avatar>
                      <q-icon dense name="check" color="primary" size="md"/>
                    </q-item-section>
                    <q-item-section>Inviter ce contact</q-item-section>
                  </q-item>
                  <q-separator v-if="m.stx === 1"/>
                  <q-item v-if="m.stx === 1" clickable v-ripple v-close-popup @click="accepterinvit(m)">
                    <q-item-section avatar>
                      <q-icon dense name="check" color="primary" size="md"/>
                    </q-item-section>
                    <q-item-section>Accepter / Refuser l'invitation</q-item-section>
                  </q-item>
                  <q-separator v-if="!m.estAvec && m.stp === 2" />
                  <q-item v-if="!m.estAvec && m.stp === 2" clickable v-ripple v-close-popup @click="resilier(m)">
                    <q-item-section avatar>
                      <q-icon dense name="close" color="warning" size="sm"/>
                    </q-item-section>
                    <q-item-section>Résilier du groupe</q-item-section>
                  </q-item>
                  <q-separator v-if="m.estAvec"/>
                  <q-item v-if="m.estAvec" clickable v-ripple v-close-popup @click="autoresilier(m)">
                    <q-item-section avatar>
                      <q-icon dense name="close" color="warning" size="sm"/>
                    </q-item-section>
                    <q-item-section>S'auto-résilier du groupe</q-item-section>
                  </q-item>
                </q-list>
              </q-menu>
            </div>
            <div class="col q-px-sm">
              <div class="titre-md text-bold">{{m.nom}}</div>
              <div>
                <q-icon v-if="m.estAc" class="q-mr-xs" size="sm" color="warning" name="stars"/>
                <span v-if="m.estAc" class="q-mr-sm text-bold text-warning">MOI</span>
                <q-icon size="sm" :color="m.stx === 2 ?'primary':'warning'"
                  :name="m.stx < 2 ? 'hourglass_empty' : (m.stx === 2 ? 'thumb_up' : 'thumb_down')"/>
                <span class="q-px-sm">{{statuts[m.stx]}}</span>
                <span class="q-px-sm" :color="m.stp < 2 ?'primary':'warning'">{{['Lecteur','Auteur','Animateur'][m.stp]}}</span>
                <span v-if="state.g.imh === m.im" class="q-px-xs text-bold text-italic text-warning">Hébergeur du groupe</span>
              </div>
              <div v-if="m.ard" class="row justify-between cursor-pointer zone" @click="ouvmajard(m)">
                <div class="col-auto q-pr-sm titre-md text-italic">Ardoise :</div>
                <show-html class="col height-2" :texte="m.ard" :idx="idx"/>
                <div class="col-auto q-pl-sm fs-sm">{{m.dhed}}</div>
              </div>
              <div v-else class="text-italic cursor-pointer zone" @click="ouvmajard(m)">(rien sur l'ardoise partagée avec le groupe)</div>
              <div v-if="m.estAc">
                <div v-if="m.info" class="zone cursor-pointer" @click="ouvmajinfo(m)">
                  <div class="titre-md text-italic">Titre et commentaires personnels à propos du groupe</div>
                  <show-html class="height-2" :texte="m.info" :idx="idx"/>
                </div>
                <div v-else class="text-italic cursor-pointer zone" @click="ouvmajinfo(m)">(pas de commentaires personnels à propos du groupe)</div>
                <div class="zone cursor-pointer" @click="ouvrirmc(m)">
                  <span class="titre-md text-italic q-pr-sm">Mots clés :</span>
                  <apercu-motscles :motscles="state.motsclesGr"
                    :src="m.mc" :groupe-id="state.g.id" :args-click="m" @click-mc="ouvrirmc"/>
                </div>
              </div>
            </div>
          </div>
        </q-card>
      </div>
    </q-expansion-item>
    <q-separator/>

    <q-dialog v-if="sessionok" v-model="ardedit">
      <q-card-section class="petitelargeur shadow-8">
        <div class="titre-md">Ardoise commune avec le groupe</div>
        <editeur-md class="height-8" v-model="mbcard" :texte="mbc.ard" editable @ok="changerardmbc" label-ok="OK" :close="fermermajard"/>
      </q-card-section>
    </q-dialog>

    <q-dialog v-if="sessionok" v-model="infoedit">
      <q-card-section class="petitelargeur shadow-8">
        <div class="row justify-between align-start">
          <div class="col titre-md">Commentaires personnels à propos du groupe</div>
          <q-btn class="col-auto q-ml-sm" flat round dense icon="close" color="negative" size="md" @click="infoedit = false" />
        </div>
        <editeur-md class="height-8" v-model="mbcinfo" :texte="mbc.info" editable @ok="changerinfombc" label-ok="OK" :close="fermermajinfo"/>
      </q-card-section>
    </q-dialog>

    <q-dialog v-if="sessionok" v-model="mcledit">
      <select-motscles :motscles="state.motsclesGr" :src="mbc.mc" @ok="changermcmbc" :close="fermermcl"></select-motscles>
    </q-dialog>

    <q-dialog v-if="sessionok" v-model="panelinvit">
      <q-card class="petitelargeur shadow-8">
      <q-card-section>
        <div class="titre-lg">Enregistrement d'un nouveau contact</div>
      </q-card-section>
      <q-separator/>
      <q-card-section>
        <div v-if="clipboard === null">
          <div class="text-italic titre-md">Sélectionner dans les listes de contacts ou des membres des groupes l'avatar à enregistrer comme simple contact du groupe.</div>
          <div class="titre-md">L'option de menu <span class="titre-lg text-bold text-grey-8 bg-yellow-4 q-mx-sm">[Contact !]</span> ramènera à ce dialogue pour valider (ou non) l'inscription du contact.</div>
        </div>
      </q-card-section>
      <q-card-section v-if="state.diagInvit !== null">
        <div :class="state.diagInvit[0] === 2 ? 'text-negative text-bold fs-lg':''">{{state.diagInvit[1]}}</div>
      </q-card-section>
      <q-card-section v-if="state.nacopie !== null">
        <div class="titre-lg">Avatar sélectionné : {{state.nacopie.nom}}</div>
        <div class="q-my-sm row">
          <img class="col-auto photomax" :src="state.nacopie.photo || phdefa"/>
          <show-html class="col q-ml-md bord1 height-6" :texte="state.nacopie.info || ''"/>
        </div>
      </q-card-section>
      <q-card-actions align="center" vertical>
        <q-btn flat dense color="primary" icon="close" label="Renoncer" @click="fermerPanelInvit"/>
        <q-btn v-if="clipboard !== null" flat dense color="warning" icon="undo" label="Je veux rechercher un autre contact" @click="inviterAtt"/>
        <q-btn v-if="clipboard !== null" :disable="state.diagInvit && state.diagInvit[0] === 2" dense color="warning"
          icon="check" label="Je valide ce nouveau contact" @click="validerContact"/>
        <q-btn v-if="clipboard === null" dense color="warning" label="J'ai compris, je vais chercher mon contact" @click="inviterAtt"/>
      </q-card-actions>
      </q-card>
    </q-dialog>

    <q-dialog v-if="sessionok" v-model="invitcontact">
      <q-card class="petitelargeur shadow-8">
      <q-card-section>
        <div class="titre-lg">Invitation d'un contact à être membre du groupe</div>
      </q-card-section>
      <q-separator/>
      <q-card-section>
        <div class="titre-lg">Contact sélectionné : {{mbc.nom}}</div>
        <div class="q-my-sm row">
          <img class="col-auto photomax" :src="mbc.ph || phdefa"/>
          <show-html class="col q-ml-md bord1 height-6" :texte="mbc.cv.info || ''"/>
        </div>
      </q-card-section>
      <q-card-section>
        <div class="q-gutter-md q-ma-sm">
          <q-radio dense v-model="laa" :val="0" label="Lecteur" />
          <q-radio dense v-model="laa" :val="1" label="Auteur" />
          <q-radio dense v-model="laa" :val="2" label="Animateur" />
        </div>
      </q-card-section>
      <q-card-actions align="center" vertical>
        <q-btn flat dense color="primary" icon="close" label="Annuler" @click="invitcontact=false"/>
        <q-btn dense color="warning" label="Inviter ce contact" @click="inviter"/>
      </q-card-actions>
      </q-card>
    </q-dialog>

  </q-card>
</template>
<script>
import { computed, reactive, watch, ref, toRef, onMounted } from 'vue'
import { useStore } from 'vuex'
import { useQuasar } from 'quasar'
import { Motscles, equ8, cfg, FiltreMbr, getJourJ } from '../app/util.mjs'
import { data } from '../app/modele.mjs'
import {
  MajMcGroupe, MajArchGroupe, MajBIGroupe, MajMcMembre, MajArdMembre, MajInfoMembre, FinHebGroupe, DebHebGroupe, MajvmaxGroupe,
  /* ContactGroupe, */ InviterGroupe, MajCv
} from '../app/operations.mjs'
import ShowHtml from './ShowHtml.vue'
import ApercuMotscles from './ApercuMotscles.vue'
import IdentiteCv from './IdentiteCv.vue'
import MotsCles from './MotsCles.vue'
import EditeurMd from './EditeurMd.vue'
import SelectMotscles from './SelectMotscles.vue'
import ChoixForfaits from './ChoixForfaits.vue'
import { retourInvitation } from '../app/page.mjs'

export default ({
  name: 'PanelGroupe',

  components: { ShowHtml, ApercuMotscles, MotsCles, ChoixForfaits, IdentiteCv, SelectMotscles, EditeurMd },

  props: { groupe: Object, suivant: Function, precedent: Function, index: Number, sur: Number },

  computed: {
    anim () { return this.state.maxstp === 2 },
    modif () {
      const c = this.contact
      if (!c) return false
      const s = this.state
      return c.info !== s.info || c.ard !== s.ard || !equ8(c.mc, s.mc) || s.aps !== (c.stx === 1)
    }
  },

  data () {
    return {
      erreur: '',
      mbcard: '',
      mbcinfo: '',
      laa: 0,
      mbc: null // membre courant
    }
  },

  methods: {
    dkli (idx) { return this.$q.dark.isActive ? (idx ? 'sombre' + (idx % 2) : 'sombre0') : (idx ? 'clair' + (idx % 2) : 'clair0') },
    nbj (j) { return j - getJourJ() },
    fermermajard () { this.ardedit = false },
    fermermajinfo () { this.infoedit = false },
    ouvmajinfo (m) { this.infoedit = true; this.mbc = m; this.mbcinfo = m.info },
    ouvmajard (m) { this.ardedit = true; this.mbc = m; this.mbcard = m.ard },
    ouvrirmc (m) { this.mcledit = true; this.mbc = m },
    fermermcl () { this.mcledit = false },

    voirsecrets () {
      this.evtfiltresecrets = { cmd: 'fsg', arg: this.groupe }
    },

    nouveausecret () {
      this.evtfiltresecrets = { cmd: 'nvg', arg: this.groupe }
    },

    async cvchangee (cv) {
      await new MajCv().run(cv)
    },
    async changermcl (mmc) {
      new MajMcGroupe().run(this.state.g, mmc)
    },
    async bloquer () {
      await new MajBIGroupe().run(this.state.g, true)
    },
    async debloquer () {
      await new MajBIGroupe().run(this.state.g, false)
    },
    async changermcmbc (mc) {
      await new MajMcMembre().run(this.mbc, mc)
    },
    async changerardmbc (texte) {
      await new MajArdMembre().run(this.mbc, texte)
      this.ardedit = false
    },
    async changerinfombc (texte) {
      await new MajInfoMembre().run(this.mbc, texte)
      this.infoedit = false
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
    copier (m) {
      retourInvitation(m)
    },
    ouvririnvitcontact (m) {
      this.mbc = m
      this.laa = 0
      this.invitcontact = true
    },

    async debheb () {
      const imh = this.state.g.imDeId(this.avatar.id)
      await new DebHebGroupe().run(this.state.g, imh)
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
      // eslint-disable-next-line no-unused-vars
      const id = this.state.nacopie.id
      this.state.nacopie = null
      this.clipboard = null
      this.invitationattente = null
      // await new ContactGroupe().run(this.state.g, id, this.avatar.id)
      this.panelinvit = false
    },
    async inviter () {
      await new InviterGroupe().run(this.state.g, this.mbc, this.laa)
      this.invitcontact = false
    },
    // TODO
    autoresilier (m) {
    },
    resilier (m) {
    },
    accepterinvit (m) {
    }
  },

  setup (props) {
    const $q = useQuasar()
    const $store = useStore()
    const sessionok = computed(() => { return $store.state.ui.sessionok })
    const mcledit = ref(false)
    const ardedit = ref(false)
    const infoedit = ref(false)
    const invitcontact = ref(false)

    const groupe = toRef(props, 'groupe')
    const avatargrform = computed({
      get: () => $store.state.ui.avatargrform,
      set: (val) => $store.commit('ui/majavatargrform', val)
    })

    const phdefg = cfg().groupe
    const phdefa = cfg().avatar
    const avatar = computed(() => { return $store.state.db.avatar })

    const diagnostic = computed({
      get: () => $store.state.ui.diagnostic,
      set: (val) => $store.commit('ui/majdiagnostic', val)
    })
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
      let nbvote = 0
      for (const im in membres.value) {
        const m = membres.value[im]
        if (f.filtre(m)) lst.push(m)
        if (m.estAc) { lstAc.push(m); if (m.stp > maxstp) maxstp = m.stp }
        if (m.stp === 2) nbanim++
        if (m.stp === 2 && m.vote) nbvote++
      }
      state.lst = lst
      state.lstAc = lstAc
      state.maxstp = maxstp
      state.nbanim = nbanim
      state.nbvote = nbvote
    }

    function trier () {
      const l = []; state.lst.forEach(x => l.push(x))
      l.sort((a, b) => state.filtre.fntri(a, b))
      state.lst = l
    }

    function checkcb () {
      const na = clipboard.value
      if (!na) return
      /*
      let na
      if (ap.table === 'couple') {
        na = ap.naE
      } else if (ap.table === 'membre') {
        na = ap.namb
      } else if (ap.table === 'avatar') {
        na = ap.na
      } else {
        state.diagInvit = [2, 'Sélectionner un contact, un membre d\'un groupe ou un avatar du compte']
        return
      }
      */
      state.nacopie = na
      for (const im in membres.value) {
        const m = membres.value[im]
        if (na.id === m.namb.id) {
          if (m.stx === 2) {
            state.diagInvit = [2, 'L\'invité est déjà un membre actif du groupe']
            return
          }
          if (m.stx === 0) {
            state.diagInvit = [1, 'L\'invité est un membre du groupe qui avait été pressenti']
            return
          }
          if (m.stx === 3) {
            state.diagInvit = [1, 'L\'invité avait déjà été invité et avait décliné l\'invitation']
            return
          }
          if (m.stx === 4) {
            state.diagInvit = [1, 'L\'invité avait été membre actif puis a été résilié']
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
        checkcb()
      })

      watch(() => sessionok.value, (ap, av) => {
        if (ap) {
          mcledit.value = false
          ardedit.value = false
          infoedit.value = false
          panelinvit.value = false
          invitcontact.value = false
        }
      })
    }

    onMounted(() => {
      tousleswatch()
      checkcb()
    })

    initState()
    chargerMcGr()
    chargerMc()
    getMembres()
    trier()

    return {
      sessionok,
      avatargrform,
      phdefa,
      phdefg,
      avatar,
      recherche,
      state,
      diagnostic,
      mode,
      options: ['Tous', 'Pressentis', 'Invités', 'Actifs', 'Inactivés', 'Refusés', 'Résiliés', 'Disparus'],
      statuts: ['simple contact', 'invité', 'actif', 'refusé', 'résilié', 'disparu'],
      invitationattente,
      panelinvit,
      clipboard,
      mcledit,
      ardedit,
      infoedit,
      invitcontact
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
</style>
