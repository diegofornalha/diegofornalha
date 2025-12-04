{
    'name': 'Mail Message Permanent Delete',
    'version': '19.0.1.0.0',
    'category': 'Discuss',
    'summary': 'Permite excluir mensagens permanentemente do Discuss',
    'description': '''
        Este módulo adiciona a opção de excluir mensagens permanentemente
        no Discuss do Odoo, além da exclusão padrão que apenas marca
        a mensagem como "removida".
    ''',
    'author': 'Diego Fornalha',
    'depends': ['mail'],
    'data': [],
    'assets': {
        'web.assets_backend': [
            'mail_message_permanent_delete/static/src/message_actions.js',
        ],
    },
    'installable': True,
    'auto_install': False,
    'license': 'LGPL-3',
}
