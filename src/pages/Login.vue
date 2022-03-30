<template>
  <q-page class="column align-start items-center">
    <q-card flat class="q-ma-xs petitelargeur fs-md">
      <q-card-section>
        <div class="column items-center q-ma-sm">
        <div class="titre-lg">Choix du mode
          <q-btn flat dense round icon="info" aria-label="info" @click="infomode = true"/>
        </div>
        <div class="q-gutter-md q-ma-sm">
          <q-radio dense v-model="mode" :val="1" label="Synchronisé" />
          <q-radio dense v-model="mode" :val="2" label="Incognito" />
          <q-radio dense v-model="mode" :val="3" label="Avion" />
        </div>
        </div>
      </q-card-section>
    </q-card>

    <q-card flat v-if="mode > 0 && mode < 4" class="q-mt-lg petitelargeur">
      <phrase-secrete label-valider="Se connecter" icon-valider="send" v-on:ok-ps="connecter"></phrase-secrete>
      <div v-if="mode === 1">
        <q-checkbox v-if="$q.dark.isActive" v-model="razdb" dense size="xs" color="grey-8"
          class="bg1 text-italic text-grey-8 q-ml-sm q-mb-sm" label="Ré-initialiser complètement la base locale"/>
        <q-checkbox v-else v-model="razdb" dense size="xs" color="grey-5"
          class="bg1 text-italic text-grey-7 q-ml-sm q-mb-sm" label="Ré-initialiser complètement la base locale"/>
      </div>
    </q-card>

    <div v-if="mode === 1 || mode === 2" class="q-mt-lg petitelargeur column items-start">
      <q-btn flat color="warning" icon="add_circle" label="Nouveau compte parrainé" @click="phrasepar=!phrasepar"/>
      <q-card v-if="phrasepar" class="petitelargeur">
          <q-input class="full-width" dense v-model="phrase" label="Phrase communiquée par le parrain"
            @keydown.enter.prevent="crypterphrase" :type="isPwd ? 'password' : 'text'"
            hint="Presser 'Entrée' à la fin de la saisie">
          <template v-slot:append>
            <q-icon :name="isPwd ? 'visibility_off' : 'visibility'" class="cursor-pointer" @click="isPwd = !isPwd"/>
            <span :class="phrase.length === 0 ? 'disabled' : ''"><q-icon name="cancel" class="cursor-pointer"  @click="phrase=''"/></span>
          </template>
          </q-input>
          <div v-if="encours" class="fs-md text-italic text-primary">Cryptage en cours ...
            <q-spinner color="primary" size="2rem" :thickness="3" />
          </div>
      </q-card>
      <q-btn flat color="secondary" icon="add_moderator" size="sm" @click="dialoguecreationcompte = true"/>
    </div>

    <q-dialog v-model="dialcp">
      <AcceptParrain :couple="couple" :phch="phch" :close="fermerap" />
    </q-dialog>
  </q-page>
</template>

<script>
import { computed, ref, watch } from 'vue'
import { useStore } from 'vuex'
import { ConnexionCompte } from '../app/operations'
import PhraseSecrete from '../components/PhraseSecrete.vue'
import AcceptParrain from '../components/AcceptParrain.vue'
import { onBoot } from '../app/page.mjs'
import { crypt } from '../app/crypto.mjs'
import { get, afficherdiagnostic, dlvDepassee } from '../app/util.mjs'
import { deserial } from '../app/schemas.mjs'
import { Contact, Couple } from '../app/modele.mjs'

export default ({
  name: 'Login',
  components: { PhraseSecrete, AcceptParrain },
  data () {
    return {
      ps: null,
      phrasepar: false,
      isPwd: false,
      encours: false,
      phrase: '',
      clex: null,
      pph: 0,
      dialcp: false,
      p: null
    }
  },

  methods: {
    fermerap () {
      this.dialcp = false
      this.phrasepar = false
    },
    connecter (ps) {
      if (ps) {
        if (this.mode === 3) {
          new ConnexionCompte().run(ps)
        } else {
          new ConnexionCompte().run(ps, this.razdb)
          this.razdb = false
        }
      }
    },
    crypterphrase () {
      if (!this.phrase) return
      this.encours = true
      setTimeout(async () => {
        this.clex = await crypt.pbkfd(this.phrase)
        let hx = ''
        for (let i = 0; i < this.phrase.length; i = i + 2) hx += this.phrase.charAt(i)
        this.phch = crypt.hash(hx)
        this.encours = false
        const resp = await get('m1', 'getContact', { phch: this.phch })
        if (!resp) {
          this.diagnostic = 'Cette phrase de parrainage est introuvable'
        } else {
          try {
            const row = deserial(new Uint8Array(resp))
            const contact = await new Contact().fromRow(row)
            if (dlvDepassee(contact.dlv)) {
              this.diagnostic = 'Cette phrase de parrainage n\'est plus valide'
              return
            }
            // eslint-disable-next-line no-unused-vars
            const [cc, id, nom] = await contact.getCcId(this.clex)
            const resp2 = await get('m1', 'getCouple', { id })
            if (!resp2) {
              this.diagnostic = 'Pas de parrainage en attente avec cette phrase'
              return
            }
            const row2 = deserial(new Uint8Array(resp2))
            this.couple = await new Couple().fromRow(row2, cc)
            this.phrasepar = false
            this.dialcp = true
          } catch (e) {
            console.log(e.toString())
          }
        }
      }, 1)
    }
  },

  setup () {
    const $store = useStore()
    onBoot()
    const razdb = ref(false)
    const mode = computed({
      get: () => $store.state.ui.mode,
      set: (val) => $store.commit('ui/majmode', val)
    })
    const infomode = computed({
      get: () => $store.state.ui.infomode,
      set: (val) => $store.commit('ui/majinfomode', val)
    })
    const dialoguecreationcompte = computed({
      get: () => $store.state.ui.infomode,
      set: (val) => $store.commit('ui/majdialoguecreationcompte', val)
    })
    const diagnostic = computed({
      get: () => $store.state.ui.diagnostic,
      set: (val) => $store.commit('ui/majdiagnostic', val)
    })
    watch(razdb, (ap, av) => {
      if (ap === true && ap !== av) {
        afficherdiagnostic('<b>Attention:</b> la base locale sera effacée et rechargée totalement.' +
        '<BR>Ceci peut alonger <b>significativement</b> la durée d\'initialisation (comme le mode <i>incognito</i>).')
      }
    })
    return {
      razdb,
      diagnostic,
      mode,
      infomode,
      dialoguecreationcompte
    }
  }

})
</script>

<style lang="sass" scoped>
@import '../css/app.sass'
</style>
