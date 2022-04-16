<template>
  <q-card class="full-height full-width fs-md column">
    <q-toolbar class="bg-primary text-white maToolBar">
      <q-btn flat round dense icon="view_list" size="md" class="q-mr-sm" @click="retourliste" />
      <q-btn :disable="!precedent" flat round dense icon="first_page" size="md" class="q-mr-sm" @click="prec(0)" />
      <q-btn :disable="!precedent" flat round dense icon="arrow_back_ios" size="md" class="q-mr-sm" @click="prec(1)" />
      <span class="q-pa-sm">{{index + 1}} sur {{sur}}</span>
      <q-btn :disable="!suivant" flat round dense icon="arrow_forward_ios" size="md" class="q-mr-sm" @click="suiv(1)" />
      <q-btn :disable="!suivant" flat round dense icon="last_page" size="md" class="q-mr-sm" @click="suiv(0)" />
      <q-toolbar-title></q-toolbar-title>
      <q-btn size="md" color="white" icon="menu" flat dense>
      </q-btn>
    </q-toolbar>
    <q-toolbar inset class="col-auto bg-primary text-white maToolBar">
      <q-toolbar-title><div class="titre-md tit text-center">{{state.titre}}</div></q-toolbar-title>
      <q-btn v-if="!state.encreation && mode <= 2" :disable="!modif()" class="q-ml-sm" flat dense color="white" icon="undo" @click="undo"/>
      <q-btn v-if="state.encreation && mode <= 2" class="q-ml-sm" flat dense color="white" icon="close" @click="suppr" label="Renoncer"/>
      <q-btn v-if="mode <= 2" :disable="!modif() || (erreur !== '')" class="q-my-sm" flat dense color="white" :label="state.encreation?'Créer':'Valider'" icon="check" @click="valider"/>
      <q-btn icon="more_vert" flat dense color="white" @click="plusinfo"/>
    </q-toolbar>
    <q-toolbar inset class="col-auto bg-secondary text-white maToolBar">
      <div class="full-width font-cf">
        <q-tabs v-model="tabsecret" inline-label no-caps dense>
          <q-tab name="texte" label="Détail du secret" />
          <q-tab name="fa" label="Fichiers attachés" />
          <q-tab name="voisins" label="Secrets voisins" />
        </q-tabs>
      </div>
    </q-toolbar>

    <div v-if="tabsecret==='texte'" class='col column'>
      <div class="col-auto q-pa-xs full-width row justify-between items-center">
        <div class="col">
          <span v-if="nonmod" class="bg-warning q-pr-sm">[NON éditable]</span>
          <span v-if="state.plocal">Protection d'écriture</span>
          <span v-else>Pas de protection d'écriture</span>
        </div>
        <q-btn :disable="mode > 2" class="col-auto" size="md" flat dense color="primary" label="Protection d'écriture" @click="protection"/>
        <q-btn class="col-auto" :disable="!modifp()" size="sm" dense push icon="undo" color="primary" @click="undop"/>
      </div>
      <div v-if="state.ts !== 0" class="col-auto q-pa-xs full-width row justify-between items-center">
        <div class="col">
          <span v-if="state.xlocal">Exclusité d'écriture</span>
          <span v-else>Pas d'exclusité d'écriture </span>
        </div>
        <q-btn :disable="mode > 2" class="col-auto" size="md" flat dense color="primary" label="Exclusivité d'écriture" @click="protection"/>
        <q-btn class="col-auto" :disable="!modifx()" size="sm" dense push icon="undo" color="primary" @click="undox"/>
     </div>
      <div class="col-auto q-pa-xs full-width row justify-between items-center">
        <apercu-motscles class="col" :motscles="state.motscles" :src="state.mclocal"/>
        <q-btn class="col-auto" :disable="state.ro !== 0" color="primary" flat dense label="Mots clés personnels" @click="ouvrirmcl"/>
        <q-btn class="col-auto" v-if="!state.ro" :disable="!modifmcl()" size="sm" dense push icon="undo" color="primary" @click="undomcl"/>
      </div>
      <div v-if="state.ts === 2" class="col-auto q-pa-xs full-width row justify-between items-center">
        <apercu-motscles class="col" :motscles="state.motscles" :src="mcglocal"/>
        <q-btn class="col-auto" :disable="state.ro !== 0" flat dense color="primary" label="Mots clés du groupe" @click="ouvrirmcg"/>
        <q-btn class="col-auto" v-if="!state.ro" :disable="!modifmcg()" size="sm" dense push icon="undo" color="primary" @click="undomcg"/>
      </div>

      <div class="col-auto q-pa-xs full-width row justify-between items-center">
        <div class="col">{{msgtemp}}</div>
        <q-btn v-if="state.templocal" :disable="state.ro !== 0" class="col-auto" flat dense color="primary" label="Le rendre 'PERMANENT'" @click="state.templocal=false"/>
        <q-btn v-if="!state.templocal" :disable="state.ro !== 0" class="col-auto" flat dense color="primary" label="Le rendre 'TEMPORAIRE'"  @click="state.templocal=true"/>
        <q-btn v-if="!state.ro" :disable="!modiftp()" class="col-auto" size="sm" dense push icon="undo" color="primary" @click="undotp"/>
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
            <div class="fs-md">Taille du texte du secret : {{secret.v1}}</div>
            <div class="fs-md">Volume total des pièces jointes : {{secret.v2}}</div>
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

    <div v-if="tabsecret==='fa'" class='col column items-center'>
      <q-btn :disable="state.ro !== 0" flat dense color="primary" class="q-mt-sm" size="md" icon="add"
        label="Ajouter un fichier" @click="nomfic='';saisiefichier=true"/>
      <div v-if="mode === 3" class="bg-yellow text-bold text-negative text-center">
        En mode avion, le secret est en lecture seule. Seuls les fichiers de nom déclaré accessible dans en mode avion peuvent visualisés (ni ajouts, ni suppressions).</div>
      <div v-if="mode === 4" class="bg-yellow text-bold text-negative text-center">
        En mode dégradé visio, le secret est en lecture seule et les fichiers sont inaccessibles.</div>
      <div v-if="mode < 3 && state.ro !== 0" class="bg-yellow text-bold text-negative text-center">
        Le secret est en lecture seule, les fichiers peuvent visualisés (ni ajout, ni suppression).</div>
      <div v-for="it in state.listefic" :key="it.nom" class="full-width">
        <q-expansion-item group="fnom" class="full-width"
          header-class="expansion-header-class-1 titre-md bg-secondary text-white">
          <template v-slot:header>
            <q-item-section>
              <div class="row justify-between items-center">
                <div class="col titre-lg text-bold">{{it.n}}</div>
                <div class="col-auto row items-center">
                  <div class="col fs-md q-mr-md">{{it.l.length}} version(s)</div>
                  <q-btn class="col-auto" dense flat size="md" icon="airplanemode_active" color="grey">
                    <q-menu transition-show="scale" transition-hide="scale">
                      <q-list dense style="min-width: 15rem">
                        <q-item>
                          <q-item-section class="text-italic">La version la plus récente est chargée localement pour être lisible en mode avion ...</q-item-section>
                        </q-item>
                        <q-separator />
                        <q-item clickable v-close-popup>
                          <q-item-section>Arrêter cette possibilité</q-item-section>
                        </q-item>
                        <q-item clickable v-close-popup>
                          <q-item-section>Toujours charger la version la plus récente localement pour qu'elle soit lisible en mode avion</q-item-section>
                        </q-item>
                      </q-list>
                    </q-menu>
                  </q-btn>
                </div>
              </div>
            </q-item-section>
          </template>
          <q-card-section v-for="f in it.l" :key="f.idf" class="ma-qcard-section">
            <div class="row justify-between items-center">
              <div class="col">
                <span class="text-bold q-pr-lg">{{f.info}}</span>
                <span class="fs-md">{{vol(f)}} - {{f.type}} - </span>
                <span class="font-mono fs-sm">{{f.sidf}}</span>
              </div>
              <div class="col-auto font-mono fs-sm">{{dhed(f)}}</div>
            </div>
            <div class="row justify-between items-center">
              <q-toggle class="col-auto" size="sm" v-model="state.avion[f.nom]" :disable="!stf3()"
                :color="state.avion[f.nom] ? 'green' : 'grey'"
                label="Lisible en mode avion" @update:model-value="chgAvion(f)"/>
              <div class="row justify-end q-gutter-xs">
                <q-btn :disable="!stf1(f)" size="sm" dense color="primary" icon="visibility" label="Aff." @click="affFic(f)"/>
                <q-btn :disable="!stf1(f)" size="sm" dense color="primary" icon="save" label="Enreg." @click="enregFic(f)"/>
                <q-btn :disable="!stf2()" size="sm" dense color="warning" icon="delete" label="Suppr." @click="supprFic(f)"/>
              </div>
            </div>
          </q-card-section>
        </q-expansion-item>
        <q-separator size="2px"/>
      </div>
    </div>

    <div v-if="tabsecret==='voisins'" class='col'>
      <q-btn flat dense color="primary" size="md" icon="add" label="Nouveau secret voisin personnel" @click="action0"/>
      <q-btn v-if="couple" flat dense size="md" color="primary" icon="add" :label="'Nouveau secret voisin partagé avec ' +  couple.nom" @click="action1(couple.id)"/>
      <q-btn v-if="groupe" flat dense size="md" color="primary" icon="add" :label="'Nouveau secret voisin du groupe ' +  groupe.nom" @click="action2(groupe.id)"/>
      <div v-for="(s, idx) in state.listevoisins" :key="s.vk" :class="dkli(idx) + ' full-width row items-start q-py-xs'" style="position:relative">
        <div class="col-auto column">
          <q-btn class="q-mx-sm" dense push size="sm" :icon="'expand_'+(!row[s.vk]?'less':'more')"
            color="primary" @click="togglerow(s.vk)"/>
          <q-btn class="q-mx-sm" dense push size="sm" color="warning" icon="add">
            <q-menu transition-show="scale" transition-hide="scale">
              <q-list dense style="min-width: 10rem">
                <q-item>
                  <q-item-section class="text-italic">Nouveau secret voisin ...</q-item-section>
                </q-item>
                <q-separator />
                <q-item clickable v-close-popup @click="action0">
                  <q-item-section>...personnel</q-item-section>
                </q-item>
                <q-separator />
                <q-item v-if="s.couple" clickable v-close-popup @click="action1">
                  <q-item-section>...partagé avec {{s.couple.nom}}</q-item-section>
                </q-item>
                <q-separator v-if="s.groupe" />
                <q-item v-if="s.groupe" clickable v-close-popup @click="action2">
                  <q-item-section>...partagé avec {{s.groupe.nom}}</q-item-section>
                </q-item>
              </q-list>
            </q-menu>
          </q-btn>
        </div>
        <div class="zone col cursor-pointer" @click="ouvrirvoisin(s)">
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
      <fichier-attache :secret="secret" :close="fermerfa"/>
    </q-dialog>

  </q-card>
