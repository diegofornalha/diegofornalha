# -*- coding: utf-8 -*-
# Part of Odoo. See LICENSE file for full copyright and licensing details.

from odoo import models, fields


class ProjectTask(models.Model):
    _inherit = 'project.task'

    depend_on_ids = fields.Many2many(
        'project.task',
        'task_dependencies_rel',
        'task_id',
        'depends_on_id',
        string='Depends On',
        help='Tasks that must be completed before this task can start.',
    )
