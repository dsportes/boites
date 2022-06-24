<template>
  <q-card class="full-height full-width fs-md column">
    <div style="min-height:4rem"></div>

    <div v-if="!secret.suppr && tabsecret==='texte'" class='col column q-mt-sm'>
      <info-txt class="col-auto" v-if="ed && cx1()" label="Texte non modifiable" :info="lc[cx1()]"/>
      <editeur-texte-secret class="col" v-model="state.textelocal" :texte-ref="secret.txt.t"
        :editable="ed && !cx1()" :erreur="state.erreur" :apropos="secret.dh"/>

      <div class="col-auto q-px-xs full-width row justify-between items-center">
        <div class="col">
          <span v-if="state.plocal">Protection d'écriture</span>
          <span v-else>Pas de protection d'écriture</span>
        </div>
        <info-txt v-if="ed && cx3()" label="Protection" :info="lc[cx3()]"/>
        <q-btn v-if="ed && !cx3()" class="col-auto" size="md" flat dense color="primary" label="Protection" @click="protectionP"/>
        <q-btn v-if="ed && !cx3()" class="col-auto" :disable="!state.modifp" size="sm" dense push icon="undo" color="primary" @click="undop"/>
      </div>

      <div v-if="secret.ts !== 0" class="col-auto q-px-xs full-width row justify-between items-center">
        <div class="col">
          <span v-if="state.xlocal">Exclusité d'écriture à {{excluNom()}}</span>
          <span v-else>Pas d'exclusité d'écriture </span>
        </div>
        <info-txt v-if="ed && cx6()" label="Exclusivité" :info="lc[cx6()]"/>
        <q-btn v-if="ed && !cx6()" class="col-auto" size="md" flat dense color="primary" label="Exclusivité" @click="protectionX"/>
        <q-btn v-if="ed && !cx6()" class="col-auto" :disable="!state.modifx" size="sm" dense push icon="undo" color="primary" @click="undox"/>
      </div>

      <div class="col-auto q-px-xs full-width row justify-between items-center">
        <div class="col-auto q-mr-sm">Mots clés:</div>
        <apercu-motscles class="col" :motscles="state.motscles" :src="state.mclocal"/>
        <q-btn v-if="ed" class="col-auto" color="primary" flat dense label="Mots clés personnels" @click="ouvrirmcl"/>
        <q-btn v-if="ed" class="col-auto" :disable="!state.modifmcl" size="sm" dense push icon="undo" color="primary" @click="undomcl"/>
      </div>

      <div v-if="state.ts === 2" class="col-auto q-px-xs full-width row justify-between items-center">
        <apercu-motscles class="col" :motscles="state.motscles" :src="state.mcglocal"/>
        <info-txt v-if="ed && cx4()" label="Mots clés du groupe" :info="lc[cx4()]"/>
        <q-btn v-if="ed && !cx4()" class="col-auto" flat dense color="primary" label="Mots clés du groupe" @click="ouvrirmcg"/>
        <q-btn v-if="ed && !cx4()" class="col-auto" :disable="!state.modifmcg" size="sm" dense push icon="undo" color="primary" @click="undomcg"/>
      </div>

      <div class="col-auto q-px-xs full-width row justify-between items-center">
        <div class="col">{{msgtemp}}</div>
        <info-txt v-if="ed && cx2()" label="Temporaire / Permanent" :info="lc[cx2()]"/>
        <q-btn v-if="state.templocal && ed && !cx2()" class="col-auto" flat dense color="primary" label="Le rendre 'PERMANENT'" @click="state.templocal=false"/>
        <q-btn v-if="!state.templocal && ed && !cx2()" class="col-auto" flat dense color="primary" label="Le rendre 'TEMPORAIRE'"  @click="state.templocal=true"/>
        <q-btn v-if="ed && !cx2()" :disable="!state.modiftp" class="col-auto" size="sm" dense push icon="undo" color="primary" @click="undotp"/>
      </div>
      <q-separator class="q-my-xs"/>
      <div class="col-auto q-px-xs full-width">
        <div class="fs-md">Taille du texte du secret : <span class="font-mono">{{secret.v1}}</span></div>
        <div class="fs-md">Volume total des pièces jointes : <span class="font-mono">{{secret.v2}}</span></div>
        <div v-if="secret.ts" class="fs-md">Derniers auteurs : <span class="font-mono">{{secret.auteurs().join(' / ')}}</span></div>
      </div>

      <q-dialog v-if="sessionok" v-model="mcledit">
        <select-motscles :motscles="state.motscles" :src="state.mclocal" @ok="changermcl" :close="fermermcl"></select-motscles>
      </q-dialog>

      <q-dialog v-if="sessionok" v-model="mcgedit">
        <select-motscles :motscles="state.motscles" :src="state.mcglocal" @ok="changermcg" :close="fermermcg"></select-motscles>
      </q-dialog>

      <q-dialog v-if="sessionok" v-model="confirmsuppr">
        <q-card class="petitelargeur fs-md">
          <q-card-section>
            <div v-if="!cx5()" class="titre-md text-bold">
              Supprimer un secret est irréversible. Pour simplement ne plus le voir mais le garder existant,
              lui attribuer le mot clé "Poubelle" et filtrer les secrets n'ayant pas ce mot-clé (ou l'ayant pour retrouver le contenu de la poublelle).
            </div>
            <div v-else>Suppression non autorisée : {{lc[cx5()]}}</div>
          </q-card-section>
          <q-card-actions v-if="!cx5()" vertical>
            <q-btn flat dense v-close-popup color="primary" label="Je renonce à le suprimer"/>
            <q-btn flat dense v-close-popup color="warning" label="Je confirme la suppression" @click="supprimer"/>
          </q-card-actions>
          <q-card-actions v-else>
            <q-btn flat dense v-close-popup color="primary" label="J'ai lu"/>
          </q-card-actions>
        </q-card>
      </q-dialog>

      <q-dialog v-if="sessionok" v-model="protectP">
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
            <q-btn v-if="actions.nerienfaire" flat dense label="Ne rien faire" color="warning" @click="protectP = false"/>
            <q-btn v-if="actions.jailu" flat dense label="J'ai lu" color="primary" @click="protectP = false"/>
          </q-card-actions>
        </q-card>
      </q-dialog>

      <q-dialog v-if="sessionok" v-model="protectX">
        <q-card class="petitelargeur fs-md">
          <q-card-section><div class="fs-lg maauto">{{titrep}}</div></q-card-section>
          <q-card-section>
            <div v-for="m in msg" :key="m" class="q-pa-sm fs-md">
              <q-icon name='check' class="q-pr-lg" size="md"/>{{m}}
            </div>
          </q-card-section>
          <q-card-section v-if="actions.donnerexmbr">
            <q-select v-model="auteur" :options="auteurs" dense options-dense label="Choisir un membre du groupe" />
            <q-btn :disable="!auteur" flat dense :label="'Donner l\'exclusité d\'écriture à ' + auteur"
              color="warning" @click="setExcluM(auteur)"/>
          </q-card-section>
          <q-card-actions vertical>
            <q-btn v-if="actions.donnerexmoi" flat dense label="Me donner l'exclusité d'écriture"
              color="warning" @click="setExcluC(false)"/>
            <q-btn v-if="actions.resetExcluC" flat dense label="Retirer l'exclusité d'écriture"
              color="warning" @click="resetExcluC()"/>
            <q-btn v-if="actions.donnerexctc" flat dense :label="'Donner l\'exclusité d\'écriture à ' + actions.donnerexctc"
              color="warning" @click="setExcluC(true)"/>
            <q-btn v-if="actions.nerienfaire" flat dense label="Ne rien faire" color="warning" @click="protectX = false"/>
            <q-btn v-if="actions.jailu" flat dense label="J'ai lu" color="primary" @click="protectX = false"/>
          </q-card-actions>
        </q-card>
      </q-dialog>

    </div>

    <div v-if="!secret.suppr && tabsecret==='fa'" class='col column items-center'>
      <q-btn v-if="cx1()" flat dense color="primary" class="q-mt-sm" size="md" icon="add"
        label="Ajouter un fichier" @click="nomfic='';saisiefichier=true"/>
      <div v-if="mode === 3" class="bg-yellow text-bold text-negative text-center">
        En mode avion, le secret est en lecture seule. Seuls ses fichiers déclarés "avion" peuvent visualisés (ni ajouts, ni suppressions).</div>
      <div v-if="mode === 4" class="bg-yellow text-bold text-negative text-center">
        En mode dégradé visio, le secret est en lecture seule et les fichiers sont inaccessibles.</div>
      <div v-if="mode < 3 && state.ro !== 0" class="bg-yellow text-bold text-negative text-center">
        Le secret est en lecture seule, les fichiers peuvent visualisés (ni ajout, ni suppression).</div>
      <div v-for="it in state.listefic" :key="it.nom" class="full-width">
        <div class="row">
          <q-expansion-item group="fnom" class="col" switch-toggle-side
            header-class="expansion-header-class-1 titre-md bg-secondary text-white">
            <template v-slot:header>
              <q-item-section>
                <div class="row justify-between items-center">
                  <div class="col titre-lg text-bold">{{it.n}}</div>
                  <div class="col-auto row items-center">
                    <div class="col fs-md q-mr-md">{{it.l.length}} version(s)</div>
                  </div>
                </div>
              </q-item-section>
            </template>
            <q-card-section>
              <div class="row items-center">
                <span>{{'Dernière version toujours visible en avion: ' + (it.avn ? 'OUI' : 'NON')}}</span>
                <q-btn v-if="mode == 1" size="sm" dense class="q-ml-sm" @click="avnom(!it.avn, it.n)" color="primary" :icon="it.avn ? 'visibility_off' : 'visibility'"/>
              </div>
              <div v-for="f in it.l" :key="f.idf" class="ma-qcard-section q-my-sm">
                <q-separator class="q-mb-sm"/>
                <div class="row justify-between items-center">
                  <div class="col">
                    <span class="text-bold q-pr-lg">{{f.info}}</span>
                    <span class="fs-md">{{vol(f)}} - {{f.type}} - </span>
                    <span class="font-mono fs-sm">{{f.sidf}}</span>
                  </div>
                  <div class="col-auto font-mono fs-sm">{{dhed(f)}}</div>
                </div>
                <div class="row justify-between">
                  <div class="col row items-center">
                    <span>{{'Version visible en avion: ' + (f.av ? 'OUI' : 'NON')}}</span>
                    <q-btn v-if="mode == 1" class="q-ml-sm" size="sm" dense @click="avidf(!f.av, f.idf)" color="primary" :icon="f.av ? 'visibility_off' : 'visibility'"/>
                  </div>
                  <div class="col-auto row justify-end q-gutter-xs">
                    <q-btn :disable="!stf1(f)" size="sm" dense color="primary" icon="open_in_new" label="Aff." @click="affFic(f)"/>
                    <q-btn :disable="!stf1(f)" size="sm" dense color="primary" icon="save" label="Enreg." @click="enregFic(f)"/>
                    <q-btn :disable="!stf2()" size="sm" dense color="warning" icon="delete" label="Suppr." @click="supprFic(f)"/>
                  </div>
                </div>
              </div>
            </q-card-section>
          </q-expansion-item>
        </div>
        <q-separator size="2px"/>
      </div>
    </div>

    <div v-if="!secret.suppr && tabsecret==='voisins'" class='col'>
      <div class="titre-md row items-center">
        <span class="titre-md q-mx-sm">Nouveau secret voisin...</span>
        <q-btn dense class="titre-md q-ml-sm" no-caps color="primary" size="sm" label="Personnel" @click="action0"/>
        <panel-grcp class="titre-md q-ml-sm" icon="chevron_right" label="du contact" color="primary" grcp="cp" @ok="action1(couple.id)"/>
        <panel-grcp class="titre-md q-ml-sm" icon="chevron_right" label="du groupe" color="primary" grcp="gr" @ok="action2(groupe.id)"/>
      </div>

      <div v-for="(s, idx) in state.listevoisins" :key="s.vk"
        :class="dkli(idx) + ' zonex full-width q-py-xs zone' + (s === secret ? '2' :'1')">
        <div v-if="s.suppr" class="col text-negative text-italic text-bold">
          <q-icon class="q-mr-sm" v-if="s.suppr" name="delete" color="negative" size="sm"/>
          <span>Secret SUPPRIMÉ</span>
        </div>
        <div v-if="!s.suppr" class="row items-start">
          <q-btn class="col-auto q-mr-xs" dense push size="sm" icon="push_pin" :color="aPin(s) ? 'green-5' : 'grey-5'" @click="togglePin(s)"/>
          <q-btn class="col-auto q-mr-xs" dense push size="sm" :icon="'expand_'+(!row[s.vk]?'more':'less')"
            color="primary" @click="togglerow(s.vk)"/>
          <div class="col cursor-pointer" @click="ouvrirvoisin(s)">
            <div class="fs-sm">{{s.partage}}</div>
            <show-html v-if="row[s.vk]" class="col height-8 full-width overlay-y-auto bottomborder" :texte="s.txt.t" :idx="idx"/>
            <div v-else class="col full-width text-bold top5">{{s.titre}}</div>
          </div>
        </div>
        <div v-if="!s.suppr" class="full-width row items-center q-pl-xl cursor-pointer"  @click="ouvrirvoisin(s)">
          <apercu-motscles class="col-6" :motscles="state.motscles" :src="s.mc" :groupe-id="s.ts===2?s.id:0"/>
          <div class="col-6 row justify-end items-center">
            <span class="fs-sm font-mono">{{s.dh}}</span>
            <q-btn v-if="s.nbfa" size="sm" color="warning" flat dense icon="attach_file" :label="s.nbfa"/>
            <q-btn v-if="s.st!=99999" size="sm" color="warning" flat dense icon="auto_delete" :label="s.nbj"/>
          </div>
        </div>
      </div>
    </div>

    <q-dialog v-if="sessionok" v-model="saisiefichier">
      <fichier-attache :secret="secret" :close="fermerfa"/>
    </q-dialog>

    <q-dialog v-if="sessionok" v-model="confirmpin">
      <q-card>
        <q-card-section>
          Ce secret ne répond pas aux critères de filtre actuels. Enlever la punaise
          fait qu'il ne sera plus visible (qui que toujours existant).
        </q-card-section>
        <q-card-actions vertical>
          <q-btn flat dense color="warning" label="J\'enlève la punaise" v-close-popup @click="punaiseoff"/>
          <q-btn flat dense color="primary" label="Je laisse la punaise" v-close-popup/>
        </q-card-actions>
      </q-card>
    </q-dialog>

  <q-page-sticky class="full-width" position="top-left" expand :offset="[50,0]">
    <q-toolbar :class="tbc">
      <q-btn v-if="tabsecret==='texte' && !secret.suppr" dense push size="sm" icon="push_pin" :color="aPin() ? 'green-5' : 'grey-5'" @click="togglePin"/>
      <q-btn :disable="!precedent || ed" flat round dense icon="first_page" size="sm" @click="prec(0)" />
      <q-btn :disable="!precedent || ed" flat round dense icon="arrow_back_ios" size="sm" @click="prec(1)" />
      <span class="fs-sm">{{index + 1}}/{{sur}}</span>
      <q-btn :disable="!suivant || ed" flat round dense icon="arrow_forward_ios" size="sm" @click="suiv(1)" />
      <q-btn :disable="!suivant || ed" flat round dense icon="last_page" size="sm" @click="suiv(0)" />
      <q-toolbar-title>
        <div v-if="secret.suppr" class="titre-md text-negative text-italic">Secret SUPPRIMÉ</div>
        <div v-if="!secret.suppr && secret.ts === 0" class="titre-md">Personnel</div>
        <div v-if="!secret.suppr && secret.ts === 1" class="titre-md">
          <titre-banner class-titre="titre-md" :titre="secret.couple.nomEd"
            :titre2="'Couple ' + secret.couple.nomEd + ' [' + secret.couple.nomEs + '#' + secret.couple.na.sfx + ']'" :id-objet="secret.couple.id"/>
        </div>
        <div v-if="!secret.suppr && secret.ts === 2" class="titre-md">
          <titre-banner class-titre="titre-md" :titre="secret.groupe.nomEd"
            :titre2="'Groupe ' + secret.groupe.nomEd + ' [' + secret.groupe.na.nom + '#' + secret.groupe.na.sfx + ']'" :id-objet="secret.groupe.id"/>
        </div>
      </q-toolbar-title>
      <info-ico v-if="tabsecret==='texte' && !secret.suppr && !ed && cx7()" icon="edit_off" color="warning" :info="lc[cx1()]"/>
      <q-btn v-if="tabsecret==='texte' && !secret.suppr && !ed && !cx7() && mode <= 2" size="sm" color="warning" icon="edit" dense @click="editer"/>
      <q-btn v-if="tabsecret==='texte' && !secret.suppr && ed" class="q-ml-xs" size="sm" :color="modif() ? 'warning' : 'secondary'" icon="undo" dense @click="undo"/>
      <q-btn v-if="tabsecret==='texte' && !secret.suppr && ed" class="q-ml-xs" :disable="!modif() || (state.erreur !== '')"
        size="sm" color="green-5" icon="check" dense label="OK" @click="valider"/>
      <q-btn v-if="tabsecret==='texte' && !secret.suppr && mode <= 2 && !cx5()" class="q-ml-xs" size="sm" color="warning" icon="delete" dense @click="confirmsuppr=true"/>
    </q-toolbar>
    <q-toolbar inset v-if="mode > 2" :class="tbc">
      <div class="q-px-sm text-center fs-sm text-bold text-negative bg-yellow-5">En mode avion ou visio, les secrets ne peuvent être QUE consultés (pas mis à jour)</div>
    </q-toolbar>
    <q-toolbar v-if="!secret.suppr" inset :class="tbc + ' row justify-center'">
      <q-tabs v-model="tabsecret" class="font-cf" inline-label no-caps dense>
        <q-tab name="texte" :disable="ed" label="Détail" />
        <q-tab name="fa" :disable="ed" label="Fichiers">
          <q-badge v-if="state.listefic.length" color="warning" floating>{{state.listefic.length}}</q-badge>
        </q-tab>
        <q-tab name="voisins" :disable="ed" label="Sec. voisins" />
      </q-tabs>
    </q-toolbar>

  </q-page-sticky>
  </q-card>
