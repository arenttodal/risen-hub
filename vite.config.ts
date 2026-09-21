import { sites } from '@openai/sites-vite-plugin';
import tailwindcss from '@tailwindcss/postcss';
import vinext from 'vinext';
import { defineConfig } from 'vite';
import hostingConfig from './.openai/hosting.json';

// Miniflare accepts any database id and persists state keyed by it, so a
// placeholder is fine locally. Cloudflare does not: deploying a D1 binding that
// points at an id which does not exist in the account fails the whole deploy
// with `D1 binding 'DB' references database '…' which was not found [10181]`.
// The placeholder must therefore never reach a built wrangler.json.
const SITE_CREATOR_PLACEHOLDER_DATABASE_ID =
  '00000000-0000-4000-8000-000000000000';

const { d1, r2 } = hostingConfig;

// Set this to a real database id (Cloudflare dashboard, or `wrangler d1 list`)
// as a build variable to bind D1 on deploy.
const realD1DatabaseId = process.env.CLOUDFLARE_D1_DATABASE_ID?.trim() || '';
const d1DatabaseName =
  process.env.CLOUDFLARE_D1_DATABASE_NAME?.trim() || 'site-creator-d1';

// The R2 bucket holding project images. Unlike D1, a bucket needs no id — the
// name is the whole reference — so an unset binding is the only failure mode,
// and `.openai/hosting.json` already guards that. See docs/MEDIA-SETUP.md.
const r2BucketName = process.env.CLOUDFLARE_R2_BUCKET_NAME?.trim() || 'risen-media';

// macOS Seatbelt blocks FSEvents, so Codex previews need polling for HMR.
const isCodexSeatbeltSandbox = process.env.CODEX_SANDBOX === 'seatbelt';

function d1Bindings(isDev: boolean) {
  if (!d1) return [];
  const databaseId = realD1DatabaseId || (isDev ? SITE_CREATOR_PLACEHOLDER_DATABASE_ID : '');
  if (!databaseId) {
    // Better a deployed worker that falls back to the seed dataset and says so
    // than a deploy that fails outright.
    console.warn(
      `[risen] D1 binding \`${d1}\` skipped for this build: set CLOUDFLARE_D1_DATABASE_ID to a real database id to enable it.`,
    );
    return [];
  }
  return [{ binding: d1, database_name: d1DatabaseName, database_id: databaseId }];
}

export default defineConfig(async ({ command }) => {
  const isDev = command === 'serve';
  const localBindingConfig = {
    main: 'vinext/server/fetch-handler',
    compatibility_flags: ['nodejs_compat'],
    d1_databases: d1Bindings(isDev),
    r2_buckets: r2 ? [{ binding: r2, bucket_name: r2BucketName }] : [],
  };

  // Keep Wrangler and Miniflare state project-local. These are non-secret tool
  // settings; application environment belongs in ignored `.env*` files.
  process.env.WRANGLER_WRITE_LOGS ??= 'false';
  process.env.WRANGLER_LOG_PATH ??= '.wrangler/logs';
  process.env.MINIFLARE_REGISTRY_PATH ??= '.wrangler/registry';

  // Wrangler snapshots its log path while the Cloudflare plugin is imported.
  const { cloudflare } = await import('@cloudflare/vite-plugin');

  return {
    css: { postcss: { plugins: [tailwindcss()] } },
    server: isCodexSeatbeltSandbox
      ? { watch: { useFsEvents: false, usePolling: true } }
      : undefined,
    plugins: [
      vinext(),
      sites(),
      cloudflare({
        viteEnvironment: { name: 'rsc', childEnvironments: ['ssr'] },
        config: localBindingConfig,
      }),
    ],
  };
});
