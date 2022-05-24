<template>
<div class="fs-md">
  <div class="top bg-secondary text-white">
    <q-toolbar>
      <q-toolbar-title class="titre-lg">Tous les contacts</q-toolbar-title>
      <q-btn dense size="md" icon="close" @click="panelcontacts=false"/>
    </q-toolbar>
    <div class="column justify-center">
      <div class="row items-end">
        <q-radio v-model="opt" val="c" label="contient" />
        <q-radio v-model="opt" val="d" label="débute par" />
        <q-input v-model="txt" class="q-ml-lg" style="width:4rem" label="abc"/>
      </div>
      <q-btn :disable="mode < 1 || mode > 2" flat color="warning" icon="add_circle" label="Rencontre ..." @click="ouvrirrenc"/>
    </div>
  </div>

  <div class="filler"></div>

  <q-card v-for="(ax, idx) in s.lst" :key="ax.na.id"
    :class="dkli(idx) + ' zone full-width row items-start q-py-xs'">
    <img class="col-auto q-mr-sm photomax cursor-pointer" :src="ax.na.photoDef" @click="cv(ax.na)"/>
    <div class="col column q-mr-sm">
      <div class="titre-md text-bold cursor-pointer self-center" @click="cv(ax.na)">{{ax.noml}}</div>
      <div v-for="id in ax.c" :key="id" class="cursor-pointer text-underline self-start" @click="cp(ax.na, id)">{{na(id).noml}}</div>
      <div v-for="x in ax.m" :key="x[0]+'/'+x[1]" class="cursor-pointer text-underline self-end" @click="mb(ax.na, x)">{{na(x[0]).noml}}</div>
    </div>
  </q-card>

  <q-dialog v-model="phraserenc">
    <q-card class="fs-md bord1 petitelargeur text-center q-mb-sm renc">
      <div class="titre-lg">Phrase de rencontre</div>
      <q-select v-model="nomavatar" :options="avatars" dense options-dense label="Choisir mon avatar concerné"
        popup-content-style="border:1px solid #777777;border-radius:3px"/>
      <q-input class="full-width" dense v-model="phrase" label="Phrase" :type="isPwd ? 'password' : 'text'">
      <template v-slot:append>
        <q-icon :name="isPwd ? 'visibility_off' : 'visibility'" class="cursor-pointer" @click="isPwd = !isPwd"/>
        <span :class="phrase.length === 0 ? 'disabled' : ''"><q-icon name="cancel" class="cursor-pointer"  @click="phrase=''"/></span>
      </template>
      </q-input>
      <div v-if="encours" class="fs-md text-italic text-primary">Cryptage en cours ...
        <q-spinner color="primary" size="2rem" :thickness="3" />
      </div>
      <q-card-actions>
        <q-btn flat color="primaty" icon="close" label="Je renonce" v-close-popup/>
        <q-btn flat color="warning" icon="check" label="Poursuivre" @click="crypterphrase" v-close-popup/>
      </q-card-actions>
    </q-card>
  </q-dialog>

  <q-dialog v-model="cvident">
    <q-card class="bord1">
      <q-card-section>
        <div class="titre-lg">Avatar</div>
        <identite-cv :nom-avatar="nac" :invitable="invit != null" type="avatar"/>
      </q-card-section>
      <q-card-actions>
        <q-btn flat dense color="primary" icon="add" label="Nouveau Couple" v-close-popup @click="nvcouple=true"/>
      </q-card-actions>
    </q-card>
  </q-dialog>

  <q-dialog v-model="cpident">
    <q-card class="bord1">
      <q-card-section>
        <div class="titre-lg">Couple</div>
        <identite-cv :nom-avatar="nac" type="couple"/>
        <identite-cv :nom-avatar="naI" type="avatar"/>
        <identite-cv :nom-avatar="naE" type="avatar"/>
      </q-card-section>
    </q-card>
  </q-dialog>

  <q-dialog v-model="nvcouple">
    <nouveau-couple :id1="nac.id" :close="closenvcouple" />
  </q-dialog>

  <q-dialog v-model="grident">
    <q-card class="bord1">
      <q-card-section>
        <div class="titre-lg">Groupe</div>
        <identite-cv :nom-avatar="nac" type="groupe"/>
        <identite-cv :nom-avatar="naI" type="avatar"/>
      </q-card-section>
    </q-card>
  </q-dialog>

  <q-dialog v-model="nvrenc">
    <nouvelle-rencontre :phrase="phrase2" :clex="clex" :phch="phch" :close="closerenc"/>
  </q-dialog>

  <q-dialog v-model="acceptrenc">
    <accept-rencontre :couple="coupleloc" :phch="phch" :close="closeacceptrenc"/>
  </q-dialog>

</div>
</template>

<script>
import { useStore } from 'vuex'
import { computed, reactive, watch, ref } from 'vue'
import IdentiteCv from '../components/IdentiteCv.vue'
import AcceptRencontre from './AcceptRencontre.vue'
import NouvelleRencontre from './NouvelleRencontre.vue'
import NouveauCouple from './NouveauCouple.vue'
import { data, Contact, Couple } from '../app/modele.mjs'
import { deserial } from '../app/schemas.mjs'
import { get, dlvDepassee, PhraseContact } from '../app/util.mjs'

