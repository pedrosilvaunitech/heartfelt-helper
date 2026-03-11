#!/bin/bash
set -e

# ============================================================
# Setup Local para Projetos Lovable (com Supabase backend)
# Uso: bash setup-local.sh [opções]
#
# Opções:
#   --name <nome>        Nome do projeto (default: lovable-app)
#   --db-port <porta>    Porta do PostgreSQL (default: 54320)
#   --api-port <porta>   Porta do API Gateway (default: 54321)
#   --app-port <porta>   Porta do Frontend (default: 3001)
#   --password <senha>   Senha do banco (default: gerada automaticamente)
#   --jwt-secret <chave> JWT secret (default: gerada automaticamente)
#   --skip-docker        Não subir containers Docker
#   --skip-npm           Não instalar dependências npm
#   --production         Compilar para produção
# ============================================================

# Cores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

# Defaults - auto-detect project name from current directory
PROJECT_NAME=$(basename "$(pwd)" | tr '[:upper:]' '[:lower:]' | sed 's/[^a-z0-9-]/-/g')
DB_PORT=54320
API_PORT=54321
APP_PORT=3001
HOST_IP=""
POSTGRES_PASSWORD=""
JWT_SECRET=""
SKIP_DOCKER=false
SKIP_NPM=false
PRODUCTION=false

# Parse argumentos
while [[ $# -gt 0 ]]; do
  case $1 in
    --name) PROJECT_NAME="$2"; shift 2 ;;
    --db-port) DB_PORT="$2"; shift 2 ;;
    --api-port) API_PORT="$2"; shift 2 ;;
    --app-port) APP_PORT="$2"; shift 2 ;;
    --password) POSTGRES_PASSWORD="$2"; shift 2 ;;
    --jwt-secret) JWT_SECRET="$2"; shift 2 ;;
    --host) HOST_IP="$2"; shift 2 ;;
    --skip-docker) SKIP_DOCKER=true; shift ;;
    --skip-npm) SKIP_NPM=true; shift ;;
    --production) PRODUCTION=true; shift ;;
    *) echo -e "${RED}Opção desconhecida: $1${NC}"; exit 1 ;;
  esac
done

# Gerar senha se não fornecida
if [ -z "$POSTGRES_PASSWORD" ]; then
  POSTGRES_PASSWORD=$(openssl rand -hex 16 2>/dev/null || echo "${PROJECT_NAME}_secret_$(date +%s)")
fi

# Gerar JWT secret se não fornecido
if [ -z "$JWT_SECRET" ]; then
  JWT_SECRET=$(openssl rand -base64 48 2>/dev/null || echo "super-secret-jwt-token-with-at-least-32-characters-long-$(date +%s)")
fi

echo -e "${CYAN}"
echo "╔══════════════════════════════════════════════════╗"
echo "║     🚀 Setup Local - Projeto Lovable            ║"
echo "╚══════════════════════════════════════════════════╝"
echo -e "${NC}"
echo -e "${BLUE}Projeto:${NC}  $PROJECT_NAME"
echo -e "${BLUE}Host:${NC}    $HOST_IP"
echo -e "${BLUE}DB:${NC}       $HOST_IP:$DB_PORT"
echo -e "${BLUE}API:${NC}      $HOST_IP:$API_PORT"
echo -e "${BLUE}App:${NC}      $HOST_IP:$APP_PORT"
echo ""

# ============================================================
# 1. Verificar dependências
# ============================================================
echo -e "${YELLOW}[1/8] Verificando dependências...${NC}"

check_cmd() {
  if ! command -v $1 &> /dev/null; then
    echo -e "${RED}✗ $1 não encontrado. Instale antes de continuar.${NC}"
    echo "  $2"
    exit 1
  else
    echo -e "${GREEN}✓ $1 encontrado${NC}"
  fi
}

check_cmd "docker" "curl -fsSL https://get.docker.com | sh"
check_cmd "node" "curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash && nvm install 18"
check_cmd "npm" "Instalado junto com o Node.js"

# Verificar Docker rodando
if ! docker info &> /dev/null; then
  echo -e "${RED}✗ Docker não está rodando. Execute: sudo systemctl start docker${NC}"
  exit 1
fi
echo -e "${GREEN}✓ Docker está rodando${NC}"

# ============================================================
# 2. Criar estrutura de diretórios
# ============================================================
echo ""
echo -e "${YELLOW}[2/8] Criando estrutura de diretórios...${NC}"

mkdir -p docker
mkdir -p supabase/functions/main
mkdir -p supabase/migrations

echo -e "${GREEN}✓ Diretórios criados${NC}"

# ============================================================
# 3. Gerar chaves JWT
# ============================================================
echo ""
echo -e "${YELLOW}[3/8] Gerando chaves JWT...${NC}"

