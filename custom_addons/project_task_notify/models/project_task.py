# -*- coding: utf-8 -*-
from odoo import api, models
from markupsafe import Markup


class ProjectTask(models.Model):
    _inherit = 'project.task'

    # Campos que disparam notificação quando alterados
    TRACKED_FIELDS = {
        'name', 'stage_id', 'user_ids', 'date_deadline',
        'priority', 'project_id', 'parent_id', 'state'
    }

    def _get_task_url(self):
        """Retorna URL da tarefa para navegação direta."""
        self.ensure_one()
        base_url = self.env['ir.config_parameter'].sudo().get_param('web.base.url')
        if self.project_id:
            return f"{base_url}/odoo/project/{self.project_id.id}/tasks/{self.id}"
        return f"{base_url}/odoo/action-project.action_view_all_task/{self.id}"

    def _get_notification_channel(self):
        """Retorna o canal de notificação do projeto, se configurado."""
        self.ensure_one()
        if self.project_id and self.project_id.notification_channel_id:
            return self.project_id.notification_channel_id
        return False

    def _format_field_changes(self, changes):
        """Formata as mudanças de campos para exibição."""
        self.ensure_one()
        change_items = []

        if 'stage_id' in changes:
            stage_name = self.stage_id.name if self.stage_id else 'Sem estágio'
            change_items.append(f"📋 Estágio: {stage_name}")

        if 'user_ids' in changes:
            user_names = ', '.join(self.user_ids.mapped('name')) or 'Não atribuído'
            change_items.append(f"👤 Responsável: {user_names}")

        if 'name' in changes:
            change_items.append(f"✏️ Nome alterado para: {self.name}")

        if 'date_deadline' in changes:
            if self.date_deadline:
                deadline = self.date_deadline.strftime('%d/%m/%Y')
            else:
                deadline = 'Sem prazo'
            change_items.append(f"📅 Prazo: {deadline}")

        if 'priority' in changes:
            priorities = {'0': 'Normal', '1': 'Importante'}
            priority_name = priorities.get(self.priority, self.priority)
            change_items.append(f"⭐ Prioridade: {priority_name}")

        if 'state' in changes:
            states = {
                'in_progress': 'Em Progresso',
                'done': 'Concluído',
                'canceled': 'Cancelado',
                '01_in_progress': 'Em Progresso',
                '03_approved': 'Aprovado',
                '04_waiting_normal': 'Aguardando',
                '1_done': 'Concluído',
                '1_canceled': 'Cancelado',
            }
            state_name = states.get(self.state, self.state or 'Desconhecido')
            change_items.append(f"🔄 Estado: {state_name}")

        if 'project_id' in changes:
            project_name = self.project_id.name if self.project_id else 'Sem projeto'
            change_items.append(f"📁 Projeto: {project_name}")

        if 'parent_id' in changes:
            parent_name = self.parent_id.name if self.parent_id else 'Nenhuma'
            change_items.append(f"🔗 Tarefa pai: {parent_name}")

        return change_items

    def _notify_channel(self, action, changes=None):
        """Posta mensagem no canal de notificação do projeto."""
        for task in self:
            channel = task._get_notification_channel()
            if not channel:
                continue

            # Montar informações da tarefa
            task_url = task._get_task_url()
            project_name = task.project_id.name if task.project_id else 'Sem projeto'
            user_names = ', '.join(task.user_ids.mapped('name')) or 'Não atribuído'
            stage_name = task.stage_id.name if task.stage_id else 'Sem estágio'

            # Definir emoji e texto da ação
            if action == 'create':
                emoji = '🆕'
                action_text = 'criada'
                header_class = 'text-success'
            else:
                emoji = '✏️'
                action_text = 'atualizada'
                header_class = 'text-primary'

            # Formatar detalhes das mudanças
            change_details_html = ''
            if changes:
                change_items = task._format_field_changes(changes)
                if change_items:
                    change_details_html = '<br/>'.join(change_items)

            # Montar corpo da mensagem
            body = Markup(f'''
<div class="o_mail_notification">
    <strong class="{header_class}">{emoji} Tarefa {action_text}</strong><br/>
    <a href="{task_url}" class="font-weight-bold">{task.name}</a><br/>
    <small class="text-muted">
        📁 {project_name} &nbsp;|&nbsp;
        👤 {user_names} &nbsp;|&nbsp;
        📋 {stage_name}
    </small>
    {f'<br/><small class="text-info">{change_details_html}</small>' if change_details_html else ''}
</div>
''')

            # Postar no canal
            channel.sudo().message_post(
                body=body,
                message_type='notification',
                subtype_xmlid='mail.mt_comment',
            )

    @api.model_create_multi
    def create(self, vals_list):
        """Sobrescreve create para notificar canal ao criar tarefa."""
        tasks = super().create(vals_list)
        # Notificar apenas tarefas que têm projeto com canal configurado
        tasks_to_notify = tasks.filtered(
            lambda t: t.project_id and t.project_id.notification_channel_id
        )
        if tasks_to_notify:
            tasks_to_notify._notify_channel('create')
        return tasks

    def write(self, vals):
        """Sobrescreve write para notificar canal ao alterar tarefa."""
        # Verificar se algum campo rastreado foi alterado
        changes = set(vals.keys()) & self.TRACKED_FIELDS

        result = super().write(vals)

        # Notificar se houve mudanças em campos rastreados
        if changes:
            tasks_to_notify = self.filtered(
                lambda t: t.project_id and t.project_id.notification_channel_id
            )
            if tasks_to_notify:
                tasks_to_notify._notify_channel('update', changes)

        return result
