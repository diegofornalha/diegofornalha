# Odoo 19 - Projeto Customizado

## Setup

### 1. Clonar o repositório
```bash
git clone https://github.com/diegofornalha/diegofornalha.git
cd diegofornalha
```

### 2. Clonar o Odoo source (obrigatório)
```bash
git clone --depth 1 --branch 19.0 https://github.com/odoo/odoo.git odoo_source
```

### 3. Criar ambiente virtual e instalar dependências
```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r odoo_source/requirements.txt
```

### 4. Configurar PostgreSQL
Certifique-se de ter o PostgreSQL rodando com um usuário `odoo`:
```bash
createuser -s odoo
```

### 5. Criar diretório de logs
```bash
mkdir -p logs
```

### 6. Iniciar o Odoo
```bash
./run.sh
```

Acesse: http://127.0.0.1:8075

## Módulos Customizados

- `mail_message_permanent_delete` - Exclusão permanente de mensagens no Discuss
- `project_task_notify` - Notificações de tarefas via Discuss
- `web_cors` - Suporte a CORS
- `web_gantt_ce` - Visualização Gantt (Community Edition)

## Estrutura

```
.
├── custom_addons/       # Módulos customizados
├── community_addons/    # Módulos da comunidade OCA
├── odoo_source/         # Código fonte do Odoo (não versionado)
├── filestore/           # Arquivos do Odoo
├── logs/                # Logs do servidor
├── odoo.conf            # Configuração do Odoo
└── run.sh               # Script de inicialização
```
