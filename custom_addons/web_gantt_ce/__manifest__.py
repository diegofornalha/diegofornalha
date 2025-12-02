# -*- coding: utf-8 -*-
{
    'name': 'Web Gantt View (Community Edition)',
    'version': '19.0.1.0.0',
    'category': 'Hidden/Tools',
    'summary': 'Gantt chart view for Odoo 19 Community Edition',
    'description': """
        Adds native Gantt view support to Odoo Community Edition.
        Based on Frappe Gantt library (MIT License).

        Usage in XML:
        <gantt date_start="date_start" date_stop="date_end" default_group_by="user_id"/>
    """,
    'author': 'Community',
    'license': 'LGPL-3',
    'depends': ['web'],
    'assets': {
        'web.assets_backend': [
            # Frappe Gantt Library
            'web_gantt_ce/static/lib/frappe-gantt/frappe-gantt.css',
            'web_gantt_ce/static/lib/frappe-gantt/frappe-gantt.umd.js',
            # Gantt View Components
            'web_gantt_ce/static/src/gantt/gantt_arch_parser.js',
            'web_gantt_ce/static/src/gantt/gantt_model.js',
            'web_gantt_ce/static/src/gantt/gantt_renderer.js',
            'web_gantt_ce/static/src/gantt/gantt_renderer.xml',
            'web_gantt_ce/static/src/gantt/gantt_controller.js',
            'web_gantt_ce/static/src/gantt/gantt_controller.xml',
            'web_gantt_ce/static/src/gantt/gantt_view.js',
            'web_gantt_ce/static/src/gantt/gantt_renderer.scss',
        ],
    },
    'installable': True,
    'auto_install': False,
}
