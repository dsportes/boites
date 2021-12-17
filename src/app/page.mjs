import { useRouter, useRoute } from 'vue-router'
import { cfg, store } from './util.mjs'

let bootfait = false
let $router

export function onBoot () {
  if (bootfait) return
  bootfait = true
  $router = useRouter()
  $router.beforeEach((to, from) => {
    const $store = store()
    const org = $store.state.ui.org
    const compte = $store.state.db.compte
    const avatar = $store.state.db.avatar
    const groupe = $store.state.db.groupe
    const neworg = to.params.org

    if (!neworg) {
      // il faut aller sur Org
      if (org && compte) return false // pas déconnecté : refusé
      $store.commit('ui/majorg', null)
      $store.commit('ui/majpage', 'Org')
      if (to.name === 'Org') return true // devrait toujours être vrai
      return '/'
    }

    if (!cfg().orgs[neworg]) return false

    if (!org) {
      // définition de l'organisation, il n'y en avait pas
      $store.commit('ui/majorg', neworg)
      $store.commit('ui/majpage', 'Login')
      if (to.name === 'Login') return true
      return '/' + org // vers Login
    }

    if (org !== neworg) {
      // changement d'organisation
      if (compte) return false // pas déconnecté : refusé
      $store.commit('ui/majorg', neworg)
      $store.commit('ui/majpage', 'Login')
      if (to.name === 'Login') return true
      return '/' + neworg
    }

    // l'organisation était définie et elle est inchangée
    if (!compte) {
      // on peut aller sur Login ou Synvhro
      if (to.name === 'Login') {
        $store.commit('ui/majpage', 'Login')
        return true
      }
      if (to.name === 'Synchro') {
        $store.commit('ui/majpage', 'Synchro')
        return true
      }
      return '/' + org
    }

    // org inchangée, compte existant : on peut aller sur synchro / compte / avatar / groupe
    if (to.name === 'Synchro') {
      $store.commit('ui/majpage', 'Synchro')
      return true // condition à ajouter
    }
    if (to.name === 'Compte') {
      $store.commit('ui/majpage', 'Compte')
      return true
    }
    if (to.name === 'Avatar') {
      if (avatar) {
        $store.commit('ui/majpage', 'Avatar')
        return true
      }
      return false
    }
    if (to.name === 'Groupe') {
      if (groupe) {
        $store.commit('ui/majpage', 'Groupe')
        return true
      }
      return false
    }
    return false
  })
  // Traitement de la route au boot
  const $route = useRoute()
  const urlorg = $route.params.org
  console.log('URL org : ' + urlorg + ' Boot page : ' + $route.name)
  store().commit('ui/majorg', (urlorg && cfg().orgs[urlorg]) ? urlorg : null)
  const org = store().state.ui.org
  if (!org && $route.name === 'Org') {
    store().commit('ui/majpage', 'Org')
    return
  }
  if (!org) {
    remplacePage('Org')
    return
  }
  if ($route.name === 'Login') {
    store().commit('ui/majpage', 'Login')
    return
  }
  remplacePage('Login')
}

export async function remplacePage (page) {
  const x = { name: page }
  if (page !== 'Org') x.params = { org: store().state.ui.org }
  await $router.replace(x)
}
