<template>
  <div class="wrapper">
    <side-bar>
      <template slot="links">
        <sidebar-link to="/" name="XSS Payload Fires" icon="fas fa-fire" />
        <sidebar-link to="/collectedpages" name="Collected Pages" icon="fas fa-file" />
        <sidebar-link to="/xsspayloads" name="XSS Payloads" icon="fas fa-file-code" />
        <sidebar-link to="/settings" name="Settings" icon="fas fa-cogs" />
        <li class="nav-item mt-5">
          <a target="_blank" href="https://twitter.com/IAmMandatory" class="nav-link">
            <i class="fab fa-twitter"></i>
            <p>By @IAmMandatory</p>
          </a>
        </li>
        <li class="nav-item">
          <a target="_blank" href="https://github.com/mandatoryprogrammer/xsshunter-express" class="nav-link">
            <i class="fab fa-github"></i>
            <p>Github Repo</p>
          </a>
        </li>
      </template>
    </side-bar>
    <div class="main-panel">
      <top-navbar></top-navbar>

      <!-- This renders the children routes matched under DashboardLayout -->
      <router-view @click.native="toggleSidebar" />

      <content-footer></content-footer>
    </div>
  </div>
</template>

<script>
import TopNavbar from "./TopNavbar.vue";
import ContentFooter from "./ContentFooter.vue";
// Import DashboardContent only if you plan to keep it for static content; otherwise, can be removed
// import DashboardContent from "./Content.vue"; 
import MobileMenu from "./MobileMenu";

export default {
  components: {
    TopNavbar,
    ContentFooter,
    // DashboardContent, // Remove if you no longer use this static content panel
    MobileMenu
  },
  methods: {
    toggleSidebar() {
      if (this.$sidebar.showSidebar) {
        this.$sidebar.displaySidebar(false);
      }
    }
  }
};
</script>

<style lang="scss">
/* Your existing styles (empty or add your styling here) */
</style>
