import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router'

import { authGuard } from './guard'

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    component: () => import('../layouts/DefaultLayout.vue'),
    meta: { requiresAuth: true },
    children: [
      {
        path: '',
        name: 'home',
        component: () => import('../views/HomeView.vue'),
        meta: { requiresAuth: true, title: 'nav.home', showInNav: true },
      },
      {
        path: 'sticky-notes',
        name: 'sticky-notes',
        component: () => import('../views/StickyNotesView.vue'),
        meta: { requiresAuth: true, title: 'nav.stickyNotes', showInNav: true },
      },
      {
        path: 'todos',
        name: 'todos',
        component: () => import('../views/TodosView.vue'),
        meta: { requiresAuth: true, title: 'nav.todos', showInNav: true },
      },
      {
        path: 'calendar',
        name: 'calendar',
        component: () => import('../views/CalendarView.vue'),
        meta: { requiresAuth: true, title: 'nav.calendar', showInNav: true },
      },
    ],
  },
  {
    path: '/login',
    name: 'login',
    component: () => import('../views/LoginView.vue'),
    meta: { requiresAuth: false },
  },
]

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
})

router.beforeEach(authGuard)

export default router
