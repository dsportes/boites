<template>
    <q-card-section class="q-pt-none shadow-box shadow-8">
      <div style="font-size: 0.9rem">Volume maximal en Mo des secrets permanents ...</div>
      <div class="row justify-around">
        <q-input dense v-model.number="q.q1" type="number" label="... des textes des secrets" hint="de 0 à 100000" style="max-width:140px"
          :rules="[val => (val >= 0 && val <= 100000) || 'Valeur entre 0 et 100000' ]">
        </q-input>
        <q-input dense v-model.number="q.q2" type="number" label="... des pièces jointes" hint="de 0 à 100000" style="max-width:140px"
          :rules="[val => (val >= 0 && val <= 100000) || 'Valeur entre 0 et 100000' ]">
        </q-input>
      </div>
      <div class="t9">Volume maximal en Ko des secrets créés par mois ...</div>
      <div class="row justify-around">
        <q-input dense v-model.number="q.qm1" type="number" label="... des textes des secrets" hint="de 0 à 100000" style="max-width:140px"
          :rules="[val => (val >= 0 && val <= 100000) || 'Valeur entre 0 et 100000' ]">
        </q-input>
        <q-input dense v-model.number="q.qm2" type="number" label="... des pièces jointes" hint="de 0 à 100000" style="max-width:140px"
          :rules="[val => (val >= 0 && val <= 100000) || 'Valeur entre 0 et 100000' ]">
        </q-input>
      </div>
      <div class="row justify-end">
        <q-btn flat label="RAZ" icon-right="cancel" color="primary" @click="raz" />
        <q-btn flat label="OK" icon-right="check" color="warning" @click="ok" />
      </div>
    </q-card-section>
</template>
<script>
import { Quotas } from '../app/db'

export default ({
  name: 'QuotasVolume',
  props: {
    initVal: Object
  },
  data () {
    return {
      q: this.initVal ? this.initVal : new Quotas()
    }
  },

  methods: {
    ok () {
      this.$emit('ok-quotas', this.q)
    },
    raz () {
      this.q.raz()
    }
  },

  setup () {
    return {
    }
  }
})
</script>

<style lang="sass" scoped>
@import '../css/input.sass'
.shadow-box
  border: 1px solid $grey-5
  border-radius:  5px !important
.q-card__section
  padding: 5px
</style>
