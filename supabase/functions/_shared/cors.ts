// Shared CORS headers for browser-invoked Edge Functions.
// Set the ALLOWED_ORIGIN function secret to your app origin in production
// (e.g. https://app.stitchbud.com); it falls back to '*' when unset.
const ALLOWED_ORIGIN = Deno.env.get('ALLOWED_ORIGIN') ?? '*'

export const corsHeaders = {
  'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  Vary: 'Origin',
}