ANON_KEY=$(node -e "
const header = Buffer.from(JSON.stringify({alg:'HS256',typ:'JWT'})).toString('base64url');
const payload = Buffer.from(JSON.stringify({
  iss:'supabase-local',
  ref:'${PROJECT_NAME}',
  role:'anon',
  iat:Math.floor(Date.now()/1000),
  exp:Math.floor(Date.now()/1000)+315360000
})).toString('base64url');
const crypto = require('crypto');
const sig = crypto.createHmac('sha256','${JWT_SECRET}').update(header+'.'+payload).digest('base64url');
console.log(header+'.'+payload+'.'+sig);
")

SERVICE_ROLE_KEY=$(node -e "
const header = Buffer.from(JSON.stringify({alg:'HS256',typ:'JWT'})).toString('base64url');
const payload = Buffer.from(JSON.stringify({
  iss:'supabase-local',
  ref:'${PROJECT_NAME}',
  role:'service_role',
  iat:Math.floor(Date.now()/1000),
  exp:Math.floor(Date.now()/1000)+315360000
})).toString('base64url');
const crypto = require('crypto');
const sig = crypto.createHmac('sha256','${JWT_SECRET}').update(header+'.'+payload).digest('base64url');
console.log(header+'.'+payload+'.'+sig);
")

echo -e "${GREEN}✓ ANON_KEY gerada${NC}"
echo -e "${GREEN}✓ SERVICE_ROLE_KEY gerada${NC}"

# ============================================================
# 4. Criar SQL de inicialização dos roles do Postgres
# ============================================================
echo ""
echo -e "${YELLOW}[4/8] Criando SQL de inicialização...${NC}"

cat > docker/init-db.sql << INITSQL_EOF
-- ============================================================
-- Complemento de roles para Supabase local
-- IMPORTANTE: A imagem supabase/postgres:15.6.1.143 já cria os roles
-- (anon, authenticated, service_role, supabase_admin, etc.) via seus
-- próprios init-scripts. NÃO re-criar esses roles aqui ou a inicialização
-- falha com "role already exists" e o banco fica unhealthy.
--
-- Este script APENAS configura o que a imagem NÃO faz automaticamente:
--   - authenticator (com senha e grants)
--   - supabase_auth_admin (senha para GoTrue conectar)
--   - Permissões de schema public
-- ============================================================

-- Role: authenticator (usado pelo PostgREST para conectar e alternar roles)
DO \$\$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'authenticator') THEN
    CREATE ROLE authenticator NOINHERIT LOGIN PASSWORD '${POSTGRES_PASSWORD}';
  END IF;
END
\$\$;
ALTER ROLE authenticator PASSWORD '${POSTGRES_PASSWORD}';

-- Grants só funcionam se os roles já existirem (a imagem os cria)
-- Usamos DO block para não falhar se ainda não existirem
DO \$\$
BEGIN
  EXECUTE 'GRANT anon TO authenticator';
  EXECUTE 'GRANT authenticated TO authenticator';
  EXECUTE 'GRANT service_role TO authenticator';
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Grants para authenticator serão aplicados após init-scripts da imagem';
END
\$\$;

-- supabase_auth_admin - garantir senha para GoTrue conectar
DO \$\$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'supabase_auth_admin') THEN
    CREATE ROLE supabase_auth_admin NOINHERIT CREATEROLE LOGIN PASSWORD '${POSTGRES_PASSWORD}';
  END IF;
END
\$\$;
ALTER ROLE supabase_auth_admin PASSWORD '${POSTGRES_PASSWORD}';

-- NÃO tocar no schema auth - gerenciado pelo GoTrue automaticamente

-- supabase_auth_admin precisa de acesso ao schema public
GRANT ALL ON SCHEMA public TO supabase_auth_admin;
GRANT CREATE ON SCHEMA public TO supabase_auth_admin;

-- Extensões comuns (IF NOT EXISTS para ser idempotente)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp" SCHEMA public;
CREATE EXTENSION IF NOT EXISTS "pgcrypto" SCHEMA public;

-- Confirmar
DO \$\$ BEGIN RAISE NOTICE '✅ Roles complementares inicializados!'; END \$\$;
INITSQL_EOF

echo -e "${GREEN}✓ docker/init-db.sql criado${NC}"

# ============================================================
# 5. Criar Kong config com chaves reais (não variáveis)
# ============================================================
echo ""
echo -e "${YELLOW}[5/8] Criando configuração do Kong...${NC}"

cat > docker/kong.yml << KONG_EOF
_format_version: "2.1"
_transform: true

