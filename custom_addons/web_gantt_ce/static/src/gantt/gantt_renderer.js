/** @odoo-module **/

import { Component, useRef, onMounted, onPatched } from "@odoo/owl";

export class GanttRenderer extends Component {
    static template = "web_gantt_ce.GanttRenderer";
    static props = {
        model: Object,
        archInfo: Object,
        openRecord: Function,
        onRecordUpdate: Function,
    };

    setup() {
        this.containerRef = useRef("ganttContainer");
        this.ganttInstance = null;

        onMounted(() => {
            this.renderGantt();
        });

        onPatched(() => {
            this.renderGantt();
        });
    }

    get tasks() {
        const records = this.props.model.records || [];
        return records
            .filter((record) => record.start)
            .map((record) => ({
                id: String(record.id),
                name: record.title || "Sem título",
                start: this.formatDate(record.start),
                end: this.formatDate(record.end) || this.formatDate(record.start),
                progress: record.progress || 0,
                custom_class: this.getTaskClass(record),
                _record: record,
            }));
    }

    formatDate(date) {
        if (!date) return null;
        if (date.toISODate) {
            return date.toISODate();
        }
        if (date instanceof Date) {
            return date.toISOString().split("T")[0];
        }
        return String(date).split("T")[0];
    }

    getTaskClass(record) {
        const decorations = this.props.archInfo.decorations || {};
        for (const [type, expr] of Object.entries(decorations)) {
            try {
                const fn = new Function("record", `with(record) { return ${expr}; }`);
                if (fn(record.rawRecord)) {
                    return `gantt-${type}`;
                }
            } catch (e) {
                console.warn("Decoration evaluation error:", e);
            }
        }
        return "";
    }

    getViewMode() {
        const scale = this.props.model.scale || "month";
        const scaleMap = {
            day: "Day",
            week: "Week",
            month: "Month",
            year: "Year",
        };
        return scaleMap[scale] || "Month";
    }

    renderGantt() {
        const container = this.containerRef.el;
        if (!container) return;

        const tasks = this.tasks;
        container.innerHTML = "";

        if (!tasks.length) {
            container.innerHTML = '<div class="o_gantt_empty text-center p-5 text-muted"><i class="fa fa-tasks fa-3x mb-3 d-block"></i>Nenhuma tarefa para exibir no Gantt</div>';
            return;
        }

        if (typeof Gantt === "undefined") {
            console.error("Frappe Gantt library not loaded");
            container.innerHTML = '<div class="o_gantt_error text-danger p-3">Biblioteca Gantt não carregada</div>';
            return;
        }

        try {
            this.ganttInstance = new Gantt(container, tasks, {
                view_mode: this.getViewMode(),
                date_format: "YYYY-MM-DD",
                language: "pt-br",
                popup_trigger: "click",
                custom_popup_html: (task) => {
                    return `
                        <div class="gantt-popup p-2">
                            <h6 class="gantt-popup-title mb-1">${task.name}</h6>
                            <p class="gantt-popup-subtitle mb-1 small text-muted">
                                ${task.start} → ${task.end}
                            </p>
                            <div class="gantt-popup-progress small">
                                Progresso: ${task.progress}%
                            </div>
                        </div>
                    `;
                },
                on_click: (task) => {
                    if (task._record) {
                        this.props.openRecord(task._record);
                    }
                },
                on_date_change: (task, start, end) => {
                    if (task._record) {
                        this.props.onRecordUpdate(task._record, { start, end });
                    }
                },
                on_progress_change: (task, progress) => {
                    if (task._record) {
                        this.props.onRecordUpdate(task._record, { progress });
                    }
                },
            });
        } catch (e) {
            console.error("Error rendering Gantt:", e);
            container.innerHTML = `<div class="o_gantt_error text-danger p-3">Erro ao renderizar Gantt: ${e.message}</div>`;
        }
    }
}
