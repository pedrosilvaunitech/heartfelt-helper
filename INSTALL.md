# PrintGuard Monitor — Guia Completo de Instalação

> Sistema de monitoramento de impressoras com backend isolado via Docker.

---

## Índice

1. [Requisitos](#1-requisitos)
2. [Instalação Rápida (Docker)](#2-instalação-rápida-docker)
3. [Instalação Detalhada](#3-instalação-detalhada)
4. [Múltiplos Sistemas no Mesmo Servidor](#4-múltiplos-sistemas-no-mesmo-servidor)
5. [Nginx — Proxy Reverso](#5-nginx--proxy-reverso)
6. [PM2 — Manter Rodando](#6-pm2--manter-rodando)
7. [Atualização do Sistema](#7-atualização-do-sistema)
8. [Solução de Problemas](#8-solução-de-problemas)

---

## 1. Requisitos

| Recurso    | Mínimo         |
|------------|----------------|
| SO         | Ubuntu 20.04+ / Debian 11+ / CentOS 8+ |
| RAM        | 4 GB (8 GB recomendado para múltiplos sistemas) |
| CPU        | 2 cores        |
| Disco      | 10 GB por sistema |
| Docker     | v20+           |
| Docker Compose | v2+        |
| Node.js    | v18+           |
| npm        | v9+            |
| Git        | Qualquer versão |

### Instalar dependências básicas

```bash
# Atualizar sistema
sudo apt update && sudo apt upgrade -y

# Git e utilitários
sudo apt install -y git curl wget nano

# Docker
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER
# IMPORTANTE: Faça logout e login novamente após este comando

# Verificar Docker
docker --version
docker compose version

# Node.js via NVM
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
source ~/.bashrc
nvm install 18
nvm use 18

# Verificar
node -v   # v18.x.x
npm -v    # v9.x.x
```

---

## 2. Instalação Rápida (Docker)

Se quiser subir tudo com o mínimo de passos:

```bash
# 1. Clonar
git clone <URL_DO_REPOSITORIO> printguard
cd printguard

# 2. Gerar chaves de segurança
bash docker/generate-keys.sh > .env.local

# 3. Subir backend (banco, auth, API)
export $(cat .env.local | grep -v '^#' | xargs)
docker compose up -d

# 4. Aguardar ~30 segundos, depois aplicar tabelas
npm install -g supabase
supabase db reset --db-url "postgresql://postgres:printguard_secret_2024@localhost:54320/postgres"

# 5. Configurar e rodar frontend
cp .env.local .env
npm install
npm run dev -- --host 0.0.0.0
```

✅ Acesse: `http://<IP_DO_SERVIDOR>:3001`

---

## 3. Instalação Detalhada

### 3.1. Clonar o repositório

```bash
git clone <URL_DO_REPOSITORIO> /opt/printguard
cd /opt/printguard
```

### 3.2. Gerar chaves JWT

O script gera automaticamente as chaves `ANON_KEY` e `SERVICE_ROLE_KEY`:

```bash
bash docker/generate-keys.sh > .env.local
```

Para usar uma senha personalizada do banco:

```bash
JWT_SECRET="minha-chave-jwt-com-pelo-menos-32-caracteres" bash docker/generate-keys.sh > .env.local
```

### 3.3. Editar configurações (opcional)

```bash
nano .env.local
```

Variáveis importantes:

```env
# Portas (mude se houver conflito)
POSTGRES_PORT=54320       # Banco de dados
KONG_HTTP_PORT=54321      # API Gateway
VITE_PORT=3001            # Frontend

# Senha do banco
POSTGRES_PASSWORD=printguard_secret_2024

# URL de acesso (mude para o IP real em produção)
SITE_URL=http://192.168.1.10:3001
API_EXTERNAL_URL=http://192.168.1.10:54321

# SubPath (para acessar via /printers no Nginx)
VITE_BASE_PATH=/
```

### 3.4. Subir o backend

```bash
# Carregar variáveis
export $(cat .env.local | grep -v '^#' | xargs)

# Subir containers
docker compose up -d

# Verificar se tudo subiu
docker compose ps
```

Resultado esperado:

```
NAME                   STATUS
printguard-db          running (healthy)
printguard-kong        running
printguard-auth        running
printguard-rest        running
printguard-functions   running
```

### 3.5. Criar as tabelas no banco

```bash
# Instalar Supabase CLI (apenas primeira vez)
npm install -g supabase

# Aplicar todas as migrations
supabase db reset --db-url "postgresql://postgres:printguard_secret_2024@localhost:54320/postgres"
```

### 3.6. Instalar e rodar o frontend

```bash
# Copiar variáveis para o frontend
cp .env.local .env

# Instalar dependências
npm install

# Rodar em modo desenvolvimento
npm run dev -- --host 0.0.0.0
```

### 3.7. Compilar para produção (opcional)

```bash
npm run build
```

Os arquivos otimizados ficam na pasta `dist/`.

### 3.8. Primeiro acesso

1. Acesse `http://<IP_DO_SERVIDOR>:3001`
2. Clique em **Cadastrar**
3. O **primeiro usuário** recebe automaticamente o cargo de **Desenvolvedor** com acesso total
4. Usuários seguintes recebem cargo de **Visualizador** (o admin pode alterar depois)

---

## 4. Múltiplos Sistemas no Mesmo Servidor

Cada sistema roda em **containers Docker isolados** com portas próprias. **Um não interfere no outro.**

### Estrutura de exemplo

```
/opt/
├── printguard/          # Sistema 1
│   ├── docker-compose.yml
│   ├── .env.local       # Portas: 54320, 54321, 3001
│   └── ...
├── helpdesk/            # Sistema 2
│   ├── docker-compose.yml
│   ├── .env.local       # Portas: 54420, 54421, 3002
│   └── ...
└── inventario/          # Sistema 3
    ├── docker-compose.yml
    ├── .env.local       # Portas: 54520, 54521, 3003
    └── ...
```

### Tabela de portas recomendadas

| Sistema     | DB (Postgres) | API (Kong) | Frontend | Studio |
|-------------|---------------|------------|----------|--------|
| PrintGuard  | 54320         | 54321      | 3001     | 54323  |
| Helpdesk    | 54420         | 54421      | 3002     | 54423  |
| Inventário  | 54520         | 54521      | 3003     | 54523  |
| Sistema 4   | 54620         | 54621      | 3004     | 54623  |

### Passo a passo para o segundo sistema

```bash
# 1. Clonar o segundo sistema
git clone <URL_HELPDESK> /opt/helpdesk
cd /opt/helpdesk

# 2. Gerar chaves (se usar Supabase)
bash docker/generate-keys.sh > .env.local

# 3. IMPORTANTE: Mudar as portas no .env.local
nano .env.local
```

Editar as portas:

```env
POSTGRES_PORT=54420
KONG_HTTP_PORT=54421
VITE_PORT=3002
SITE_URL=http://192.168.1.10:3002
API_EXTERNAL_URL=http://192.168.1.10:54421
VITE_SUPABASE_URL=http://localhost:54421
```

```bash
# 4. Subir
export $(cat .env.local | grep -v '^#' | xargs)
docker compose up -d

# 5. Aplicar migrations
supabase db reset --db-url "postgresql://postgres:printguard_secret_2024@localhost:54420/postgres"

# 6. Frontend
cp .env.local .env
npm install
npm run dev -- --host 0.0.0.0
```

### Renomear containers (evitar conflito)

Se os `docker-compose.yml` tiverem nomes iguais de container, edite o `container_name` de cada serviço:

```yaml
# /opt/helpdesk/docker-compose.yml
services:
  db:
    container_name: helpdesk-db      # Em vez de printguard-db
  kong:
    container_name: helpdesk-kong
  auth:
    container_name: helpdesk-auth
  rest:
    container_name: helpdesk-rest
  functions:
    container_name: helpdesk-functions
```

### Verificar todos os containers

```bash
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
```

---

## 5. Nginx — Proxy Reverso

Serve todos os sistemas em um único domínio/IP com paths diferentes.

### Instalar Nginx

```bash
sudo apt install -y nginx
```

### Configurar

```bash
sudo nano /etc/nginx/sites-available/sistemas
```

```nginx
server {
    listen 80;
    server_name _;

    # PrintGuard em /printers
    location /printers/ {
        proxy_pass http://127.0.0.1:3001/printers/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    # Helpdesk em /helpdesk
    location /helpdesk/ {
        proxy_pass http://127.0.0.1:3002/helpdesk/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    # Inventário em /inventario
    location /inventario/ {
        proxy_pass http://127.0.0.1:3003/inventario/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    # Página principal (opcional)
    location / {
        return 301 /printers/;
    }
}
```

### Ativar

```bash
sudo ln -sf /etc/nginx/sites-available/sistemas /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl restart nginx
sudo systemctl enable nginx
```

### Para usar subpath, configure no `.env.local` do sistema

```env
VITE_BASE_PATH=/printers
```

E recompile: `npm run build`

### Servir build estático (produção)

```bash
sudo mkdir -p /var/www/printers
sudo cp -r /opt/printguard/dist/* /var/www/printers/
```

Trocar proxy por alias no Nginx:

```nginx
location /printers/ {
    alias /var/www/printers/;
    index index.html;
    try_files $uri $uri/ /printers/index.html;
}
```

---

## 6. PM2 — Manter Rodando

Para manter o frontend rodando após fechar o terminal:

```bash
# Instalar PM2
npm install -g pm2

# PrintGuard
cd /opt/printguard
pm2 start "npm run dev -- --host 0.0.0.0" --name printguard

# Helpdesk
cd /opt/helpdesk
pm2 start "npm run dev -- --host 0.0.0.0" --name helpdesk

# Salvar e iniciar no boot
pm2 save
pm2 startup
```

### Comandos úteis

```bash
pm2 status                  # Ver todos os processos
pm2 logs printguard          # Ver logs do PrintGuard
pm2 restart printguard       # Reiniciar
pm2 stop printguard          # Parar
pm2 delete printguard        # Remover
pm2 restart all              # Reiniciar todos
```

---

## 7. Atualização do Sistema

```bash
cd /opt/printguard

# Parar frontend
pm2 stop printguard

# Atualizar código
git pull

# Reinstalar dependências (se necessário)
npm install

# Aplicar novas migrations (se houver)
supabase db reset --db-url "postgresql://postgres:printguard_secret_2024@localhost:54320/postgres"

# Reiniciar
pm2 restart printguard

# Se usar build estático, recompilar
npm run build
sudo cp -r dist/* /var/www/printers/
```

---

## 8. Solução de Problemas

| Problema | Causa | Solução |
|----------|-------|---------|
| `docker compose up` falha | Docker não instalado/rodando | `sudo systemctl start docker` |
| Porta em uso | Outro serviço na porta | Mudar portas no `.env.local` |
| Container não sobe | Porta conflitante | `docker compose down && docker compose up -d` |
| `npm install` falha | Conflito de dependências | `npm install --legacy-peer-deps` |
| Não acessa de outra máquina | Firewall bloqueando | `sudo ufw allow 80 && sudo ufw allow 3001` |
| Página branca | VITE_BASE_PATH errado | Verificar `.env` e recompilar |
| Auth não funciona | ANON_KEY não bate | Regenerar: `bash docker/generate-keys.sh > .env.local` |
| 404 no Nginx | try_files errado | Verificar `try_files $uri $uri/ /printers/index.html` |
| Banco não conecta | Container não healthy | `docker compose logs db` |
| Migrations falham | URL do banco errada | Usar `localhost:54320` (porta do .env.local) |
| Dois sistemas conflitam | Mesmas portas/nomes | Mudar portas e `container_name` no segundo |

### Logs úteis

```bash
# Logs do Docker
docker compose logs -f           # Todos
docker compose logs -f db        # Só banco
docker compose logs -f auth      # Só autenticação
docker compose logs -f kong      # Só API Gateway

# Logs do frontend
pm2 logs printguard

# Verificar portas em uso
sudo ss -tlnp | grep -E '3001|54320|54321'
```

### Firewall

```bash
sudo ufw allow 80      # HTTP
sudo ufw allow 443     # HTTPS
sudo ufw allow 3001    # Frontend direto (opcional)
sudo ufw enable
```

---

## Resumo de Comandos

| Ação | Comando |
|------|---------|
| Subir backend | `docker compose up -d` |
| Parar backend | `docker compose down` |
| Parar e apagar dados | `docker compose down -v` |
| Ver containers | `docker compose ps` |
| Rodar frontend | `npm run dev -- --host 0.0.0.0` |
| Compilar produção | `npm run build` |
| Aplicar migrations | `supabase db reset --db-url "postgresql://postgres:SENHA@localhost:PORTA/postgres"` |
| Ver logs Docker | `docker compose logs -f` |
| Ver logs PM2 | `pm2 logs` |