services:
  - name: rest-v1
    url: http://rest:3000/
    routes:
      - name: rest-v1
        strip_path: true
        paths:
          - /rest/v1/
    plugins:
      - name: cors
        config:
          origins:
            - "*"
          methods:
            - GET
            - POST
            - PUT
            - PATCH
            - DELETE
            - OPTIONS
          headers:
            - Accept
            - Accept-Version
            - Content-Length
            - Content-MD5
            - Content-Type
            - Date
            - X-Auth-Token
            - Authorization
            - apikey
            - x-client-info
          exposed_headers:
            - X-Total-Count
          credentials: true
          max_age: 3600
      - name: key-auth
        config:
          hide_credentials: false
          key_names:
            - apikey

  - name: auth-v1
    url: http://auth:9999/
    routes:
      - name: auth-v1
        strip_path: true
        paths:
          - /auth/v1/
    plugins:
      - name: cors
        config:
          origins:
            - "*"
          methods:
            - GET
            - POST
            - PUT
            - PATCH
            - DELETE
            - OPTIONS
          headers:
            - Accept
            - Content-Type
            - Authorization
            - apikey
            - x-client-info
          credentials: true
          max_age: 3600

  - name: functions-v1
    url: http://functions:9000/
    routes:
      - name: functions-v1
        strip_path: true
        paths:
          - /functions/v1/
    plugins:
      - name: cors
        config:
          origins:
            - "*"
          methods:
            - GET
            - POST
            - PUT
            - PATCH
            - DELETE
            - OPTIONS
          headers:
            - Accept
            - Content-Type
            - Authorization
            - apikey
            - x-client-info
          credentials: true
          max_age: 3600

consumers:
  - username: anon
    keyauth_credentials:
      - key: ${ANON_KEY}
  - username: service_role
    keyauth_credentials:
      - key: ${SERVICE_ROLE_KEY}
KONG_EOF

echo -e "${GREEN}✓ docker/kong.yml criado com chaves reais${NC}"

# ============================================================
# 6. Criar edge functions main (entry point obrigatório)
# ============================================================
echo ""
echo -e "${YELLOW}[6/8] Criando entry point das Edge Functions...${NC}"

# Só criar se não existir
if [ ! -f "supabase/functions/main/index.ts" ]; then
  cat > supabase/functions/main/index.ts << 'MAIN_EOF'
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

serve(async (req: Request) => {
  const url = new URL(req.url);
  const path = url.pathname;

  // Health check
  if (path === "/" || path === "/health") {
    return new Response(JSON.stringify({ status: "ok" }), {
      headers: { "Content-Type": "application/json" },
    });
  }

  // Route to functions based on path
  // e.g., /function-name will look for ./function-name/index.ts
  const functionName = path.split("/").filter(Boolean)[0];

  if (functionName) {
    try {
      const module = await import(`../${functionName}/index.ts`);
      if (typeof module.default === "function") {
        return module.default(req);
      }
    } catch (e) {
      // Function not found
    }
  }

  return new Response(JSON.stringify({ error: "Function not found" }), {
    status: 404,
    headers: { "Content-Type": "application/json" },
  });
});
MAIN_EOF
  echo -e "${GREEN}✓ supabase/functions/main/index.ts criado${NC}"
else
  echo -e "${GREEN}✓ supabase/functions/main/index.ts já existe${NC}"
fi

# ============================================================
# 7. Criar docker-compose.yml
# ============================================================
echo ""
echo -e "${YELLOW}[7/8] Criando docker-compose.yml...${NC}"

cat > docker-compose.yml << COMPOSE_EOF

# ${PROJECT_NAME} - Deploy Local Isolado
# Gerado por setup-local.sh em $(date)

