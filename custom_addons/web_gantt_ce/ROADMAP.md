# Roadmap - web_gantt_ce

Módulo Gantt View Community Edition para Odoo 19.

## Status Atual

### Funcionalidades Implementadas

| Feature | Status | Descrição |
|---------|--------|-----------|
| Visualização Gantt | ✅ | Barras de tarefas com timeline |
| Escalas de tempo | ✅ | Day, Week, Month, Quarter, Year |
| Drag & Drop horizontal | ✅ | Mover tarefas no tempo |
| Redimensionar barras | ✅ | Alterar duração arrastando bordas |
| Cores por prioridade | ✅ | Verde (urgente), Vermelho (muito alta), Laranja (alta), Roxo (normal) |
| Dependências (setas) | ✅ | Visualização de depend_on_ids |
| Criar dependências | ✅ | Arrastar do connector para outra tarefa |
| Deletar dependências | ✅ | Clicar na seta + Delete |
| Popup de informações | ✅ | Click na tarefa mostra detalhes |
| Automatic Scheduling | ✅ | Mover cadeia de tarefas dependentes |
| Connector estável | ✅ | Hit area invisível evita flickering |

---

## Roadmap de Features

### Alta Prioridade

#### 1. Info ao Hover (em vez de Click)
- **Esforço:** Baixo
- **Benefício:** Melhora UX, informação mais rápida
- **Detalhes:** Mudar `popup_trigger: "click"` para `"hover"` no Frappe Gantt
- **Campos a mostrar:** Nome, Responsável, Datas, Progresso, Prioridade

#### 2. Avatares de Usuários
- **Esforço:** Médio
- **Benefício:** Visual imediato de quem está atribuído
- **Detalhes:** Mostrar foto/iniciais do responsável na barra ou ao lado
- **Dependência:** Carregar dados de res.users junto com as tarefas

#### 3. Fullscreen Mode
- **Esforço:** Baixo
- **Benefício:** Útil para apresentações e foco
- **Detalhes:** Botão para expandir Gantt em tela cheia
- **Referência:** API Fullscreen do browser

---

### Média Prioridade

#### 4. Múltiplos Projetos ("All Projects")
- **Esforço:** Médio
- **Benefício:** Visão consolidada de todos os projetos
- **Detalhes:** Filtro para selecionar projeto ou ver todos
- **Considerações:** Cores diferentes por projeto, agrupamento

#### 5. Ícone Representativo
- **Esforço:** Baixo
- **Benefício:** Identidade visual do módulo
- **Detalhes:** Criar ícone SVG estilo Gantt (barras horizontais)
- **Localização:** `static/description/icon.png`

#### 6. Melhorar Popup
- **Esforço:** Baixo
- **Benefício:** Mais informações úteis
- **Campos adicionais:**
  - Responsável(eis)
  - Estágio atual
  - Tags
  - Horas registradas
  - Link direto para a tarefa

---

### Baixa Prioridade

#### 7. Dark Mode
- **Esforço:** Alto
- **Benefício:** Conforto visual, preferência do usuário
- **Detalhes:**
  - Detectar preferência do sistema ou toggle manual
  - Variáveis CSS para cores
  - Tema escuro para grid, barras, popups
- **Considerações:** Manter consistência com tema do Odoo

#### 8. Resource Utilization / Histogram
- **Esforço:** Alto
- **Benefício:** Visualizar carga de trabalho por recurso
- **Detalhes:**
  - Gráfico de barras mostrando alocação por dia/semana
  - Identificar sobrecarga de trabalho
  - Útil para planejamento de capacidade
- **Dependência:** Dados de horas estimadas vs disponíveis

#### 9. Seleção de Células Individuais
- **Esforço:** Alto
- **Benefício:** Criar tarefas clicando em célula vazia
- **Detalhes:**
  - Grid clicável
  - Criar tarefa com data pré-preenchida
  - Seleção múltipla para operações em lote

---

## Funcionalidades Descartadas

| Feature | Motivo |
|---------|--------|
| Integração com Enterprise modules | Projeto usa apenas Odoo Community |
| Campo progress editável no Gantt | Frappe Gantt não suporta bem |

---

## Notas Técnicas

### Stack Atual
- **Frontend:** OWL (Odoo Web Library) + Frappe Gantt
- **Backend:** Python/Odoo 19
- **Dependências:** Frappe Gantt 0.6.1 (MIT License)

### Arquivos Principais
```
web_gantt_ce/
├── static/src/gantt_view/
│   ├── gantt_renderer.js    # Lógica principal
│   ├── gantt_renderer.xml   # Template OWL
│   └── gantt.scss           # Estilos
├── static/lib/frappe-gantt/ # Biblioteca Gantt
└── views/
    └── project_task_views.xml
```

### Compatibilidade
- Odoo 19 Community Edition
- Modelo: project.task (extensível para outros modelos)
- Campos necessários: date_assign, date_deadline, depend_on_ids

---

## Contribuições

Para contribuir com novas features:
1. Verificar se não depende de módulos Enterprise
2. Manter compatibilidade com Odoo Community
3. Seguir padrões OWL do Odoo 19
4. Testar com dados reais do projeto

---

*Última atualização: Dezembro 2025*
