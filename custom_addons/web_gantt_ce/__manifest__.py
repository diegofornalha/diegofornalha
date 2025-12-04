# -*- coding: utf-8 -*-
# Part of Odoo. See LICENSE file for full copyright and licensing details.
{
    'name': 'Web Gantt CE',
    'version': '19.0.1.9.0',
    'category': 'Hidden/Tools',
    'summary': 'Gantt view for Odoo Community Edition',
    'description': """
Web Gantt Community Edition
===========================

This module provides a Gantt chart view for Odoo 19 Community Edition.

Features:
- Timeline visualization of tasks
- Drag & drop to adjust dates
- Multiple time scales (day, week, month)
- Task dependencies support
- Integration with project module

Based on Frappe Gantt (MIT License).
    """,
    'author': 'Diego Fornalha',
    'website': 'https://github.com/diegofornalha',
    'license': 'LGPL-3',
    'depends': ['web', 'project'],
    'data': [
        'security/ir.model.access.csv',
        'views/project_views.xml',
    ],
    'assets': {
        'web.assets_backend': [
            'web_gantt_ce/static/lib/frappe-gantt/frappe-gantt.min.css',
            'web_gantt_ce/static/lib/frappe-gantt/frappe-gantt.min.js',
            'web_gantt_ce/static/src/gantt_view/gantt_arch_parser.js',
            'web_gantt_ce/static/src/gantt_view/gantt_model.js',
            'web_gantt_ce/static/src/gantt_view/gantt_renderer.js',
            'web_gantt_ce/static/src/gantt_view/gantt_controller.js',
            'web_gantt_ce/static/src/gantt_view/gantt_view.js',
            'web_gantt_ce/static/src/gantt_view/gantt_renderer.xml',
            'web_gantt_ce/static/src/gantt_view/gantt_controller.xml',
            'web_gantt_ce/static/src/gantt_view/gantt.scss',
        ],
    },
    'installable': True,
    'auto_install': False,
    'application': False,
}
