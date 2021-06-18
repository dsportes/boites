<template>
    <q-card-section class="q-pt-none shadow-box shadow-8">
        <q-input dense clearable counter hint="Au moins 16 caractères" v-model="ligne1" :type="isPwd ? 'password' : 'text'" label="Première ligne de la phrase secrète">
        <template v-slot:append>
            <q-icon :name="isPwd ? 'visibility_off' : 'visibility'" class="cursor-pointer" @click="isPwd = !isPwd"/>
        </template>
        </q-input>
        <q-input dense clearable counter hint="Au moins 16 caractères" v-model="ligne2" :type="isPwd ? 'password' : 'text'" label="Seconde ligne de la phrase secrète">
        <template v-slot:append>
            <q-icon :name="isPwd ? 'visibility_off' : 'visibility'" class="cursor-pointer" @click="isPwd = !isPwd"/>
        </template>
        </q-input>
        <div class="t3">
        <div v-if="encours" class="t1">Cryptage en cours ...</div>
        <div v-else class="row justify-between items-center">
            <div>
            <q-btn flat label="RAZ" color="primary" @click="raz" />
            <q-btn v-if="isDev" flat label="P1" color="primary" @click="p1" />
            <q-btn v-if="isDev" flat label="P2" color="primary" @click="p2" />
            </div>
            <div>
            <q-btn v-if="boutonCheck" color="primary" flat label="OK" size="md" icon-right="check" :disable="ligne1.length < 16 || ligne2.length < 16" @click="ok" />
            <q-btn v-else color="deep-orange" glossy label="OK" size="md" icon-right="send" :disable="ligne1.length < 16 || ligne2.length < 16" @click="ok" />
            </div>
        </div>
        </div>
    </q-card-section>
</template>
<script>
import { Phrase } from '../app/db'
export default ({
  name: 'PhraseSecrete',
  props: {
    boutonCheck: Boolean
  },
  data () {
    return {
      isDev: process.env.DEV,
      encours: false,
      isPwd: false,
      ligne1: '',
      ligne2: ''
    }
  },

  methods: {
    p1 () {
      this.ligne1 = this.$cfg.phrase1[0]
      this.ligne2 = this.$cfg.phrase1[1]
    },
    p2 () {
      this.ligne1 = this.$cfg.phrase2[0]
      this.ligne2 = this.$cfg.phrase2[1]
    },
    ok () {
      this.encours = true
      setTimeout(() => {
        const ps = new Phrase(this.ligne1, this.ligne2)
        this.$emit('ok-ps', ps)
        this.raz(true)
      }, 1)
    },
    raz (noemit) {
      this.encours = false
      this.ligne1 = ''
      this.ligne2 = ''
      if (noemit !== true) this.$emit('ok-ps', null)
    }
  }
})
</script>

<style lang="sass" scoped>
.shadow-box
  border: 1px solid $grey-5
  border-radius:  5px !important
.t3
  height: 1.5rem
  overflow: hidden
.t1
  font-size: 1.1rem
  font-weight: bold
  font-style: italic
  color: $primary
.q-card__section
  padding: 5px
.q-card > div
  box-shadow: inherit !important
::v-deep(.q-field__bottom)
  font-size: 0.9rem
  font-weight: bold
  bottom: 5px !important
::v-deep(.q-field__native)
  font-size: 1rem
  font-family: "Roboto Mono"
  font-weight: bold
  color: rgb(255, 6, 6) !important
</style>
