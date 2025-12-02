# -*- coding: utf-8 -*-
from odoo import http
from odoo.http import Response, request
import json

# Origins permitidas (Angular dev server)
ALLOWED_ORIGINS = [
    'http://localhost:4200',
    'http://127.0.0.1:4200',
    'http://localhost:4201',
    'http://127.0.0.1:4201',
]


def add_cors_headers(response, origin=None):
    """Adiciona headers CORS à resposta."""
    if origin and origin in ALLOWED_ORIGINS:
        response.headers['Access-Control-Allow-Origin'] = origin
        response.headers['Access-Control-Allow-Credentials'] = 'true'
        response.headers['Access-Control-Allow-Methods'] = 'GET, POST, PUT, DELETE, OPTIONS'
        response.headers['Access-Control-Allow-Headers'] = 'Content-Type, X-Requested-With, Authorization'
        response.headers['Access-Control-Max-Age'] = '86400'
    return response


def make_cors_response(data, origin):
    """Cria resposta JSON com headers CORS."""
    response = Response(
        json.dumps(data),
        content_type='application/json',
        status=200
    )
    return add_cors_headers(response, origin)


class CorsController(http.Controller):

    @http.route([
        '/web/dataset/call_kw',
        '/web/dataset/call_kw/<path:path>',
        '/web/session/authenticate',
        '/web/session/get_session_info',
    ], type='json', auth='none', methods=['OPTIONS'], csrf=False)
    def cors_preflight(self, **kw):
        """Handle CORS preflight requests."""
        origin = request.httprequest.headers.get('Origin')
        response = Response(status=200)
        return add_cors_headers(response, origin)


class GanttApiController(http.Controller):
    """API pública para o Angular Gantt Chart."""

    @http.route('/api/gantt/tasks', type='http', auth='public', methods=['GET', 'OPTIONS'], csrf=False)
    def get_tasks(self, project_id=None, **kw):
        """Retorna tarefas do projeto para o Gantt."""
        origin = request.httprequest.headers.get('Origin')

        # Handle preflight
        if request.httprequest.method == 'OPTIONS':
            response = Response(status=200)
            return add_cors_headers(response, origin)

        domain = [('active', '=', True)]
        if project_id:
            domain.append(('project_id', '=', int(project_id)))

        tasks = request.env['project.task'].sudo().search_read(
            domain,
            fields=['id', 'name', 'display_name', 'date_assign', 'date_deadline', 'create_date', 'priority', 'parent_id'],
            order='id asc'
        )

        # Converter para formato esperado pelo DHTMLX Gantt
        gantt_tasks = []
        for task in tasks:
            start_date = task.get('date_assign') or task.get('create_date')
            end_date = task.get('date_deadline')

            # Calcular duração
            duration = 1
            if start_date and end_date:
                from datetime import datetime
                if isinstance(start_date, str):
                    start_dt = datetime.fromisoformat(start_date.replace(' ', 'T'))
                else:
                    start_dt = start_date
                if isinstance(end_date, str):
                    end_dt = datetime.fromisoformat(end_date.replace(' ', 'T'))
                else:
                    end_dt = end_date
                duration = max(1, (end_dt - start_dt).days)

            # Formatar data para Gantt
            if start_date:
                if hasattr(start_date, 'strftime'):
                    start_str = start_date.strftime('%Y-%m-%d %H:%M')
                else:
                    start_str = str(start_date)[:16].replace('T', ' ')
            else:
                start_str = ''

            gantt_tasks.append({
                'id': task['id'],
                'text': task.get('display_name') or task.get('name'),
                'start_date': start_str,
                'duration': duration,
                'progress': 0,
                'parent': task['parent_id'][0] if task.get('parent_id') else 0,
            })

        return make_cors_response({'data': gantt_tasks, 'links': []}, origin)

    @http.route('/api/gantt/tasks', type='http', auth='public', methods=['POST'], csrf=False)
    def create_task(self, **kw):
        """Cria nova tarefa."""
        origin = request.httprequest.headers.get('Origin')

        data = json.loads(request.httprequest.data.decode('utf-8'))

        from datetime import datetime, timedelta
        start_date = datetime.strptime(data.get('start_date', ''), '%Y-%m-%d %H:%M') if data.get('start_date') else datetime.now()
        duration = int(data.get('duration', 1))
        end_date = start_date + timedelta(days=duration)

        vals = {
            'name': data.get('text', 'Nova Tarefa'),
            'project_id': int(data.get('project_id', 3)),
            'date_assign': start_date,
            'date_deadline': end_date,
        }

        if data.get('parent') and int(data['parent']) > 0:
            vals['parent_id'] = int(data['parent'])

        task = request.env['project.task'].sudo().create(vals)

        return make_cors_response({'action': 'inserted', 'tid': task.id}, origin)

    @http.route('/api/gantt/tasks/<int:task_id>', type='http', auth='public', methods=['PUT', 'OPTIONS'], csrf=False)
    def update_task(self, task_id, **kw):
        """Atualiza tarefa existente."""
        origin = request.httprequest.headers.get('Origin')

        if request.httprequest.method == 'OPTIONS':
            response = Response(status=200)
            return add_cors_headers(response, origin)

        data = json.loads(request.httprequest.data.decode('utf-8'))

        from datetime import datetime, timedelta
        vals = {}

        if data.get('text'):
            vals['name'] = data['text']

        if data.get('start_date'):
            start_date = datetime.strptime(data['start_date'], '%Y-%m-%d %H:%M')
            vals['date_assign'] = start_date

            duration = int(data.get('duration', 1))
            vals['date_deadline'] = start_date + timedelta(days=duration)

        if 'parent' in data:
            vals['parent_id'] = int(data['parent']) if data['parent'] and int(data['parent']) > 0 else False

        task = request.env['project.task'].sudo().browse(task_id)
        if task.exists():
            task.write(vals)

        return make_cors_response({'action': 'updated'}, origin)

    @http.route('/api/gantt/tasks/<int:task_id>', type='http', auth='public', methods=['DELETE', 'OPTIONS'], csrf=False)
    def delete_task(self, task_id, **kw):
        """Remove tarefa."""
        origin = request.httprequest.headers.get('Origin')

        if request.httprequest.method == 'OPTIONS':
            response = Response(status=200)
            return add_cors_headers(response, origin)

        task = request.env['project.task'].sudo().browse(task_id)
        if task.exists():
            task.unlink()

        return make_cors_response({'action': 'deleted'}, origin)
