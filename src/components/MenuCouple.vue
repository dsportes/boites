<template>
  <q-menu transition-show="scale" transition-hide="scale">
    <q-list dense style="min-width: 10rem">
      <q-item v-if="!depuisDetail" clickable v-close-popup @click="detail">
        <q-item-section>Détail et édition du contact</q-item-section>
      </q-item>
      <q-item v-if="depuisDetail" clickable v-close-popup @click="liste">
        <q-item-section>Liste des contacts</q-item-section>
      </q-item>
      <q-separator />
      <q-item v-if="invitationattente" clickable v-close-popup @click="copier">
        <q-item-section class="titre-lg text-bold text-grey-8 bg-yellow-4 q-mx-sm text-center">[Contact !]</q-item-section>
      </q-item>
      <q-separator v-if="ppc"/>
      <q-item v-if="ppc" clickable v-close-popup @click="acceptctc=true">
        <q-item-section>Accepter la proposition de contact</q-item-section>
      </q-item>
      <q-separator v-if="ppc"/>
      <q-item v-if="ppc" clickable v-close-popup @click="declctc=true">
        <q-item-section>Décliner la proposition de contact</q-item-section>
      </q-item>
      <q-separator v-if="supp" />
      <q-item v-if="supp" clickable v-close-popup @click="supprimer">
        <q-item-section>Supprimer le contact</q-item-section>
      </q-item>
      <q-separator v-if="quit" />
      <q-item v-if="quit" clickable v-close-popup @click="suspendre">
        <q-item-section>Suspendre mes accès aux secrets</q-item-section>
      </q-item>
      <q-separator v-if="repc" />
      <q-item v-if="repc" clickable v-close-popup @click="reactacc=true">
        <q-item-section>Réactiver mes accès aux secrets</q-item-section>
      </q-item>
      <q-separator v-if="prlp" />
      <q-item v-if="prlp" clickable v-close-popup @click="prolonger(0)">
        <q-item-section>Prolonger ma proposition de parrainage</q-item-section>
      </q-item>
      <q-separator v-if="prlr" />
      <q-item v-if="prlr" clickable v-close-popup @click="prolonger(1)">
        <q-item-section>Prolonger ma proposition de contact</q-item-section>
      </q-item>
      <q-separator v-if="sec" />
      <q-item v-if="sec" clickable v-close-popup @click="voirsecrets">
        <q-item-section>Voir les secrets du contact</q-item-section>
      </q-item>
      <q-separator v-if="sec" />
      <q-item v-if="sec" clickable v-close-popup @click="nouveausecret">
        <q-item-section>Nouveau secret du contact</q-item-section>
      </q-item>
    </q-list>
  </q-menu>

  <q-dialog v-model="acceptctc" position="right" full-height>
    <q-card class="q-ma-xs petitelargeur fs-md">
      <q-toolbar class="bg-secondary text-white">
        <q-btn class="chl" dense flat size="md" icon="chevron_left" @click="declctc=false"/>
        <div class="titre-lg">Accepter la proposition de contact de {{c.nomE}}</div>
      </q-toolbar>
      <q-card-section>
        <div v-if="c.stE===1">{{c.nomE}} a choisi de partager des secrets par ce contact:<br>
          <div class="font-mono q-pl-md">Maximum v1: {{c.max1E}} - {{ed1(c.max1E)}}</div>
          <div class="font-mono q-pl-md">Maximum v2: {{c.max2E}} - {{ed2(c.max2E)}}</div>
        </div>
        <div v-else>{{c.nomE}} a choisi de NE PAS PARTAGER de secrets par ce contact</div>
        <div class="titre-lg">Volumes v1 / v2 maximaux déclarés par vous pour les secrets partagés par ce contact :</div>
        <div class="titre-md text-warning">Mettre 0 pour NE PAS PARTAGER de secrets</div>
        <choix-forfaits v-model="max" :f1="c.max1E" :f2="c.max2E"/>
      </q-card-section>
      <q-card-section>
        <div>Message de remerciement</div>
        <editeur-md class="full-width height-8" v-model="ard" :texte="c.ard" editable modetxt/>
      </q-card-section>
      <q-card-actions>
        <q-btn flat color="primary" label="Je réfléchis encore" v-close-popup/>
        <q-btn flat color="warning" label="J'accepte" @click="accepter"/>
      </q-card-actions>
    </q-card>
  </q-dialog>

  <q-dialog v-model="declctc" position="right" full-height>
    <q-card class="q-ma-xs petitelargeur fs-md">
      <q-toolbar class="bg-secondary text-white">
        <q-btn class="chl" dense flat size="md" icon="chevron_left" @click="declctc=false"/>
        <div class="titre-lg">Décliner la proposition de contact de {{c.nomE}}</div>
      </q-toolbar>
      <q-card-section>
        <div>Remerciement / explication sur l'ardoise</div>
        <editeur-md class="full-width height-8" v-model="ard" :texte="c.ard" editable modetxt/>
      </q-card-section>
      <q-card-actions>
        <q-btn flat color="primary" label="Je réfléchis encore" v-close-popup/>
        <q-btn flat color="warning" label="Je décline" @click="decliner"/>
      </q-card-actions>
    </q-card>
  </q-dialog>

  <q-dialog v-model="reactacc" position="right" full-height>
    <q-card class="q-ma-xs petitelargeur fs-md">
      <q-toolbar class="bg-secondary text-white">
        <q-btn class="chl" dense flat size="md" icon="chevron_left" @click="reactacc=false"/>
        <div class="titre-lg">Réactiver l'accès aux secrets du contact avec {{c.nomE}}</div>
      </q-toolbar>
      <div class="q-mt-md text-center">Volumes occupés actuellement par les secrets du contact :
        <br><span>Volume V1 : {{edvol(c.v1)}}</span>
        <br><span>Volume V2 : {{edvol(c.v2)}}</span>
      </div>
      <q-card-section>
        <div v-if="c.stE===1">
          <div class="titre-md q-mt-lg">{{c.nomE}} partage les secrets par ce contact:
            <br><span class="font-mono q-pl-md">Maximum V1: {{c.max1E + ' - ' + ed1(c.max1E)}}</span>
            <br><span class="font-mono q-pl-md">Maximum V2: {{c.max2E + ' - ' + ed2(c.max2E)}}</span>
          </div>
        </div>
        <div v-else>
          <div class="titre-md q-mt-lg">{{c.nomE}} NE PARTAGE PAS les secrets par ce contact, le volume occupé actuellement est donc nul</div>
        </div>
        <div class="titre-md q-mt-lg">Volumes maximaux déclarés par vous pour les secrets partagés par ce contact :</div>
        <choix-forfaits v-model="max" :f1="c.max1E" :f2="c.max2E" :v1="c.v1" :v2="c.v2"/>
      </q-card-section>
      <q-card-actions>
        <q-btn flat class="q-ma-xs" color="primary" label="Je réfléchis encore" v-close-popup/>
        <q-btn flat class="q-ma-xs" color="warning" label="Je réactive l'accès aux secrets" @click="reactiver"/>
      </q-card-actions>
    </q-card>
  </q-dialog>

