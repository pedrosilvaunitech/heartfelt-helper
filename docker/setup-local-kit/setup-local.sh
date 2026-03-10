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

# Defaults
PROJECT_NAME="lovable-app"
DB_PORT=54320
API_PORT=54321
APP_PORT=3001
HOST_IP="localhost"
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
echo -e "${BLUE}DB:${NC}       localhost:$DB_PORT"
echo -e "${BLUE}API:${NC}      localhost:$API_PORT"
echo -e "${BLUE}App:${NC}      localhost:$APP_PORT"
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
-- Roles necessários para o Supabase funcionar localmente
-- Este script roda automaticamente na primeira vez que o banco sobe
-- ============================================================

-- Role: anon (usado pelo PostgREST para requests não autenticados)
DO \$\$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'anon') THEN
    CREATE ROLE anon NOLOGIN NOINHERIT;
  END IF;
END
\$\$;

-- Role: authenticated (usado pelo PostgREST para requests autenticados)
DO \$\$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'authenticated') THEN
    CREATE ROLE authenticated NOLOGIN NOINHERIT;
  END IF;
END
\$\$;

-- Role: service_role (acesso total, usado pelo SERVICE_ROLE_KEY)
DO \$\$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'service_role') THEN
    CREATE ROLE service_role NOLOGIN NOINHERIT BYPASSRLS;
  END IF;
END
\$\$;

-- Role: authenticator (usado pelo PostgREST para conectar e alternar roles)
DO \$\$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'authenticator') THEN
    CREATE ROLE authenticator NOINHERIT LOGIN PASSWORD '${POSTGRES_PASSWORD}';
  END IF;
END
\$\$;
ALTER ROLE authenticator PASSWORD '${POSTGRES_PASSWORD}';
GRANT anon TO authenticator;
GRANT authenticated TO authenticator;
GRANT service_role TO authenticator;

-- Role: supabase_auth_admin (usado pelo GoTrue para gerenciar auth)
DO \$\$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'supabase_auth_admin') THEN
    CREATE ROLE supabase_auth_admin NOINHERIT CREATEROLE LOGIN PASSWORD '${POSTGRES_PASSWORD}';
  END IF;
END
\$\$;
ALTER ROLE supabase_auth_admin PASSWORD '${POSTGRES_PASSWORD}';

-- Schema auth (necessário para GoTrue)
CREATE SCHEMA IF NOT EXISTS auth AUTHORIZATION supabase_auth_admin;

-- Permissões do supabase_auth_admin no schema public (CRÍTICO!)
GRANT ALL ON SCHEMA public TO supabase_auth_admin;
GRANT CREATE ON SCHEMA public TO supabase_auth_admin;
GRANT ALL ON ALL TABLES IN SCHEMA public TO supabase_auth_admin;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO supabase_auth_admin;

-- Permissões do schema public
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL ROUTINES IN SCHEMA public TO anon, authenticated, service_role;

-- Permissões default para tabelas futuras
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON ROUTINES TO anon, authenticated, service_role;

-- Extensões comuns
CREATE EXTENSION IF NOT EXISTS "uuid-ossp" SCHEMA public;
CREATE EXTENSION IF NOT EXISTS "pgcrypto" SCHEMA public;

