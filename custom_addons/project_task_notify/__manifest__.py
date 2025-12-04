# -*- coding: utf-8 -*-
{
    'name': 'Project Task Notifications',
    'version': '19.0.1.0.0',
    'category': 'Project Management',
    'summary': 'Notifica canal Discuss quando tarefas são alteradas',
    'description': """
Project Task Notifications
==========================

Este módulo envia notificações automáticas para um canal do Discuss
quando tarefas de projeto são criadas ou alteradas.

Funcionalidades:
- Notificação ao criar nova tarefa
- Notificação ao alterar campos importantes (estágio, responsável, prazo, etc)
- Link direto para a tarefa na notificação
- Formato detalhado com projeto, responsável e estágio

Configuração:
- O canal de notificação é configurável no projeto
    """,
    'author': 'Diego Fornalha',
    'website': 'https://github.com/diegofornalha',
    'license': 'LGPL-3',
    'depends': ['project', 'mail'],
    'data': [
        'views/project_views.xml',
    ],
    'installable': True,
    'auto_install': False,
    'application': False,
}
