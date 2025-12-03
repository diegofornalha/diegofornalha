# Roadmap - Configuração

Análise de funcionalidades de configuração e personalização do Gantt.

---

## Status Atual

| Feature | Status | Detalhes |
|---------|--------|----------|
| Escala de tempo | ✅ | Seletor Day/Week/Month/Year |
| Salvamento de preferências | ❌ | Não persiste entre sessões |
| Toolbar | ✅ Básica | Apenas seletor de escala |
| Parâmetros configuráveis | ❌ | Hardcoded no código |

---

## Funcionalidades Propostas

### 1. Salvamento de Estado por Usuário

**O que é:** Lembrar preferências do usuário (escala, colunas, filtros).

| Aspecto | Avaliação |
|---------|-----------|
| **Esforço** | Médio |
| **Benefício** | UX consistente entre sessões |
| **Viabilidade** | Alta - Usar ir.config.parameter ou localStorage |

**O que salvar:**
- Escala de tempo preferida (Day/Week/Month)
- Colunas visíveis/ocultas
- Largura das colunas
- Filtros aplicados
- Zoom level

**Implementação possível:**
- Opção 1: `localStorage` no browser (simples, por browser)
- Opção 2: `ir.config.parameter` no Odoo (sincronizado, por usuário)
- Opção 3: Campo JSON no `res.users` (preferências do usuário)

---

### 2. Configuração do Gantt Personalizável

**O que é:** Permitir ajustes via interface sem editar código.

| Aspecto | Avaliação |
|---------|-----------|
| **Esforço** | Alto |
| **Benefício** | Flexibilidade para diferentes casos de uso |
| **Viabilidade** | Média |

**Configurações possíveis:**
- Campos a exibir nas barras
- Cores por campo (não apenas prioridade)
- Formato de datas
- Comportamento do popup (click vs hover)
- Mostrar/ocultar fins de semana

---

### 3. Toolbar Configurável

**O que é:** Adicionar botões e controles à barra de ferramentas.

| Aspecto | Avaliação |
|---------|-----------|
| **Esforço** | Médio |
| **Benefício** | Acesso rápido a funcionalidades |
| **Viabilidade** | Alta |

**Botões sugeridos:**
- Expandir/Colapsar todas as tarefas
- Fullscreen
- Exportar (PNG, PDF)
- Filtros rápidos (Minhas tarefas, Atrasadas, etc.)
- Zoom In/Out
- Ir para Hoje
- Refresh

---

### 4. Unidade de Duração Configurável

**O que é:** Escolher se duração é exibida em horas ou dias.

| Aspecto | Avaliação |
|---------|-----------|
| **Esforço** | Baixo |
| **Benefício** | Flexibilidade para diferentes tipos de projeto |
| **Viabilidade** | Alta |

**Opções:**
- Horas (para projetos curtos, sprints)
- Dias (para projetos médios)
- Semanas (para projetos longos)

**Implementação possível:**
- Dropdown na toolbar
- Conversão automática baseada no calendário de trabalho

---

### 5. Parâmetros Gantt em Aba Separada

**O que é:** Painel de configurações acessível pelo Gantt.

| Aspecto | Avaliação |
|---------|-----------|
| **Esforço** | Médio |
| **Benefício** | Configuração centralizada |
| **Viabilidade** | Alta |

**Estrutura sugerida:**
```
⚙️ Configurações do Gantt
├── Visualização
│   ├── Escala padrão: [Day ▼]
│   ├── Mostrar fins de semana: [✓]
│   └── Popup ao: [Hover ▼]
├── Cores
│   ├── Campo para cor: [Prioridade ▼]
│   └── Esquema: [Padrão ▼]
└── Comportamento
    ├── Confirmar ao deletar: [✓]
    └── Auto-schedule: [✗]
```

---

### 6. Settings Globais via ir.config.parameter

**O que é:** Configurações do sistema armazenadas no Odoo.

| Aspecto | Avaliação |
|---------|-----------|
| **Esforço** | Baixo |
| **Benefício** | Configuração centralizada para admins |
| **Viabilidade** | Alta - Padrão Odoo |

