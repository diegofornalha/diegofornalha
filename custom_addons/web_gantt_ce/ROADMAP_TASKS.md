# Roadmap - Funcionalidades de Tarefas

Análise de funcionalidades relacionadas a gestão de tarefas no Gantt.

---

## Status Atual

| Feature | Status | Detalhes |
|---------|--------|----------|
| Criar tarefas | ❌ | Apenas via Odoo, não pelo Gantt |
| Editar tarefas | ✅ Parcial | Datas e progresso via drag & drop |
| Deletar dependências | ✅ | Click na seta + Delete |
| Deletar tarefas | ❌ | Não disponível no Gantt |
| Subtasks | ❌ | Não exibidas (campo parent_id existe no Odoo) |
| Abrir tarefa no Odoo | ✅ | Click na barra abre o formulário |

---

## Funcionalidades Propostas

### 1. Split Tasks (Tarefas Segmentadas)

**O que é:** Dividir uma tarefa em múltiplos segmentos não contínuos no tempo.

**Exemplo:** Tarefa "Desenvolvimento" com trabalho nos dias 1-3, pausa, e continua dias 7-10.

| Aspecto | Avaliação |
|---------|-----------|
| **Esforço** | Alto |
| **Benefício** | Representação mais realista de trabalho intermitente |
| **Viabilidade** | Baixa - Frappe Gantt não suporta nativamente |

**Contra:** Frappe Gantt não tem suporte nativo. Exigiria fork da biblioteca ou substituição completa.

---

### 2. Baselines (Linha de Base)

**O que é:** Salvar uma "foto" do cronograma original para comparar com o atual.

**Uso:** Ver se o projeto está atrasado comparando datas planejadas vs reais.

| Aspecto | Avaliação |
|---------|-----------|
| **Esforço** | Médio |
| **Benefício** | Controle de desvios do cronograma original |
| **Viabilidade** | Média - Precisa criar modelo para armazenar baselines |

**Implementação possível:**
- Criar modelo `project.task.baseline` com campos date_start_planned, date_end_planned
- Mostrar linha fantasma no Gantt com cronograma original
- Botão "Salvar Baseline" para capturar estado atual

---

### 3. Roll Up (Agregação)

**O que é:** Tarefa pai mostra automaticamente o período que engloba todas as subtarefas.

**Exemplo:**
```
Projeto Website (01/12 - 15/12) ← calculado automaticamente
  ├── Design (01/12 - 05/12)
  ├── Frontend (06/12 - 10/12)
  └── Backend (08/12 - 15/12)
```

| Aspecto | Avaliação |
|---------|-----------|
| **Esforço** | Médio |
| **Benefício** | Visão hierárquica clara, datas consistentes |
| **Viabilidade** | Alta - Odoo já tem parent_id nas tarefas |

**Implementação possível:**
- Usar campo `parent_id` existente no project.task
- Calcular date_start = min(subtasks.date_start)
- Calcular date_end = max(subtasks.date_end)
- Mostrar barra de resumo diferenciada (cor/estilo)

---

### 4. Critical Path (Caminho Crítico)

**O que é:** Destacar a sequência de tarefas que determina a duração mínima do projeto.

**Por que importa:** Atrasos no caminho crítico atrasam o projeto inteiro.

| Aspecto | Avaliação |
|---------|-----------|
| **Esforço** | Alto |
| **Benefício** | Identificar onde focar esforços |
| **Viabilidade** | Média - Algoritmo complexo mas conhecido (CPM) |

**Implementação possível:**
- Algoritmo CPM (Critical Path Method)
- Calcular folga de cada tarefa
- Destacar tarefas com folga = 0 (cor diferente ou borda)

**Contra:** Requer dependências bem definidas. Se tarefas não tiverem todas as dependências cadastradas, o caminho crítico será impreciso.

---

### 5. Indent / Outdent (Hierarquia)

**O que é:** Transformar tarefa em subtarefa (indent) ou promover subtarefa (outdent).

