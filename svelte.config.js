import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

/**
 * @type {import("@sveltejs/vite-plugin-svelte").SvelteConfig}
 *
 * `vitePreprocess` is here so components carrying `lang="ts"` compile. The stat
 * tracking components were written in TypeScript in the standalone project, and
 * porting them verbatim is safer than retyping working markup by hand.
 */
export default {
  preprocess: vitePreprocess(),
};
