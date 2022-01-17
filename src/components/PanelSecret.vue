<template>
  <q-card class="full-height moyennelargeur fs-md column">
    <q-toolbar class="col-auto bg-primary text-white maToolBar">
      <q-btn flat round dense icon="close" size="md" class="q-mr-sm" @click="fermer" />
      <q-toolbar-title><div class="titre-md tit text-center">{{state.titre}}</div></q-toolbar-title>
      <q-btn v-if="mode <= 2" :disable="!modif" class="q-ml-sm" flat dense color="white" icon="undo" @click="undo"/>
      <q-btn v-if="mode <= 2" :disable="!modif || erreur !== ''" class="q-my-sm" flat dense color="white" :label="state.encreation?'Créer':'Valider'" icon="check" @click="valider"/>
      <q-btn icon="more_vert" flat dense color="white" @click="plusinfo"/>
    </q-toolbar>
    <q-toolbar inset class="col-auto bg-primary text-white maToolBar">
      <div class="full-width font-cf">
        <q-tabs v-model="tabsecret" inline-label no-caps dense>
          <q-tab name="texte" label="Détail du secret" />
          <q-tab name="pj" label="Pièces Jointes" />
          <q-tab name="voisins" label="Secrets Voisins" />
        </q-tabs>
      </div>
    </q-toolbar>

    <div v-if="tabok==='texte'" class='col column'>
      <div class="col-auto q-pa-xs full-width row justify-between items-center">
        <div class="col">
          <span v-if="nonmod" class="bg-warning q-pr-sm">[NON éditable]</span>
          <span v-if="state.oralocal===1000">Protection d'écriture</span>
          <span v-if="state.oralocal>1000">Protection d'écriture ET exclusité</span>
          <span v-if="state.oralocal===0">Pas de protection d'écriture</span>
          <span v-if="state.oralocal>0 && state.oralocal<1000">Pas de protection d'écriture MAIS exclusivité</span>
        </div>
        <q-btn :disable="mode > 2" class="col-auto" size="md" flat dense color="primary" label="Protection d'écriture" @click="protection"/>
        <q-btn class="col-auto" :disable="!modifora" size="sm" dense push icon="undo" color="primary" @click="undoora"/>
      </div>
      <div class="col-auto q-pa-xs full-width row justify-between items-center">
        <apercu-motscles class="col" :motscles="state.motscles" :src="state.mclocal"/>
        <q-btn class="col-auto" :disable="state.ro !== 0" color="primary" flat dense label="Mots clés personnels" @click="ouvrirmcl"/>
        <q-btn class="col-auto" v-if="!state.ro" :disable="!modifmcl" size="sm" dense push icon="undo" color="primary" @click="undomcl"/>
      </div>
      <div v-if="state.ts === 2" class="col-auto q-pa-xs full-width row justify-between items-center">
        <apercu-motscles class="col" :motscles="state.motscles" :src="mcglocal"/>
        <q-btn class="col-auto" :disable="state.ro !== 0" flat dense color="primary" label="Mots clés du groupe" @click="ouvrirmcg"/>
        <q-btn class="col-auto" v-if="!state.ro" :disable="!modifmcg" size="sm" dense push icon="undo" color="primary" @click="undomcg"/>
      </div>

      <div class="col-auto q-pa-xs full-width row justify-between items-center">
        <div class="col">{{msgtemp}}</div>
        <q-btn v-if="state.templocal" :disable="state.ro !== 0" class="col-auto" flat dense color="primary" label="Le rendre 'PERMANENT'" @click="state.templocal=false"/>
        <q-btn v-if="!state.templocal" :disable="state.ro !== 0" class="col-auto" flat dense color="primary" label="Le rendre 'TEMPORAIRE'"  @click="state.templocal=true"/>
        <q-btn v-if="!state.ro" :disable="!modiftp" class="col-auto" size="sm" dense push icon="undo" color="primary" @click="undotp"/>
      </div>

      <editeur-texte-secret class="col" v-model="state.textelocal" :texte-ref="secret.txt.t" :editable="!state.ro" :erreur="erreur" :apropos="secret.dh"/>

      <q-dialog v-model="mcledit">
        <select-motscles :motscles="state.motscles" :src="state.mclocal" @ok="changermcl" :close="fermermcl"></select-motscles>
      </q-dialog>

      <q-dialog v-model="mcgedit">
        <select-motscles :motscles="state.motscles" :src="state.mcglocal" @ok="changermcg" :close="fermermcg"></select-motscles>
      </q-dialog>

      <q-dialog v-model="plus">
        <q-card>
          <q-card-section>
            <div class="fs-md">Date-heure de dernière modification : {{secret.dh}}</div>
          </q-card-section>
          <q-card-actions align="right">
            <q-btn flat dense label="J'ai lu" color="primary" @click="plus = false"/>
          </q-card-actions>
        </q-card>
      </q-dialog>

      <q-dialog v-model="protect">
        <q-card class="petitelargeur fs-md">
          <q-card-section><div class="fs-lg maauto">{{titrep}}</div></q-card-section>
          <q-card-section>
            <div v-for="m in msg" :key="m" class="q-pa-sm fs-md">
              <q-icon name='check' class="q-pr-lg" size="md"/>{{m}}
            </div>
          </q-card-section>

          <q-card-actions vertical>
            <q-btn v-if="actions.setprotP" flat dense label="Protéger contre les écritures" color="primary" @click="setprotP"/>
            <q-btn v-if="actions.resetprotP" flat dense label="Lever la protection d'écriture" color="primary" @click="resetprotP"/>
            <q-btn flat dense label="Ne rien faire" color="warning" @click="protect = false"/>
          </q-card-actions>
        </q-card>
      </q-dialog>

    </div>

    <div v-if="tabok==='pj'" class='col column items-center'>
      <q-btn :disable="state.ro !== 0" flat dense color="primary" class="q-mt-sm" size="md" icon="add" label="Ajouter une pièce jointe" @click="nompj='';saisiefichier=true"/>
      <div v-if="state.ro !== 0" class="bg-yellow text-bold text-negative text-center">Le secret est en lecture seule, les pièces jointes peuvent visualisées mais ni créées, ni modifiées.</div>
      <div v-if="secret && secret.mpj" class="q-mt-sm row justify-around items-start">
        <q-card v-for="pj in secret.mpj" :key="pj.nom" class="cardpj q-pa-sm">
          <q-card-section class="ma-qcard-section">
            <div>Nom : {{pj.nom}}</div>
            <div>Type : {{pj.type}}</div>
            <div>Taille : {{pj.size}}</div>
            <div>Date : {{dhstring(pj.dh)}}</div>
          </q-card-section>
          <q-card-actions class="ma-qcard-section" align="left">
            <q-btn :disable="state.ro !== 0" flat dense color="primary" icon="visibility" label="Afficher" @click="affpj(pj)"/>
            <q-btn :disable="state.ro !== 0" flat dense color="primary" icon="save" label="Enregistrer" @click="enregpj(pj)"/>
            <q-btn :disable="state.ro !== 0" flat dense color="primary" icon="refresh" label="Remplacer" @click="majpj(pj)"/>
            <q-btn :disable="state.ro !== 0" flat dense color="warning" icon="delete" label="Supprimer" @click="supprpj(pj)"/>
          </q-card-actions>
        </q-card>
      </div>
    </div>

    <div v-if="tabok==='voisins'" class='col'>
      <q-btn flat dense color="primary" size="md" icon="add" label="Nouveau secret voisin personnel" @click="action1()"/>
      <q-btn v-if="contactcourant" flat dense size="md" color="primary" icon="add" :label="'Nouveau secret voisin partagé avec ' +  contactcourant.nom" @click="action2()"/>
      <q-btn v-if="groupecourant" flat dense size="md" color="primary" icon="add" :label="'Nouveau secret voisin du groupe ' +  groupecourant.nom" @click="action3()"/>
      <div v-for="(s, idx) in state.listevoisins" :key="s.vk" :class="dkli(idx) + ' full-width row items-start q-py-xs'" style="position:relative">
        <div class="col-auto column">
          <q-btn class="q-mx-sm" dense push size="sm" :icon="'expand_'+(!row[s.vk]?'less':'more')"
            color="primary" @click="togglerow(s.vk)"/>
          <q-btn class="q-mx-sm" dense push size="sm" color="warning" icon="add" @click="nouveauvoisin=true;srcvoisin=s"/>
        </div>
        <div class="secretcourant col cursor-pointer" @click="ouvrirvoisin(s)">
          <show-html v-if="row[s.vk]" class="height-8 full-width overlay-y-auto bottomborder" :texte="s.txt.t" :idx="idx"/>
          <div v-else class="full-width text-bold">{{s.titre}}</div>
          <div class="full-width row items-center">
            <apercu-motscles class="col-6" :motscles="state.motscles" :src="s.mc" :groupe-id="s.ts===2?s.id:0"/>
            <div class="col-6 row justify-end items-center">
              <span class="fs-sm q-px-sm">{{s.partage}}</span>
              <span class="fs-sm font-mono">{{s.dh}}</span>
              <q-btn v-if="s.nbpj" size="sm" color="warning" flat dense icon="attach_file" :label="s.nbpj"/>
              <q-btn v-if="s.st!=99999" size="sm" color="warning" flat dense icon="auto_delete" :label="s.nbj"/>
            </div>
          </div>
        </div>
      </div>
    </div>

    <q-dialog v-model="saisiefichier">
      <piece-jointe :nom="nompj" :close="fermerpj" @ok="okpj"/>
    </q-dialog>

    <q-dialog v-model="nouveauvoisin">
      <q-card class="petitelargeur fs-md">
        <q-card-section>
          <div class="titre-lg maauto">
            <span>Création d'un nouveau secret voisin </span>
            <span v-if="srcvoisin.ts === 0">personnel</span>
            <div v-else>{{srcvoisin.partage}}</div>
          </div>
        </q-card-section>
        <q-card-actions align="right">
          <q-btn v-if="srcvoisin.ts === 0" flat dense label="Créer le secret" color="primary" @click="nouveauvoisin=false;action1()"/>
          <q-btn v-if="srcvoisin.ts === 1" flat dense label="Créer le secret" color="primary" @click="nouveauvoisin=false;action2(srcvoisin.contact)"/>
          <q-btn v-if="srcvoisin.ts === 2" flat dense label="Créer le secret" color="primary" @click="nouveauvoisin=false;action3(srcvoisin.groupe)"/>
          <q-btn flat dense label="Annuler" color="warning" @click="nouveauvoisin=false"/>
        </q-card-actions>
      </q-card>
    </q-dialog>

  </q-card>
