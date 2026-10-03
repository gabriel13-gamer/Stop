# STOP Android

Flutter + Material 3. O multiplayer real usa Supabase Auth/Postgres/Realtime. O Nearby usa Android Nearby Connections. O APK é gerado por GitHub Actions.

## Configuração
1. Execute `supabase/schema.sql` no SQL Editor do Supabase.
2. Crie os secrets GitHub `SUPABASE_URL` e `SUPABASE_ANON_KEY`.
3. Execute o workflow **Build STOP Android APK**.

O cliente usa apenas a anon key; nunca coloque a service-role key no APK.
