from odoo import http
from odoo.http import request


class MailMessagePermanentDeleteController(http.Controller):

    @http.route('/mail/message/permanent_delete', type='json', auth='user')
    def permanent_delete_message(self, message_id):
        """Exclui permanentemente uma mensagem do banco de dados."""
        message = request.env['mail.message'].browse(message_id)

        if not message.exists():
            return {'error': 'Mensagem não encontrada'}

        # Verifica se o usuário pode excluir a mensagem
        # Apenas o autor ou admin pode excluir permanentemente
        is_author = message.author_id == request.env.user.partner_id
        is_admin = request.env.user._is_admin()

        if not is_author and not is_admin:
            return {'error': 'Você não tem permissão para excluir esta mensagem'}

        # Notifica via bus antes de excluir
        if message.model == 'discuss.channel':
            channel = request.env['discuss.channel'].browse(message.res_id)
            if channel.exists():
                channel._bus_send('mail.message/delete', {'message_ids': [message.id]})

        # Exclui a mensagem permanentemente
        message.sudo().unlink()

        return {'success': True, 'message_id': message_id}