services:
  # ============================================
  # PostgreSQL - Banco de Dados
  # ============================================
  db:
    image: supabase/postgres:15.6.1.143
    container_name: ${PROJECT_NAME}-db
    restart: unless-stopped
    ports:
      - "${DB_PORT}:5432"
    environment:
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
      POSTGRES_DB: postgres
      JWT_SECRET: ${JWT_SECRET}
      JWT_EXP: 3600
    volumes:
      - ${PROJECT_NAME}-db-data:/var/lib/postgresql/data
    healthcheck:
      test: pg_isready -U supabase_admin -d postgres -h localhost
      interval: 5s
      timeout: 10s
      retries: 30
      start_period: 60s

  # ============================================
  # Supabase Auth (GoTrue) - Autenticação
  # IMPORTANTE: depende do DB estar healthy E do init-db.sql ter rodado
  # ============================================
  auth:
    image: supabase/gotrue:v2.149.0
    container_name: ${PROJECT_NAME}-auth
    restart: unless-stopped
    depends_on:
      db:
        condition: service_healthy
    environment:
      GOTRUE_API_HOST: 0.0.0.0
      GOTRUE_API_PORT: 9999
      API_EXTERNAL_URL: http://\${HOST_IP:-localhost}:${API_PORT}
      GOTRUE_DB_DRIVER: postgres
      GOTRUE_DB_DATABASE_URL: postgres://supabase_auth_admin:${POSTGRES_PASSWORD}@db:5432/postgres
      GOTRUE_SITE_URL: http://\${HOST_IP:-localhost}:${APP_PORT}
      GOTRUE_URI_ALLOW_LIST: ""
      GOTRUE_DISABLE_SIGNUP: "false"
      GOTRUE_JWT_ADMIN_ROLES: service_role
      GOTRUE_JWT_AUD: authenticated
      GOTRUE_JWT_DEFAULT_GROUP_NAME: authenticated
      GOTRUE_JWT_EXP: 3600
      GOTRUE_JWT_SECRET: ${JWT_SECRET}
      GOTRUE_EXTERNAL_EMAIL_ENABLED: "true"
      GOTRUE_MAILER_AUTOCONFIRM: "true"
      GOTRUE_SMTP_ADMIN_EMAIL: admin@${PROJECT_NAME}.local
      GOTRUE_MAILER_SECURE_EMAIL_CHANGE_ENABLED: "true"
      GOTRUE_LOG_LEVEL: warn

  # ============================================
  # PostgREST - API REST automática
  # ============================================
  rest:
    image: postgrest/postgrest:v12.2.3
    container_name: ${PROJECT_NAME}-rest
    restart: unless-stopped
    depends_on:
      db:
        condition: service_healthy
    environment:
      PGRST_DB_URI: postgres://authenticator:${POSTGRES_PASSWORD}@db:5432/postgres
      PGRST_DB_SCHEMAS: public,storage
      PGRST_DB_ANON_ROLE: anon
      PGRST_JWT_SECRET: ${JWT_SECRET}
      PGRST_DB_USE_LEGACY_GUCS: "false"
      PGRST_APP_SETTINGS_JWT_SECRET: ${JWT_SECRET}
      PGRST_APP_SETTINGS_JWT_EXP: 3600

  # ============================================
  # Kong - API Gateway
  # ============================================
  kong:
    image: kong:2.8.1
    container_name: ${PROJECT_NAME}-kong
    restart: unless-stopped
    ports:
      - "${API_PORT}:8000"
    environment:
      KONG_DATABASE: "off"
      KONG_DECLARATIVE_CONFIG: /var/lib/kong/kong.yml
      KONG_DNS_ORDER: LAST,A,CNAME
      KONG_PLUGINS: request-transformer,cors,key-auth,acl,basic-auth
      KONG_NGINX_PROXY_PROXY_BUFFER_SIZE: 160k
      KONG_NGINX_PROXY_PROXY_BUFFERS: 64 160k
    volumes:
      - ./docker/kong.yml:/var/lib/kong/kong.yml:ro
    depends_on:
      - auth
      - rest

  # ============================================
  # Edge Functions (Deno Runtime)
  # ============================================
  functions:
    image: supabase/edge-runtime:v1.65.3
    container_name: ${PROJECT_NAME}-functions
    restart: unless-stopped
    depends_on:
      db:
        condition: service_healthy
    environment:
      JWT_SECRET: ${JWT_SECRET}
      SUPABASE_URL: http://kong:8000
      SUPABASE_ANON_KEY: ${ANON_KEY}
      SUPABASE_SERVICE_ROLE_KEY: ${SERVICE_ROLE_KEY}
      SUPABASE_DB_URL: postgres://postgres:${POSTGRES_PASSWORD}@db:5432/postgres
      VERIFY_JWT: "false"
    volumes:
      - ./supabase/functions:/home/deno/functions:ro
    extra_hosts:
      - "host.docker.internal:host-gateway"
    command:
      - start
      - --main-service
      - /home/deno/functions/main

volumes:
  ${PROJECT_NAME}-db-data:
    driver: local
COMPOSE_EOF

echo -e "${GREEN}✓ docker-compose.yml criado${NC}"

# ============================================================
# 8. Criar .env e subir tudo
# ============================================================
echo ""
echo -e "${YELLOW}[8/8] Criando .env...${NC}"

cat > .env.local << ENV_EOF
# ${PROJECT_NAME} - Variáveis Locais
# Gerado em: $(date)

# Banco de dados
POSTGRES_PASSWORD=${POSTGRES_PASSWORD}
POSTGRES_PORT=${DB_PORT}

# JWT
JWT_SECRET=${JWT_SECRET}

# Chaves Supabase (geradas automaticamente)
ANON_KEY=${ANON_KEY}
SERVICE_ROLE_KEY=${SERVICE_ROLE_KEY}

