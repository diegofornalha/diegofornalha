# Roadmap - Calendário e Scheduling

Análise de funcionalidades relacionadas a calendário, horários de trabalho e agendamento no Gantt.

---

## Infraestrutura Disponível no Odoo

O Odoo Community já possui modelos de calendário prontos:

| Tabela | Descrição |
|--------|-----------|
| `resource_calendar` | Calendários de trabalho (ex: 40h/semana) |
| `resource_calendar_attendance` | Horários por dia da semana |
| `resource_calendar_leaves` | Feriados e ausências |
| `resource_resource` | Recursos (funcionários/equipamentos) |

**Calendário atual configurado:**
- Nome: Standard 40 hours/week
- Horário: 8h-12h, 13h-17h (Seg-Sex)
- Timezone: America/Sao_Paulo

---

## Status Atual do Gantt

| Feature | Status | Detalhes |
|---------|--------|----------|
| Escalas de tempo | ✅ | Quarter Day, Half Day, Day, Week, Month, Year |
| Dias úteis destacados | ❌ | Não diferencia fim de semana |
| Feriados | ❌ | Não exibidos |
| Horário de trabalho | ❌ | Não considera calendário |
| Constraint de datas | ❌ | Permite mover para qualquer data |

---

## Funcionalidades Propostas

### 1. Destacar Fins de Semana

**O que é:** Visual diferenciado para sábados e domingos no grid.

| Aspecto | Avaliação |
|---------|-----------|
| **Esforço** | Baixo |
| **Benefício** | Clareza visual do período de trabalho |
| **Viabilidade** | Alta - CSS no grid |

**Implementação possível:**
- Identificar colunas de Sáb/Dom
- Aplicar cor de fundo cinza claro
- Opcional: esconder fins de semana (fold)

---

### 2. Exibir Feriados

**O que é:** Marcar feriados no calendário do Gantt.

| Aspecto | Avaliação |
|---------|-----------|
| **Esforço** | Médio |
| **Benefício** | Planejamento realista |
| **Viabilidade** | Alta - Dados em resource_calendar_leaves |

**Implementação possível:**
- Buscar feriados do resource_calendar_leaves
- Mostrar coluna com cor diferenciada
- Tooltip com nome do feriado

---

### 3. Constraint: Não Permitir Fim de Semana

**O que é:** Ao mover/redimensionar tarefa, ajustar automaticamente para dia útil.

| Aspecto | Avaliação |
|---------|-----------|
| **Esforço** | Médio |
| **Benefício** | Datas sempre em dias úteis |
| **Viabilidade** | Média - Precisa interceptar eventos do Frappe Gantt |

**Implementação possível:**
- Hook no on_date_change
- Se cair em fim de semana, mover para segunda
- Feedback visual durante drag

---

### 4. Cálculo de Duração em Dias Úteis

**O que é:** Mostrar duração considerando apenas dias de trabalho.

| Aspecto | Avaliação |
|---------|-----------|
| **Esforço** | Médio |
| **Benefício** | Estimativas mais precisas |
| **Viabilidade** | Alta |

**Exemplo:**
- Tarefa: Segunda 01/12 a Segunda 08/12
- Duração calendário: 7 dias
- Duração útil: 5 dias (exclui Sáb/Dom)

---

### 5. Fold Off-Hours (Ocultar Não-Trabalho)

**O que é:** Opção para esconder fins de semana e feriados do grid.

| Aspecto | Avaliação |
|---------|-----------|
| **Esforço** | Alto |
| **Benefício** | Mais espaço útil, foco no trabalho |
| **Viabilidade** | Baixa - Frappe Gantt não suporta nativamente |

**Contra:** Frappe Gantt renderiza timeline contínua. Esconder dias exigiria modificação significativa ou biblioteca alternativa.

---

### 6. Respeitar Calendário do Recurso

**O que é:** Cada usuário pode ter calendário diferente.

| Aspecto | Avaliação |
|---------|-----------|
| **Esforço** | Alto |
| **Benefício** | Suporte a equipes com horários diferentes |
| **Viabilidade** | Média |

**Exemplo:**
- João: 40h/semana (Seg-Sex)
- Maria: 30h/semana (Seg-Qui)
- Tarefa de Maria não pode cair na Sexta

---

### 7. Auto-Schedule por Capacidade

**O que é:** Distribuir tarefas automaticamente baseado na disponibilidade.

| Aspecto | Avaliação |
|---------|-----------|
| **Esforço** | Muito Alto |
| **Benefício** | Planejamento otimizado |
| **Viabilidade** | Baixa - Algoritmo complexo |

**Contra:** Requer horas estimadas por tarefa, capacidade por recurso, e algoritmo de otimização. Complexidade alta para benefício incerto.

---

## Matriz de Priorização

| Feature | Esforço | Benefício | Prioridade |
|---------|---------|-----------|------------|
| Destacar fins de semana | Baixo | Alto | **Alta** |
| Exibir feriados | Médio | Médio | **Média** |
| Constraint dias úteis | Médio | Alto | **Média** |
| Duração em dias úteis | Médio | Médio | **Média** |
| Fold off-hours | Alto | Médio | **Baixa** |
| Calendário por recurso | Alto | Médio | **Baixa** |
| Auto-schedule | Muito Alto | Alto | **Descartada** |

---

## Recomendação de Implementação

### Fase 1 - Visual
1. Destacar fins de semana (CSS)

### Fase 2 - Calendário
2. Exibir feriados
3. Constraint para dias úteis
4. Mostrar duração em dias úteis no popup

### Fase 3 - Avançado (Opcional)
5. Fold off-hours (se trocar biblioteca)
6. Calendário por recurso

### Descartado
- Auto-schedule por capacidade (complexidade vs benefício)

---

*Última atualização: Dezembro 2025*
