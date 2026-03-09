#!/bin/bash
# Gera as chaves JWT (anon e service_role) para o Supabase local
# Uso: bash docker/generate-keys.sh > .env.local

JWT_SECRET="${JWT_SECRET:-super-secret-jwt-token-with-at-least-32-characters-long}"

# Gerar ANON_KEY
ANON_KEY=$(node -e "
const header = Buffer.from(JSON.stringify({alg:'HS256',typ:'JWT'})).toString('base64url');
const payload = Buffer.from(JSON.stringify({
  iss:'supabase-local',
  ref:'printguard-local',
  role:'anon',
  iat:Math.floor(Date.now()/1000),
  exp:Math.floor(Date.now()/1000)+315360000
})).toString('base64url');
const crypto = require('crypto');
const sig = crypto.createHmac('sha256','${JWT_SECRET}').update(header+'.'+payload).digest('base64url');
console.log(header+'.'+payload+'.'+sig);
")

# Gerar SERVICE_ROLE_KEY
SERVICE_ROLE_KEY=$(node -e "
const header = Buffer.from(JSON.stringify({alg:'HS256',typ:'JWT'})).toString('base64url');
const payload = Buffer.from(JSON.stringify({
  iss:'supabase-local',
  ref:'printguard-local',
  role:'service_role',
  iat:Math.floor(Date.now()/1000),
  exp:Math.floor(Date.now()/1000)+315360000
})).toString('base64url');
const crypto = require('crypto');
const sig = crypto.createHmac('sha256','${JWT_SECRET}').update(header+'.'+payload).digest('base64url');
console.log(header+'.'+payload+'.'+sig);
")

cat <<EOF
# PrintGuard - Variáveis de Ambiente Local
# Gerado em: $(date)

# Banco de dados
POSTGRES_PASSWORD=printguard_secret_2024
POSTGRES_PORT=54320

# JWT
JWT_SECRET=${JWT_SECRET}

# Supabase Keys (geradas automaticamente)
ANON_KEY=${ANON_KEY}
SERVICE_ROLE_KEY=${SERVICE_ROLE_KEY}

# Portas
KONG_HTTP_PORT=54321
SITE_URL=http://localhost:3001
API_EXTERNAL_URL=http://localhost:54321

# Frontend
VITE_SUPABASE_URL=http://localhost:54321
VITE_SUPABASE_PUBLISHABLE_KEY=${ANON_KEY}
VITE_SUPABASE_PROJECT_ID=printguard-local
VITE_PORT=3001
VITE_BASE_PATH=/
EOF
