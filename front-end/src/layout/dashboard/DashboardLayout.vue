<template>
  <div class="wrapper">
    <side-bar>
      <template slot="links">
        <!-- Your sidebar link components -->
        <sidebar-link to="/" name="XSS Payload Fires" icon="fas fa-fire" />
        <sidebar-link to="/collectedpages" name="Collected Pages" icon="fas fa-file" />
        <sidebar-link to="/xsspayloads" name="XSS Payloads" icon="fas fa-file-code" />
        <sidebar-link to="/settings" name="Settings" icon="fas fa-cogs" />
        <!-- other links ... -->
      </template>
    </side-bar>
    <div class="main-panel">
      <top-navbar></top-navbar>

      <!-- IMPORTANT: Render routed children here -->
      <router-view @click.native="toggleSidebar" />

      <content-footer></content-footer>
    </div>
  </div>
</template>

<script>
import TopNavbar from './TopNavbar.vue';
import ContentFooter from './ContentFooter.vue';
import MobileMenu from './MobileMenu';

export default {
  components: {
    TopNavbar,
    ContentFooter,
    MobileMenu,
  },
  methods: {
    toggleSidebar() {
      if (this.$sidebar.showSidebar) {
        this.$sidebar.displaySidebar(false);
      }
    },
  },
};
</script>