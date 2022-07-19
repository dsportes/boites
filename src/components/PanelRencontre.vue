<template>
  <q-card class="petitelargeur text-center q-pa-sm">
    <div class="titre-lg text-center q-my-md">Phrase de rencontre</div>
    <q-input class="full-width" dense counter v-model="phrase" label="Phrase" :type="isPwd ? 'password' : 'text'"
        :rules="[r1]" maxlength="32" @keydown.enter.prevent="crypterphrase">
      <template v-slot:append>
        <q-icon :name="isPwd ? 'visibility_off' : 'visibility'" class="cursor-pointer" @click="isPwd = !isPwd"/>
        <span :class="phrase.length === 0 ? 'disabled' : ''"><q-icon name="cancel" class="cursor-pointer"  @click="phrase='';diagnostic=''"/></span>
      </template>
    </q-input>
    <div v-if="encours" class="fs-md text-italic text-primary">Cryptage en cours ...
      <q-spinner color="primary" size="2rem" :thickness="3" />
    </div>
    <div v-if="diagnostic" class="fs-md text-negative bg-yellow-5 text-bold">{{diagnostic}}</div>
    <q-card-actions>
      <q-btn flat color="primary" icon="close" label="Je renonce" @click="fermer"/>
      <q-btn flat color="warning" :disable="!phraseok || (diagnostic.length !== 0)" icon="check" label="Poursuivre" @click="crypterphrase"/>
    </q-card-actions>

    <q-dialog v-model="nvrenc">
      <nouvelle-rencontre :phrase="phrase2" :clex="clex" :phch="phch" :close="closerenc"/>
    </q-dialog>

    <q-dialog v-model="acceptrenc">
      <accept-rencontre :couple="coupleloc" :phch="phch" :close="closeacceptrenc"/>
    </q-dialog>

  </q-card>
</template>

<script>
import { useStore } from 'vuex'
import { computed, watch, ref } from 'vue'
import AcceptRencontre from './AcceptRencontre.vue'
import NouvelleRencontre from './NouvelleRencontre.vue'
import { Contact, Couple } from '../app/modele.mjs'
import { deserial } from '../app/schemas.mjs'
import { get, dlvDepassee, PhraseContact } from '../app/util.mjs'
import { tru8 } from '../app/crypto.mjs'

export default ({
  name: 'PanelRencontre',

  components: { AcceptRencontre, NouvelleRencontre },

  props: { close: Function },

  data () {
    return {
      encours: false,
      isPwd: false,
      phrase: '',
      phrase2: '',
      phraseok: false,
      diagnostic: '',
      clex: null,
      phch: 0
    }
  },

  watch: {
    phrase (ap, av) {
      this.phraseok = ap && this.r1(ap) === true
      // console.log(this.phraseok + ' ' + this.diagnostic.length)
    }
  },

  methods: {
    r1 (val) { return (val.length > 15 && val.length < 33) || 'De 16 à 32 signes' },

    fermer () { if (this.close) this.close() },

    closerenc () { this.nvrenc = false; this.fermer() },

    closeacceptrenc () { this.acceptrenc = false; this.fermer() },

    crypterphrase () {
      this.diagnostic = ''
      this.encours = true
      setTimeout(async () => {
        const pc = await new PhraseContact().init(this.phrase)
        this.phch = pc.phch
        this.encours = false
        const resp = await get('m1', 'getContact', { phch: pc.phch })
        if (!resp || !resp.length) {
          this.clex = pc.clex
          this.phrase2 = this.phrase
          this.raz()
          this.nvrenc = true
        } else {
          try {
            const [row, clepubc] = deserial(new Uint8Array(resp))
            tru8('Pub Comptable PanelRencontre clepubc', clepubc)
            const contact = await new Contact().fromRow(row)
            if (dlvDepassee(contact.dlv)) {
              this.diagnostic = 'Cette phrase de rencontre n\'est plus valide'
              return
            }
            const [cc, id, nom] = await contact.getCcId(pc.clex)
            if (nom !== this.avatar.na.nom) {
              this.diagnostic = 'Cette phrase de rencontre n\'est pas associée à votre nom'
              return
            }
            const resp2 = await get('m1', 'getCouple', { id })
            if (!resp2) {
              this.diagnostic = 'Pas de rencontre en attente avec cette phrase'
              return
            }
            const row2 = deserial(new Uint8Array(resp2))
            this.coupleloc = await new Couple().fromRow(row2, cc)
            this.raz()
            this.acceptrenc = true
          } catch (e) {
            this.raz()
          }
        }
      }, 1)
    },
    raz () {
      this.phraserenc = false
      this.phrase = ''
    }
  },

  setup (props) {
    const $store = useStore()
    const nvrenc = ref(false)
    const acceptrenc = ref(false)
    const sessionok = computed(() => { return $store.state.ui.sessionok })
    const avatar = computed(() => { return $store.state.db.avatar })

    watch(() => sessionok.value, (ap, av) => {
      if (!ap) {
        nvrenc.value = false
        acceptrenc.value = false
      }
    })

    return {
      avatar,
      sessionok,
      nvrenc,
      acceptrenc
    }
  }
})
</script>

<style lang="sass" scoped>
@import '../css/app.sass'
</style>