</template>

<script>
import { reactive, watch, computed, toRef } from 'vue'
import { useStore } from 'vuex'
import ApercuMotscles from './ApercuMotscles.vue'
import FichierAttache from './FichierAttache.vue'
import SelectMotscles from './SelectMotscles.vue'
import EditeurTexteSecret from './EditeurTexteSecret.vue'
import ShowHtml from './ShowHtml.vue'
import TitreBanner from '../components/TitreBanner.vue'
import PanelGrcp from '../components/PanelGrcp.vue'
import InfoTxt from './InfoTxt.vue'
import InfoIco from './InfoIco.vue'
import { equ8, getJourJ, cfg, Motscles, dhstring, afficherdiagnostic, edvol } from '../app/util.mjs'
import { NouveauSecret, Maj1Secret, SupprFichier, SupprSecret } from '../app/operations.mjs'
import { data, Secret } from '../app/modele.mjs'
import { gestionFichierMaj } from '../app/db.mjs'
import { crypt } from '../app/crypto.mjs'
import { saveAs } from 'file-saver'

export default ({
  name: 'PanelSecret',

  components: { InfoIco, InfoTxt, PanelGrcp, TitreBanner, ApercuMotscles, SelectMotscles, EditeurTexteSecret, ShowHtml, FichierAttache },

  props: { aPin: Function, estFiltre: Function, sec: Object, suivant: Function, precedent: Function, pinSecret: Function, index: Number, sur: Number },

  computed: {
    tbc () { return 'bg-primary text-white full-width ' + (this.$q.screen.gt.sm ? ' ml23' : '') },
    ed () { return this.state.enedition },
    tbclass () { return this.$q.dark.isActive ? ' sombre' : ' clair' },
    msgtemp () {
      if (this.state.templocal) {
        const n = this.secret.st === 99999 ? this.limjours : this.secret.st - this.jourJ
        return 'Secret auto-détruit ' + (n === 0 ? 'aujourd\'hui' : (n === 1 ? 'demain' : ('dans ' + n + ' jours')))
      }
      return 'Secret permanent'
    }
  },

  data () {
    return {
      row: {},
      confirmpin: false,
      mcledit: false,
      mcgedit: false,
      protectP: false,
      protectX: false,
      confirmsuppr: false,
      saisiefichier: false,
      nomfic: '',
      msg: [],
      titrep: '',
      actions: {},
      auteurs: [],
      auteur: ''
    }
  },

  methods: {
    togglePin () {
      if (this.state.enedition) return
      if (this.aPin() && !this.estFiltre()) {
        this.confirmpin = true
        return
      }
      if (this.pinSecret) this.pinSecret(this.secret, !this.aPin())
    },
    punaiseoff () {
      this.pinSecret(this.secret, false)
    },
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
    ouvrirvoisin (s, nouveau) {
      this.secret = s
      if (nouveau) {
        data.setSecrets([s])
        this.pinSecret(s, true)
      }
      this.tabsecret = 'texte'
    },
    action0 () {
      const s = this.secret
      const ref = s.ref ? s.ref : [s.id, s.ns]
      this.ouvrirvoisin(new Secret().nouveauP(s.id, ref), true)
    },
    action1 (id) {
      const s = this.secret
      const ref = s.ref ? s.ref : [s.id, s.ns]
      const c = this.couple
      if (c) this.ouvrirvoisin(new Secret().nouveauC(id || s.id, ref, c.avc), true)
    },
    action2 (id) {
      const s = this.secret
      const ref = s.ref ? s.ref : [s.id, s.ns]
      const g = this.groupe
      if (g) {
        if (g.sty === 1) {
          afficherdiagnostic('Le groupe ' + g.nom + ' est "protégé en écriture", création et modification de secrets impossible.')
          return
        }
        const m = g.membreParId(this.avatar.id)
        if (!m || !m.stp) {
          afficherdiagnostic('Seuls les membres de niveau "auteur" et "animateur" du groupe ' + g.nom + ' peuvent créer ou modifier des secrets.')
          return
        }
        this.ouvrirvoisin(new Secret().nouveauG(id || s.id, ref, m.im), true)
      }
    },
    fermerfa () { this.saisiefichier = false },

    async blobde (f, b) {
      const buf = await this.secret.getFichier(f.idf, this.avatar.id)
      if (!buf || !buf.length) return null
      const blob = new Blob([buf], { type: f.type })
      return b ? blob : URL.createObjectURL(blob)
    },

    wop (url) { // L'appel direct de wndow.open ne semble pas marcher dans une fonction async. Etrange !
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

    avnom (plus, nom) {
      setTimeout(() => {
        gestionFichierMaj(this.secret, plus, null, nom)
      }, 50)
    },

    avidf (plus, idf) {
      setTimeout(() => {
        gestionFichierMaj(this.secret, plus, idf, null)
      }, 50)
    },

    ouvrirmcl () { this.mcledit = true },
    fermermcl () { this.mcledit = false },
    ouvrirmcg () { this.mcgedit = true },
    fermermcg () { this.mcgedit = false },

    changermcl (mc) { this.state.mclocal = mc },
    changermcg (mc) { this.state.mcglocal = mc },
    setprotP () { this.state.plocal = 1; this.protectP = false },
    resetprotP () { this.state.plocal = 0; this.protectP = false },
    setExcluC (lautre) {
      this.state.xlocal = lautre ? (this.state.im === 1 ? 2 : 1) : this.state.im
      this.protectX = false
    },
    resetExcluC () { this.state.xlocal = 0; this.protectX = false },
    setExcluM (auteur) {
      const n = auteur.substring(0, auteur.indexOf('-'))
      this.state.xlocal = parseInt(n)
      this.protectX = false
    },
    protectionP () { // paramétrage du dialogue de gestion de la protection d'écriture
      const s = this.secret
      const pr = this.state.plocal
      const ex = this.state.xlocal
      const im = this.state.im
      const m = []
      const a = {}
      if (s.ts === 0) {
        this.titrep = 'Secret personnel'
        m.push(!pr ? 'Pas de protection d\'écriture' : 'Protection contre les écritures')
        if (!pr) a.setprotP = true; else a.resetprotP = true
        a.nerienfaire = true
      } else if (s.ts === 1) {
        const n = this.secret.couple.nom
        this.titrep = 'Secret de couple : ' + n
        m.push(!pr ? 'Pas de protection d\'écriture' : 'Protection contre les écritures')
        if (ex === 0) {
          if (!pr) a.setprotP = true; else a.resetprotP = true
          a.nerienfaire = true
        } else if (ex === im) {
          m.push('J\'ai l\'exclusité d\'écriture')
          if (!pr) a.setprotP = true; else a.resetprotP = true
          a.nerienfaire = true
        } else {
          m.push(n + ' a l\'exclusité d\'écriture et est le seul à pouvoir changer le statut de protection du secret')
          a.nerienfaire = true
        }
      } else if (s.ts === 2) {
        this.titrep = 'Secret du groupe : ' + this.groupe.nom
        const p = this.state.membre.stp
        m.push(this.labelp[p])
        if (this.groupe.sty === 1) {
          m.push('Le groupe est "protégé contre l\'écriture" (archivé), ses secrets n\'y sont pas modifiables. Un animateur peut le remettre en activité')
          a.jailu = true
        } else if (p === 0) {
          m.push('Un simple lecteur ne peut pas changer les protections d\'écriture')
          a.jailu = true
        } else {
          m.push(pr ? 'Pas de protection d\'écriture' : 'Protection contre les écritures')
          if (ex) {
            const mbr = data.getMembre(this.groupe.id, ex)
            const n = mbr ? mbr.nom : ('#' + ex)
            m.push(ex === this.state.im ? 'J\'ai l\'exclusité d\'écriture' : (n + ' a l\'exclusité d\'écriture'))
          }
          if (ex === this.state.im || p === 2) { // l'exclusivité équivalente ici au pouvoir d'animateur
            if (!pr) a.setprotP = true; else a.resetprotP = true
            a.nerienfaire = true
          } else {
            m.push('N\'ayant pas l\'exclusivité et n\'étant pas animateur, vous ne pouvez pas changer les protections d\'écriture')
            a.jailu = true
          }
        }
      }
      this.actions = a
      this.msg = m
      this.protectP = true
    },

    protectionX () { // paramétrage du dialogue de gestion des exclusivités
      const s = this.secret
      const ex = this.state.xlocal
      const im = this.state.im
      const m = []
      const a = {}
      if (s.ts === 1) {
        const c = this.secret.couple
        this.titrep = 'Secret de couple : ' + c.nom
        if (ex === 0) {
          a.donnerexmoi = true
          a.nerienfaire = true
        } else if (ex === im) {
          m.push('J\'ai l\'exclusité d\'écriture')
          a.resetExcluC = true
          if (c.naE) {
            a.donnerexctc = true
            a.donnerexctc = c.naE.nom
          }
          a.nerienfaire = true
        } else {
          m.push((c.naE ? c.naE.nom : 'L\'autre') + ' a l\'exclusité d\'écriture et est la/le seul à pouvoir transmettre cette exclusivité')
          a.nerienfaire = true
        }
      } else if (s.ts === 2) {
        const gr = this.groupe
        this.titrep = 'Secret du groupe : ' + gr.nom
        const p = this.state.membre.stp
        if (p === 0) {
          m.push('Un simple lecteur ne peut pas changer l\'exclusivité d\'écriture')
          a.jailu = true
        } else if (gr.sty === 1) {
          m.push('Le groupe est "protégé contre l\'écriture" (archivé), ses secrets n\'y sont pas modifiables. Un animateur peut le remettre en activité')
          a.jailu = true
        } else {
          if (ex) {
            const mbr = data.getMembre(gr.id, ex)
            const n = mbr ? mbr.nomEd : ('#' + ex)
            m.push(ex === this.state.im ? 'J\'ai l\'exclusité d\'écriture' : (n + ' a l\'exclusité d\'écriture'))
          } else {
            m.push('Personne n\'a d\'exclusivité d\'écriture')
          }
          if (ex === this.state.im || p === 2) {
            a.resetExcluC = true
            a.nerienfaire = true
          }
          if (!ex || p === 2) {
            a.donnerexmoi = true
            a.nerienfaire = true
          }
          if (!ex || ex === this.state.im || p === 2) { // l'exclusivité équivalente ici au pouvoir d'animateur
            a.donnerexmbr = true // je peux transférer et supprimer l'exclusivité. Choix du membre recevant l'exclusivité
            a.nerienfaire = true
            this.auteurs = gr.auteurs()
          } else {
            m.push('N\'ayant pas l\'exclusivité et n\'étant pas animateur, vous ne pouvez pas changer les protections d\'écriture')
            a.jailu = true
          }
        }
      }
      this.actions = a
      this.msg = m
      this.protectX = true
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
      let ret
      if (s.v) {
        // maj
        const txts = !this.state.modift ? null : await s.toRowTxt(this.state.textelocal, this.state.im)
        const v1 = !this.state.modift ? null : this.state.textelocal.length
        const mc = !this.state.modifmcl ? null : this.state.mclocal
        const mcg = !this.state.modifmcg ? null : this.state.mcglocal
        const st = !this.state.modiftp ? null : (this.state.templocal ? this.jourJ + this.limjours : 99999)
        const xp = !this.state.modifx && !this.state.modifp ? null : xploc
        const arg = { ts: s.ts, id: s.id, ns: s.ns, mc, txts, v1, xp, st, mcg, im: this.state.im, varg: s.volarg() }
        ret = await new Maj1Secret().run(arg)
      } else {
        // création
        const txts = await s.toRowTxt(this.state.textelocal, this.state.im)
        const mc = this.state.mclocal
        const mcg = this.mcglocal
        const v1 = this.state.textelocal.length
        const st = this.state.templocal ? this.jourJ + this.limjours : 99999
        const xp = xploc
        const arg = { ts: s.ts, id: s.id, ns: s.ns, mc, txts, v1, xp, st, mcg, im: this.state.im, varg: s.volarg() }
        arg.refs = await s.toRowRef()
        ret = await new NouveauSecret().run(arg)
      }
      if (ret) this.finEdition()
    },

    async supprimer () {
      const s = this.secret
      const arg = { ts: s.ts, id: s.id, ns: s.ns, varg: s.volarg() }
      await new SupprSecret().run(arg)
      this.finEdition()
    },

    // n == 0, premier / dernier, n == 1 suivant / précédent
    suiv (n) { if (this.suivant) this.suivant(n) },
    prec (n) { if (this.precedent) this.precedent(n) },
    suppr () {
      if (this.supprcreation) this.supprcreation()
    }
  },

  setup (props) {
    const $store = useStore()
    const pinSecret = toRef(props, 'pinSecret')
    const sessionok = computed(() => { return $store.state.ui.sessionok })
    const avatarscform = computed({
      get: () => $store.state.ui.avatarscform,
      set: (val) => $store.commit('ui/majavatarscform', val)
    })
    const tabsecret = computed({
      get: () => $store.state.ui.tabsecret,
      set: (val) => $store.commit('ui/majtabsecret', val)
    })
    const prefs = computed(() => { return data.getPrefs() })
    const avatar = computed(() => { return $store.state.db.avatar })
    const mode = computed(() => $store.state.ui.mode)
    const avsecrets = computed(() => $store.state.db.avsecrets)
    const secret = computed({ // secret courant
      get: () => $store.state.db.secret,
      set: (val) => $store.commit('db/majsecret', val)
    })
    const couple = computed({ // secret courant
      get: () => $store.state.db.couple,
      set: (val) => $store.commit('db/majcouple', val)
    })
    const groupe = computed({ // secret courant
      get: () => $store.state.db.groupe,
      set: (val) => $store.commit('db/majgroupe', val)
    })

    const state = reactive({
      enedition: false,
      listevoisins: [],
      listefic: [],
      erreur: '',
      im: 0,
      ro: 0,
      avs: null,
      stp: 0,
      mcg: new Uint8Array([]),
      membre: null,
      mcl: new Uint8Array([]),
      temp: false,
      motscles: null,
      dhlocal: 0,

      textelocal: '',
      mclocal: new Uint8Array([]),
      mcglocal: null,
      xlocal: 0,
      plocal: 0,
      templocal: null,

      modift: false,
      modifmcl: false,
      modifmcg: false,
      modifx: false,
      modifp: false,
      modiftp: false
    })

    function initState () {
      // données principalement dépendantes du secret ET de l'avatar courant ET de avsecrets
      const avid = avatar.value ? avatar.value.id : 0
      const s = secret.value // Normalement (!!!) s n'est jamais null ici
      if (s) $store.commit('db/initVoisins', s)
      const z = s && !s.suppr
      if (z) {
        if (s.ts === 1 && (!couple.value || couple.value.id !== s.id)) couple.value = s.couple
        if (s.ts === 2 && (!groupe.value || groupe.value.id !== s.id)) groupe.value = s.groupe
      }
      if (z && s.v === 0) state.enedition = true
      state.im = z ? s.im(avid) : 0
      state.membre = z ? s.membre(avid) : null
      state.stp = z && state.membre ? state.membre.stp : 0
      state.mcg = z && state.stp ? s.mcg : new Uint8Array([])
      state.mcl = z ? s.mcl(avid) : new Uint8Array([])
      state.temp = z ? s.st > 0 && s.st !== 99999 : 0
      state.avs = z ? data.getAvSecret(s.id, s.ns) : null
      state.listevoisins = z ? lstvoisins($store.state.db['voisins@' + (s.ref ? s.pkref : s.pk)]) : []
      state.listefic = z ? listefichiers(s, state.avs) : []
      state.erreur = z ? (s.txt.t.length < 10 ? 'Le texte doit avoir au moins 10 signes' : '') : ''
      if (z && state.enedition) {
        /* le contenu du secret a changé.
        - si non modifié : valeur de s dans valeur éditée
        - sinon : modifié si valeur de s != valeur éditée
        */
        if (!state.modift) state.textelocal = s.txt.t; else { state.modift = (state.textelocal !== s.txt.t) }
        if (!state.modifmcl) state.mclocal = state.mcl; else { state.modifmcl = !equ8(state.mclocal, state.mcl) }
        if (!state.modifmcg) state.mcglocal = state.mcg; else { state.modifmcg = !equ8(state.mcglocal, state.mcg) }
        if (!state.modifx) state.xlocal = s.exclu; else { state.modifx = (state.xlocal !== s.exclu) }
        if (!state.modifp) state.plocal = s.protect; else { state.modifp = (state.plocal !== s.protect) }
        if (!state.modiftp) state.templocal = state.temp; else { state.modiftp = (state.templocal !== state.temp) }
      } else { // changement de secret OU de contenu du secret courant
        resetLocals()
      }
    }

    function excluNom () {
      const s = secret.value
      if (!s) return '?'
      if (s.ts === 0) {
        return avatar.value.na.nom
      } else if (s.ts === 1) {
        return s.couple.naDeIm(state.xlocal).nomc
      }
      const m = data.getMembre(s.groupe.id, state.xlocal)
      return m ? m.namb.nomc : '?'
    }

    function editer () {
      pinSecret.value(secret.value, true)
      resetLocals()
      state.enedition = true
    }

    function undo () {
      const s = secret.value
      if (s.v) {
        if (modif()) resetLocals()
      } else {
        data.setSecrets([s.cloneSuppr()])
      }
      finEdition()
    }

    function finEdition () {
      state.enedition = false
    }

    function resetLocals () {
      const st = state
      const s = secret.value
      const z = s && !s.suppr
      st.textelocal = z ? s.txt.t : ''
      st.mclocal = z ? st.mcl : new Uint8Array([])
      st.mcglocal = z ? st.mcg : new Uint8Array([])
      st.xlocal = z ? s.exclu : 0
      st.plocal = z ? s.protect : 0
      st.templocal = z ? st.temp : false
      st.dhlocal = z ? s.txt.d : 0
      st.modift = false; st.modifmcl = false; st.modifmcg = false
      st.modifx = false; st.modifp = false; st.modiftp = false
    }

    watch(() => state.textelocal, (ap, av) => {
      if (!state.enedition) return
      const s = secret.value; state.modift = s && !s.suppr && ap !== s.txt.t
      state.erreur = ap.length < 10 ? 'Le texte doit avoir au moins 10 signes' : ''
    })
    watch(() => state.mclocal, (ap, av) => {
      if (!state.enedition) return
      const s = secret.value; state.modifmcl = s && !s.suppr && !equ8(ap, state.mcl)
    })
    watch(() => state.mcglocal, (ap, av) => {
      if (!state.enedition) return
      const s = secret.value; state.modifmcg = s && !s.suppr && !equ8(ap, state.mcg)
    })
    watch(() => state.xlocal, (ap, av) => {
      if (!state.enedition) return
      const s = secret.value; state.modifx = s && !s.suppr && ap !== s.exclu
    })
    watch(() => state.plocal, (ap, av) => {
      if (!state.enedition) return
      const s = secret.value; state.modifp = s && !s.suppr && ap !== s.protect
    })
    watch(() => state.templocal, (ap, av) => {
      if (!state.enedition) return
      const s = secret.value; state.modiftp = s && !s.suppr && ap !== state.temp
    })

    function undomcl () { state.mclocal = state.mcl }
    function undomcg () { state.mcglocal = state.mcg }
    function undotp () { state.templocal = state.temp }
    function undotx () { const s = secret.value; if (s) { state.textelocal = s.txt.t; state.dhlocal = s.txt.d } }
    function undox () { const s = secret.value; if (s) { state.xlocal = s.exclu } }
    function undop () { const s = secret.value; if (s) { state.plocal = s.protect } }

    function modif () { return state.modift || state.modifmcl || state.modifmcg || state.modifx || state.modifp || state.modiftp }

    const lc = [
      '',
      'Le groupe de ce secret est protégé contre toute modification', // 1
      'L\'exclusivité d\'écriture de ce secret a été attribuée à l\'autre dans le couple',
      'L\'exclusivité d\'écriture de ce secret a été attribuée à un autre membre du groupe ET vous n\'êtes pas animateur du groupe et ',
      'Vous n\'êtes pas animateur du groupe', // 4
      'Vous êtes lecteur dans le groupe sans droit d\'écriture',
      'L\'exclusivité d\'écriture a été attribuée à un autre membre du groupe',
      'Le secret est protégé contre l\'écriture (et la suppression)',
      'Le groupe de ce secret n\'a plus d\'animateur qui l\'héberge' // 8
    ]

    function c1 () { // groupe protégé en écriture (archivé)
      const s = secret.value
      return !s || (s.groupe && s.groupe.sty) ? 1 : 0
    }
    function c2 () { // couple et exclusivité accordée à l'autre
      const s = secret.value
      return !s || (s.ts === 1 && s.exclu && s.exclu !== state.im) ? 2 : 0
    }
    function c3 () { // groupe et exclusivité accordée à un autre et pas animateur
      const s = secret.value
      const m = state.membre
      return !s || (s.ts === 2 && s.exclu && s.exclu !== state.im && m.stp !== 2) ? 3 : 0
    }
    function c4 () { // groupe et pas animateur
      const s = secret.value
      const m = state.membre
      return !s || (s.ts === 2 && m.stp !== 2) ? 4 : 0
    }
    function c5 () { // groupe et pas auteur
      const s = secret.value
      const m = state.membre
      return !s || (s.ts === 2 && m.stp < 1) ? 5 : 0
    }
    function c6 () { // groupe et exclusivité accordée à un autre
      const s = secret.value
      return !s || (s.ts === 2 && s.exclu && s.exclu !== state.im) ? 6 : 0
    }
    function c7 () { // secret protégé en écriture
      const s = secret.value
      return !s || s.protect ? 7 : 0
    }
    function c8 () { // groupe non hébergé
      const s = secret.value
      return !s || (s.groupe && s.groupe.imh === 0) ? 8 : 0
    }
    function cx1 () { return c1() || c8() || c2() || c5() || c6() || c7() } // texte editable
    function cx2 () { return c1() || c8() || c5() || c2() || c6() } // statut temporaire
    function cx3 () { return c1() || c8() || c2() || c4() } // protection d'écriture
    function cx6 () { return c1() || c8() || c3() } // exclusivité d'écriture
    function cx4 () { return c1() || c8() || c4() } // mots clés
    function cx5 () { return c1() || c8() || c2() || c3() || c5() || c7() } // suppression
    function cx7 () { return c1() || c8() } // mode édition

    const mc = reactive({ categs: new Map(), lcategs: [], st: { enedition: false, modifie: false } })

    function chargerMc () {
      state.motscles = new Motscles(mc, 1, secret.value && secret.value.ts === 2 ? secret.value.id : 0)
      state.motscles.recharger()
    }

    function lstvoisins (mapv) {
      const lst = []
      for (const pk in mapv) {
        const s = mapv[pk]
        if (!s.suppr) lst.push(mapv[pk])
      }
      lst.sort((a, b) => { return !a.ref ? -1 : (a.titre > b.titre ? 1 : (a.titre < b.titre ? -1 : 0)) })
      return lst
    }

    function listefichiers (s, avs) {
      const lst = []
      const mnom = {}
      for (const x in s.mfa) {
        const idf = parseInt(x)
        const f = s.mfa[idf]
        let e = mnom[f.nom]; if (!e) { e = []; mnom[f.nom] = e; lst.push(f.nom) }
        // eslint-disable-next-line no-unneeded-ternary
        const av = avs && (avs.lidf.indexOf(idf) !== -1) ? true : false
        e.push({ ...f, sidf: crypt.idToSid(f.idf), av })
      }
      lst.sort((a, b) => { return a < b ? -1 : (a > b ? 1 : 0) })
      const res = []
      lst.forEach(n => {
        const l = mnom[n]
        // eslint-disable-next-line no-unneeded-ternary
        const avn = avs && avs.mnom[n] ? true : false
        l.sort((a, b) => { return a.dh < b.dh ? 1 : (a.dh > b.dh ? -1 : 0) })
        res.push({ n, l, av: avs && avs.mnom[n], avn })
      })
      return res
    }

    function cleanVoisins (s) {
      if (s) $store.commit('db/cleanVoisins', s.ref ? s.pkref : s.pk)
    }

    watch(() => prefs.value, (ap, av) => {
      chargerMc()
    })

    watch(() => avsecrets.value, (ap, av) => {
      initState()
    })

    watch(() => secret.value, (ap, av) => {
      if (av) cleanVoisins(av)
      initState()
      if (ap && (!av || av.pk !== ap.pk)) chargerMc() // le nouveau peut avoir un autre groupe
    })

    watch(() => avatarscform.value, (ap, av) => {
      if (!ap && state.enedition) {
        setTimeout(() => { avatarscform.value = true; tabsecret.value = 'texte' }, 50)
      } else cleanVoisins(secret.value)
    })

    watch(() => tabsecret.value, (ap, av) => {
      if (state.enedition && ap !== 'texte') {
        setTimeout(() => { tabsecret.value = 'texte' }, 50)
      }
    })

    initState()
    chargerMc()

    return {
      sessionok,
      avatar,
      avatarscform,
      tabsecret,
      couple,
      groupe,
      secret,
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
      modif,
      cx1,
      cx2,
      cx3,
      cx4,
      cx5,
      cx6,
      cx7,
      lc,
      excluNom,
      editer,
      finEdition,
      labelp: ['Simple lecteur', 'Lecteur et auteur', 'Lecteur, auteur et animateur']
    }
  }
})
</script>
<style lang="sass" scoped>
@import '../css/app.sass'
.q-toolbar
  padding: 2px !important
  min-height: 0 !important
.q-tabs--dense .q-tab
  min-height: 1px !important
.qc
  padding: 5px
  background-color: $yellow-5
  color: $negative
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
.btnt
  position: absolute
  right: 3px
  z-index: 10
.ml23
  margin-left: 23rem !important
</style>
