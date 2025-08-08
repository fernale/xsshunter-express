import routes from './routes';
import { createRouter, createWebHistory } from "vue-router";

const router = createRouter({
  history: createWebHistory('/admin'), // or createWebHashHistory() if you want hash-based routing
  routes,
  linkExactActiveClass: "active",
  scrollBehavior(to) {
    if (to.hash) {
      return { selector: to.hash };
    } else {
      return { left: 0, top: 0 };
    }
  }
});

export default router;