**Parâmetros sugeridos:**
```
gantt.default_scale = day
gantt.show_weekends = true
gantt.popup_trigger = click
gantt.confirm_delete = true
gantt.color_field = priority
```

**Implementação:**
- Menu: Configurações → Técnico → Parâmetros → System Parameters
- Ou criar menu específico em Configurações → Gantt

---

### 7. Calendários de Recursos

**O que é:** Definir horários de trabalho diferentes por usuário/equipe.

| Aspecto | Avaliação |
|---------|-----------|
| **Esforço** | Alto |
| **Benefício** | Planejamento realista por recurso |
| **Viabilidade** | Alta - Odoo já tem resource_calendar |

**Infraestrutura existente no Odoo:**
- `resource_calendar` - Calendários (40h, 30h, etc.)
- `resource_calendar_attendance` - Horários por dia
- `resource_resource` - Recursos vinculados a calendários

**Implementação possível:**
- Vincular usuário ao calendário
- Gantt considera horário de trabalho ao calcular duração
- Destacar indisponibilidade no grid

---

### 8. Auto/Manual Scheduling

**O que é:** Escolher se tarefas são agendadas automaticamente ou manualmente.

| Aspecto | Avaliação |
|---------|-----------|
| **Esforço** | Alto |
| **Benefício** | Flexibilidade de planejamento |
| **Viabilidade** | Média |

**Modos:**
- **Auto:** Dependências determinam datas automaticamente
- **Manual:** Usuário define datas livremente

**Status atual:** O Gantt já tem "Automatic Scheduling" via Frappe Gantt que move tarefas dependentes.

---

### 9. Constraint Types

**O que é:** Definir regras de agendamento por tarefa.

| Aspecto | Avaliação |
|---------|-----------|
| **Esforço** | Alto |
| **Benefício** | Controle fino de agendamento |
| **Viabilidade** | Média - Precisa campo novo no model |

**Tipos de constraint (padrão MS Project):**
- As Soon As Possible (ASAP) - Padrão
- As Late As Possible (ALAP)
- Must Start On (MSO)
- Must Finish On (MFO)
- Start No Earlier Than (SNET)
- Start No Later Than (SNLT)
- Finish No Earlier Than (FNET)
- Finish No Later Than (FNLT)

**Contra:** Complexidade alta. Útil apenas para projetos muito rigorosos com datas contratuais.

---

## Matriz de Priorização

| Feature | Esforço | Benefício | Prioridade |
|---------|---------|-----------|------------|
| Salvamento de estado | Médio | Alto | **Alta** |
| Settings via ir.config | Baixo | Médio | **Alta** |
| Toolbar configurável | Médio | Alto | **Alta** |
| Unidade de duração | Baixo | Médio | **Média** |
| Painel de configurações | Médio | Médio | **Média** |
| Calendários de recursos | Alto | Médio | **Baixa** |
| Gantt personalizável | Alto | Médio | **Baixa** |
| Auto/Manual scheduling | Alto | Médio | **Baixa** |
| Constraint types | Alto | Baixo | **Descartada** |

---

## Recomendação de Implementação

### Fase 1 - Quick Wins
1. Settings globais via ir.config.parameter
2. Salvamento básico no localStorage

### Fase 2 - Toolbar
3. Botões na toolbar (Fullscreen, Ir para Hoje, Filtros)
4. Unidade de duração configurável

### Fase 3 - Avançado
5. Painel de configurações completo
6. Calendários de recursos integrados

### Descartado
- Constraint types (complexidade alta para benefício específico)

---

## Parâmetros Sugeridos para ir.config.parameter

| Chave | Valor Padrão | Descrição |
|-------|--------------|-----------|
| `gantt.default_scale` | `day` | Escala inicial (day/week/month) |
| `gantt.show_weekends` | `true` | Mostrar fins de semana |
| `gantt.popup_trigger` | `click` | Trigger do popup (click/hover) |
| `gantt.confirm_delete` | `true` | Confirmar antes de deletar |
| `gantt.color_field` | `priority` | Campo para cores das barras |
| `gantt.date_format` | `DD/MM/YYYY` | Formato de datas |
| `gantt.working_hours` | `8` | Horas por dia de trabalho |

---

*Última atualização: Dezembro 2025*