export default ({
  name: 'PanelContacts',

  components: { IdentiteCv, AcceptRencontre, NouvelleRencontre, NouveauCouple },

  data () {
    return {
      nac: null,
      naI: null,
      naE: null,
      phraserenc: false,
      isPwd: false,
      encours: false,
      nvrenc: false,
      acceptrenc: false,
      nvcouple: false,
      phrase: '',
      phrase2: '',
      coupleloc: null,
      phch: 0,
      clex: null,
      avatars: [],
      nomavatar: ''
    }
  },

  watch: {
    nomavatar (ap, av) { this.avatar = data.getAvatar(data.getCompte().avatarDeNom(ap)) }
  },

  methods: {
    dkli (idx) { return this.$q.dark.isActive ? (idx ? 'sombre' + (idx % 2) : 'sombre0') : (idx ? 'clair' + (idx % 2) : 'clair0') },
    na (id) { return data.repertoire.na(id) },
    cv (na) { // na de l'avatar
      this.nac = na
      this.cvident = true
    },
    cp (na, id) { // id du couple
      this.nac = data.repertoire.na(id)
      const c = data.getCouple(id)
      this.naI = c.naI
      this.naE = c.naE
      this.cpident = true
    },
    mb (na, x) { // x [idg, im]
      this.nac = data.repertoire.na(x[0])
      const mb = data.getMembre(x[0], x[1])
      this.naI = mb.namb
      this.grident = true
    },

    closenvcouple () { this.nvcouple = false; this.cvident = false },

    ouvrirrenc () {
      const c = data.getCompte()
      this.avatars = c.avatars()
      if (this.avatar) {
        this.nomavatar = this.avatar.na.nom
      } else {
        this.nomavatar = this.avatars[0]
        this.avatar = data.getAvatar(c.avatarDeNom(this.nomavatar))
      }
      this.phraserenc = true
    },

    closerenc () { this.nvrenc = false },

    closeacceptrenc () { this.acceptrenc = false },

    crypterphrase () {
      if (!this.phrase) return

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
            const row = deserial(new Uint8Array(resp))
            const contact = await new Contact().fromRow(row)
            if (dlvDepassee(contact.dlv)) {
              this.diagnostic = 'Cette phrase de rencontre n\'est plus valide'
              this.raz()
              return
            }
            const [cc, id, nom] = await contact.getCcId(pc.clex)
            if (nom !== this.avatar.na.nom) {
              this.diagnostic = 'Cette phrase de rencontre n\'est pas associée à votre nom'
              this.raz()
              return
            }
            const resp2 = await get('m1', 'getCouple', { id })
            if (!resp2) {
              this.diagnostic = 'Pas de rencontre en attente avec cette phrase'
              this.raz()
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

  setup () {
    const $store = useStore()
    const opt = ref('c')
    const txt = ref('')
    const cvident = ref(false)
    const cpident = ref(false)
    const grident = ref(false)
    const panelcontacts = computed({
      get: () => $store.state.ui.panelcontacts,
      set: (val) => $store.commit('ui/majpanelcontacts', val)
    })
    const mode = computed(() => $store.state.ui.mode)
    const invit = computed(() => { return $store.state.ui.invitationattente })
    const tousAx = computed(() => { return $store.state.db.tousAx })
    const cvs = computed(() => { return $store.state.db.cvs })
    const avatar = computed({
      get: () => $store.state.db.avatar,
      set: (val) => $store.commit('db/majavatar', val)
    })

    const s = reactive({
      blst: [],
      lst: []
    })

    function init1 () {
      const lst = []
      for (const id in tousAx.value) {
        const ax = tousAx.value[id]
        if (!ax.x) lst.push({ na: ax.na, c: ax.c, m: ax.m, noml: ax.na.noml })
      }
      lst.sort((a, b) => { return a.noml < b.noml ? -1 : (b.noml > a.noml ? 1 : 0) })
      s.blst = lst
    }

    function filtre () {
      const lst = []
      const c = opt.value === 'c'
      const t = txt.value
      s.blst.forEach(ax => {
        if (!t) {
          lst.push(ax)
        } else {
          if (c) {
            if (ax.noml.indexOf(t) !== -1) lst.push(ax)
          } else {
            if (ax.noml.startsWith(t)) lst.push(ax)
          }
        }
      })
      s.lst = lst
    }

    watch(() => tousAx.value, (ap, av) => { init1(); filtre() })
    watch(() => cvs.value, (ap, av) => { init1(); filtre() })
    watch(() => opt.value, (ap, av) => { filtre() })
    watch(() => txt.value, (ap, av) => { filtre() })
    watch(() => panelcontacts.value, (ap, av) => {
      if (!ap) {
        cvident.value = false
        cpident.value = false
        grident.value = false
      }
    })

    init1()
    filtre()

    return {
      invit,
      panelcontacts,
      opt,
      txt,
      s,
      avatar,
      mode,
      cvident,
      cpident,
      grident
    }
  }
})
</script>

<style lang="sass" scoped>
@import '../css/app.sass'
$haut: 9rem
$larg: 330px
.top
  position: absolute
  top: 0
  left: 0
  height: $haut
  width: $larg
  overflow: hidden
  background-color: $secondary
.filler
  height: $haut
  width: 100%
.photomax
  margin-top: 4px
.q-card > div
  box-shadow: inherit !important
.bord1
  border: 1px solid $grey-5
  border-radius: 5px
  padding: 3px
.text-underline
  text-decoration: underline
  color: $blue-8
</style>
