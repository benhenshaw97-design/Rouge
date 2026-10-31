import { defineConfig } from 'vite';

export default defineConfig({
  // Relative base so the build works at https://<user>.github.io/<repo>/ without
  // hard-coding the repository name.
  base: './',
  // Everything in /assets is served as-is (e.g. assets/sprites/wheel.svg -> ./sprites/wheel.svg),
  // so you can drop replacement art and audio in without touching the build.
  publicDir: 'assets',
  build: {
    outDir: 'dist',
    // Name the bundled JS folder something other than "assets" to avoid confusion with /assets.
    assetsDir: 'bundle',
    // Phaser is ~1.2 MB minified; that's expected for a game, so don't warn about it.
    chunkSizeWarningLimit: 2000,
  },
  server: {
    host: true,
  },
});