</template>
<script>
import { computed, toRef } from 'vue'
import { useStore } from 'vuex'
import { retourInvitation } from '../app/page.mjs'
import { cfg, edvol } from '../app/util.mjs'
import { AccepterCouple, DeclinerCouple, ProlongerParrainage, SupprimerCouple, SuspendreCouple, ReactiverCouple } from '../app/operations.mjs'
import { useQuasar } from 'quasar'
import ChoixForfaits from './ChoixForfaits.vue'
import EditeurMd from './EditeurMd.vue'
import { UNITEV1, UNITEV2 } from '../app/api.mjs'

export default ({
  name: 'MenuCouple',
  components: { ChoixForfaits, EditeurMd },
  props: { c: Object, depuisDetail: Boolean },
  computed: {
    nom () { const x = this.c || this.couple; return x.nomEd },
    sec () { const x = this.c || this.couple; return x.stp === 4 && x.stI === 1 },
    repc () { const x = this.c || this.couple; return x.stI === 0 && x.stp === 4 },
    quit () { const x = this.c || this.couple; return x.stI === 1 },
    supp () { const x = this.c || this.couple; return (x.stp < 4 && x.avc === 0) || x.stp === 5 },
    ppc () { const x = this.c || this.couple; return x.stp === 1 && x.orig === 0 && x.avc === 1 },
    prlp () { const x = this.c || this.couple; return x.stp === 1 && x.orig === 1 },
    prlr () { const x = this.c || this.couple; return x.stp === 1 && x.orig === 2 }
  },

  data () {
    return {
      acceptctc: false,
      declctc: false,
      reactacc: false,
      max: [1, 1],
      ard: '',
      edvol: edvol
    }
  },

  methods: {
    ed1 (f) { return edvol(f * UNITEV1) },
    ed2 (f) { return edvol(f * UNITEV2) },
    detail () {
      if (this.c) this.couple = this.c
      this.avatarcpform = true
    },

    liste () {
      this.avatarcpform = false
    },

    voirsecrets () {
      if (this.c) this.couple = this.c
      this.tabavatar = 'secrets'
      setTimeout(() => {
        this.evtfiltresecrets = { cmd: 'fsc', arg: this.c || this.couple }
      }, 100)
    },

    nouveausecret () {
      if (this.c) this.couple = this.c
      this.tabavatar = 'secrets'
      setTimeout(() => {
        this.evtfiltresecrets = { cmd: 'nvc', arg: this.c || this.couple }
      }, 100)
    },

    copier () {
      retourInvitation(this.c || this.couple)
    },

    async accepter () {
      const x = this.c || this.couple
      await new AccepterCouple().run(x, this.ard, this.max)
      this.acceptctc = false
    },

    async decliner () {
      const x = this.c || this.couple
      await new DeclinerCouple().run(x, this.avatar.id, this.ard)
      this.declctc = false
    },

    async reactiver () {
      const x = this.c || this.couple
      await new ReactiverCouple().run(x, this.avatar.id, this.max)
      this.reactacc = false
    }
  },

  setup (props) {
    const $store = useStore()
    const $q = useQuasar()
    const c = toRef(props, 'c')
    const avatar = computed(() => { return $store.state.db.avatar })

    const tabavatar = computed({
      get: () => $store.state.ui.tabavatar,
      set: (val) => $store.commit('ui/majtabavatar', val)
    })
    const avatarcpform = computed({
      get: () => $store.state.ui.avatarcpform,
      set: (val) => $store.commit('ui/majavatarcpform', val)
    })
    const invitationattente = computed({
      get: () => $store.state.ui.invitationattente,
      set: (val) => $store.commit('ui/majinvitationattente', val)
    })
    const evtfiltresecrets = computed({ // secret courant
      get: () => $store.state.ui.evtfiltresecrets,
      set: (val) => $store.commit('ui/majevtfiltresecrets', val)
    })
    const couple = computed({ // couple courant
      get: () => $store.state.db.couple,
      set: (val) => $store.commit('db/majcouple', val)
    })

    function prolonger (opt) {
      const x = c.value || couple.value
      const nj = cfg().limitesjour.parrainage
      const lbl = [
        `La proposition de parrainage peut être prolongée de ${nj} jours.`,
        `La proposition de contact (par phrase de rencontre) peut être prolongée de ${nj} jours.`
      ]
      $q.dialog({
        dark: true,
        title: 'Confirmer la prolongation',
        message: lbl[opt],
        cancel: { label: 'Je renonce', color: 'primary' },
        ok: { color: 'warning', label: 'Je veux la prolonger' },
        persistent: true
      }).onOk(async () => {
        await new ProlongerParrainage().run(x)
      }).onCancel(() => {
      }).onDismiss(() => {
        // console.log('I am triggered on both OK and Cancel')
      })
    }

    function suspendre () {
      const x = c.value || couple.value
      let m
      if (x.stI === 1) {
        m = `Vous n'accéderez plus aux secrets de ce contact, mais ${x.nomE} y accèdera toujours.`
      } else {
        m = `${x.nomE} n'accèdant plus aux secrets si vous confirmez ne plus vouloir y accéder non plus, TOUS LES SECRETS SERONT DETRUITS.`
      }
      $q.dialog({
        dark: true,
        title: 'Suspendre mon accès aux secrets du contact',
        message: m,
        cancel: { label: 'Je maintiens mon accès aux secrets', color: 'primary' },
        ok: { color: 'warning', label: 'Je suspend mon accès aux secrets' },
        persistent: true
      }).onOk(async () => {
        await new SuspendreCouple().run(x, avatar.value.id)
      }).onCancel(() => {
      }).onDismiss(() => {
        // console.log('I am triggered on both OK and Cancel')
      })
    }

    function supprimer () { // x.stp < 4 && x.avc === 1) || x.stp === 5
      const x = c.value || couple.value
      let lbl = x.nomE
      if (x.stp === 5) {
        lbl += ' a disparu, le contact va être supprimé et les secrets détruits.'
      } else if (x.orig === 0) {
        lbl += x.stp === 1 ? ' n\'a pas déclaré accepter ce contact.' : ' a refusé ce contact'
        lbl += ' Le contact va être supprimé.'
      } else if (x.orig === 1) {
        lbl += [
          ' n\'a pas déclaré accepter ce parrainage.',
          ' n\'a pas déclaré dans les délais accepter ce parrainage et ne peut plus le faire.',
          ' a refusé ce parrainage.'
        ][x.stp - 1]
        lbl += ' Le contact va être supprimé.'
      } else if (x.orig === 2) {
        lbl += [
          ' n\'a pas déclaré accepter ce contact en invoquant la phrase de rencontre.',
          ' n\'a pas invoqué la phrase de rencontre dans les délais et ne peut plus le faire.',
          ' a invoqué la phrase de rencontre mais a refusé le contact.'
        ][x.stp - 1]
        lbl += ' Le contact va être supprimé.'
      }
      $q.dialog({
        dark: true,
        title: 'Confirmer la suppression du contact',
        message: lbl,
        cancel: { label: 'Je renonce à la suppression', color: 'primary' },
        ok: { color: 'warning', label: 'Je supprime le contact' },
        persistent: true
      }).onOk(async () => {
        await new SupprimerCouple().run(x, avatar.value.id)
      }).onCancel(() => {
      }).onDismiss(() => {
        // console.log('I am triggered on both OK and Cancel')
      })
    }

    return {
      prolonger,
      suspendre,
      supprimer,
      couple,
      avatar,
      avatarcpform,
      evtfiltresecrets,
      tabavatar,
      invitationattente
    }
  }
})
</script>
<style lang="sass" scoped>
@import '../css/app.sass'
.q-list
  border: 3px solid $grey !important
.chl
  position: relative
  left: -10px
.q-toolbar
  padding: 2px !important
  min-height: 0 !important
</style>
