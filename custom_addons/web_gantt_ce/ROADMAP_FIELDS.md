# Roadmap - Campos Adicionais

Análise de campos que podem ser exibidos ou utilizados no Gantt.

---

## Campos no Odoo (project.task)

| Campo | Existe no Odoo | Exibido no Gantt | Tipo |
|-------|----------------|------------------|------|
| Tags | ✅ `project_tags_project_task_rel` | ❌ Não | Many2many |
| Deadline | ✅ `date_deadline` | ✅ Sim (como end date) | Datetime |
| Predecessors | ✅ `task_dependencies_rel` | ✅ Sim (setas) | Many2many |
| Successors | ✅ (inverso de predecessors) | ✅ Sim (setas) | Many2many |
| Milestone | ✅ `milestone_id` + `project_milestone` | ❌ Não | Many2one |
| WBS | ❌ Não existe | ❌ Não | - |
| Note/Description | ✅ `description` | ❌ Não | Text |
| Kanban State | ✅ `state` | ❌ Não | Selection |
| Priority | ✅ `priority` | ✅ Sim (cores) | Selection |

---

## Análise por Campo

### 1. Tags

**Status:** Existe no Odoo, não exibido no Gantt

**O que é:** Etiquetas coloridas para categorizar tarefas (ex: "Bug", "Feature", "Urgent").

| Aspecto | Avaliação |
|---------|-----------|
| **Esforço** | Baixo |
| **Benefício** | Categorização visual rápida |
| **Viabilidade** | Alta |

**Implementação possível:**
- Carregar tags junto com tarefas (join em project_tags)
- Exibir como pequenos círculos coloridos na barra
- Ou mostrar no popup/hover

---

### 2. Deadline (End Date)

**Status:** ✅ Já implementado

O Gantt já usa `date_deadline` como data final da barra.

**Campos relacionados no Odoo:**
- `date_assign` → Data início
- `date_deadline` → Data fim (deadline)
- `date_end` → Data de conclusão real

**Melhoria possível:** Diferenciar visualmente quando deadline != date_end (tarefa atrasada).

---

### 3. Predecessors / Successors

**Status:** ✅ Já implementado

O Gantt já exibe dependências como setas via `task_dependencies_rel`.

| Relação | Tabela | Significado |
|---------|--------|-------------|
| Predecessor | `depends_on_id` | Tarefa que precisa terminar antes |
| Successor | `task_id` | Tarefa que depende desta |

**Funcionalidades atuais:**
- ✅ Visualização de setas
- ✅ Criar dependências (arrastar connector)
- ✅ Deletar dependências (click + Delete)

---

### 4. Milestone

**Status:** Existe no Odoo, não exibido no Gantt

**O que é:** Marcos importantes do projeto (entregas, releases, deadlines críticos).

**Estrutura no Odoo:**
```
project_milestone:
  - id
  - name
  - deadline
  - is_reached
  - project_id
```

| Aspecto | Avaliação |
|---------|-----------|
| **Esforço** | Médio |
| **Benefício** | Visualizar marcos importantes no timeline |
| **Viabilidade** | Alta |

**Implementação possível:**
- Carregar milestones do projeto
- Exibir como losango (◆) ou linha vertical no Gantt
- Cor diferente para milestones atingidos vs pendentes
- Tooltip com nome e data

---

### 5. WBS (Work Breakdown Structure)

**Status:** ❌ Não existe no Odoo

**O que é:** Código hierárquico de identificação (ex: 1.2.3 para subtarefa).

| Aspecto | Avaliação |
|---------|-----------|
| **Esforço** | Médio |
| **Benefício** | Organização hierárquica formal |
| **Viabilidade** | Alta |

**Implementação possível:**
- Criar campo computed no project.task
- Calcular baseado em parent_id e sequence
- Formato: "1", "1.1", "1.1.1", etc.
- Exibir antes do nome da tarefa no Gantt

**Contra:** Adiciona complexidade. Útil principalmente para projetos muito estruturados (construção, engenharia). Para projetos ágeis pode ser overhead desnecessário.

---

### 6. Note / Description

**Status:** Existe no Odoo, não exibido no Gantt

**O que é:** Campo de texto livre com detalhes da tarefa.

| Aspecto | Avaliação |
|---------|-----------|
| **Esforço** | Baixo |
| **Benefício** | Contexto sem abrir tarefa |
| **Viabilidade** | Alta |

**Implementação possível:**
- Mostrar no popup (já existe estrutura)
- Truncar se muito longo (ex: 200 caracteres + "...")
- Suportar markdown básico ou HTML sanitizado

**Contra:** Descrições longas podem poluir o popup. Melhor mostrar apenas preview.

---

### 7. Kanban State

**Status:** Existe no Odoo (`state`), não exibido no Gantt

**O que é:** Estado rápido da tarefa dentro do estágio.

**Valores típicos:**
- `01_in_progress` - Em andamento
- `02_changes_requested` - Mudanças solicitadas
- `03_approved` - Aprovado
- `04_done` - Concluído
- `1_done` - Feito
- `1_canceled` - Cancelado

| Aspecto | Avaliação |
|---------|-----------|
| **Esforço** | Baixo |
| **Benefício** | Status visual rápido |
| **Viabilidade** | Alta |

**Implementação possível:**
- Ícone ou indicador na barra (✓, !, ✗)
- Cor de borda baseada no state
- Filtro por kanban state

---

## Matriz de Priorização

| Campo | Esforço | Benefício | Prioridade |
|-------|---------|-----------|------------|
| Tags | Baixo | Alto | **Alta** |
| Milestone | Médio | Alto | **Alta** |
| Description (no popup) | Baixo | Médio | **Média** |
| Kanban State | Baixo | Médio | **Média** |
| WBS | Médio | Baixo | **Baixa** |

---

## Campos Já Implementados

| Campo | Como é usado |
|-------|--------------|
| `date_assign` | Data início da barra |
| `date_deadline` | Data fim da barra |
| `priority` | Cor da barra (roxo, laranja, vermelho, verde) |
| `depend_on_ids` | Setas de dependência |
| `name` | Texto na barra e popup |
| `progress` | Percentual no popup |

---

## Recomendação de Implementação

### Fase 1 - Quick Wins
1. Tags (círculos coloridos na barra)
2. Kanban State (indicador visual)

### Fase 2 - Milestones
3. Exibir milestones como losangos no timeline
4. Description no popup melhorado

### Fase 3 - Opcional
5. WBS (apenas se houver demanda)

---

## Exemplo de Popup Melhorado

```
┌─────────────────────────────────────┐
│ Configurar DNS                      │
├─────────────────────────────────────┤
│ 📅 03/12 - 05/12 (3 dias)          │
│ 👤 Felipe                           │
│ 🏷️ [Infra] [Urgente]               │
│ 📊 Progresso: 50%                   │
│ 🎯 Milestone: Release v1.0          │
│ ─────────────────────────────────── │
│ Configurar registros A, MX e TXT   │
│ no Cloudflare para o domínio...    │
└─────────────────────────────────────┘
```

---

*Última atualização: Dezembro 2025*
