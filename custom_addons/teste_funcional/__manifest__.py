# -*- coding: utf-8 -*-
{
    'name': 'Teste Funcional',
    'version': '19.0.1.0.0',
    'category': 'Operations',
    'summary': 'Modulo teste_funcional gerado pelo odoo',
    'description': """
Modulo teste_funcional gerado pelo odoo
    """,
    'author': 'Your Name',
    'website': 'https://yourwebsite.com',
    'depends': ['base', 'mail'],
    'data': [
        'security/ir.model.access.csv',
        'security/teste_funcional_security.xml',
        'views/teste_funcional_views.xml',
        'views/teste_funcional_menus.xml',
    ],
    'demo': [
        # 'demo/demo_data.xml',
    ],
    'installable': True,
    'auto_install': False,
    'application': False,
    'license': 'LGPL-3',
}