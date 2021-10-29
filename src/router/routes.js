import MainLayout from 'layouts/MainLayout.vue'
import Org from 'src/pages/Org.vue'
import Accueil from 'src/pages/Accueil.vue'
import Compte from 'src/pages/Compte.vue'
import Synchro from 'src/pages/Synchro.vue'

const routes = [
  {
    path: '/',
    component: MainLayout,
    children: [
      { path: '', name: 'Org', component: Org },
      { path: ':org', name: 'Accueil', component: Accueil },
      { path: ':org/synchro', name: 'Synchro', component: Synchro },
      { path: ':org/compte', name: 'Compte', component: Compte }
    ]
  },

  // Always leave this as last one,
  // but you can also remove it
  {
    path: '/:catchAll(.*)*',
    component: () => import('pages/Error404.vue')
  }
]

export default routes