</template>

<script>
import { toRef, reactive, watch, computed } from 'vue'
import { useStore } from 'vuex'
import ApercuMotscles from './ApercuMotscles.vue'
import PieceJointe from './PieceJointe.vue'
import SelectMotscles from './SelectMotscles.vue'
import EditeurTexteSecret from './EditeurTexteSecret.vue'
import ShowHtml from './ShowHtml.vue'
import { equ8, getJourJ, cfg, serial, Motscles, dhstring, getpj, gzipT, ungzipT } from '../app/util.mjs'
import { NouveauSecret, Maj1Secret, PjSecret } from '../app/operations.mjs'
import { data, Secret } from '../app/modele.mjs'
import { crypt } from '../app/crypto.mjs'
import { saveAs } from 'file-saver'

export default ({
  name: 'PanelSecret',

  components: { ApercuMotscles, SelectMotscles, EditeurTexteSecret, ShowHtml, PieceJointe },

  props: { close: Function },

  computed: {
    tbclass () { return this.$q.dark.isActive ? ' sombre' : ' clair' },
    modifmcl () { return !equ8(this.state.mclocal, this.secret.ts === 2 ? this.secret.mc[this.state.im] : this.secret.mc) },
    modifmcg () { return this.secret.ts === 2 && !equ8(this.state.mcglocal, this.secret.mc[0]) },
    modifora () { return this.state.oralocal !== this.secret.ora },
    modiftx () { return this.state.textelocal !== this.secret.txt.t },
    modiftp () { return this.state.templocal !== (this.secret.st >= 0 && this.secret.st < 99999) },
    modif () { return this.secret && (this.modifmcl || this.modifmcg || this.modiftx || this.modiftp || this.modifora) },
    erreur () { return this.state.ro || this.state.textelocal.length > 9 ? '' : 'Le texte doit contenir au moins 10 signes' },
    msgtemp () {
      if (this.state.templocal) {
        const n = this.secret.st === 99999 ? this.limjours : this.secret.st - this.jourJ
        return 'Secret auto-détruit ' + (n === 0 ? 'aujourd\'hui' : (n === 1 ? 'demain' : ('dans ' + n + ' jours')))
      }
      return 'Secret permanent'
    },
    nonmod () {
      const s = this.state
      return (s.ora >= 1000) || (s.ora > 0 && s.ora < 1000 && s.ora !== s.im) || (s.ts === 2 && s.membre.stp === 0) || (s.ts === 2 && s.groupe.sty === 0)
    }
  },

  data () {
    return {
      row: {},
      tabsecret: 'texte',
      tabok: 'texte',
      plus: false,
      mcledit: false,
      mcgedit: false,
      temporaire: false,
      alertesaisie: false,
      nouveauvoisin: false,
      saisiefichier: false,
      nompj: '',
      srcvoisin: null,
      options1: [
        { label: 'modifiable', value: 0 },
        { label: 'non modifiable (archivé)', value: 2 }
      ],
      options2: [
        { label: 'modifiable par tous', value: 0 },
        { label: 'le dernier auteur', value: 2 },
        { label: 'personne (archivé)', value: 2 }
      ],
      labelro: [
        '',
        'secret "archivé"',
        'seul le propriétaire exclusif peut l\'éditer',
        'non modifiable par les membres du groupe de niveau "lecteur"',
        'groupe "archivé"',
        'mode avion ou visio'
      ],
      labelp: [
        'Vous êtes simple lecteur dans ce groupe',
        'Vous pouvez lire et écrire des secrets dans ce groupe',
        'Vous pouvez lire, écrire des secrets et administrer le groupe.'
      ],
      msg: [],
      titrep: '',
      actions: {},
      protect: false
    }
  },

  watch: {
    tabsecret (ap, av) {
      if (av === 'texte' && this.modif) {
        this.diagnostic = 'Des modifications ont été faites. Avant de changer d\'onglet, soit les "Annuler", soit les "Valider"'
        setTimeout(() => { this.tabsecret = 'texte' }, 50)
      } else {
        this.tabok = ap
      }
    }
  },

  methods: {
    dhstring (t) { return dhstring(new Date(t)) },

    dkli (idx) { return this.$q.dark.isActive ? (idx ? 'sombre' + (idx % 2) : 'sombre0') : (idx ? 'clair' + (idx % 2) : 'clair0') },
    togglerow (vk) {
      if (this.row[vk] === true) {
        this.row[vk] = false
      } else {
        this.row[vk] = true
      }
    },
    ouvrirvoisin (s) {
      this.secret = s
      this.tabsecret = 'texte'
      this.tabok = 'secret'
    },
    listevoisins () {
      const lst = []
      for (const pk in this.voisins) lst.push(this.voisins[pk])
      lst.sort((a, b) => {
        return !a.ref ? 1 : (a.titre > b.titre ? 1 : (a.titre < b.titre ? -1 : 0))
      })
      return lst
    },
    action1 () {
      const s = this.secret
      const ref = s.ref ? s.ref : [s.id, s.ns]
      this.ouvrirvoisin(new Secret().nouveauP(s.id, ref))
    },
    action2 (cx) {
      const s = this.secret
      const ref = s.ref ? s.ref : [s.id, s.ns]
      const c = cx || this.contactcourant
      if (c && c.accepteNouveauSecret) {
        this.ouvrirvoisin(new Secret().nouveauC(s.id, c, ref))
      } else {
        this.diagnostic = 'Le contact ' + (c ? c.nom : '?') + ' n\'est pas en état d\'accepter le partage de nouveaux secrets.'
      }
    },
    action3 (gx) {
      const s = this.secret
      const ref = s.ref ? s.ref : [s.id, s.ns]
      const g = gx || this.groupecourant
      if (!g) {
        this.diagnostic = 'Le groupe ? n\'est pas en état d\'accepter le partage de nouveaux secrets.'
        return
      }
      if (g.sty === 0) {
        this.diagnostic = 'Le groupe ' + g.nom + ' est "archivé", création et modification de secrets impossible.'
        return
      }
      const im = g.imDeId(this.avatar.id)
      const membre = im ? data.getMembre(g.id, im) : null
      if (!membre || !membre.stp) {
        this.diagnostic = 'Seuls les membres de niveau "auteur" et "animateur" du groupe ' + g.nom + ' peuvent créer ou modifier des secrets.'
        return
      }
      this.ouvrirvoisin(new Secret().nouveauG(s.id, g, ref))
    },
    plusinfo () { // liste des auteurs, mots clés des membres du groupe, etc. dans un dialogue
      this.plus = true
    },
    fermer () {
      if (this.modif) {
        this.diagnostic = 'Des modifications ont été faites. Avant de fermer ce secret, soit les "Annuler", soit les "Valider"'
      } else {
        this.avantFermeture()
        this.secret = null
        if (this.close) this.close()
      }
    },

    fermerpj () { this.saisiefichier = false },

    async urlDe (pj, b) {
      const cle = crypt.hash(pj.nom, false, true)
      const x = pj.nom + '|' + pj.type + '|' + pj.dh + (pj.gz ? '$' : '')
      const idc = crypt.u8ToB64(await crypt.crypter(data.clek, x, 1), true)
      const secid = this.secret.sid + '@' + this.secret.sid2
      const buf = await getpj(secid, cle + '@' + idc)
      if (!buf) return null
      const u8 = new Uint8Array(buf)
      const buf2 = await crypt.decrypter(data.clek, u8)
      const buf3 = pj.gz ? ungzipT(buf2) : buf2
      const blob = new Blob([buf3], { type: pj.type })
      return b ? blob : URL.createObjectURL(blob)
    },

    async affpj (pj) {
      const urlpj = await this.urlDe(pj)
      if (urlpj) {
        setTimeout(() => { this.wop(urlpj) }, 500)
      } else {
        this.diagnostic = 'Contenu de la pièce jointe non disponible (corrompu ? effacé ?)'
      }
    },

    async enregpj (pj) {
      const blob = await this.urlDe(pj)
      if (blob) {
        saveAs(blob, pj.nom)
      } else {
        this.diagnostic = 'Contenu de la pièce jointe non disponible (corrompu ? effacé ?)'
      }
    },

    wop (url) { // L'appel direct de wndow.open ne semble pas marcher dans une fonction async. Etrange !
      // console.log(url)
      window.open(url, '_blank')
    },

    majpj (pj) {
      this.nompj = pj.nom
      this.saisiefichier = true
    },

    supprpj (pj) {

    },

    async okpj (pj) {
      const cle = crypt.hash(pj.nompj, false, true)
      pj.gz = pj.type.startsWith('text/')
      const x = pj.nompj + '|' + pj.type + '|' + new Date().getTime() + (pj.gz ? '$' : '')
      const idc = crypt.u8ToB64(await crypt.crypter(data.clek, x, 1), true)
      // console.log(pj.nompj, pj.size, pj.type)
      const s = this.secret
      const b = pj.gz ? gzipT(pj.u8) : pj.u8
      const buf = await crypt.crypter(data.clek, b)
      const arg = { ts: s.ts, id: s.id, ns: s.ns, cle, idc, lg: pj.size, buf }
      if (s.ts === 1) {
        arg.ns2 = s.ns2
        arg.id2 = s.id2
      }
      await new PjSecret().run(arg)
      this.saisiefichier = false
    },

    ouvrirmcl () { this.mcledit = true },
    fermermcl () { this.mcledit = false },
    ouvrirmcg () { this.mcgedit = true },
    fermermcg () { this.mcgedit = false },
    changermcl (mc) { this.state.mclocal = mc },
    changermcg (mc) { this.state.mcglocal = mc },

    setprotP () { this.state.oralocal = 1000; this.protect = false },
    resetprotP () { this.state.oralocal = 0; this.protect = false },

    protection () {
      const s = this.secret
      const ora = this.state.oralocal
      const m = []
      const a = {}
      const pr = Math.floor(ora / 1000) !== 0
      const ex = ora % 1000
      if (this.mode > 2) {
        m.push('Les secrets ne sont pas éditables en mode avion ou dégradé visio')
        a.jailu = true
      } else if (s.ts === 0) {
        this.titrep = 'Secret personnel'
        m.push(!pr ? 'Pas de protection d\'écriture' : 'Protection contre les écritures')
        if (!pr) a.setprotP = true; else a.resetprotP = true
      } else if (s.ts === 1) {
        const n = this.state.contact.nom
        this.titrep = 'Secret partagé avec le contact' + n
        m.push(pr ? 'Pas de protection d\'écriture' : 'Protection contre les écritures')
        if (ex === 0) {
          a.donnerexmoictc = n
          if (pr) a.setprotC = true; else a.resetprotC = true
          a.ok = true
        } else if (ex === this.state.im) {
          m.push('J\'ai l\'exclusité d\'écriture')
          a.donnerexctc = n
          a.ok = true
        } else {
          m.push(n + ' a l\'exclusité d\'écriture')
          m.push('Ce contact est le seul à pouvoir changer le statut de protection du secret')
          a.jailu = true
        }
      } else if (s.ts === 2) {
        this.titrep = 'Secret partagé avec le groupe ' + this.state.groupe.nom
        const p = this.state.membre.stp
        m.push(this.labelp[p])
        if (this.state.groupe.sty === 1) {
          m.push('Le groupe est "archivé" : il est figé, les secrets ne sont pas éditables. Seul un animateur peut le remettre en activité')
          a.jailu = true
        } else if (p === 0) {
          m.push('En tant que simple lecteur vous ne pouvez pas changer les protections d\'écriture')
          a.jailu = true
        } else {
          m.push(pr ? 'Pas de protection d\'écriture' : 'Protection contre les écritures')
          if (ex) {
            const mbr = data.getMembre(this.state.groupe.id, ex)
            const n = mbr ? mbr.nom : ('#' + ex)
            m.push(ex === this.state.im ? 'J\'ai l\'exclusité d\'écriture' : (n + ' a l\'exclusité d\'écriture'))
          }
          if (ex === this.state.im || p === 2) { // l'exclusivité équivalente ici au pouvoir d'animateur
            if (pr) a.setprotG = true; else a.resetprotG = true
            a.donnerexmbr = true // choix du membre recevant l'exclusivité
            a.ok = true
          } else {
            m.push('N\'ayant pas l\'exclusivité et n\'étant pas animateur, vous ne pouvez pas changer les protections d\'écriture')
            a.jailu = true
          }
        }
      }
      this.actions = a
      this.msg = m
      this.protect = true
    },

    getMembres () { // liste des membres actifs du groupes, auteurs et animateurs
      const lst = []
      const mmb = data.getMembre(this.state.groupe.id)
      for (const sim in mmb) {
        const m = mmb[sim]
        if (m.stx === 3 && m.stp > 0) lst.push({ im: m.im, nom: m.nom, p: m.stp === 1 ? 'auteur' : 'animateur' })
      }
      lst.sort((a, b) => { return (a.nom < b.nom ? -1 : (a.nom > b.nom ? 1 : 0)) })
      return lst
    },

    async valider () {
      const s = this.secret
      if (s.v) {
        // maj
        const txts = this.state.textelocal === s.txt.t ? null : await s.toRowTxt(this.state.textelocal, this.state.im)
        let mc = null, mcg = null
        if (s.ts !== 2) {
          mc = equ8(this.state.mclocal, s.mc) ? null : this.state.mclocal
        } else {
          mc = equ8(this.state.mclocal, s.mc[this.state.im]) ? null : this.state.mclocal
          mcg = equ8(this.state.mcglocal, s.mc[0]) ? null : this.state.mcglocal
        }
        const v1 = this.v && this.state.textelocal === s.txt.t ? null : this.state.textelocal.length
        const tempav = this.secret.st > 0 && this.secret.st !== 99999
        const temp = tempav === this.state.templocal ? null : (this.state.templocal ? this.jourJ + this.limjours : 99999)
        const ora = this.state.oralocal === s.ora ? null : this.state.oralocal
        const arg = { ts: s.ts, id: s.id, ns: s.ns, mc, txts, v1, ora, temp }
        if (s.ts === 2) { // im requis pour mettre à jour les motsclés de l'avatar
          arg.mcg = mcg
          arg.im = this.state.im
        }
        if (s.ts === 1) { // pour éviter une relecture inutile au serveur (qui aurait pu les trouver lui-même)
          arg.id2 = s.id2
          arg.ns2 = s.ns2
        }
        await new Maj1Secret().run(arg)
      } else {
        // création
        const txts = await s.toRowTxt(this.state.textelocal, this.state.im)
        const mc = this.state.mclocal
        const v1 = this.state.textelocal.length
        const st = this.state.templocal ? this.jourJ + this.limjours : 99999
        const ora = this.state.oralocal
        const arg = { ts: s.ts, id: s.id, ns: s.ns, ic: s.ic, mc, txts, v1, ora, st }
        if (s.ts === 2) {
          arg.mcg = this.state.mcglocal
          arg.im = this.state.im
        }
        if (s.ts === 1) {
          arg.id2 = s.id2
          arg.ns2 = s.ns2
          arg.ic2 = s.ic2
          arg.dups = await crypt.crypter(s.cles, serial([arg.id2, arg.ns2]))
          arg.dups2 = await crypt.crypter(s.cles, serial([arg.id, arg.ns]))
        }
        arg.refs = s.ref ? await crypt.crypter(s.cles, serial(s.ref)) : null
        await new NouveauSecret().run(arg)
      }
    }
  },

  setup (props) {
    const $store = useStore()
    const diagnostic = computed({
      get: () => $store.state.ui.diagnostic,
      set: (val) => $store.commit('ui/majdiagnostic', val)
    })
    const prefs = computed(() => { return data.getPrefs() })
    const avatar = computed(() => { return $store.state.db.avatar })
    const contactcourant = computed(() => { return $store.state.db.contact })
    const groupecourant = computed(() => { return $store.state.db.groupe })
    const mode = computed(() => $store.state.ui.mode)
    const secret = computed({
      get: () => $store.state.db.secret,
      set: (val) => $store.commit('db/majsecret', val)
    })

    /* Le set des voisins ne changera pas MEME si le secret change, donc pas de watch
    En effet on ne peut au cours de la vie de ce composant ne changer de secret
    QUE pour un autre secret voisin, donc ayant le même "voisins"
    SI c'est un secret SANS ref, il peut devenir de référence au cours de la vie
    du composant, il n'est pas enregistré dans les voisins, il faut donc le forcer.
    */
    if (secret.value && !secret.value.ref) $store.commit('db/setRefVoisin', secret.value)
    const voisins = computed(() => {
      const s = secret.value
      if (!s) return {}
      const pk = s.ref ? s.pkref : s.pk
      return $store.state.db['voisins@' + pk]
    })

    toRef(props, 'close')

    const state = reactive({
      motcles: null,
      contact: null,
      groupe: null,
      avatar: null,
      membre: null,
      im: 0,
      ts: 0,
      encreation: false,
      ro: 0,
      titre: '',
      textelocal: '',
      mclocal: null,
      mcglocal: null,
      oralocal: null,
      templocal: null,
      dhlocal: 0,
      listevoisins: []
    })
    const mc = reactive({ categs: new Map(), lcategs: [], st: { enedition: false, modifie: false } })

    function chargerMc () {
      state.motscles = new Motscles(mc, 1, secret.value && secret.value.ts === 2 ? secret.value.id : 0)
      state.motscles.recharger()
    }

    function lstvoisins (mapv) {
      const lst = []
      for (const pk in mapv) lst.push(mapv[pk])
      lst.sort((a, b) => {
        return !a.ref ? 1 : (a.titre > b.titre ? 1 : (a.titre < b.titre ? -1 : 0))
      })
      return lst
    }

    function undomcl () { const s = secret.value; if (s) { state.mclocal = s.ts === 2 ? s.mc[state.im] : s.mc } }

    function undomcg () { const s = secret.value; if (s) { state.mcglocal = s.ts === 2 ? s.mc[0] : null } }

    function undotp () { const s = secret.value; if (s) { const st = s.st; state.templocal = st > 0 && st < 99999 } }

    function undotx () { const s = secret.value; if (s) { state.textelocal = s.txt.t; state.dhlocal = s.txt.d } }

    function undoora () { const s = secret.value; if (s) { state.oralocal = s.ora } }

    function undo () { undomcl(); undomcg(); undotp(); undotx(); undoora() }

    function initState () {
      const s = secret.value
      const avid = avatar.value ? avatar.value.id : 0 // avatar null après déconnexion
      if (s) { // propriétés immuables pour un secret
        state.ts = s.ts
        state.avatar = s.ts === 0 ? avatar : null
        state.groupe = s.ts === 2 ? data.getGroupe(s.id) : null
        state.contact = s.ts === 1 ? data.getContact(s.id, s.ic) : null
        state.voisins = voisins
        state.im = s.ts === 2 ? state.groupe.imDeId(avid) : (s.ts === 1 ? (state.contact.na.id > avid ? 1 : 2) : 0)
        state.membre = s.ts === 2 && state.im ? data.getMembre(state.groupe.id, state.im) : null
        state.encreation = s.v === 0
        state.ro = 0
        state.listevoisins = lstvoisins(voisins.value)
        if (s.ts === 2) {
          if (!s.mc[state.im]) s.mc[state.im] = new Uint8Array([])
          if (!s.mc[0]) s.mc[0] = new Uint8Array([])
        } else {
          if (!s.mc) s.mc = new Uint8Array([])
        }
        if (!state.encreation) {
          if (s.ora >= 1000) { // archivé
            state.ro = 1
          } else if (s.ora > 0 && s.ora < 1000 && s.ora !== state.im) {
            state.ro = 2 // pas exclusif
          } else if (s.ts === 2 && state.membre.stp === 0) {
            state.ro = 3 // lecteur
          } else if (s.ts === 2 && state.groupe.sty === 0) {
            state.ro = 4 // groupe archivé
          } else if (mode.value > 2) {
            state.ro = 5
          }
        }
        switch (secret.value.ts) {
          case 0 : { state.titre = 'Secret personnel'; break }
          case 1 : { state.titre = 'Partagé avec ' + state.contact.nom; break }
          case 2 : { state.titre = 'Partagé avec ' + state.groupe.nom; break }
        }
        undo()
      }
    }

    initState()
    chargerMc()

    watch(() => prefs.value, (ap, av) => {
      chargerMc()
    })

    watch(() => secret.value, (ap, av) => {
      initState()
      if (ap && (!av || av.pk !== ap.pk)) chargerMc() // le nouveau peut avoir un autre groupe
    })

    watch(() => voisins.value, (ap, av) => {
      state.listevoisins = lstvoisins(ap)
    })

    function avantFermeture () {
      if (secret.value) {
        const pkref = secret.value.ref ? secret.value.pkref : secret.value.pk
        $store.commit('db/unsetRefVoisin', pkref)
      }
    }

    // watch(() => state.textelocal, (ap, av) => { console.log(av, '\n', ap) })

    return {
      diagnostic,
      contactcourant,
      groupecourant,
      secret,
      voisins,
      u8vide: new Uint8Array([]),
      state,
      mode,
      limjours: cfg().limitesjour[0],
      jourJ: getJourJ(),
      undo,
      undomcl,
      undomcg,
      undotp,
      undotx,
      undoora,
      avantFermeture
    }
  }
})
</script>
<style lang="sass" scoped>
@import '../css/app.sass'
.maToolBar
  padding: 0 !important
  min-height: 1.1rem !important
  max-height: 1.6rem !important
.tit
  max-height: 1.3rem
  text-overflow: ellipsis
.mced
  padding: 3px
  border-radius: 5px
  border: 1px solid grey
.bottomborder
  border-bottom: 1px solid $grey-5
.secretcourant:hover
  background-color: rgba(130, 130, 130, 0.5)
.addnv
  position: absolute
  top: 5px
  right: 5px
.cardpj
  width: 18rem
.ma-qcard-section
  padding: 0 !important
</style>
