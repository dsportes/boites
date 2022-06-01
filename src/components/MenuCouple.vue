<template>
  <q-menu transition-show="scale" transition-hide="scale">
    <q-list dense style="min-width: 10rem">
      <q-item v-if="c" clickable v-close-popup @click="detail">
        <q-item-section>Détail et édition du contact</q-item-section>
      </q-item>
      <q-item v-if="!c" clickable v-close-popup @click="liste">
        <q-item-section>Liste des contacts</q-item-section>
      </q-item>
      <q-separator />
      <q-item v-if="invitationattente" clickable v-close-popup @click="copier">
        <q-item-section class="titre-lg text-bold text-grey-8 bg-yellow-4 q-mx-sm text-center">[Contact !]</q-item-section>
      </q-item>
      <q-separator v-if="a"/>
      <q-item v-if="a" clickable v-close-popup @click="acceptctc=true">
        <q-item-section>Accepter la proposition de contact</q-item-section>
      </q-item>
      <q-separator v-if="a"/>
      <q-item v-if="a" clickable v-close-popup @click="declctc=true">
        <q-item-section>Décliner la proposition de contact</q-item-section>
      </q-item>
      <q-separator v-if="r" />
      <q-item v-if="r" clickable v-close-popup @click="supprimer">
        <q-item-section>Supprimer le contact</q-item-section>
      </q-item>
      <q-separator v-if="q" />
      <q-item v-if="q" clickable v-close-popup @click="quitter">
        <q-item-section>Suspendre ma participation au contact</q-item-section>
      </q-item>
      <q-separator v-if="q" />
      <q-item clickable v-close-popup @click="voirsecrets">
        <q-item-section>Voir les secrets partagés</q-item-section>
      </q-item>
      <q-separator />
      <q-item clickable v-close-popup @click="nouveausecret">
        <q-item-section>Nouveau secret partagé</q-item-section>
      </q-item>
    </q-list>
  </q-menu>

  <q-dialog v-model="acceptctc">
    <q-card class="q-ma-xs moyennelargeur fs-md">
      <q-card-section class="column items-center">
        <div class="titre-lg text-center">Accepter une proposition de contact</div>
      </q-card-section>
      <q-card-section>
        <div>Volumes v1 / v2 maximaux déclarés par {{nomE}} pour les secrets du contact :</div>
        <choix-forfaits v-model="vmax1" lecture :f1="c.avc===0 ? c.mx10 : c.mx11" :f2="c.avc===0 ? c.mx20 : c.mx21"/>
      </q-card-section>
      <q-card-section>
        <div>Volumes v1 / v2 maximaux fixés par vous-même :</div>
        <choix-forfaits v-model="vmax" :f1="1" :f2="1" :v1="c.v1" :v2="c.v2"/>
      </q-card-section>
      <q-card-section>
        <div>Message de remerciement ... sur l'ardoise commune</div>
        <editeur-md class="full-width height-8" v-model="ard" :texte="c.ard" editable modetxt/>
      </q-card-section>
    <q-card-actions>
      <q-btn flat color="primary" label="Je réfléchis encore" v-close-popup/>
      <q-btn flat color="warning" label="J'accepte" @click="accepter"/>
  </q-dialog>

  <q-dialog v-model="declctc">
    <q-card class="q-ma-xs moyennelargeur fs-md">
      <q-card-section class="column items-center">
        <div class="titre-lg text-center">Décliner une proposition de contact</div>
      </q-card-section>
      <q-card-section>
        <div>Remerciement / explication ... sur l'ardoise commune</div>
        <editeur-md class="full-width height-8" v-model="ard" :texte="c.ard" editable modetxt/>
      </q-card-section>
    <q-card-actions>
      <q-btn flat color="primary" label="Je réfléchis encore" v-close-popup/>
      <q-btn flat color="warning" label="Je décline" @click="decliner"/>
  </q-dialog>

</template>
<script>
import { computed, toRef } from 'vue'
import { useStore } from 'vuex'
import { retourInvitation } from '../app/page.mjs'
import { ProlongerCouple, QuitterCouple, RelancerCouple, AccepterCouple, DeclinerCouple } from '../app/operations.mjs'
import { useQuasar } from 'quasar'

