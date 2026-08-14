import { mount } from 'svelte'

// Self-hosted so the overlay renders identically on every operator's machine
// and needs no network at broadcast time. One variable file covers weights
// 100–900; subsets are split by unicode-range, so only latin (~47KB) is
// actually fetched for English content.
import '@fontsource-variable/inter/wght.css'

import './app.css'
import App from './App.svelte'

const app = mount(App, {
  target: document.getElementById('app'),
})

export default app
