import MainLayout from 'layouts/MainLayout.vue'
import Org from 'src/pages/Org.vue'
import Login from 'src/pages/Login.vue'
import Synchro from 'src/pages/Synchro.vue'
import Compte from 'src/pages/Compte.vue'
import Avatar from 'src/pages/Avatar.vue'
import Groupe from 'src/pages/Groupe.vue'

const routes = [
  {
    path: '/',
    component: MainLayout,
    children: [
      { path: '', name: 'Org', component: Org },
      { path: ':org', name: 'Login', component: Login },
      { path: ':org/synchro', name: 'Synchro', component: Synchro },
      { path: ':org/compte', name: 'Compte', component: Compte },
      { path: ':org/compte', name: 'Avatar', component: Avatar },
      { path: ':org/compte', name: 'Groupe', component: Groupe }
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