# Portas
KONG_HTTP_PORT=${API_PORT}
HOST_IP=${HOST_IP}
SITE_URL=http://${HOST_IP}:${APP_PORT}
API_EXTERNAL_URL=http://${HOST_IP}:${API_PORT}

# Frontend (Vite)
VITE_SUPABASE_URL=http://${HOST_IP}:${API_PORT}
VITE_SUPABASE_PUBLISHABLE_KEY=${ANON_KEY}
VITE_SUPABASE_PROJECT_ID=${PROJECT_NAME}
VITE_PORT=${APP_PORT}
VITE_BASE_PATH=/
ENV_EOF

# Copiar para .env (usado pelo Vite)
cp .env.local .env

echo -e "${GREEN}✓ .env.local e .env criados${NC}"

# ============================================================
# Subir Docker
# ============================================================
if [ "$SKIP_DOCKER" = false ]; then
  echo ""
  echo -e "${YELLOW}Subindo containers Docker...${NC}"
  
  docker compose down 2>/dev/null || true
  docker compose up -d
  
  echo -e "${GREEN}✓ Containers iniciados${NC}"
  echo ""
  docker compose ps
  
  # Aguardar banco ficar healthy
  echo ""
  echo -e "${YELLOW}Aguardando banco ficar pronto...${NC}"
  RETRIES=0
  MAX_RETRIES=30
  until docker exec ${PROJECT_NAME}-db pg_isready -U supabase_admin -d postgres -h localhost > /dev/null 2>&1; do
    RETRIES=$((RETRIES + 1))
    if [ $RETRIES -ge $MAX_RETRIES ]; then
      echo -e "${RED}✗ Banco não ficou pronto após ${MAX_RETRIES} tentativas${NC}"
      echo -e "${YELLOW}Verifique: docker compose logs db${NC}"
      break
    fi
    sleep 2
  done
  
  if [ $RETRIES -lt $MAX_RETRIES ]; then
    echo -e "${GREEN}✓ Banco pronto!${NC}"
    
    # ============================================================
    # Setup completo dos roles via docker exec (pós-init)
    # A imagem supabase/postgres já cria: anon, authenticated,
    # service_role, supabase_admin, supabase_auth_admin, etc.
    # Aqui garantimos authenticator + senha + grants
    # ============================================================
    echo -e "${YELLOW}Configurando roles e permissões do banco...${NC}"
    docker exec -i ${PROJECT_NAME}-db psql -U supabase_admin -h localhost -d postgres <<ROLES_SQL
-- Criar schemas base antes de tudo
CREATE SCHEMA IF NOT EXISTS auth;
CREATE SCHEMA IF NOT EXISTS extensions;
CREATE SCHEMA IF NOT EXISTS storage;

-- Permissões do schema auth para GoTrue
GRANT ALL ON SCHEMA auth TO supabase_auth_admin;
ALTER DEFAULT PRIVILEGES IN SCHEMA auth GRANT ALL ON TABLES TO supabase_auth_admin;
ALTER DEFAULT PRIVILEGES IN SCHEMA auth GRANT ALL ON SEQUENCES TO supabase_auth_admin;
ALTER DEFAULT PRIVILEGES IN SCHEMA auth GRANT ALL ON ROUTINES TO supabase_auth_admin;

-- Authenticator (PostgREST connection role)
BEGIN
  IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'authenticator') THEN
    CREATE ROLE authenticator NOINHERIT LOGIN PASSWORD '${POSTGRES_PASSWORD}';
  END IF;
END
\$\$;
ALTER ROLE authenticator PASSWORD '${POSTGRES_PASSWORD}';

-- Garantir senha do supabase_auth_admin para GoTrue
ALTER ROLE supabase_auth_admin PASSWORD '${POSTGRES_PASSWORD}';

-- Grants
GRANT anon TO authenticator;
GRANT authenticated TO authenticator;
GRANT service_role TO authenticator;
GRANT ALL ON SCHEMA public TO supabase_auth_admin;
GRANT CREATE ON SCHEMA public TO supabase_auth_admin;
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL ROUTINES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO supabase_auth_admin;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO supabase_auth_admin;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON ROUTINES TO anon, authenticated, service_role;

