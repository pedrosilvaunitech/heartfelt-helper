# Kit de Deploy Local para Projetos Lovable

> Copie esta pasta `docker/setup-local-kit/` para qualquer projeto Lovable e execute o script de setup.

## Uso Rápido

```bash
# 1. Copie os arquivos para o projeto
cp -r docker/setup-local-kit/* /caminho/do/projeto/

# 2. Entre no projeto
cd /caminho/do/projeto/

# 3. Execute o setup
bash setup-local.sh

# 4. Pronto! Acesse http://localhost:3001
```

## O que o script faz

1. Cria a estrutura `docker/` com `kong.yml` e `generate-keys.sh`
2. Gera o `docker-compose.yml` configurado
3. Gera as chaves JWT (ANON_KEY, SERVICE_ROLE_KEY)
4. Cria o `.env` com as variáveis corretas
5. Sobe os containers Docker
6. Instala dependências npm
7. Inicia o frontend

## Múltiplos Projetos

Para rodar vários projetos no mesmo servidor, passe parâmetros:

```bash
# Projeto 1 (padrão)
bash setup-local.sh

# Projeto 2
bash setup-local.sh --name helpdesk --db-port 54420 --api-port 54421 --app-port 3002

# Projeto 3
bash setup-local.sh --name inventario --db-port 54520 --api-port 54521 --app-port 3003
```

## Portas Padrão

| Recurso      | Porta  |
|-------------|--------|
| PostgreSQL  | 54320  |
| API Gateway | 54321  |
| Frontend    | 3001   |

## Parar / Remover

```bash
docker compose down       # Parar containers
docker compose down -v    # Parar e apagar dados
pm2 stop <nome>           # Parar frontend
```
