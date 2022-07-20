<template>
  <div :class="dkli(idx) + ' row full-width fs-md q-pa-xs'">
    <div class="col-auto column items-center">
      <img class="photomax" :src="s.photo"/>
      <q-btn dense class="q-my-xs" size="sm" icon="content_copy" color="primary" @click.stop="copierna" />
    </div>
    <div class="col q-pl-sm">
      <div class="row items-center">
        <div class="col-auto">
          <info-txt :class="s.primaire ? 'bord2p' :'bord2'" :label="s.na.nom"
            :suffixe="s.na.sfx" noicon :info="s.na.nom + ' ID:' + s.na.id"/>
          <span v-if="s.primaire" class="q-ml-sm">Compte</span>
          <span v-if="s.parrain" class="q-ml-sm text-bold text-warning">PARRAIN</span>
          <q-btn v-if="s.naTribu" class="q-ml-sm" :label="s.naTribu.nom" dense no-caps color="primary" @click.stop="ouvrirtribu"/>
        </div>
        <q-space/>
        <slot name="statut" class="col-auto text-right">
        </slot>
        <q-btn v-if="!noMenu" class="q-ml-sm col-auto" dense size="md" color="primary" icon="more_horiz">
          <q-menu transition-show="scale" transition-hide="scale">
            <div :class="' menu column fs-md font-mono'">
              <div class="item row items-center" v-close-popup @click="copierna">
                <q-icon class="col-auto q-ml-sm" size="md" name="content_copy"/>
                <span class="col">Copier</span>
              </div>
              <q-separator v-if="cvEditable"/>
              <div v-if="cvEditable" class="item row items-center" v-close-popup @click="ouvrircv">
                <q-icon class="col-auto q-ml-sm" size="md" name="mode_edit"/>
                <span class="col">Éditer la carte de visite</span>
              </div>
              <div class="item row items-center" v-close-popup @click="parraintribu">
                <q-icon class="col-auto" size="md" name="question_mark"/>
                <q-item-section>En savoir plus ...</q-item-section>
              </div>
              <q-separator v-if="compta"/>
              <div v-if="compta" class="item row items-center" v-close-popup @click="ouvrircompta">
                <q-icon class="col-auto" size="md" name="euro"/>
                <q-item-section>Afficher la comptabilité</q-item-section>
              </div>
              <div v-if="s.lfc.length">
                <q-separator/>
                <div class="titre-md text-italic">Nouveau contact de ...</div>
                <div v-for="na in s.lfc" :key="na.id" class="item row items-center" v-close-popup @click="nvcontact(na)">
                  <q-icon class="col-auto" size="md" name="add"/>
                  <q-item-section>{{na.nom}}</q-item-section>
                </div>
              </div>
            </div>
          </q-menu>
        </q-btn>
      </div>
      <show-html v-if="s.info" class="q-my-xs bord height-4 cursor-pointer"
        :texte="s.info" :idx="idx" @click="zoomdial=true"/>
      <div v-else class="q-my-xs titre-md full-width text-center bord cursor-pointer text-italic text-grey5">
        (pas d'autre information)
      </div>
      <div v-if="s.c.length || s.m.length">
        <span v-for="c in s.c" :key="c.id" class="q-mr-md bord2b cursor-pointer"
          @click="ouvrircouple(c)">Contact de {{c.naI.nom}}</span>
        <span v-for="m in s.m" :key="m.id" class="q-mr-md bord2b cursor-pointer"
          @click="ouvrirmembre(m)">Groupe {{m.na.noml}}</span>
      </div>
      <div v-if="actions" :class="'row justify-center q-pa-xs ' + (s.c.length || s.m.length ? 'bord3' : '')">
        <slot name="actions"></slot>
      </div>
    </div>

  <q-dialog v-model="cvdetail">
    <q-card class="petitelargeur">
      <q-card-section>
        <div class="titre-lg text-center q-mb-md">Carte de visite de {{s.na.nom}}</div>
        <editeur-md class="height-16" :texte="s.info"/>
      </q-card-section>
      <q-card-actions align="right">
        <q-btn flat color="primary" label="J'ai lu" v-close-popup/>
      </q-card-actions>
    </q-card>
  </q-dialog>

  <q-dialog v-model="cvloc">
    <carte-visite :na="s.na" :close="closecv" :photo-init="s.photo" :info-init="s.info" @ok="cvchangee"/>
  </q-dialog>

  <q-dialog v-model="zoomdial">
    <q-card class="moyennelargeur">
      <q-card-section>
        <editeur-md class="height-16" :texte="s.info"/>
      </q-card-section>
      <q-card-actions align="right">
        <q-btn flat color="primary" label="J'ai lu" v-close-popup/>
      </q-card-actions>
    </q-card>
  </q-dialog>

  <q-dialog v-model="nvcouple">
    <nouveau-couple :na-int="naint" :na-ext="s.na" :close="closenvcouple" />
  </q-dialog>

</div>
</template>

<script>
import { useStore } from 'vuex'
import { watch, toRef, reactive, computed, ref } from 'vue'
import CarteVisite from './CarteVisite.vue'
import ShowHtml from './ShowHtml.vue'
import EditeurMd from './EditeurMd.vue'
import InfoTxt from './InfoTxt.vue'
import NouveauCouple from './NouveauCouple.vue'
import { Cv, data } from '../app/modele.mjs'
import { copier, affichermessage } from '../app/util.mjs'
import { GetCompta, GetTribuCompte, EstParrainTribu } from '../app/operations.mjs'

export default ({
  name: 'FicheAvatar',

  props: {
    naAvatar: Object, // na de l'avatar
    cvEditable: Boolean, // Si true la cv est editable et est reçue sur @cv-changee
    compta: Boolean, // Si true, option de menu de la compta
    idx: Number,
    noMenu: Boolean, // Si true le bouton menu (et le menu) n'apparaissent pas
    contacts: Boolean, // Si true affiche la liste de ses contacts
    groupes: Boolean, // Si true affiche la liste de ses groupes (membres)
    actions: Boolean // A un slot "actions"
  },

  components: { NouveauCouple, InfoTxt, ShowHtml, CarteVisite, EditeurMd },

  computed: { },

  data () {
    return {
      couple: null,
      groupe: null,
      membre: null,
      naint: null
    }
  },

  methods: {
    dkli (idx) { return this.$q.dark.isActive ? (idx ? 'sombre' + (idx % 2) : 'sombre0') : (idx ? 'clair' + (idx % 2) : 'clair0') },

    ouvrircv () { if (this.cvEditable) this.cvloc = true; else this.cvdetail = true },
    closecv () { this.cvloc = false },

    cvchangee (res) {
      if (res && this.naAvatar) {
        const cv = new Cv().init(this.naAvatar.id, res.ph, res.info)
        this.$emit('cv-changee', cv)
      }
    },

    copierna () { copier(this.s.na) },

    ouvrirtribu () {
      if (this.s.naTribu) {
        this.tribu = data.getTribu(this.s.naTribu.id)
        this.tribudial = true
      }
    },

    ouvrircouple (c) {
      this.coupledialobj = c
    },

    ouvrirmembre (m) {
      this.membredialobj = [data.getGroupe(m.id), m]
    },

    async ouvrircompta () {
      const id = this.s.na.id
      const c = this.compte
      let compta = null
      if (c.id === id) {
        compta = data.getCompta(id)
      } else {
        compta = await new GetCompta().run(id)
        if (!c.estComptable) {
          if (!c.stp) {
            affichermessage('Seul un compte parrain peut accéder à la comptabilité des autres comptes (de la même tribu)', true)
            return
          } else {
            const st = await new EstParrainTribu().run(id)
            if (st === 0) {
              affichermessage('Cet avatar n`est pas de la même tribu.' +
                'Impossible d\'accéder à sa comptabilité.', true)
              return
            }
          }
        }
      }
      this.comptadialobj = {
        x: compta.compteurs,
        av: {
          na: this.s.na,
          estPrimaire: compta.estPrimaire
        }
      }
    },

    nvcontact (na) {
      this.naint = na
      this.nvcouple = true
    },

    closenvcouple () { this.nvcouple = false },

    async parraintribu () {
      const id = this.s.na.id
      const c = this.compte
      if (c.estComptable) {
        const compta = await new GetCompta().run(id)
        this.s.primaire = compta.t
        if (!compta.t) {
          affichermessage('Cet avatar n`est pas l`avatar primaire de son compte.' +
            'Impossible de savoir si son compte est parrain ou non et de quelle tribu.', true)
          return
        }
        const [parrain, naTribu] = await new GetTribuCompte().run(id)
        this.s.parrain = parrain
        this.s.naTribu = naTribu
        affichermessage(`${parrain ? 'Parrain' : 'N\'est pas parrain'}
         - Tribu : ${naTribu.nom}`, true)
        return
      }
      if (c.id === id) {
        const compta = data.getCompta(id)
        this.s.primaire = compta.t
        this.s.parrain = c.stp
        this.s.naTribu = c.nat
        return
      }
      const st = await new EstParrainTribu().run(id)
      /*
      0 - id n'est pas primaire
      1 - id est primaire pas de la même tribu
      2 - id est primaire et de la même tribu
      3 - id est parrain de la même tribu
      */
      if (st === 0) {
        this.s.primaire = 0
        affichermessage('Cet avatar n`est pas l`avatar primaire de son compte ou la création de son compte est en attente.' +
          'Impossible de savoir si son compte est parrain ou non et de quelle tribu', true)
        return
      }
      this.s.primaire = 1
      if (st === 1) {
        affichermessage('Cet avatar n`est pas de la même tribu que la votre.' +
          'Impossible de savoir si son compte est parrain ou non et de quelle tribu', true)
        return
      }
      this.s.parrain = st === 3 ? 1 : 0
      this.s.naTribu = c.nat
      affichermessage(`${st === 3 ? 'Parain' : 'N\'est pas parrain'} - Tribu : ${c.nat.nom}`, true)
    }
  },

  setup (props) {
    const $store = useStore()
    const sessionok = computed(() => $store.state.ui.sessionok)
    const compte = computed(() => $store.state.db.compte)
    const tribu = computed({ // tribu courante
      get: () => $store.state.db.tribu,
      set: (val) => $store.commit('db/majtribu', val)
    })
    const tribudial = computed({
      get: () => $store.state.ui.tribudial,
      set: (val) => $store.commit('ui/majtribudial', val)
    })
    const comptadialobj = computed({
      get: () => $store.state.ui.comptadialobj,
      set: (val) => $store.commit('ui/majcomptadialobj', val)
    })
    const coupledialobj = computed({
      get: () => $store.state.ui.coupledialobj,
      set: (val) => $store.commit('ui/majcoupledialobj', val)
    })
    const membredialobj = computed({
      get: () => $store.state.ui.membredialobj,
      set: (val) => $store.commit('ui/majmembredialobj', val)
    })

    const tousAx = computed(() => { return $store.state.db.tousAx })

    const cvloc = ref(false)
    const cvdetail = ref(false)
    const zoomdial = ref(false)
    const nvcouple = ref(false)
    const naAvatar = toRef(props, 'naAvatar')
    const contacts = toRef(props, 'contacts')
    const groupes = toRef(props, 'groupes')

    const s = reactive({
      photo: '',
      info: '',
      na: null,
      c: [],
      m: {},
      lfc: [],
      compta: null,
      primaire: false,
      parrain: false,
      naTribu: null
    })

    const cvs = computed(() => { return $store.state.db.cvs })

    function init () {
      s.na = naAvatar.value
      if (!sessionok.value || !s.na) return
      const id = s.na.id
      s.photo = s.na.photoDef
      s.info = s.na.info
      s.c = []
      s.m = []
      s.lfc = []
      if (contacts.value || groupes.value) {
        const tax = tousAx.value
        if (tax) {
          const ax = tax[id]
          if (ax) {
            if (contacts.value && ax.c) {
              const nas = data.getCompte().avatarNas()
              const s1 = new Set()
              ax.c.forEach(idc => {
                const x = data.getCouple(idc)
                if (x) { s.c.push(x); s1.add(x.idI) }
              })
              nas.forEach(na => {
                if (!s1.has(na.id)) s.lfc.push(na)
              })
            }
            if (groupes.value && ax.m && ax.m.size) {
              ax.m.forEach(y => {
                const [idg, im] = y
                const x = data.getMembre(idg, im)
                if (x) s.m.push(x)
              })
            }
          }
        }
      }
      if (compte.value.id === id) {
        const compta = data.getCompta(id)
        s.primaire = compta.t
        s.parrain = compte.value.stp
        s.naTribu = compte.value.nat
      }
    }

    watch(() => cvs.value, (ap, av) => {
      init()
    })

    watch(() => naAvatar.value, (ap, av) => {
      init()
    })

    watch(() => tousAx.value, (ap, av) => {
      init()
    })

    watch(() => compte.value, (ap, av) => {
      init()
    })

    watch(() => sessionok.value, (ap, av) => {
      cvloc.value = false
      cvdetail.value = false
      zoomdial.value = false
    })

    init()

    return {
      compte,
      tribu,
      tribudial,
      comptadialobj,
      coupledialobj,
      membredialobj,
      cvloc,
      cvdetail,
      zoomdial,
      nvcouple,
      s,
      sessionok
    }
  }
})
</script>
<style lang="sass" scoped>
@import '../css/app.sass'
.ligne:hover
  background-color: rgba(130, 130, 130, 0.5)
.q-card > div
  box-shadow: inherit !important
.bord
  border-bottom: 1px solid $grey-5
.bord3
  border-top: 1px solid $grey-5
.bord2p
  border-radius: 3px
  border: 2px solid $warning
  font-weight: bold
  padding: 1px 3px
.bord2, .bord2b
  border-radius: 3px
  border: 1px solid $grey-5
  padding: 1px 3px
.bord2b
  display: inline-block
.menu
  min-width: 15rem
  padding: 2px
  border-radius: 3px
  border: 2px solid $grey-5
.item
  margin: 2px
  border-left: solid 2px transparent
  cursor: pointer
.item:hover
  border-left: solid 2px $warning
</style>
<style lang="css">
@import '../css/cropper.css'
</style>
