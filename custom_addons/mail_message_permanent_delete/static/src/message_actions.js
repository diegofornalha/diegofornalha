/** @odoo-module */

import { _t } from "@web/core/l10n/translation";
import { discussComponentRegistry } from "@mail/core/common/discuss_component_registry";
import { messageActionsRegistry, registerMessageAction } from "@mail/core/common/message_actions";
import { ACTION_TAGS } from "@mail/core/common/action";
import { Deferred } from "@web/core/utils/concurrency";
import { rpc } from "@web/core/network/rpc";
import { toRaw } from "@odoo/owl";

// Remove a ação padrão "delete" (Excluir) do registro
// Usando try/catch caso a ação ainda não exista
try {
    if (messageActionsRegistry.contains("delete")) {
        messageActionsRegistry.remove("delete");
    }
} catch (e) {
    console.warn("Não foi possível remover ação delete:", e);
}

registerMessageAction("permanent-delete", {
    condition: ({ message }) => message.editable,
    icon: "fa fa-times text-danger",
    name: _t("Excluir Definitivamente"),
    onSelected: async ({ message: msg, owner, store }) => {
        const message = toRaw(msg);
        const def = new Deferred();
        store.env.services.dialog.add(
            discussComponentRegistry.get("MessageConfirmDialog"),
            {
                message,
                prompt: _t("ATENÇÃO: Esta ação é IRREVERSÍVEL! A mensagem será excluída permanentemente do banco de dados. Deseja continuar?"),
                onConfirm: async () => {
                    def.resolve(true);
                    try {
                        const result = await rpc("/mail/message/permanent_delete", {
                            message_id: message.id,
                        });
                        if (result.success) {
                            // Remove da thread localmente
                            if (message.thread) {
                                message.thread.messages = message.thread.messages.filter(
                                    (m) => m.notEq(message)
                                );
                            }
                            // Remove do store
                            message.delete();
                            store.env.services.notification.add(
                                _t("Mensagem excluída permanentemente!"),
                                { type: "success" }
                            );
                        } else {
                            store.env.services.notification.add(
                                result.error || _t("Erro ao excluir mensagem"),
                                { type: "danger" }
                            );
                        }
                    } catch (error) {
                        store.env.services.notification.add(
                            _t("Erro ao excluir mensagem: ") + error.message,
                            { type: "danger" }
                        );
                    }
                },
            },
            { context: owner, onClose: () => def.resolve(false) }
        );
        return def;
    },
    sequence: 125,
    tags: ACTION_TAGS.DANGER,
});
