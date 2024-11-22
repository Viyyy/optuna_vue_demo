// router/index.js
import { createRouter, createWebHistory } from 'vue-router';
import ParallelAxis from '~/components/parallelAxis.vue';
import Plot from '~/components/plot.vue';
import Study from '~/components/study.vue';
import Predictor from '~/components/predictor.vue';

const routes = [
  { path: '/parallel-axis', component: ParallelAxis },
  { path: '/tasks', component: Plot },
  { path: '/study', component: Study },
  { path: '/predictor', component: Predictor },
];

const router = createRouter({
  history: createWebHistory(),
  routes
});

export default router;
