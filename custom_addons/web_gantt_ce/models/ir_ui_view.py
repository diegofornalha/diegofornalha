# -*- coding: utf-8 -*-
# Part of Odoo. See LICENSE file for full copyright and licensing details.

from odoo import fields, models


class IrUIView(models.Model):
    _inherit = 'ir.ui.view'

    type = fields.Selection(selection_add=[('gantt', 'Gantt')], ondelete={'gantt': 'cascade'})

    def _get_view_info(self):
        view_info = super()._get_view_info()
        view_info['gantt'] = {'icon': 'fa fa-tasks'}
        return view_info


class IrActionsActWindowView(models.Model):
    _inherit = 'ir.actions.act_window.view'

    view_mode = fields.Selection(selection_add=[('gantt', 'Gantt')], ondelete={'gantt': 'cascade'})
