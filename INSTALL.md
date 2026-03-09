# Guia de Instalação - PrintGuard Monitor

## Modos de Instalação

| Modo | Descrição | Internet |
|------|-----------|----------|
| [Cloud](#modo-cloud) | Usa Lovable Cloud como backend | Necessária |
| [Local Isolado](#modo-local-isolado-docker) | Tudo via Docker, 100% offline | Não |
| [Desenvolvimento](#modo-desenvolvimento) | Para desenvolver e testar | Depende |

---

## Modo Cloud

Usa o backend Lovable Cloud (padrão do projeto).

### Requisitos
- Node.js v18+
- npm v9+

### Instalação

```bash
git clone <URL_DO_REPOSITORIO>
cd <PASTA_DO_PROJETO>
npm install
npm run dev -- --host 0.0.0.0
```

Acesse: `http://localhost:8080`

---

## Modo Local Isolado (Docker)

Roda **100% local** — banco de dados, autenticação, edge functions e frontend — sem depender de internet.

### Requisitos

| Recurso | Mínimo |
|---------|--------|
| RAM | 4 GB |
| CPU | 2 cores |
| Disco | 10 GB |
| Docker | v20+ |
| Docker Compose | v2+ |
| Node.js | v18+ |

### 1. Instalar Docker

```bash
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER
# Faça logout e login novamente
```

### 2. Clonar o Projeto

```bash
git clone <URL_DO_REPOSITORIO>
cd <PASTA_DO_PROJETO>
```

### 3. Gerar Chaves de Segurança

```bash
bash docker/generate-keys.sh > .env.local
```

Isso gera as chaves JWT (anon e service_role) automaticamente.

### 4. Subir o Backend

```bash
# Carregar variáveis
export $(cat .env.local | xargs)

# Subir tudo
docker compose up -d
```

Aguarde ~30 segundos para todos os serviços iniciarem.

### 5. Aplicar Migrations

```bash
# Instalar Supabase CLI
npm install -g supabase

# Conectar ao banco local
supabase db reset --db-url "postgresql://postgres:printguard_secret_2024@localhost:54320/postgres"
```

### 6. Rodar o Frontend

```bash
# Copiar variáveis do frontend
cp .env.local .env

npm install
npm run dev -- --host 0.0.0.0
```

Acesse: `http://<IP_DO_SERVIDOR>:3001`

### 7. Verificar Serviços

```bash
docker compose ps
```

| Serviço | Porta | Função |
|---------|-------|--------|
| printguard-db | 54320 | PostgreSQL |
| printguard-kong | 54321 | API Gateway |
| printguard-auth | (interna) | Autenticação |
| printguard-rest | (interna) | API REST |
| printguard-functions | (interna) | Edge Functions |

### Comandos Úteis

```bash
docker compose logs -f          # Ver logs
docker compose restart           # Reiniciar tudo
docker compose down              # Parar tudo
docker compose down -v           # Parar e apagar dados
```

---

## Múltiplos Sistemas no Mesmo Servidor

Cada sistema roda sua **própria instância** isolada com portas diferentes:

### Exemplo de Portas

| Sistema | DB | API | Frontend |
|---------|-----|------|----------|
| PrintGuard | 54320 | 54321 | 3001 |
| Helpdesk | 54420 | 54421 | 3002 |
| Inventário | 54520 | 54521 | 3003 |

### Configurar Portas no `.env.local`

```env
POSTGRES_PORT=54320
KONG_HTTP_PORT=54321
VITE_PORT=3001
```

### Nginx (Proxy Reverso)

```bash
sudo apt install -y nginx
sudo nano /etc/nginx/sites-available/sistemas
```

```nginx
server {
    listen 80;
    server_name _;

    # PrintGuard
    location /printers/ {
        proxy_pass http://127.0.0.1:3001/printers/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
    }

    # Outro sistema
    location /helpdesk/ {
        proxy_pass http://127.0.0.1:3002/helpdesk/;
        proxy_set_header Host $host;
    }
}
```

```bash
sudo ln -sf /etc/nginx/sites-available/sistemas /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t && sudo systemctl restart nginx
```

Para usar subpath, configure no `.env.local`:
```env
VITE_BASE_PATH=/printers
```

---

## Modo Desenvolvimento

### Rodar com Hot Reload

```bash
npm run dev -- --host 0.0.0.0
```

### Compilar para Produção

```bash
npm run build
```

Os arquivos são gerados na pasta `dist/`.

### Manter Rodando com PM2

```bash
npm install -g pm2
pm2 start "npm run dev -- --host 0.0.0.0" --name printguard
pm2 startup && pm2 save
```

```bash
pm2 status              # Ver status
pm2 logs printguard      # Ver logs
pm2 restart printguard   # Reiniciar
pm2 stop printguard      # Parar
```

---

## Firewall

```bash
sudo ufw allow 80
sudo ufw allow 443
sudo ufw allow 3001   # Frontend (se acesso direto)
```

---

## Solução de Problemas

| Problema | Solução |
|----------|---------|
| Porta em uso | Alterar portas no `.env.local` |
| Docker não inicia | `sudo systemctl start docker` |
| DB não conecta | `docker compose logs db` |
| `npm install` falha | `npm install --legacy-peer-deps` |
| Página branca | Verificar `VITE_SUPABASE_URL` aponta para API local |
| Auth não funciona | Verificar se `ANON_KEY` no `.env` bate com Kong |
| Migrations falham | Verificar URL do banco: `localhost:54320` |
