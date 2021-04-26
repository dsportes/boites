import MainLayout from 'layouts/MainLayout.vue'
import Accueil from 'src/pages/Accueil.vue'

const routes = [
  {
    path: '/',
    component: MainLayout,
    children: [
      { path: '', component: Accueil },
      { path: ':org', component: Accueil }
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
