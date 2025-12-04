# -*- coding: utf-8 -*-
# Part of Odoo. See LICENSE file for full copyright and licensing details.

from odoo import models, fields, api


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

    progress = fields.Integer(
        string='Progress',
        default=0,
        help='Progress percentage (0-100) for Gantt view.',
    )

    @api.constrains('progress')
    def _check_progress(self):
        for task in self:
            if task.progress < 0:
                task.progress = 0
            elif task.progress > 100:
                task.progress = 100
