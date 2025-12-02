# -*- coding: utf-8 -*-
{
    'name': 'Project Gantt View (Community Edition)',
    'version': '19.0.1.0.0',
    'category': 'Project',
    'summary': 'Adds Gantt chart view to Project Tasks',
    'description': """
        Adds a Gantt chart view to visualize project tasks.
        Based on web_gantt_ce module.
    """,
    'author': 'Community',
    'license': 'LGPL-3',
    'depends': ['project', 'web_gantt_ce'],
    'data': [
        'views/project_task_views.xml',
    ],
    'installable': True,
    'auto_install': False,
}
