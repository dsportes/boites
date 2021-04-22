import MainLayout from 'layouts/MainLayout.vue'
import Index from 'pages/Index.vue'
import OrgAbsent from 'pages/OrgAbsent.vue'

const routes = [
  {
    path: '/',
    component: MainLayout,
    children: [
      { path: '', component: OrgAbsent },
      { path: ':org', component: Index }
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
