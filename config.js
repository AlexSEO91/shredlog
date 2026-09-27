/* Shredlog — configuration de la PWA.
   Colle ici l'URL du projet Supabase et la clé "anon public" (Project Settings → API).
   La clé anon est publique par conception : la sécurité vient des règles RLS (voir supabase/schema.sql). */
window.SHRED_CONFIG = {
  supabaseUrl: "https://zucsemhdglkuifqvhusi.supabase.co",
  supabaseAnonKey: "sb_publishable_4NEv6_7iVGuhSQvG1K6pUg_3ZBePKz5",
  // Notifications push : clé VAPID publique (la privée est dans Supabase → Edge Functions → Secrets).
  vapidPublicKey: "BO67--Fy4TjmV936flvXOAOwJv2eO4tqsHZDygQmeTtGUtSRfHtC2mHmLAcKRWpzIU1E84H8mCwIUqULEOQf5eg",
};