| Aspecto | Avaliação |
|---------|-----------|
| **Esforço** | Baixo |
| **Benefício** | Organização hierárquica rápida |
| **Viabilidade** | Alta - Apenas atualizar parent_id |

**Implementação possível:**
- Botões ou atalhos Tab/Shift+Tab
- Selecionar tarefa → Indent transforma em filho da tarefa acima
- Outdent remove o parent_id

---

### 6. Duplicar Projeto com Subtasks e Dependências

**O que é:** Copiar projeto inteiro mantendo estrutura de tarefas, hierarquia e dependências.

| Aspecto | Avaliação |
|---------|-----------|
| **Esforço** | Médio |
| **Benefício** | Reutilizar templates de projeto |
| **Viabilidade** | Alta - SQL/ORM para copiar registros |

**Implementação possível:**
- Botão "Duplicar Projeto"
- Copiar todas as tarefas com novos IDs
- Mapear dependências antigas para novos IDs
- Opcionalmente ajustar datas (shift por X dias)

---

### 7. Confirmação Antes de Deletar

**O que é:** Pedir confirmação ao usuário antes de remover dependência ou tarefa.

| Aspecto | Avaliação |
|---------|-----------|
| **Esforço** | Baixo |
| **Benefício** | Evitar deleções acidentais |
| **Viabilidade** | Alta - Apenas adicionar dialog de confirmação |

**Status atual:** Delete de dependência não pede confirmação.

**Implementação possível:**
- Modal "Tem certeza que deseja remover esta dependência?"
- Checkbox "Não perguntar novamente" (salvar preferência)

---

### 8. Atalho para Abrir Tarefa em Nova Aba

**O que é:** Ctrl+Click ou botão para abrir tarefa do Odoo em nova aba do browser.

| Aspecto | Avaliação |
|---------|-----------|
| **Esforço** | Baixo |
| **Benefício** | Manter Gantt aberto enquanto edita tarefa |
| **Viabilidade** | Alta |

**Status atual:** Click abre no mesmo contexto (substitui view).

**Implementação possível:**
- Detectar Ctrl+Click ou Cmd+Click
- `window.open()` com URL da tarefa
- Ou adicionar ícone de "abrir em nova aba" no hover/popup

---

### 9. Preservar Links ao Copiar/Colar Tarefas

**O que é:** Ao duplicar tarefas, manter referências internas atualizadas.

| Aspecto | Avaliação |
|---------|-----------|
| **Esforço** | Médio |
| **Benefício** | Duplicação inteligente |
| **Viabilidade** | Alta |

**O que preservar:**
- Dependências entre tarefas copiadas (remapear IDs)
- Hierarquia parent/child
- Atribuições de usuários (opcional)

**Contra:** Se copiar apenas algumas tarefas (não todas de uma cadeia), dependências externas ficam órfãs.

---

## Matriz de Priorização

| Feature | Esforço | Benefício | Prioridade Sugerida |
|---------|---------|-----------|---------------------|
| Confirmação antes de deletar | Baixo | Médio | **Alta** |
| Atalho nova aba | Baixo | Alto | **Alta** |
| Indent/Outdent | Baixo | Médio | **Alta** |
| Roll Up | Médio | Alto | **Média** |
| Duplicar projeto | Médio | Alto | **Média** |
| Preservar links | Médio | Médio | **Média** |
| Baselines | Médio | Médio | **Baixa** |
| Critical Path | Alto | Alto | **Baixa** |
| Split Tasks | Alto | Baixo | **Descartada** |

---

## Recomendação de Implementação

### Fase 1 - Quick Wins
1. Confirmação antes de deletar
2. Atalho para abrir em nova aba
3. Indent/Outdent

### Fase 2 - Hierarquia
4. Roll Up (mostrar subtasks agregadas)
5. Duplicar projeto completo

### Fase 3 - Avançado
6. Baselines
7. Critical Path

### Descartado
- Split Tasks (limitação técnica do Frappe Gantt)

---

*Última atualização: Dezembro 2025*