</template>

<script>
import { reactive, watch, computed, ref } from 'vue'
import { useStore } from 'vuex'
import ApercuMotscles from './ApercuMotscles.vue'
import FichierAttache from './FichierAttache.vue'
import SelectMotscles from './SelectMotscles.vue'
import EditeurTexteSecret from './EditeurTexteSecret.vue'
import ShowHtml from './ShowHtml.vue'
import { equ8, getJourJ, cfg, Motscles, dhstring, afficherdiagnostic, edvol } from '../app/util.mjs'
import { NouveauSecret, Maj1Secret, SupprFichier } from '../app/operations.mjs'
import { data, Secret } from '../app/modele.mjs'
import { crypt } from '../app/crypto.mjs'
import { putFa } from '../app/db.mjs'
import { saveAs } from 'file-saver'

export default ({
  name: 'PanelSecret',

  components: { ApercuMotscles, SelectMotscles, EditeurTexteSecret, ShowHtml, FichierAttache },

  props: { sec: Object, suivant: Function, precedent: Function, supprcreation: Function, index: Number, sur: Number },

  computed: {
    tbclass () { return this.$q.dark.isActive ? ' sombre' : ' clair' },
    msgtemp () {
      if (this.state.templocal) {
        const n = this.secret.st === 99999 ? this.limjours : this.secret.st - this.jourJ
        return 'Secret auto-détruit ' + (n === 0 ? 'aujourd\'hui' : (n === 1 ? 'demain' : ('dans ' + n + ' jours')))
      }
      return 'Secret permanent'
    },
    nonmod () { return this.state.ro }
  },

  data () {
    return {
      row: {},
      plus: false,
      mcledit: false,
      mcgedit: false,
      protect: false,
      saisiefichier: false,
      nomfic: '',
      msg: [],
      titrep: '',
      actions: {}
    }
  },

  methods: {
    vol (f) { return edvol(f.lg) },
    dhed (f) { return dhstring(f.dh) },
    stf1 (f) { // visibilité d'un fichier
      if (this.mode < 3) return true
      if (this.mode === 4) return false
      return this.state.avion[f.nom] // mode avion
    },

    stf2 () { // suppression d'une pièce jointe
      if (this.mode > 2) return false
      return this.state.ro === 0
    },

    stf3 () { // peut basculer accessible en mode avion
      return this.mode === 1 || this.mode === 3
    },

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
    },
    action0 () {
      const s = this.secret
      const ref = s.ref ? s.ref : [s.id, s.ns]
      this.ouvrirvoisin(new Secret().nouveauP(s.id, ref))
    },
    action1 (id) {
      const s = this.secret
      const ref = s.ref ? s.ref : [s.id, s.ns]
      const c = this.couple
      if (c) this.ouvrirvoisin(new Secret().nouveauC(id || s.id, ref, c.avc))
    },
    action2 (id) {
      const s = this.secret
      const ref = s.ref ? s.ref : [s.id, s.ns]
      const g = this.groupe
      if (g) {
        if (g.sty === 0) {
          afficherdiagnostic('Le groupe ' + g.nom + ' est "protégé en écriture", création et modification de secrets impossible.')
          return
        }
        const m = g.membreParId(this.avatar.id)
        if (!m || !m.stp) {
          afficherdiagnostic('Seuls les membres de niveau "auteur" et "animateur" du groupe ' + g.nom + ' peuvent créer ou modifier des secrets.')
          return
        }
        this.ouvrirvoisin(new Secret().nouveauG(id || s.id, ref, m.im))
      }
    },
    plusinfo () { // liste des auteurs, mots clés des membres du groupe, etc. dans un dialogue
      this.plus = true
    },
    fermerfa () { this.saisiefichier = false },

    async blobde (f, b) {
      const buf = await this.secret.getFichier(f.idf)
      if (!buf || !buf.length) return null
      const blob = new Blob([buf], { type: f.type })
      return b ? blob : URL.createObjectURL(blob)
    },

    wop (url) { // L'appel direct de wndow.open ne semble pas marcher dans une fonction async. Etrange !
      // console.log(url)
      window.open(url, '_blank')
    },

    async affFic (f) {
      const url = await this.blobde(f)
      if (url) {
        setTimeout(() => { this.wop(url) }, 500)
      } else {
        afficherdiagnostic('Contenu du fichier non disponible (corrompu ? effacé ?)')
      }
    },

    async enregFic (f) {
      const blob = await this.blobde(f, true)
      if (blob) {
        saveAs(blob, this.secret.nomFichier(f.idf))
      } else {
        afficherdiagnostic('Contenu du fichier non disponible (corrompu ? effacé ?)')
      }
    },

    async supprFic (f) {
      await new SupprFichier().run(this.secret, f.idf)
    },

    async chgAvion (f) {
      const s = this.secret
      const ap = this.state.avion[f.cle]
      const x = { id: s.id, ns: s.ns, cle: f.cle, hv: f.hv }
      if (ap) {
        // dispo en mode avion
        const buf = await s.datapj(f, true)
        await putFa(x, buf) // en IDB
        data.setPjidx([x]) // lst : array de { id, ns, cle, hv } - Dans le store
      } else {
        x.hv = null
        await putFa(x, null) // suppr en IDB
        data.setPjidx([x])
      }
    },

    ouvrirmcl () { this.mcledit = true },
    fermermcl () { this.mcledit = false },
    ouvrirmcg () { this.mcgedit = true },
    fermermcg () { this.mcgedit = false },
    changermcl (mc) { this.state.mclocal = mc },
    changermcg (mc) { this.state.mcglocal = mc },

    setprotP () {
      this.state.plocal = 1
      this.protect = false
    },
    resetprotP () { this.state.plocal = 0; this.protect = false },

    protection () { // paramétrage du dialogue de gestion des exclusivité / protection
      const s = this.secret
      const ex = this.state.xlocal
      const pr = this.state.plocal
      const m = []
      const a = {}
      if (this.mode > 2) {
        m.push('Les secrets ne sont pas éditables en mode avion ou dégradé visio')
        a.jailu = true
      } else if (s.ts === 0) {
        this.titrep = 'Secret personnel'
        m.push(!pr ? 'Pas de protection d\'écriture' : 'Protection contre les écritures')
        if (!pr) a.setprotP = true; else a.resetprotP = true
      } else if (s.ts === 1) {
        const n = this.state.couple.nom
        this.titrep = 'Secret partagé en couple ' + n
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
          m.push(n + ' a l\'exclusité d\'écriture et est le seul à pouvoir changer le statut de protection du secret')
          a.jailu = true
        }
      } else if (s.ts === 2) {
        this.titrep = 'Secret partagé avec le groupe ' + this.state.groupe.nom
        const p = this.state.membre.stp
        m.push(this.labelp[p])
        if (this.state.groupe.sty === 1) {
          m.push('Le groupe est "protégé contre l\'écriture" : il est figé, les secrets ne sont pas éditables. Seul un animateur peut le remettre en activité')
          a.jailu = true
        } else if (p === 0) {
          m.push('Un simple lecteur ne peut pas changer les protections d\'écriture')
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
      const xploc = this.state.plocal + (10 * this.state.xlocal)
      if (s.v) {
        // maj
        const txts = this.state.textelocal === s.txt.t ? null : await s.toRowTxt(this.state.textelocal, this.state.im)
        const chgmc = s.ts === 0 ? !equ8(this.state.mclocal, s.mc) : !equ8(this.state.mclocal, s.mc[this.state.im])
        const mc = chgmc ? this.state.mclocal : null
        const v1 = this.state.textelocal === s.txt.t ? null : this.state.textelocal.length
        const tempav = this.secret.st > 0 && this.secret.st !== 99999
        const st = tempav === this.state.templocal ? null : (this.state.templocal ? this.jourJ + this.limjours : 99999)
        const xp = xploc === s.xp ? null : xploc
        const arg = { ts: s.ts, id: s.id, ns: s.ns, mc, txts, v1, xp, st, varg: s.volarg() }
        if (s.ts === 2) arg.mcg = equ8(this.state.mcglocal, s.mc[0]) ? null : this.state.mcglocal
        // im requis pour mettre à jour les motsclés de l'avatar
        if (s.ts !== 0) arg.im = this.state.im
        await new Maj1Secret().run(arg)
      } else {
        // création
        const txts = await s.toRowTxt(this.state.textelocal, this.state.im)
        const mc = this.state.mclocal
        const v1 = this.state.textelocal.length
        const st = this.state.templocal ? this.jourJ + this.limjours : 99999
        const xp = xploc
        const arg = { ts: s.ts, id: s.id, ns: s.ns, mc, txts, v1, xp, st, varg: s.volarg() }
        if (s.ts === 2) arg.mcg = this.mcglocal
        // im requis pour mettre à jour les motsclés de l'avatar
        if (s.ts !== 0) arg.im = this.state.im
        arg.refs = await s.toRowRef()
        await new NouveauSecret().run(arg)
      }
    },

    // n == 0, premier / dernier, n == 1 suivant / précédent
    suiv (n) { if (this.suivant) this.suivant(n) },
    prec (n) { if (this.precedent) this.precedent(n) },
    suppr () {
      if (this.supprcreation) this.supprcreation()
    }
  },

  setup () {
    const $store = useStore()
    const tabsecret = ref('texte')
    const erreur = ref('')
    const avatarscform = computed({
      get: () => $store.state.ui.avatarscform,
      set: (val) => $store.commit('ui/majavatarscform', val)
    })
    const prefs = computed(() => { return data.getPrefs() })
    const avatar = computed(() => { return $store.state.db.avatar })
    const faidx = computed(() => { return $store.state.db.faidx })
    const couple = computed(() => { return $store.state.db.couple })
    const groupe = computed(() => { return $store.state.db.groupe })
    const mode = computed(() => $store.state.ui.mode)
    const secret = computed({ // secret courant
      get: () => $store.state.db.secret,
      set: (val) => $store.commit('db/majsecret', val)
    })

    const state = reactive({
      motcles: null,
      couple: null,
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
      xlocal: 0,
      plocal: 0,
      templocal: null,
      dhlocal: 0,
      listevoisins: [],
      listefic: [],
      avion: {}
    })
    const mc = reactive({ categs: new Map(), lcategs: [], st: { enedition: false, modifie: false } })

    function chargerMc () {
      state.motscles = new Motscles(mc, 1, secret.value && secret.value.ts === 2 ? secret.value.id : 0)
      state.motscles.recharger()
    }

    function lstvoisins (mapv) {
      const lst = []
      for (const pk in mapv) lst.push(mapv[pk])
      lst.sort((a, b) => { return !a.ref ? -1 : (a.titre > b.titre ? 1 : (a.titre < b.titre ? -1 : 0)) })
      return lst
    }

    function undomcl () { const s = secret.value; if (s) { state.mclocal = s.ts >= 1 ? s.mc[state.im] : s.mc } }

    function undomcg () { const s = secret.value; if (s) { state.mcglocal = s.ts === 2 ? s.mc[0] : null } }

    function undotp () { const s = secret.value; if (s) { const st = s.st; state.templocal = st > 0 && st < 99999 } }

    function undotx () { const s = secret.value; if (s) { state.textelocal = s.txt.t; state.dhlocal = s.txt.d } }

    function undox () { const s = secret.value; if (s) { state.xlocal = s.exclu } }

    function undop () { const s = secret.value; if (s) { state.plocal = s.protect } }

    function undo () { undomcl(); undomcg(); undotp(); undotx(); undox(); undop() }

    function modifmcl () {
      return !equ8(state.mclocal, secret.value.ts === 2 ? secret.value.mc[state.im] : secret.value.mc)
    }
    function modifmcg () {
      return secret.value.ts === 2 && !equ8(state.mcglocal, secret.value.mc[0])
    }
    function modifx () {
      return state.xlocal !== secret.value.exclu
    }
    function modifp () {
      return state.plocal !== secret.value.protect
    }
    function modiftx () {
      return state.textelocal !== secret.value.txt.t
    }
    function modiftp () {
      return state.templocal !== (secret.value.st >= 0 && secret.value.st < 99999)
    }
    function modif () {
      return secret.value && (modifmcl() || modifmcg() || modiftx() || modiftp() || modifx() || modifp())
    }
    function listefichiers (s) {
      const lst = []
      const mnom = {}
      for (const idf in s.mfa) {
        const f = s.mfa[idf]
        let e = mnom[f.nom]; if (!e) { e = []; mnom[f.nom] = e; lst.push(f.nom) }
        e.push({ ...f, sidf: crypt.idToSid(f.idf) })
      }
      lst.sort((a, b) => { return a < b ? -1 : (a > b ? 1 : 0) })
      const res = []
      lst.forEach(n => {
        const l = mnom[n]
        l.sort((a, b) => { return a.dh < b.dh ? 1 : (a.dh > b.dh ? -1 : 0) })
        res.push({ n, l })
      })
      return res
    }
    function initState () {
      const s = secret.value
      const avid = avatar.value ? avatar.value.id : 0 // avatar null après déconnexion
      if (s) { // propriétés immuables pour un secret
        $store.commit('db/initVoisins', secret.value) // initialise (si besoin est, nouveau secret par exemple) l'entrée des voisins
        state.ts = s.ts
        state.avatar = s.ts === 0 ? avatar : null
        state.groupe = s.ts === 2 ? data.getGroupe(s.id) : null
        state.couple = s.ts === 1 ? data.getCouple(s.id) : null
        state.im = s.ts === 2 ? state.groupe.imDeId(avid) : (s.ts === 1 ? state.couple.avc + 1 : 0)
        state.membre = s.ts === 2 && state.im ? data.getMembre(state.groupe.id, state.im) : null
        state.encreation = s.v === 0
        state.ro = 0
        state.listevoisins = lstvoisins($store.state.db['voisins@' + (s.ref ? s.pkref : s.pk)])
        if (s.ts >= 1) {
          if (!s.mc[state.im]) s.mc[state.im] = new Uint8Array([])
          if (!s.mc[0]) s.mc[0] = new Uint8Array([])
        } else {
          if (!s.mc) s.mc = new Uint8Array([])
        }
        if (!state.encreation) {
          if (s.protect) {
            state.ro = 1 // protégé en écriture
          } else if (s.exclu && s.exclu !== state.im) {
            state.ro = 2 // exclusivité accordée à un autre membre
          } else if (s.ts === 2 && state.membre.stp === 0) {
            state.ro = 3 // lecteur
          } else if (s.ts === 2 && state.groupe.sty === 0) {
            state.ro = 4 // groupe protégé en écriture
          } else if (mode.value > 2) {
            state.ro = 5 // mode sans mise à jour
          }
        }
        switch (secret.value.ts) {
          case 0 : { state.titre = 'Secret personnel'; break }
          case 1 : { state.titre = 'Partagé avec ' + state.couple.nom; break }
          case 2 : { state.titre = 'Partagé avec ' + state.groupe.nom; break }
        }
        state.listefic = listefichiers(s)
        undo()
      }
    }

    function setFaloc () {
      const s = secret.value
      if (!s || mode.value === 2 || mode.value === 4) { state.avion = {}; return } // En mode incognito/visio, c'est indéterminé (pas d'accès à IDB)
      const avion = {}
      const lst = data.getFaidx({ id: s.id, ns: s.ns })
      if (s.nbpj) {
        for (const cle in s.mpj) {
          avion[cle] = false
        }
      }
      if (lst && lst.length) {
        lst.forEach(x => { avion[x.cle] = true })
      }
      state.avion = avion
    }

    watch(() => prefs.value, (ap, av) => {
      chargerMc()
    })

    watch(() => secret.value, (ap, av) => {
      if (av) cleanVoisins(av)
      initState()
      setFaloc()
      check()
      if (ap && (!av || av.pk !== ap.pk)) chargerMc() // le nouveau peut avoir un autre groupe
    })

    function check () {
      erreur.value = state.ro || state.textelocal.length > 10 ? '' : 'Le texte doit contenir au moins 10 signes'
    }

    watch(() => state.textelocal, (ap, av) => {
      check()
    })

    watch(() => faidx.value, (ap, av) => {
      setFaloc()
    })

    watch(() => avatarscform.value, (ap, av) => {
      if (!ap) {
        if (modif()) {
          afficherdiagnostic('Des modifications ont été faites. Avant de fermer ce secret, soit les "Annuler", soit les "Valider"')
          setTimeout(() => { avatarscform.value = true; tabsecret.value = 'texte' }, 50)
          return
        }
        if (state.encreation) {
          afficherdiagnostic('Une création de secret est en cours. Avant de fermer ce secret, soit "Renoncer", soit "Valider"')
          setTimeout(() => { avatarscform.value = true; tabsecret.value = 'texte' }, 50)
          return
        }
      }
      cleanVoisins(secret.value)
    })

    watch(() => tabsecret.value, (ap, av) => {
      if (av === 'texte') {
        if (modif()) {
          afficherdiagnostic('Des modifications ont été faites. Avant de changer d\'onglet, soit les "Annuler", soit les "Valider"')
          setTimeout(() => { tabsecret.value = 'texte' }, 50)
          return
        }
        if (state.encreation) {
          afficherdiagnostic('Une création de secret est en cours. Avant de changer d\'onglet, soit "Renoncer", soit "Valider"')
          setTimeout(() => { avatarscform.value = true; tabsecret.value = 'texte' }, 50)
        }
      }
    })

    function cleanVoisins (s) {
      if (s) $store.commit('db/cleanVoisins', s.ref ? s.pkref : s.pk)
    }

    function retourliste () {
      avatarscform.value = false
    }

    initState()
    chargerMc()
    setFaloc()
    check()

    return {
      tabsecret,
      couple,
      groupe,
      secret,
      u8vide: new Uint8Array([]),
      state,
      mode,
      limjours: cfg().limitesjour.secrettemp,
      jourJ: getJourJ(),
      undo,
      undomcl,
      undomcg,
      undotp,
      undotx,
      undox,
      undop,
      modifmcl,
      modifmcg,
      modifx,
      modifp,
      modiftx,
      modiftp,
      modif,
      erreur,
      retourliste
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
.addnv
  position: absolute
  top: 5px
  right: 5px
.ma-qcard-section
  padding: 0 !important
</style>
