<template>
  <q-card-section class="q-pt-none shadow-box shadow-8">
    <div class="titre-3">{{msg[phase]}}</div>
    <q-input dense counter hint="Au moins 16 caractères" v-model="ligne1" :type="isPwd ? 'password' : 'text'" label="Première ligne de la phrase secrète">
    <template v-slot:append>
        <q-icon :name="isPwd ? 'visibility_off' : 'visibility'" class="cursor-pointer" @click="isPwd = !isPwd"/>
        <span :class="!ligne1 || ligne1.length === 0 ? 'disabled' : ''"><q-icon name="cancel" class="cursor-pointer"  @click="ligne1 = ''"/></span>
    </template>
    </q-input>
    <q-input dense counter hint="Au moins 16 caractères" v-model="ligne2" :type="isPwd ? 'password' : 'text'" label="Seconde ligne de la phrase secrète">
    <template v-slot:append>
        <q-icon :name="isPwd ? 'visibility_off' : 'visibility'" class="cursor-pointer" @click="isPwd = !isPwd"/>
        <span :class="!ligne2 || ligne2.length === 0 ? 'disabled' : ''"><q-icon name="cancel" class="cursor-pointer" @click="ligne2 = ''"/></span>
    </template>
    </q-input>
    <div>
      <div v-if="encours" class="t1">Cryptage en cours ...
        <q-spinner color="primary" size="2rem" :thickness="3" />
      </div>
      <div v-else class="row justify-between items-center no-wrap">
          <div v-if="isDev">
            <span class="text-weight-bold text-primary cursor-pointer q-px-xs" v-for="(p, idx) in phrases" :key="idx" @click="selph(p)">{{idx}}</span>
          </div>
          <div>
            <q-btn color="primary" flat label="Renoncer" size="md" @click="ko" />
            <q-btn color="warning" glossy :label="labelVal()" size="md" :icon-right="iconValider"
            :disable="!ligne1 || !ligne2 || ligne1.length < 16 || ligne2.length < 16" @click="ok" />
          </div>
      </div>
    </div>
  </q-card-section>
</template>
<script>
import { cfg, Phrase } from '../app/util.mjs'
const msg = ['Saisir la phrase secrète', 'Phrase non confirmée, la re-saisir', 'Confirmer la phrase secréte']
export default ({
  name: 'PhraseSecrete',
  props: {
    iconValider: String,
    verif: Boolean,
    labelValider: String,
    initVal: Object
  },
  data () {
    return {
      phase: 0,
      msg: msg,
      encours: false,
      isPwd: false,
      phrases: this.$cfg.phrases,
      ligne1: this.initVal ? this.initVal.debut : '',
      ligne2: this.initVal ? this.initVal.fin : '',
      vligne1: '',
      vligne2: ''
    }
  },
  methods: {
    selph (p) {
      this.ligne1 = p[0]
      this.ligne2 = p[1]
    },
    labelVal () {
      if (!this.verif) return this.labelValider
      return this.phase < 2 ? 'OK' : this.labelValider
    },
    ok () {
      if (!this.verif) {
        this.okem()
      } else {
        if (this.phase < 2) {
          this.vligne1 = this.ligne1
          this.vligne2 = this.ligne2
          this.ligne1 = ''
          this.ligne2 = ''
          this.phase = 2
        } else {
          if (this.ligne1 === this.vligne1 && this.ligne2 === this.vligne2) {
            this.okem()
          } else {
            this.raz()
            this.phase = 1
          }
        }
      }
    },
    okem () {
      this.encours = true
      setTimeout(async () => {
        const ps = new Phrase()
        await ps.init(this.ligne1, this.ligne2)
        this.$emit('ok-ps', ps)
        this.raz()
      }, 300)
    },
    ko () {
      this.raz()
      this.$emit('ok-ps', null)
    },
    raz () {
      this.encours = false
      this.ligne1 = ''
      this.ligne2 = ''
      this.vligne1 = ''
      this.vligne2 = ''
      this.phase = 0
    }
  },

  setup () {
    const isDev = true
    // eslint-disable-next-line no-unused-vars
    const isDev2 = cfg().isDev
    return {
      isDev: isDev
    }
  }
})
</script>

<style lang="sass" scoped>
@import '../css/input.sass'
.shadow-box
  border: 1px solid $grey-5 !important
  border-radius:  5px !important
.t1
  font-size: 1.1rem
  font-weight: bold
  font-style: italic
  color: $primary
.q-card__section
  padding: 5px
.q-card > div
  box-shadow: inherit !important
</style>
