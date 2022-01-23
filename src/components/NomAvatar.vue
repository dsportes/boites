<template>
  <q-card-section class="q-pt-none shadow-8 fs-md">
    <div class="titre-lg">{{msg[phase]}}</div>
    <div class="text-warning">Ce nom NE POURRA PLUS être changé.
      Caractères <span class="q-px-sm text-negative bg-yellow text-bold">{{interdits}}</span> et non imprimables (CR TAB ...) interdits.</div>
    <q-input dense counter v-model="nom" label="Nom de l'avatar" :rules="[r1,r2]" maxlength="32"
      @keydown.enter.prevent="ok" type="text" hint="Presser 'Entrée' à la fin de la saisie">
      <template v-slot:append>
        <span :class="nom.length === 0 ? 'disabled' : ''"><q-icon name="cancel" class="cursor-pointer"  @click="nom=''"/></span>
      </template>
    </q-input>
    <div class="row justify-between items-center no-wrap">
      <q-btn color="primary" flat label="Renoncer" size="md" @click="ko" />
      <q-btn color="warning" glossy :label="labelVal()" size="md" :icon-right="iconValider"
      :disable="r1(nom) !== true || r2(nom) !== true" @click="ok" />
    </div>
  </q-card-section>
</template>
<script>
const msg = ['Saisir un nom', 'Saisie non confirmée, re-saisir le nom', 'Confirmer le nom']
export default ({
  name: 'NomAvatar',
  props: {
    iconValider: String,
    verif: Boolean,
    labelValider: String
  },
  data () {
    return {
      phase: 0,
      msg: msg,
      nom: '',
      interdits: '< > : " / \\ | ? *'
    }
  },
  methods: {
    r2 (val) { return val.length < 4 || val.length > 20 ? 'Entre 4 et 24 caractères' : true },
    r1 (val) {
      // eslint-disable-next-line no-control-regex
      return /[<>:"/\\|?*\x00-\x1F]/.test(val) ? 'Caractères interdits' : true
    },
    labelVal () {
      return this.phase < 2 ? 'OK' : this.labelValider
    },
    ok () {
      if (this.phase < 2) {
        this.vnom = this.nom
        this.nom = ''
        this.phase = 2
      } else {
        if (this.nom === this.vnom) {
          this.$emit('ok-nom', this.nom)
        } else {
          this.phase = 1
        }
        this.raz()
      }
    },
    ko () {
      this.raz()
      this.$emit('ok-nom', null)
    },
    raz () {
      this.nom = ''
      this.vnom = ''
      this.phase = 0
    }
  },

  setup () {
  }
})
</script>

<style lang="sass" scoped>
@import '../css/input.sass'
</style>
