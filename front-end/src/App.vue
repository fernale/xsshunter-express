<template>
  <div>
    <notifications></notifications>

    <!-- Login modal visible when not authenticated -->
    <modal
      v-if="show_login_prompt"
      class="show d-block"
      body-classes="p-0"
      modal-classes="modal-dialog-centered modal-sm"
    >
      <div style="color: red; font-weight: bold;">
        LOGIN MODAL VISIBLE - Please log in
      </div>

      <card
        type="secondary"
        header-classes="bg-white pb-5"
        body-classes="px-lg-5 py-lg-5"
        class="border-0 mb-0"
        style="text-align: center"
      >
        <h3>
          XSS Hunter Express<br />
          <i>Please login to continue.</i>
        </h3>
        <base-input
          alternative
          v-model="password"
          type="password"
          placeholder="Password"
          autofocus
          v-on:keyup.enter="attempt_login"
        />
        <base-button block simple type="primary" v-on:click="attempt_login">
          <i class="fas fa-key"></i> Authenticate
        </base-button>
        <base-alert v-if="invalid_password_used" class="mt-4" type="danger">
          <i class="fas fa-times"></i> Incorrect password, try again.
        </base-alert>
      </card>
    </modal>

    <!-- Render routed app when authenticated -->
    <router-view :key="$route.fullPath" v-if="!show_login_prompt"></router-view>

    <!-- Loading bar during async auth check -->
    <div class="loading-bar" v-if="loading">
      <div class="progress">
        <div
          role="progressbar"
          aria-valuemin="0"
          aria-valuemax="100"
          aria-valuenow="100"
          class="progress-bar bg-purp progress-bar-striped progress-bar-animated"
          style="width: 100%;"
        ></div>
      </div>
    </div>

    <!-- Debug info -->
    <pre style="background: #f5f5f5; padding: 10px; margin-top: 20px;">
Debug Info:
is_authed: {{ is_authed }}
invalid_password_used: {{ invalid_password_used }}
current route: {{ $route.fullPath }}
loading: {{ loading }}
show_login_prompt: {{ show_login_prompt }}
    </pre>
  </div>
</template>

<script>
import Modal from './components/Modal';
import BaseAlert from './components/BaseAlert';
import Notifications from './components/NotificationPlugin/Notifications.vue';
import api_request from '@/libs/api.js';

export default {
  components: {
    Modal,
    BaseAlert,
    Notifications,
  },
  data() {
    return {
      loading: false,
      is_authed: false,
      invalid_password_used: false,
      password: '',
    };
  },
  computed: {
    show_login_prompt() {
      return !this.is_authed;
    },
  },
  methods: {
    async is_authenticated() {
      try {
        const auth_result = await api_request.is_authenticated();
        console.log('Auth check result:', auth_result);
        return auth_result.result.is_authenticated;
      } catch (e) {
        console.error('Authentication error:', e);
        return false;
      }
    },
    async attempt_login() {
      try {
        const login_result = await api_request.authenticate(this.password);
        console.log('Login attempt result:', login_result);

        if (login_result.success) {
          this.is_authed = true;
          this.invalid_password_used = false;
          return;
        }

        if (login_result.code === 'INVALID_CREDENTIALS') {
          this.invalid_password_used = true;
        }
      } catch (e) {
        console.error('Login error:', e);
        this.invalid_password_used = true;
      }
    },
    toggleNavOpen() {
      const root = document.getElementsByTagName('html')[0];
      root.classList.toggle('nav-open');
    },
  },
  async mounted() {
    this.loading = true;
    window.app = this;

    this.$watch('$sidebar.showSidebar', this.toggleNavOpen);

    try {
      this.is_authed = await this.is_authenticated();
      console.log('Mounted hook - is_authed:', this.is_authed);
    } catch (e) {
      console.error('Error in mounted auth check:', e);
      this.is_authed = false;
    }

    this.loading = false;
  },
};
</script>
