#!/bin/bash
set -e

# ============================================================
# Setup Local para Projetos Lovable
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
echo -e "${YELLOW}[1/7] Verificando dependências...${NC}"

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
# 2. Criar estrutura Docker
# ============================================================
echo ""
echo -e "${YELLOW}[2/7] Criando estrutura Docker...${NC}"

mkdir -p docker

# Kong config
cat > docker/kong.yml << 'KONG_EOF'
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

echo -e "${GREEN}✓ docker/kong.yml criado${NC}"

# ============================================================
# 3. Gerar chaves JWT
# ============================================================
echo ""
echo -e "${YELLOW}[3/7] Gerando chaves JWT...${NC}"

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
# 4. Criar docker-compose.yml
# ============================================================
echo ""
echo -e "${YELLOW}[4/7] Criando docker-compose.yml...${NC}"

cat > docker-compose.yml << COMPOSE_EOF
version: "3.8"

# ${PROJECT_NAME} - Deploy Local Isolado
# Gerado por setup-local.sh em $(date)

services:
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
      test: pg_isready -U postgres -h localhost
      interval: 5s
      timeout: 5s
      retries: 10

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
      API_EXTERNAL_URL: http://localhost:${API_PORT}
      GOTRUE_DB_DRIVER: postgres
      GOTRUE_DB_DATABASE_URL: postgres://supabase_auth_admin:${POSTGRES_PASSWORD}@db:5432/postgres
      GOTRUE_SITE_URL: http://localhost:${APP_PORT}
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
      GOTRUE_LOG_LEVEL: warn

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
      ANON_KEY: ${ANON_KEY}
      SERVICE_ROLE_KEY: ${SERVICE_ROLE_KEY}
    volumes:
      - ./docker/kong.yml:/var/lib/kong/kong.yml:ro
    depends_on:
      - auth
      - rest

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
# 5. Criar .env
# ============================================================
echo ""
echo -e "${YELLOW}[5/7] Criando .env...${NC}"

cat > .env.local << ENV_EOF
# ${PROJECT_NAME} - Variáveis Locais
# Gerado em: $(date)

# Banco de dados
POSTGRES_PASSWORD=${POSTGRES_PASSWORD}
POSTGRES_PORT=${DB_PORT}

# JWT
JWT_SECRET=${JWT_SECRET}

# Chaves Supabase
ANON_KEY=${ANON_KEY}
SERVICE_ROLE_KEY=${SERVICE_ROLE_KEY}

# Portas
KONG_HTTP_PORT=${API_PORT}
SITE_URL=http://localhost:${APP_PORT}
API_EXTERNAL_URL=http://localhost:${API_PORT}

# Frontend (Vite)
VITE_SUPABASE_URL=http://localhost:${API_PORT}
VITE_SUPABASE_PUBLISHABLE_KEY=${ANON_KEY}
VITE_SUPABASE_PROJECT_ID=${PROJECT_NAME}
VITE_PORT=${APP_PORT}
VITE_BASE_PATH=/
ENV_EOF

# Copiar para .env (usado pelo Vite)
cp .env.local .env

echo -e "${GREEN}✓ .env.local e .env criados${NC}"

# ============================================================
# 6. Subir Docker
# ============================================================
if [ "$SKIP_DOCKER" = false ]; then
  echo ""
  echo -e "${YELLOW}[6/7] Subindo containers Docker...${NC}"
  
  export $(cat .env.local | grep -v '^#' | xargs)
  docker compose down 2>/dev/null || true
  docker compose up -d
  
  echo -e "${GREEN}✓ Containers rodando${NC}"
  echo ""
  docker compose ps
  
  # Aguardar banco ficar pronto
  echo ""
  echo -e "${YELLOW}Aguardando banco ficar pronto...${NC}"
  sleep 10
  
  # Aplicar migrations se existirem
  if [ -d "supabase/migrations" ] && [ "$(ls -A supabase/migrations 2>/dev/null)" ]; then
    echo -e "${YELLOW}Aplicando migrations...${NC}"
    if command -v supabase &> /dev/null; then
      supabase db reset --db-url "postgresql://postgres:${POSTGRES_PASSWORD}@localhost:${DB_PORT}/postgres" 2>/dev/null || \
        echo -e "${YELLOW}⚠ Migrations falharam. Execute manualmente: supabase db reset --db-url \"postgresql://postgres:${POSTGRES_PASSWORD}@localhost:${DB_PORT}/postgres\"${NC}"
    else
      echo -e "${YELLOW}⚠ Supabase CLI não encontrado. Instale com: npm install -g supabase${NC}"
      echo -e "${YELLOW}  Depois execute: supabase db reset --db-url \"postgresql://postgres:${POSTGRES_PASSWORD}@localhost:${DB_PORT}/postgres\"${NC}"
    fi
  fi
else
  echo ""
  echo -e "${YELLOW}[6/7] Docker pulado (--skip-docker)${NC}"
fi

# ============================================================
# 7. Instalar e rodar frontend
# ============================================================
if [ "$SKIP_NPM" = false ]; then
  echo ""
  echo -e "${YELLOW}[7/7] Instalando dependências...${NC}"
  npm install --legacy-peer-deps
  
  if [ "$PRODUCTION" = true ]; then
    echo -e "${YELLOW}Compilando para produção...${NC}"
    npm run build
    echo -e "${GREEN}✓ Build em dist/${NC}"
  else
    echo ""
    echo -e "${CYAN}╔══════════════════════════════════════════════════╗"
    echo "║  ✅ Setup completo!                              ║"
    echo "║                                                  ║"
    echo "║  Para iniciar o frontend:                        ║"
    echo "║  npm run dev -- --host 0.0.0.0 --port ${APP_PORT}      ║"
    echo "║                                                  ║"
    echo "║  Ou com PM2 (background):                        ║"
    echo "║  pm2 start \"npm run dev -- --host 0.0.0.0        ║"
    echo "║    --port ${APP_PORT}\" --name ${PROJECT_NAME}             ║"
    echo "║                                                  ║"
    echo "║  Acesse: http://localhost:${APP_PORT}                  ║"
    echo "╚══════════════════════════════════════════════════╝"
    echo -e "${NC}"
  fi
else
  echo ""
  echo -e "${YELLOW}[7/7] npm pulado (--skip-npm)${NC}"
fi

echo ""
echo -e "${GREEN}🎉 Projeto ${PROJECT_NAME} configurado com sucesso!${NC}"
echo ""
echo -e "${BLUE}Resumo:${NC}"
echo -e "  PostgreSQL: localhost:${DB_PORT}"
echo -e "  API:        localhost:${API_PORT}"
echo -e "  Frontend:   localhost:${APP_PORT}"
echo -e "  Senha DB:   ${POSTGRES_PASSWORD}"
echo ""
echo -e "${YELLOW}Dica: Salve o .env.local em local seguro!${NC}"
