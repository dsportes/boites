<template>
  <q-page class="column align-start items-center">
    <q-card v-if="!q666" flat class="q-ma-xs petitelargeur fs-md">
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

    <q-card flat v-if="!q666 && mode > 0 && mode < 4" class="q-mt-lg petitelargeur">
      <phrase-secrete label-valider="Se connecter" icon-valider="send" v-on:ok-ps="connecter"></phrase-secrete>
      <div v-if="mode === 1">
        <q-checkbox v-if="$q.dark.isActive" v-model="razdb" dense size="xs" color="grey-8"
          class="bg1 text-italic text-grey-8 q-ml-sm q-mb-sm" label="Ré-initialiser complètement la base locale"/>
        <q-checkbox v-else v-model="razdb" dense size="xs" color="grey-5"
          class="bg1 text-italic text-grey-7 q-ml-sm q-mb-sm" label="Ré-initialiser complètement la base locale"/>
      </div>
    </q-card>

    <div v-if="!q666 && (mode === 1 || mode === 2)" class="q-mt-lg petitelargeur column items-start">
      <div class="titre-md">Un parrain vous a communiqué une phrase secrète pour créer vous-même votre compte ?</div>
      <q-btn flat color="warning" icon="add_circle" label="Je créé mon compte ..." @click="phrasepar=!phrasepar"/>
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
    </div>

    <q-dialog v-model="dialcp">
      <AcceptParrain :couple="coupleloc" :datactc="datactc" :clepubc="clepubc" :phch="phch" :close="fermerap" />
    </q-dialog>

    <q-card v-if="q666" class="q-ma-xs moyennelargeur fs-md">
      <q-card-section class="column items-center">
        <div class="titre-lg text-center">Création du compte du Comptable</div>
      </q-card-section>

      <q-card-section>
        <phrase-secrete class="q-ma-xs" :init-val="ps" v-on:ok-ps="creercc"
          icon-valider="check" label-valider="Créer"></phrase-secrete>
      </q-card-section>
    </q-card>
  </q-page>
</template>

<script>
import { computed, ref, watch, onMounted } from 'vue'
import { useStore } from 'vuex'
import { ConnexionCompte, CreationCompteComptable } from '../app/operations'
import PhraseSecrete from '../components/PhraseSecrete.vue'
import AcceptParrain from '../components/AcceptParrain.vue'
import { onBoot } from '../app/page.mjs'
import { get, afficherdiagnostic, dlvDepassee, PhraseContact, NomContact } from '../app/util.mjs'
import { deserial } from '../app/schemas.mjs'
import { Contact, Couple, data } from '../app/modele.mjs'
import { openIDB, getCompte, deleteIDB } from '../app/db.mjs'
import { tru8 } from '../app/crypto.mjs'
import { AppExc } from '../app/api.mjs'

