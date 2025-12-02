#!/bin/bash
PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$PROJECT_DIR"
set -e

# Ler configuração
PORT=$(grep xmlrpc_port odoo.conf | cut -d'=' -f2 | tr -d ' ' || echo "8069")
DB_NAME=$(grep db_name odoo.conf | cut -d'=' -f2 | tr -d ' ' || echo "odoo")

echo "🚀 Iniciando Odoo..."
echo "📁 Projeto: $(basename "$PWD")"
echo "🗄️  Database: $DB_NAME"
echo "🌐 URL: http://localhost:$PORT"
echo "📝 Logs: $PWD/logs/odoo.log"
echo ""
echo "✅ Odoo está iniciando..."
echo "📋 Para parar: Ctrl+C"
echo "" 
echo "$(date): Odoo starting..." >> logs/startup.log

source .venv/bin/activate
python odoo_source/odoo-bin -c odoo.conf