-- Extensões
CREATE EXTENSION IF NOT EXISTS "uuid-ossp" SCHEMA public;
CREATE EXTENSION IF NOT EXISTS "pgcrypto" SCHEMA public;
ROLES_SQL
    echo -e "${GREEN}✓ Roles e permissões configurados${NC}"
  fi

  # Aplicar migrations se existirem
  if [ -d "supabase/migrations" ] && [ "$(ls -A supabase/migrations 2>/dev/null)" ]; then
    echo ""
    echo -e "${YELLOW}Aplicando migrations do banco...${NC}"
    MIGRATION_COUNT=0
    MIGRATION_ERRORS=0
    for migration_file in supabase/migrations/*.sql; do
      if [ -f "$migration_file" ]; then
        MIGRATION_COUNT=$((MIGRATION_COUNT + 1))
        migration_name=$(basename "$migration_file")
        if docker exec -i ${PROJECT_NAME}-db psql -U supabase_admin -h localhost -d postgres < "$migration_file" > /dev/null 2>&1; then
          echo -e "  ${GREEN}✓${NC} $migration_name"
        else
          MIGRATION_ERRORS=$((MIGRATION_ERRORS + 1))
          echo -e "  ${YELLOW}⚠${NC} $migration_name (pode já estar aplicada)"
        fi
      fi
    done
    echo -e "${GREEN}✓ ${MIGRATION_COUNT} migrations processadas (${MIGRATION_ERRORS} avisos)${NC}"
  else
    echo -e "${YELLOW}⚠ Nenhuma migration encontrada em supabase/migrations/${NC}"
  fi

  # ============================================================
  # Criar tabelas da aplicação e usuário DEV
  # ============================================================

  echo -e "${YELLOW}Criando tabelas da aplicação e funções...${NC}"
  docker exec -i ${PROJECT_NAME}-db psql -U supabase_admin -h localhost -d postgres <<'APP_SQL'
-- Tabelas da aplicação
CREATE TABLE IF NOT EXISTS public.roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  description text,
  is_system boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  role_id uuid NOT NULL REFERENCES public.roles(id) ON DELETE CASCADE,
  assigned_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, role_id)
);

CREATE TABLE IF NOT EXISTS public.role_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  role_id uuid NOT NULL REFERENCES public.roles(id) ON DELETE CASCADE,
  page_path text NOT NULL,
  can_view boolean NOT NULL DEFAULT false,
  can_edit boolean NOT NULL DEFAULT false
);

CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY,
  full_name text NOT NULL DEFAULT '',
  email text NOT NULL DEFAULT '',
  avatar_url text,
  department text,
  phone text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  user_email text,
  action text NOT NULL,
  entity_type text,
  entity_id text,
  details text,
  old_data jsonb,
  new_data jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.printers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ip text NOT NULL,
  hostname text DEFAULT '',
  brand text NOT NULL DEFAULT '',
  model text NOT NULL DEFAULT '',
  serial text DEFAULT '',
  firmware text DEFAULT '',
  mac text DEFAULT '',
  location text DEFAULT '',
  sector text DEFAULT '',
  status text NOT NULL DEFAULT 'online' CHECK (status IN ('online', 'offline', 'warning', 'maintenance', 'disabled')),
  uptime text DEFAULT '0d 0h 0m',
  page_count integer DEFAULT 0,
  pages_per_day integer DEFAULT 0,
  supplies jsonb DEFAULT '[]'::jsonb,
  last_seen timestamptz DEFAULT now(),
  discovered_at timestamptz DEFAULT now(),
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.printers ENABLE ROW LEVEL SECURITY;

-- Cargos padrão
INSERT INTO public.roles (name, description, is_system) VALUES
  ('dev', 'Desenvolvedor com acesso total', true),
  ('admin', 'Administrador do sistema', true),
  ('technician', 'Técnico de manutenção', true),
  ('viewer', 'Visualizador apenas leitura', true)
ON CONFLICT (name) DO NOTHING;

-- Funções de segurança
CREATE OR REPLACE FUNCTION public.has_role_name(_user_id uuid, _role_name text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles ur
    JOIN public.roles r ON r.id = ur.role_id
    WHERE ur.user_id = _user_id AND r.name = _role_name
  )
$$;

CREATE OR REPLACE FUNCTION public.get_user_roles(_user_id uuid)
RETURNS text[] LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE(array_agg(r.name), ARRAY[]::text[])
  FROM public.user_roles ur
  JOIN public.roles r ON r.id = ur.role_id
  WHERE ur.user_id = _user_id
$$;

CREATE OR REPLACE FUNCTION public.has_page_permission(_user_id uuid, _page_path text, _permission text DEFAULT 'view')
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT
    public.has_role_name(_user_id, 'admin')
    OR public.has_role_name(_user_id, 'dev')
    OR EXISTS (
      SELECT 1 FROM public.user_roles ur
      JOIN public.role_permissions rp ON rp.role_id = ur.role_id
      WHERE ur.user_id = _user_id AND rp.page_path = _page_path
        AND ((_permission = 'view' AND rp.can_view) OR (_permission = 'edit' AND rp.can_edit))
    )
$$;

CREATE OR REPLACE FUNCTION public.create_profile_with_role(_user_id uuid, _full_name text, _email text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _is_first boolean; _role_name text;
BEGIN
  SELECT NOT EXISTS (SELECT 1 FROM public.profiles LIMIT 1) INTO _is_first;
  INSERT INTO public.profiles (id, full_name, email) VALUES (_user_id, _full_name, _email)
    ON CONFLICT (id) DO NOTHING;
  IF _is_first THEN _role_name := 'dev'; ELSE _role_name := 'viewer'; END IF;
  INSERT INTO public.user_roles (user_id, role_id)
    SELECT _user_id, id FROM public.roles WHERE name = _role_name
    ON CONFLICT (user_id, role_id) DO NOTHING;
END;
$$;

-- RLS Policies (drop and recreate to ensure PERMISSIVE)
-- Profiles
DROP POLICY IF EXISTS "Users can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can update any profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can delete profiles" ON public.profiles;
CREATE POLICY "Users can view all profiles" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK (id = auth.uid());
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE TO authenticated USING (id = auth.uid());
CREATE POLICY "Admins can update any profile" ON public.profiles FOR UPDATE TO authenticated USING (has_role_name(auth.uid(), 'admin') OR has_role_name(auth.uid(), 'dev'));
CREATE POLICY "Admins can delete profiles" ON public.profiles FOR DELETE TO authenticated USING (has_role_name(auth.uid(), 'admin') OR has_role_name(auth.uid(), 'dev'));

-- Roles
DROP POLICY IF EXISTS "Authenticated can view roles" ON public.roles;
DROP POLICY IF EXISTS "Admins can insert roles" ON public.roles;
DROP POLICY IF EXISTS "Admins can update roles" ON public.roles;
DROP POLICY IF EXISTS "Admins can delete roles" ON public.roles;
CREATE POLICY "Authenticated can view roles" ON public.roles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can insert roles" ON public.roles FOR INSERT TO authenticated WITH CHECK (has_role_name(auth.uid(), 'admin') OR has_role_name(auth.uid(), 'dev'));
CREATE POLICY "Admins can update roles" ON public.roles FOR UPDATE TO authenticated USING (has_role_name(auth.uid(), 'admin') OR has_role_name(auth.uid(), 'dev'));
CREATE POLICY "Admins can delete roles" ON public.roles FOR DELETE TO authenticated USING (has_role_name(auth.uid(), 'admin') OR has_role_name(auth.uid(), 'dev'));

-- User roles
DROP POLICY IF EXISTS "Authenticated can view user_roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can insert user_roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can update user_roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can delete user_roles" ON public.user_roles;
CREATE POLICY "Authenticated can view user_roles" ON public.user_roles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can insert user_roles" ON public.user_roles FOR INSERT TO authenticated WITH CHECK (has_role_name(auth.uid(), 'admin') OR has_role_name(auth.uid(), 'dev'));
CREATE POLICY "Admins can update user_roles" ON public.user_roles FOR UPDATE TO authenticated USING (has_role_name(auth.uid(), 'admin') OR has_role_name(auth.uid(), 'dev'));
CREATE POLICY "Admins can delete user_roles" ON public.user_roles FOR DELETE TO authenticated USING (has_role_name(auth.uid(), 'admin') OR has_role_name(auth.uid(), 'dev'));

-- Role permissions
DROP POLICY IF EXISTS "Authenticated can view permissions" ON public.role_permissions;
DROP POLICY IF EXISTS "Admins can insert permissions" ON public.role_permissions;
DROP POLICY IF EXISTS "Admins can update permissions" ON public.role_permissions;
DROP POLICY IF EXISTS "Admins can delete permissions" ON public.role_permissions;
CREATE POLICY "Authenticated can view permissions" ON public.role_permissions FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can insert permissions" ON public.role_permissions FOR INSERT TO authenticated WITH CHECK (has_role_name(auth.uid(), 'admin') OR has_role_name(auth.uid(), 'dev'));
CREATE POLICY "Admins can update permissions" ON public.role_permissions FOR UPDATE TO authenticated USING (has_role_name(auth.uid(), 'admin') OR has_role_name(auth.uid(), 'dev'));
CREATE POLICY "Admins can delete permissions" ON public.role_permissions FOR DELETE TO authenticated USING (has_role_name(auth.uid(), 'admin') OR has_role_name(auth.uid(), 'dev'));

-- Audit logs
DROP POLICY IF EXISTS "Admins can view audit logs" ON public.audit_logs;
DROP POLICY IF EXISTS "Admins and devs can view audit logs" ON public.audit_logs;
DROP POLICY IF EXISTS "Authenticated can insert own audit logs" ON public.audit_logs;
CREATE POLICY "Admins and devs can view audit logs" ON public.audit_logs FOR SELECT TO authenticated USING (has_role_name(auth.uid(), 'admin') OR has_role_name(auth.uid(), 'dev'));
CREATE POLICY "Authenticated can insert own audit logs" ON public.audit_logs FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

-- Printers
DROP POLICY IF EXISTS "Authenticated can view printers" ON public.printers;
DROP POLICY IF EXISTS "Admins can insert printers" ON public.printers;
DROP POLICY IF EXISTS "Admins can update printers" ON public.printers;
DROP POLICY IF EXISTS "Admins can delete printers" ON public.printers;
CREATE POLICY "Authenticated can view printers" ON public.printers FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can insert printers" ON public.printers FOR INSERT TO authenticated WITH CHECK (has_role_name(auth.uid(), 'admin') OR has_role_name(auth.uid(), 'dev') OR has_role_name(auth.uid(), 'technician'));
CREATE POLICY "Admins can update printers" ON public.printers FOR UPDATE TO authenticated USING (has_role_name(auth.uid(), 'admin') OR has_role_name(auth.uid(), 'dev') OR has_role_name(auth.uid(), 'technician'));
CREATE POLICY "Admins can delete printers" ON public.printers FOR DELETE TO authenticated USING (has_role_name(auth.uid(), 'admin') OR has_role_name(auth.uid(), 'dev'));
APP_SQL
  echo -e "${GREEN}✓ Tabelas, funções e RLS da aplicação criados${NC}"
else
  echo ""
  echo -e "${YELLOW}Docker pulado (--skip-docker)${NC}"
fi

# ============================================================
# Instalar e rodar frontend
# ============================================================
if [ "$SKIP_NPM" = false ]; then
  echo ""
  echo -e "${YELLOW}Instalando dependências npm...${NC}"
  npm install --legacy-peer-deps
  
  if [ "$PRODUCTION" = true ]; then
    echo -e "${YELLOW}Compilando para produção...${NC}"
    npm run build
    echo -e "${GREEN}✓ Build gerado em dist/${NC}"
  fi
fi

# ============================================================
# Resumo final
# ============================================================
echo ""
echo -e "${CYAN}╔══════════════════════════════════════════════════════╗"
echo "║  ✅ Setup completo!                                  ║"
echo "╠══════════════════════════════════════════════════════╣"
echo "║                                                      ║"
echo "║  📦 Serviços rodando:                                ║"
echo "║    PostgreSQL:      ${HOST_IP}:${DB_PORT}                  ║"
echo "║    API Gateway:     ${HOST_IP}:${API_PORT}                  ║"
echo "║    Auth (GoTrue):   interno (via Kong)                ║"
echo "║    PostgREST:       interno (via Kong)                ║"
echo "║    Edge Functions:  interno (via Kong)                ║"
echo "║                                                      ║"
echo "║  🔗 URLs úteis:                                      ║"
echo "║    API:    http://${HOST_IP}:${API_PORT}/rest/v1/           ║"
echo "║    Auth:   http://${HOST_IP}:${API_PORT}/auth/v1/           ║"
echo "║    Funcs:  http://${HOST_IP}:${API_PORT}/functions/v1/      ║"
echo "║                                                      ║"
echo "║  🚀 Para iniciar o frontend:                         ║"
echo "║    npm run dev -- --host 0.0.0.0 --port ${APP_PORT}       ║"
echo "║                                                      ║"
echo "║  🔄 Com PM2 (background):                            ║"
echo "║    pm2 start \"npm run dev -- --host 0.0.0.0           ║"
echo "║      --port ${APP_PORT}\" --name ${PROJECT_NAME}                  ║"
echo "║                                                      ║"
echo "║  🌐 Acesse: http://${HOST_IP}:${APP_PORT}                  ║"
echo "╚══════════════════════════════════════════════════════╝"
echo -e "${NC}"
echo ""
echo -e "${BLUE}Resumo de acesso:${NC}"
echo -e "  PostgreSQL:  postgresql://postgres:${POSTGRES_PASSWORD}@${HOST_IP}:${DB_PORT}/postgres"
echo -e "  API:         http://${HOST_IP}:${API_PORT}"
echo -e "  Frontend:    http://${HOST_IP}:${APP_PORT}"
echo ""
echo -e "${YELLOW}⚠ Salve o arquivo .env.local em local seguro!${NC}"
echo -e "${YELLOW}⚠ Primeiro usuário cadastrado recebe acesso total (dev).${NC}"
echo ""
echo -e "${GREEN}🎉 Projeto ${PROJECT_NAME} pronto para uso!${NC}"
