<template>
  <q-menu transition-show="scale" transition-hide="scale">
    <q-list dense style="min-width: 10rem">
      <q-item v-if="c" clickable v-close-popup @click="detail">
        <q-item-section>Détail et édition du couple</q-item-section>
      </q-item>
      <q-item v-if="!c" clickable v-close-popup @click="liste">
        <q-item-section>Liste des couples</q-item-section>
      </q-item>
      <q-separator />
      <q-item v-if="invitationattente" clickable v-close-popup @click="copier">
        <q-item-section class="titre-lg text-bold text-grey-8 bg-yellow-4 q-mx-sm text-center">[Contact !]</q-item-section>
      </q-item>
      <q-separator v-if="invitationattente"/>
      <q-item v-if="p" clickable v-close-popup @click="prolonger">
        <q-item-section>Prolonger la proposition faite à {{nom}}</q-item-section>
      </q-item>
      <q-separator v-if="p" />
      <q-item  v-if="r" clickable v-close-popup @click="relancer">
        <q-item-section>Relancer une proposition pour {{nom}}</q-item-section>
      </q-item>
      <q-separator v-if="r" />
      <q-item v-if="s" clickable v-close-popup @click="supprimer">
        <q-item-section>Supprimer le couple</q-item-section>
      </q-item>
      <q-separator v-if="s" />
      <q-item v-if="q" clickable v-close-popup @click="quitter">
        <q-item-section>Quitter le couple</q-item-section>
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
</template>
<script>
import { computed, toRef } from 'vue'
import { useStore } from 'vuex'
import { retourInvitation } from '../app/page.mjs'
import { ProlongerCouple, QuitterCouple, SupprimerCouple, RelancerCouple } from '../app/operations.mjs'
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
    r () { const x = this.c ? this.c : this.couple; return x.stp === 4 && x.ste !== 1 }
  },

  data () {
    return {
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
      this.tabavtar = 'secrets'
      setTimeout(() => {
        this.evtfiltresecrets = { cmd: 'nvc', arg: this.c ? this.c : this.couple }
      })
    },

    copier () {
      retourInvitation(this.c ? this.c : this.couple)
    }
  },
  setup (props) {
    const $store = useStore()
    const $q = useQuasar()
    const c = toRef(props, 'c')
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
        'La proposition de constituer un couple peut être prolongée de 20 jours.',
        'La proposition de parrainage peut être prolongée de 20 jours.',
        'La proposition de rencontre peut être prolongée de 20 jours.'
      ]
      $q.dialog({
        dark: true,
        title: 'Confirmer la prolongation',
        message: lbl[x.orig],
        cancel: { label: 'Je renonce', color: 'primary' },
        ok: { color: 'warning', label: 'Je veux la prolonger' },
        persistent: true
      }).onOk(async () => {
        await new ProlongerCouple().run(x)
      }).onCancel(() => {
      }).onDismiss(() => {
        // console.log('I am triggered on both OK and Cancel')
      })
    }

    function quitter () {
      const x = c.value || couple.value
      const lbl = [
        'Vous êtes seul(e) dans ce couple : le quitter revient à le supprimer et à perdre tous les secrets associés',
        x.nomE + ' restera seul(e) dans le couple et pourra continuer d\'accéder aux secrets'
      ]
      $q.dialog({
        dark: true,
        title: 'Quitter le couple',
        message: x.stp === 3 ? lbl[1] : lbl[0],
        cancel: { label: 'Je reste', color: 'primary' },
        ok: { color: 'warning', label: x.stp === 3 ? 'Je quitte le couple' : 'Je supprime le couple' },
        persistent: true
      }).onOk(async () => {
        if (x.stp === 3) {
          await new QuitterCouple().run(x)
        } else {
          await new SupprimerCouple().run(x)
        }
      }).onCancel(() => {
      }).onDismiss(() => {
        // console.log('I am triggered on both OK and Cancel')
      })
    }

    function supprimer () {
      const x = c.value || couple.value
      const n = x.nomE
      const lbl = [
        `${n} n'a pas répondu favorablement dans les temps. Ce couple est inutile.`,
        `${n} n'a pas accepté la proposition de parrainage de son compte. Ce couple est inutile.`,
        `${n} n'a pas accepté répondu à la proposition de rencontre faite. Ce couple est inutile.`
      ]
      $q.dialog({
        dark: true,
        title: 'Quitter le couple',
        message: lbl[x.orig],
        cancel: { label: 'Je le maintiens quand-même', color: 'primary' },
        ok: { color: 'warning', label: 'Je supprime le couple' },
        persistent: true
      }).onOk(async () => {
        await new SupprimerCouple().run(x)
      }).onCancel(() => {
      }).onDismiss(() => {
        // console.log('I am triggered on both OK and Cancel')
      })
    }

    function relancer () {
      const x = c.value || couple.value
      const n = x.nomE
      const lbl = `${n} a quitté le couple. Vous pouvez essayer de la.le relancer pour qu'elle.il réintègre le couple`
      $q.dialog({
        dark: true,
        title: `Relancer ${n}`,
        message: lbl,
        cancel: { label: 'Je ne relance pas', color: 'primary' },
        ok: { color: 'warning', label: `Je relance ${n}` },
        persistent: true
      }).onOk(async () => {
        await new RelancerCouple().run(x)
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
