# -*- coding: utf-8 -*-
from odoo import fields, models


class ProjectProject(models.Model):
    _inherit = 'project.project'

    notification_channel_id = fields.Many2one(
        'discuss.channel',
        string='Canal de Notificações',
        help='Canal do Discuss onde serão enviadas notificações sobre alterações nas tarefas deste projeto.',
        domain="[('channel_type', '=', 'channel')]",
    )
