// src/main.js

import { createApp, provide } from 'vue'
import App from './App.vue'
import router from './router/index'
import i18n from './i18n'

import RouterPrefetch from 'vue-router-prefetch'
import VueClipboard from 'vue-clipboard3'
import VueMoment from 'vue-moment-v3'

// vue-codemirror6 imports
import { Codemirror } from 'vue-codemirror6'
import { basicSetup } from 'codemirror'
import { oneDark } from '@codemirror/theme-one-dark'
import { yaml } from '@codemirror/lang-yaml'


const app = createApp(App)

app.use(router)
app.use(i18n)

app.use(RouterPrefetch)

app.use(VueClipboard)

app.use(VueMoment)

app.component('Codemirror', Codemirror)

app.provide('cmExtensions', [basicSetup, oneDark, yaml()])

app.mount('#app')
