<template>
    <q-card-section class="q-pt-none">
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
        <div class="row justify-between items-center">
            <div>
            <q-btn v-if="isDev" flat label="P1" color="primary" @click="p1" />
            <q-btn v-if="isDev" flat label="P2" color="primary" @click="p2" />
            <q-btn flat label="RAZ" color="primary" @click="raz" />
            </div>
            <div>
            <q-btn v-if="boutonCheck" color="primary" flat label="OK" size="md" icon-right="check" :disable="ligne1.length < 16 || ligne2.length < 16" @click="ok" />
            <q-btn v-else color="deep-orange" glossy label="OK" size="md" icon-right="send" :disable="ligne1.length < 16 || ligne2.length < 16" @click="ok" />
            </div>
        </div>
    </q-card-section>
</template>
<script>
export default ({
  name: 'PhraseSecrete',
  props: {
    boutonCheck: Boolean
  },
  data () {
    return {
      isDev: process.env.DEV,
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
      this.$emit('ok-ps', [this.ligne1, this.ligne2])
    },
    raz () {
      this.ligne1 = ''
      this.ligne2 = ''
    }
  }
})
</script>

<style scoped>
.q-card__section { padding: 5px; }
.q-field__messages { font-size: 0.9rem; font-weight: bold }
>>> .q-field__native {
  font-size: 1rem;
  font-family: "Roboto Mono";
  font-weight: bold;
  color: rgb(255, 6, 6)
}
</style>
