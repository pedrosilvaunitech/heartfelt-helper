# Guia de Instalação - Sistema de Monitoramento de Impressoras

## Requisitos do Sistema

- **Sistema Operacional:** Ubuntu 20.04+ / Debian 11+ / CentOS 8+ ou qualquer distro Linux moderna
- **Node.js:** v18 ou superior
- **npm:** v9 ou superior
- **Git:** instalado

---

## Passo 1: Atualizar o sistema

```bash
sudo apt update && sudo apt upgrade -y
```

## Passo 2: Instalar o Node.js (via NVM - recomendado)

```bash
# Instalar NVM
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash

# Recarregar o terminal
source ~/.bashrc

# Instalar Node.js 18 LTS
nvm install 18
nvm use 18

# Verificar instalação
node -v
npm -v
```

### Alternativa: Instalar Node.js via apt (Ubuntu/Debian)

```bash
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs
```

## Passo 3: Instalar o Git

```bash
sudo apt install -y git
```

## Passo 4: Clonar o repositório

```bash
git clone <URL_DO_SEU_REPOSITORIO>
cd <NOME_DA_PASTA_DO_PROJETO>
```

> **Dica:** Para obter a URL do repositório, vá em Settings → GitHub no Lovable e conecte ao GitHub primeiro.

## Passo 5: Instalar as dependências

```bash
npm install
```

## Passo 6: Configurar variáveis de ambiente

Crie um arquivo `.env` na raiz do projeto:

```bash
nano .env
```

Adicione o seguinte conteúdo:

```env
VITE_SUPABASE_URL=https://hdjpgmcopstbykdaoohm.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhkanBnbWNvcHN0YnlrZGFvb2htIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI3MjEwNTEsImV4cCI6MjA4ODI5NzA1MX0.dIP3A6pwGDRVwKKuyXxi4kceg4H09E_DPSvsXS_R78g
VITE_SUPABASE_PROJECT_ID=hdjpgmcopstbykdaoohm
```

Salve com `Ctrl+O`, `Enter`, e saia com `Ctrl+X`.

## Passo 7: Executar em modo de desenvolvimento

```bash
npm run dev
```

O servidor vai iniciar em `http://localhost:5173`. Acesse pelo navegador.

> **Nota:** Para acessar de outra máquina na rede, use:
> ```bash
> npm run dev -- --host 0.0.0.0
> ```
> E acesse via `http://<IP_DA_VM>:5173`

## Passo 8: Build para produção (opcional)

```bash
# Gerar os arquivos otimizados
npm run build

# Os arquivos ficarão na pasta 'dist/'
```

## Passo 9: Servir em produção com Nginx (opcional)

### Instalar Nginx

```bash
sudo apt install -y nginx
```

### Configurar o Nginx

```bash
sudo nano /etc/nginx/sites-available/impressoras
```

Cole o seguinte:

```nginx
server {
    listen 80;
    server_name _;

    root /caminho/para/seu/projeto/dist;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    # Cache de assets estáticos
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

### Ativar o site e reiniciar Nginx

```bash
sudo ln -s /etc/nginx/sites-available/impressoras /etc/nginx/sites-enabled/
sudo rm /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl restart nginx
```

### Liberar porta no firewall (se necessário)

```bash
sudo ufw allow 80
sudo ufw allow 443
```

## Passo 10: Executar como serviço com PM2 (alternativa ao Nginx)

Se preferir manter o servidor de desenvolvimento rodando:

```bash
# Instalar PM2
npm install -g pm2

# Iniciar o app
pm2 start "npm run dev -- --host 0.0.0.0" --name impressoras

# Salvar para iniciar automaticamente no boot
pm2 startup
pm2 save
```

### Comandos úteis do PM2

```bash
pm2 status          # Ver status
pm2 logs impressoras # Ver logs
pm2 restart impressoras # Reiniciar
pm2 stop impressoras    # Parar
```

---

## Solução de Problemas

| Problema | Solução |
|----------|---------|
| `npm install` falha | Tente `npm install --legacy-peer-deps` |
| Porta 5173 em uso | Use `npm run dev -- --port 3000` |
| Não acessa de outra máquina | Use `--host 0.0.0.0` e verifique o firewall |
| Erro de permissão | Use `sudo` ou corrija permissões da pasta |
| Node.js muito antigo | Atualize com `nvm install 18` |

---

## Estrutura do Projeto

```
├── src/                  # Código fonte
│   ├── components/       # Componentes React
│   ├── pages/            # Páginas da aplicação
│   ├── context/          # Contextos React (estado global)
│   ├── data/             # Dados mock
│   ├── types/            # Tipos TypeScript
│   └── hooks/            # Hooks customizados
├── supabase/
│   └── functions/        # Edge Functions (backend)
├── public/               # Arquivos estáticos
├── package.json          # Dependências
└── .env                  # Variáveis de ambiente
```
