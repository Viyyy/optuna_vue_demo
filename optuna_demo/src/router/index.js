// router/index.js
import { createRouter, createWebHistory } from 'vue-router';
import ParallelAxis from '~/components/parallelAxis.vue';
import Plot from '~/components/plot.vue';
import Study from '~/components/study.vue';

const routes = [
  { path: '/parallel-axis', component: ParallelAxis },
  { path: '/plot', component: Plot },
  { path: '/study', component: Study },
];

const router = createRouter({
  history: createWebHistory(),
  routes
});

export default router;
