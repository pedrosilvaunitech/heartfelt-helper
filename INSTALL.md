# Guia de Instalação Local - PrintGuard Monitor

## Requisitos

- **Linux:** Ubuntu 20.04+ / Debian 11+ / CentOS 8+
- **Node.js:** v18+
- **npm:** v9+
- **Git**

---

## 1. Preparar o Servidor

```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y git curl
```

## 2. Instalar Node.js

```bash
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
source ~/.bashrc
nvm install 18
nvm use 18
```

## 3. Clonar e Instalar

```bash
git clone <URL_DO_REPOSITORIO>
cd <PASTA_DO_PROJETO>
npm install
```

## 4. Configurar Variáveis de Ambiente

Crie o arquivo `.env` na raiz do projeto:

```bash
nano .env
```

```env
# Conexão com backend (Lovable Cloud)
VITE_SUPABASE_URL=https://hdjpgmcopstbykdaoohm.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhkanBnbWNvcHN0YnlrZGFvb2htIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI3MjEwNTEsImV4cCI6MjA4ODI5NzA1MX0.dIP3A6pwGDRVwKKuyXxi4kceg4H09E_DPSvsXS_R78g
VITE_SUPABASE_PROJECT_ID=hdjpgmcopstbykdaoohm

# ===== CONFIGURAÇÃO LOCAL =====
# Porta do servidor de desenvolvimento (mude se 8080 estiver em uso)
VITE_PORT=3001

# Base path para proxy reverso (deixe "/" se não usar proxy)
# Para acessar via http://servidor/printers use:
VITE_BASE_PATH=/printers
```

Salve com `Ctrl+O`, `Enter`, saia com `Ctrl+X`.

---

## 5. Executar em Desenvolvimento

```bash
# Iniciar na porta configurada (padrão: 3001)
npm run dev -- --host 0.0.0.0
```

Acesse: `http://<IP_DA_VM>:3001/printers`

> **Trocar a porta:** Basta alterar `VITE_PORT` no `.env` e reiniciar.

---

## 6. Compilar para Produção

```bash
npm run build
```

Os arquivos otimizados serão gerados na pasta `dist/`.

---

## 7. Servir com Nginx (Proxy Reverso em /printers)

### Instalar Nginx

```bash
sudo apt install -y nginx
```

### Copiar arquivos de build

```bash
sudo mkdir -p /var/www/printers
sudo cp -r dist/* /var/www/printers/
```

### Configurar Nginx

```bash
sudo nano /etc/nginx/sites-available/printers
```

Cole:

```nginx
server {
    listen 80;
    server_name _;

    # Seus outros sistemas podem ficar aqui em outros location blocks
    # location / { proxy_pass http://127.0.0.1:8080; }

    # PrintGuard em /printers
    location /printers/ {
        alias /var/www/printers/;
        index index.html;
        try_files $uri $uri/ /printers/index.html;
    }

    # Cache de assets
    location ~* ^/printers/assets/.*\.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf)$ {
        root /var/www/;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

### Ativar e reiniciar

```bash
sudo ln -sf /etc/nginx/sites-available/printers /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl restart nginx
```

Acesse: `http://<IP_DA_VM>/printers`

---

## 8. Manter Rodando com PM2 (Modo Dev Persistente)

Se preferir rodar em modo de desenvolvimento ao invés de build estático:

```bash
npm install -g pm2

# Iniciar na porta desejada
pm2 start "npm run dev -- --host 0.0.0.0" --name printguard

# Iniciar no boot
pm2 startup
pm2 save
```

### Comandos PM2

```bash
pm2 status              # Ver status
pm2 logs printguard      # Ver logs
pm2 restart printguard   # Reiniciar
pm2 stop printguard      # Parar
```

Com PM2, configure o Nginx como proxy reverso:

```nginx
location /printers/ {
    proxy_pass http://127.0.0.1:3001/printers/;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_set_header Host $host;
}
```

---

## 9. Liberar Firewall

```bash
sudo ufw allow 80
sudo ufw allow 443
```

---

## Resumo Rápido

| Ação | Comando |
|------|---------|
| Instalar dependências | `npm install` |
| Rodar em dev | `npm run dev -- --host 0.0.0.0` |
| Compilar produção | `npm run build` |
| Trocar porta | Editar `VITE_PORT` no `.env` |
| Trocar path | Editar `VITE_BASE_PATH` no `.env` e recompilar |

---

## Solução de Problemas

| Problema | Solução |
|----------|---------|
| Porta em uso | Mudar `VITE_PORT` no `.env` |
| `npm install` falha | `npm install --legacy-peer-deps` |
| Não acessa de outra máquina | Use `--host 0.0.0.0` e verifique firewall |
| Página branca no /printers | Verifique se `VITE_BASE_PATH=/printers` e recompile |
| 404 ao navegar no Nginx | Verifique `try_files` aponta para `/printers/index.html` |
