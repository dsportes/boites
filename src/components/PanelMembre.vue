<template>
<q-card :class="dkli(idx) + ' shadow-8 zone q-px-xs full-width row items-start'">
  <div class="col">
    <identite-cv :nom-avatar="m.namb" type="avatar" :idx="idx"/>

    <div>
      <q-icon v-if="m.estAc" class="q-mr-xs" size="sm" color="warning" name="stars"/>
      <span v-if="m.estAc" class="q-mr-sm text-bold text-warning">MOI</span>
      <q-icon size="sm" :color="m.stx === 2 ?'primary':'warning'"
        :name="m.stx < 2 ? 'hourglass_empty' : (m.stx === 2 ? 'thumb_up' : 'thumb_down')"/>
      <span class="q-px-sm">{{statuts[m.stx]}}</span>
      <span v-if="m.stx !== 0" class="q-px-sm" :color="m.stp < 2 ?'primary':'warning'">{{['Lecteur','Auteur','Animateur'][m.stp]}}</span>
      <span v-if="g.imh === m.im" class="q-px-xs text-bold text-italic text-warning">Hébergeur du groupe</span>
    </div>

    <div v-if="m.ard" class="row justify-between cursor-pointer zone items-start" @click="ouvmajard">
      <div class="col-auto q-pr-sm titre-md">Ardoise :</div>
      <show-html class="col" style="height:1.8rem;overflow:hidden" :texte="m.ard" :idx="idx"/>
      <div class="col-auto q-pl-sm fs-sm">{{m.dhed}}</div>
    </div>
    <div v-else class="fs-sm cursor-pointer zone" @click="ouvmajard">(rien sur l'ardoise partagée avec le groupe)</div>

    <div v-if="m.estAc">
      <div v-if="m.info" class="zone cursor-pointer" @click="ouvmajinfo">
        <div class="titre-md">Titre et commentaires à propos du groupe</div>
        <show-html class="height-2" :texte="m.info" :idx="idx"/>
      </div>
      <div v-else class="fs-sm cursor-pointer zone" @click="ouvmajinfo">(pas de commentaire à propos du groupe)</div>
      <div class="zone cursor-pointer" @click="ouvrirmc">
        <span class="titre-sm q-pr-sm">Mots clés :</span>
        <apercu-motscles :motscles="state.motsclesGr" :src="m.mc" :groupe-id="g.id" :args-click="m" @click-mc="ouvrirmc"/>
      </div>
    </div>
  </div>

  <q-btn class="col-auto q-ml-sm" size="md" icon="menu" flat dense>
    <q-menu transition-show="scale" transition-hide="scale">
      <q-list dense class="bord1">
        <q-item v-if="invitationattente" clickable v-ripple v-close-popup @click="copier">
          <q-item-section class="titre-lg text-bold text-grey-8 bg-yellow-4 q-mx-sm text-center">[Contact !]</q-item-section>
        </q-item>
        <q-separator v-if="invitationattente && m.stx === 0 && g.maxStp() === 2"/>
        <q-item v-if="(m.stx === 0 || m.stx === 3 || m.stx === 4) && g.maxStp() === 2" clickable v-ripple v-close-popup @click="ouvririnvitcontact">
          <q-item-section avatar>
            <q-icon dense name="open_in_new" color="primary" size="md"/>
          </q-item-section>
          <q-item-section>Inviter ce contact</q-item-section>
        </q-item>
        <q-separator v-if="m.stx === 1 && m.estAc"/>
        <q-item v-if="m.stx === 1 && m.estAc" clickable v-ripple v-close-popup @click="accepterinvit">
          <q-item-section avatar>
            <q-icon dense name="check" color="primary" size="md"/>
          </q-item-section>
          <q-item-section>Accepter l'invitation</q-item-section>
        </q-item>
        <q-separator v-if="m.stx === 1 && m.estAc" />
        <q-item v-if="m.stx === 1 && m.estAc" clickable v-ripple v-close-popup @click="refuserinvit">
          <q-item-section avatar>
            <q-icon dense name="not_interested" color="primary" size="md"/>
          </q-item-section>
          <q-item-section>Refuser l'invitation</q-item-section>
        </q-item>
        <q-separator v-if="g.maxStp() === 2 && m.stx >= 1 && m.stx <= 2 && m.stp < 2" />
        <q-item v-if="g.maxStp() === 2 && m.stx >= 1 && m.stx <= 2 && m.stp < 2" clickable v-ripple v-close-popup @click="resilier">
          <q-item-section avatar>
            <q-icon dense name="close" color="warning" size="sm"/>
          </q-item-section>
          <q-item-section>Résilier du groupe</q-item-section>
        </q-item>
        <q-separator v-if="m.stp === 2 && m.estAc"/>
        <q-item v-if="m.stx === 2 && m.estAc" clickable v-ripple v-close-popup @click="autoresilier">
          <q-item-section avatar>
            <q-icon dense name="close" color="warning" size="sm"/>
          </q-item-section>
          <q-item-section>S'auto-résilier du groupe</q-item-section>
        </q-item>
        <q-separator v-if="g.maxStp() === 2 && m.stx >= 1 && m.stx <= 2 && (m.stp < 2 || m.estAc)" />
        <q-item v-if="g.maxStp() === 2 && m.stx >= 1 && m.stx <= 2 && (m.stp < 2 || m.estAc)" clickable v-ripple v-close-popup @click="changerlaa">
          <q-item-section avatar>
            <q-icon dense name="close" color="warning" size="sm"/>
          </q-item-section>
          <q-item-section>Changer le niveau d'habilitation</q-item-section>
        </q-item>
      </q-list>
    </q-menu>
  </q-btn>

  <q-dialog v-if="sessionok" v-model="ardedit">
    <q-card class="petitelargeur shadow-8">
      <q-card-section>
        <div class="row justify-between items-start q-yb-md">
          <div class="titre-md">Ardoise commune avec le groupe</div>
          <q-btn class="col-auto q-ml-sm btn1" flat round dense icon="close" color="negative" size="md" @click="ardedit = false" />
        </div>
        <editeur-md class="height-8" v-model="mbcard" :texte="m.ard" @ok="changerardmbc" editable label-ok="OK"/>
      </q-card-section>
    </q-card>
  </q-dialog>

  <q-dialog v-if="sessionok" v-model="infoedit">
    <q-card class="petitelargeur shadow-8">
      <q-card-section>
        <div class="row justify-between items-start q-yb-md">
          <div class="col titre-md">Commentaires personnels à propos du groupe</div>
          <q-btn class="col-auto q-ml-sm btn1" flat round dense icon="close" color="negative" size="md" @click="infoedit = false" />
        </div>
        <editeur-md class="height-8" v-model="mbcinfo" :texte="m.info"
          editable @ok="changerinfombc" label-ok="OK" :close="fermermajinfo"/>
      </q-card-section>
    </q-card>
  </q-dialog>

  <q-dialog v-if="sessionok" v-model="mcledit">
    <select-motscles :motscles="state.motsclesGr" :src="m.mc" @ok="changermcmbc" :close="fermermcl"></select-motscles>
  </q-dialog>

  <q-dialog v-if="sessionok" v-model="invitcontact">
    <q-card class="petitelargeur shadow-8">
      <q-card-section>
        <div class="titre-lg">Invitation d'un contact à être membre du groupe</div>
      </q-card-section>
      <q-separator/>
      <q-card-section>
        <div class="titre-lg">Contact sélectionné : {{m.namb.nom}}</div>
        <div class="q-my-sm row">
          <img class="col-auto photomax" :src="m.namb.photo || phdefa"/>
          <show-html class="col q-ml-md bord1 height-6" :texte="m.namb.info || ''"/>
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

  <q-dialog v-if="sessionok" v-model="modiflaa">
    <q-card class="petitelargeur shadow-8">
      <q-card-section>
        <div class="titre-lg">Modification du niveau d'habilitation</div>
      </q-card-section>
      <q-separator/>
      <q-card-section>
        <div class="titre-lg">Membre sélectionné : {{m.namb.nom}}</div>
        <div class="q-my-sm row">
          <img class="col-auto photomax" :src="m.namb.photo || phdefa"/>
          <show-html class="col q-ml-md bord1 height-6" :texte="m.namb.info || ''"/>
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
        <q-btn flat dense color="primary" icon="close" label="Annuler" @click="modiflaa=false"/>
        <q-btn dense color="warning" label="Modifier le niveau"
          :disable="laa === m.stp" @click="modifierlaa"/>
      </q-card-actions>
    </q-card>
  </q-dialog>

</q-card>
</template>
<script>
import { computed, reactive, watch, ref, toRef } from 'vue'
import { useStore } from 'vuex'
// import { useQuasar } from 'quasar'
import { Motscles, cfg, afficherdiagnostic } from '../app/util.mjs'
import { data } from '../app/modele.mjs'
import ShowHtml from './ShowHtml.vue'
import IdentiteCv from './IdentiteCv.vue'
import SelectMotscles from './SelectMotscles.vue'
import ApercuMotscles from './ApercuMotscles.vue'
import EditeurMd from './EditeurMd.vue'
import { MajLAAMembre, AcceptInvitGroupe, RefusInvitGroupe, MajMcMembre, MajArdMembre, MajInfoMembre, InviterGroupe, ResilierMembreGroupe } from '../app/operations.mjs'
import { retourInvitation } from '../app/page.mjs'

export default ({
  name: 'PanelGroupe',

  components: { ShowHtml, ApercuMotscles, IdentiteCv, SelectMotscles, EditeurMd },

  props: { groupe: Object, membre: Object, idx: Number },

  computed: { },

  data () {
    return {
      mbcard: '',
      mbcinfo: '',
      laa: 0
    }
  },

  methods: {
    dkli (idx) { return this.$q.dark.isActive ? (idx ? 'sombre' + (idx % 2) : 'sombre0') : (idx ? 'clair' + (idx % 2) : 'clair0') },

    ouvrirmc () { this.mcledit = true },
    fermermcl () { this.mcledit = false },
    ouvmajard () { this.ardedit = true; this.mbcard = this.m.ard },
    fermermajard () { this.ardedit = false },
    ouvmajinfo () { this.infoedit = true; this.mbcinfo = this.m.info },
    fermermajinfo () { this.infoedit = false },
    ouvririnvitcontact () { this.laa = 0; this.invitcontact = true },
    changerlaa () { this.laa = this.m.stp; this.modiflaa = true },

    async changermcmbc (mc) {
      await new MajMcMembre().run(this.m, mc)
      this.mcledit = false
    },
    async changerardmbc (texte) {
      await new MajArdMembre().run(this.m, texte)
      this.ardedit = false
    },
    async changerinfombc (texte) {
      await new MajInfoMembre().run(this.m, texte)
      this.infoedit = false
    },

    copier () {
      retourInvitation(this.m.namb)
    },

    async inviter () {
      await new InviterGroupe().run(this.g.na, this.m, this.laa)
      this.invitcontact = false
    },

    async autoresilier () {
      let msg = 'Voulez-vous vraiment vous auto-résilier du groupe ? '
      if (this.g.imh === this.m.im) msg += 'Vous êtes hébergeur du groupe : après auto-résiliation le groupe sera bloqué en lecture puis disparaîtra. '
      if (this.g.nbActifsInvites() === 1) msg += 'Vous êtes le dernier membre actif du groupe: après auto-résiliation le groupe sera détruit'
      this.$q.dialog({
        dark: true,
        title: 'Confirmer l\'auto-résiliation',
        message: msg,
        cancel: { label: 'Je renonce', color: 'primary' },
        ok: { color: 'warning', label: 'Je confirme mon auto-résiliation' },
        persistent: true
      }).onOk(async () => {
        await new ResilierMembreGroupe().run(this.m)
      }).onCancel(() => {
      }).onDismiss(() => {
        // console.log('I am triggered on both OK and Cancel')
      })
    },
    async resilier () {
      if (this.g.imh === this.m.im) {
        afficherdiagnostic('Impossible de résilier l\'hébergeur du groupe')
      } else {
        await new ResilierMembreGroupe().run(this.m)
      }
    },
    async accepterinvit () {
      await new AcceptInvitGroupe().run(this.m)
    },
    async refuserinvit () {
      await new RefusInvitGroupe().run(this.m, this.avatar)
    },
    async modifierlaa () {
      await new MajLAAMembre().run(this.g, this.m.im, this.laa)
    }
  },

  setup (props) {
    // const $q = useQuasar()
    const $store = useStore()
    const sessionok = computed(() => { return $store.state.ui.sessionok })
    const mcledit = ref(false)
    const ardedit = ref(false)
    const infoedit = ref(false)
    const invitcontact = ref(false)
    const modiflaa = ref(false)

    const g = toRef(props, 'groupe')
    const m = toRef(props, 'membre')

    const phdefa = cfg().avatar
    const avatar = computed(() => { return $store.state.db.avatar })

    const invitationattente = computed({
      get: () => $store.state.ui.invitationattente,
      set: (val) => $store.commit('ui/majinvitationattente', val)
    })
    const mode = computed(() => $store.state.ui.mode)
    const prefs = computed(() => { return data.getPrefs() })
    const cvs = computed(() => { return $store.state.db.cvs })

    const mc = reactive({ categs: new Map(), lcategs: [], st: { enedition: false, modifie: false } })

    const state = reactive({
      motclesGr: null
    })

    function chargerMc () {
      state.motsclesGr = new Motscles(mc, 3, g.value ? g.value.id : 0)
      state.motsclesGr.recharger()
    }

    chargerMc()

    watch(() => prefs.value, (ap, av) => {
      if (!sessionok.value) return
      chargerMc()
    })

    watch(() => m.value, (ap, av) => {
      if (!sessionok.value) return
      chargerMc()
    })

    watch(() => g.value, (ap, av) => {
      if (!sessionok.value) return
      chargerMc()
    })

    watch(() => cvs.value, (ap, av) => {
    })

    watch(() => sessionok.value, (ap, av) => {
      if (ap) {
        mcledit.value = false
        ardedit.value = false
        infoedit.value = false
        invitcontact.value = false
        modiflaa.value = false
      }
    })

    return {
      g,
      m,
      sessionok,
      phdefa,
      avatar,
      state,
      mode,
      options: ['Tous', 'Pressentis', 'Invités', 'Actifs', 'Inactivés', 'Refusés', 'Résiliés', 'Disparus'],
      statuts: ['simple contact', 'invité', 'actif', 'refusé', 'résilié', 'disparu'],
      invitationattente,
      mcledit,
      ardedit,
      infoedit,
      invitcontact,
      modiflaa
    }
  }
})
</script>
<style lang="sass" scoped>
@import '../css/app.sass'
.btn1
  position: relative
  top: -5px
.bord1
  border:  1px solid $grey-5
  min-width: 20rem
.itemcourant:hover
  border: 1px solid $warning
.itemcourant
  border: 1px solid transparent
</style>