export default ({
  name: 'MenuCouple',
  components: { },
  props: { c: Object },
  computed: {
    nom () { const x = this.c ? this.c : this.couple; return x.nomE },
    s () { const x = this.c ? this.c : this.couple; return x.stp <= 2 },
    p () { const x = this.c ? this.c : this.couple; return x.stp === 1 },
    q () { const x = this.c ? this.c : this.couple; return x.stp === 3 || x.stp === 4 },
    r () { const x = this.c ? this.c : this.couple; return x.stp === 4 && x.ste !== 1 },
    a () { const x = this.c ? this.c : this.couple; return x.stp === 1 && x.ste !== 1 }
  },

  data () {
    return {
      acceptctc: false,
      declctc: false,
      vmax: [1, 1],
      vmax1: [1, 1],
      ard: ''
    }
  },

  methods: {
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
        this.evtfiltresecrets = { cmd: 'fsc', arg: this.c ? this.c : this.couple }
      }, 100)
    },

    nouveausecret () {
      if (this.c) this.couple = this.c
      this.tabavatar = 'secrets'
      setTimeout(() => {
        this.evtfiltresecrets = { cmd: 'nvc', arg: this.c ? this.c : this.couple }
      }, 100)
    },

    copier () {
      retourInvitation(this.c ? this.c : this.couple)
    },

    async accepter () {
      const x = this.c || this.couple
      await new AccepterCouple().run(x, this.avatar.id, this.ard, this.vmax)
    },

    async decliner () {
      const x = this.c || this.couple
      await new DeclinerCouple().run(x, this.avatar.value.id, this.ard)
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

    function prolonger () {
      const x = c.value || couple.value
      const lbl = [
        'La proposition de contact peut être prolongée de 20 jours.',
        'La proposition de parrainage peut être prolongée de 20 jours.',
        'La proposition de contact (par phrase de rencontre) peut être prolongée de 20 jours.'
      ]
      $q.dialog({
        dark: true,
        title: 'Confirmer la prolongation',
        message: lbl[x.orig],
        cancel: { label: 'Je renonce', color: 'primary' },
        ok: { color: 'warning', label: 'Je veux la prolonger' },
        persistent: true
      }).onOk(async () => {
        await new ProlongerCouple().run(x, avatar.value.id)
      }).onCancel(() => {
      }).onDismiss(() => {
        // console.log('I am triggered on both OK and Cancel')
      })
    }

    function quitter () {
      const x = c.value || couple.value
      const lbl = [
        'Vous êtes seul(e) dans ce contact : le quitter revient à le supprimer et à perdre tous les secrets associés',
        x.nomE + ' restera seul(e) dans le contact et pourra continuer d\'accéder aux secrets'
      ]
      $q.dialog({
        dark: true,
        title: 'Se retirer du contact',
        message: x.stp === 3 ? lbl[1] : lbl[0],
        cancel: { label: 'Je reste', color: 'primary' },
        ok: { color: 'warning', label: x.stp === 3 ? 'Je quitte le contact' : 'Je supprime le contact' },
        persistent: true
      }).onOk(async () => {
        await new QuitterCouple().run(x, avatar.value.id)
      }).onCancel(() => {
      }).onDismiss(() => {
        // console.log('I am triggered on both OK and Cancel')
      })
    }

    function supprimer () {
      const x = c.value || couple.value
      const n = x.nomE
      const lbl = [
        `${n} n'a pas répondu favorablement dans les temps. Vous êtes seul(e) dans ce contact.`,
        `${n} n'a pas accepté la proposition de parrainage de son compte. Vous êtes seul(e) dans ce contact.`,
        `${n} n'a pas accepté répondu à la proposition de contact par phrase de rencontrerencontre faite. Vous êtes seul(e) dans ce contact.`
      ]
      $q.dialog({
        dark: true,
        title: 'Confirmer la suppression du contact',
        message: lbl[x.orig] + ' Tous les secrets seront perdus.',
        cancel: { label: 'Je renonce à la suppression', color: 'primary' },
        ok: { color: 'warning', label: 'Je supprime le contact' },
        persistent: true
      }).onOk(async () => {
        await new QuitterCouple().run(x, avatar.value.id)
      }).onCancel(() => {
      }).onDismiss(() => {
        // console.log('I am triggered on both OK and Cancel')
      })
    }

    function relancer () {
      const x = c.value || couple.value
      const n = x.nomE
      const lbl = `${n} s'est retiré du contact. Vous pouvez essayer de la.le relancer pour qu'elle.il accepte de le rétablir`
      $q.dialog({
        dark: true,
        title: `Relancer ${n}`,
        message: lbl,
        cancel: { label: 'Je ne relance pas', color: 'primary' },
        ok: { color: 'warning', label: `Je relance ${n}` },
        persistent: true
      }).onOk(async () => {
        await new RelancerCouple().run(x, avatar.value.id)
      }).onCancel(() => {
      }).onDismiss(() => {
        // console.log('I am triggered on both OK and Cancel')
      })
    }

    return {
      prolonger,
      quitter,
      supprimer,
      relancer,
      couple,
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
</style>