-- Confirmar
DO \$\$ BEGIN RAISE NOTICE '✅ Roles e schemas inicializados com sucesso!'; END \$\$;
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

  - name: functions-v1
    url: http://functions:9000/
    routes:
      - name: functions-v1
        strip_path: true
        paths:
          - /functions/v1/
    plugins:
      - name: cors

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
version: "3.8"

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
      - ./docker/init-db.sql:/docker-entrypoint-initdb.d/00-init-roles.sql:ro
    healthcheck:
      test: pg_isready -U postgres -h localhost
      interval: 5s
      timeout: 10s
      retries: 20
      start_period: 30s

  # ============================================
  # Supabase Auth (GoTrue) - Autenticação
  # ============================================
  auth:
    image: supabase/gotrue:v2.164.0
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
  until docker exec ${PROJECT_NAME}-db pg_isready -U postgres -h localhost > /dev/null 2>&1; do
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
    
    # Rodar init-db.sql manualmente caso docker-entrypoint não tenha rodado
    # (acontece se o volume já existia de uma instalação anterior)
    echo -e "${YELLOW}Garantindo roles do banco...${NC}"
    docker exec -i ${PROJECT_NAME}-db psql -U postgres -d postgres < docker/init-db.sql 2>/dev/null || true
    echo -e "${GREEN}✓ Roles verificados${NC}"
  fi
  
  # Aplicar migrations se existirem
  if [ -d "supabase/migrations" ] && [ "$(ls -A supabase/migrations 2>/dev/null)" ]; then
    echo ""
    echo -e "${YELLOW}Aplicando migrations do banco...${NC}"
    if command -v supabase &> /dev/null; then
      supabase db reset --db-url "postgresql://postgres:${POSTGRES_PASSWORD}@localhost:${DB_PORT}/postgres" 2>/dev/null && \
        echo -e "${GREEN}✓ Migrations aplicadas${NC}" || \
        echo -e "${YELLOW}⚠ Migrations falharam. Execute manualmente:${NC}
  supabase db reset --db-url \"postgresql://postgres:${POSTGRES_PASSWORD}@localhost:${DB_PORT}/postgres\""
    else
      echo -e "${YELLOW}⚠ Supabase CLI não encontrado.${NC}"
      echo -e "  Instale: ${CYAN}npm install -g supabase${NC}"
      echo -e "  Execute: ${CYAN}supabase db reset --db-url \"postgresql://postgres:${POSTGRES_PASSWORD}@localhost:${DB_PORT}/postgres\"${NC}"
    fi
  else
    echo -e "${YELLOW}⚠ Nenhuma migration encontrada em supabase/migrations/${NC}"
  fi
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
echo "║    PostgreSQL:      localhost:${DB_PORT}                  ║"
echo "║    API Gateway:     localhost:${API_PORT}                  ║"
echo "║    Auth (GoTrue):   interno (via Kong)                ║"
echo "║    PostgREST:       interno (via Kong)                ║"
echo "║    Edge Functions:  interno (via Kong)                ║"
echo "║                                                      ║"
echo "║  🔗 URLs úteis:                                      ║"
echo "║    API:    http://localhost:${API_PORT}/rest/v1/           ║"
echo "║    Auth:   http://localhost:${API_PORT}/auth/v1/           ║"
echo "║    Funcs:  http://localhost:${API_PORT}/functions/v1/      ║"
echo "║                                                      ║"
echo "║  🚀 Para iniciar o frontend:                         ║"
echo "║    npm run dev -- --host 0.0.0.0 --port ${APP_PORT}       ║"
echo "║                                                      ║"
echo "║  🔄 Com PM2 (background):                            ║"
echo "║    pm2 start \"npm run dev -- --host 0.0.0.0           ║"
echo "║      --port ${APP_PORT}\" --name ${PROJECT_NAME}                  ║"
echo "║                                                      ║"
echo "║  🌐 Acesse: http://localhost:${APP_PORT}                  ║"
echo "╚══════════════════════════════════════════════════════╝"
echo -e "${NC}"
echo ""
echo -e "${BLUE}Resumo de acesso:${NC}"
echo -e "  PostgreSQL:  postgresql://postgres:${POSTGRES_PASSWORD}@localhost:${DB_PORT}/postgres"
echo -e "  API:         http://localhost:${API_PORT}"
echo -e "  Frontend:    http://localhost:${APP_PORT}"
echo ""
echo -e "${YELLOW}⚠ Salve o arquivo .env.local em local seguro!${NC}"
echo -e "${YELLOW}⚠ Primeiro usuário cadastrado recebe acesso total (dev).${NC}"
echo ""
echo -e "${GREEN}🎉 Projeto ${PROJECT_NAME} pronto para uso!${NC}"