export default ({
  name: 'Login',
  components: { PhraseSecrete, AcceptParrain },
  data () {
    return {
      datactc: null,
      ps: null,
      phrasepar: false,
      isPwd: false,
      encours: false,
      phrase: '',
      clex: null,
      phch: 0,
      coupleloc: null,
      pph: 0,
      dialcp: false,
      p: null
    }
  },

  methods: {
    async creercc (ps) {
      if (!ps) return
      this.mode = 2
      await new CreationCompteComptable().run(ps)
      this.ps = null
    },
    fermerap () {
      this.dialcp = false
      this.phrasepar = false
    },

    async connecter (ps) {
      if (!ps) return
      data.ps = ps
      ps.razDebutFin()
      const lsk = this.org + '-' + ps.dpbh
      const nb = localStorage.getItem(lsk)
      data.nombase = nb || null
      data.db = null
      if (this.mode === 3) {
        await this.connexion3(ps)
      } else {
        if (this.mode === 1 && data.nombase && this.razdb) await deleteIDB()
        let db = null
        if (this.mode === 1 && data.nombase) {
          let dbok = false
          try {
            db = await openIDB()
            const compte = await getCompte()
            if (compte && compte.pcbh === data.ps.pcbh && compte.nombase() === data.nombase) dbok = true
          } catch (e) { }
          if (!dbok) {
            await deleteIDB()
            db = null
          }
        }
        await new ConnexionCompte().run(null, db)
      }
    },

    async connexion3 () {
      let db
      if (!data.nombase) {
        const msg1 = `La base locale du compte n'a pas été trouvée:
aucune session synchronisée ne s'est préalablement exécutée sur ce poste avec cette phrase secrète.
Erreur dans la saisie de la ligne 1 de la phrase ?`
        afficherdiagnostic(msg1)
        return
      }
      try {
        db = await openIDB()
      } catch (e) {
        const msg2 = `La base locale est absente ou corrompue.<br>
Code erreur: ${e.message}<br>
Choisir le mode synchronisé ou incognito.`
        afficherdiagnostic(msg2)
        return
      }
      try {
        const compte = await getCompte()
        if (!compte || (compte.pcbh !== data.ps.pcbh)) throw new AppExc('X', 'Enregistrement compte non trouvé / incorrect')
        await new ConnexionCompte().run(compte, db)
      } catch (e) {
        const msg3 = `Base corrompue: les données du compte n'y ont pas été trouvées.<br>
Code erreur: ${e.message}<br>
Choisir le mode synchronisé ou incognito.`
        afficherdiagnostic(msg3)
        await deleteIDB()
      }
    },

    crypterphrase () {
      if (!this.phrase) return
      this.encours = true
      setTimeout(async () => {
        const pc = await new PhraseContact().init(this.phrase)
        this.phch = pc.phch
        this.encours = false
        const resp = await get('m1', 'getContact', { phch: pc.phch })
        if (!resp || !resp.length) {
          afficherdiagnostic('Cette phrase de parrainage est introuvable')
          this.raz()
        } else {
          try {
            const [row, clepubc] = deserial(new Uint8Array(resp))
            this.clepubc = clepubc
            const contact = await new Contact().fromRow(row)
            tru8('Login ph parr clepubc ' + contact.id, clepubc)
            if (dlvDepassee(contact.dlv)) {
              afficherdiagnostic('Cette phrase de parrainage n\'est plus valide')
              this.raz()
              return
            }
            // eslint-disable-next-line no-unused-vars
            this.datactc = await contact.getData(pc.clex)
            // { cc, nom, nct, parrain, forfaits, idt }
            const naf = new NomContact('fake', this.datactc.cc)
            const resp2 = await get('m1', 'getCouple', { id: naf.id })
            if (!resp2) {
              afficherdiagnostic('Pas de parrainage en attente avec cette phrase')
              this.raz()
              return
            }
            const row2 = deserial(new Uint8Array(resp2))
            this.coupleloc = await new Couple().fromRow(row2, this.datactc.cc)
            this.raz()
            this.dialcp = true
          } catch (e) {
            console.log(e)
            this.raz()
          }
        }
      }, 1)
    },
    raz () {
      this.phrasepar = false
      this.phrase = ''
    }
  },

  setup () {
    const $store = useStore()
    onBoot()
    const hr = window.location.href
    const q666 = ref(false)
    const razdb = ref(false)
    const org = computed({
      get: () => $store.state.ui.org,
      set: (val) => $store.commit('ui/majorg', val)
    })
    const mode = computed({
      get: () => $store.state.ui.mode,
      set: (val) => $store.commit('ui/majmode', val)
    })
    if (hr.endsWith('?666')) {
      q666.value = true
      mode.value = 2
    }
    const infomode = computed({
      get: () => $store.state.ui.infomode,
      set: (val) => $store.commit('ui/majinfomode', val)
    })
    const dialoguecreationcompte = computed({
      get: () => $store.state.ui.infomode,
      set: (val) => $store.commit('ui/majdialoguecreationcompte', val)
    })
    watch(razdb, (ap, av) => {
      if (ap === true && ap !== av) {
        afficherdiagnostic('<b>Attention:</b> la base locale sera effacée et rechargée totalement.' +
        '<BR>Ceci peut alonger <b>significativement</b> la durée d\'initialisation (comme le mode <i>incognito</i>).')
      }
    })

    onMounted(() => {
      mode.value = 0
    })

    return {
      q666,
      razdb,
      org,
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
