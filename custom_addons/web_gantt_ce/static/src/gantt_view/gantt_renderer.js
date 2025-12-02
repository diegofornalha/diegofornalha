/** @odoo-module **/

import { Component, useRef, onMounted, onWillUnmount, onPatched } from "@odoo/owl";

export class GanttRenderer extends Component {
    static template = "web_gantt_ce.GanttRenderer";
    static props = {
        model: Object,
        openRecord: Function,
        onTaskUpdate: Function,
    };

    setup() {
        this.ganttRef = useRef("gantt-container");
        this.gantt = null;

        onMounted(() => {
            this.renderGantt();
        });

        onPatched(() => {
            this.renderGantt();
        });

        onWillUnmount(() => {
            if (this.gantt) {
                this.gantt = null;
            }
        });
    }

    get tasks() {
        return this.props.model.data.records || [];
    }

    get hasData() {
        // Verifica se há tarefas com datas válidas para exibir no Gantt
        const tasks = this.formatTasks();
        return tasks.length > 0;
    }

    get viewMode() {
        return this.props.model.meta?.scale || "Day";
    }

    renderGantt() {
        const container = this.ganttRef.el;
        // Se não há container (template mostra NoContent) ou não há dados, não renderiza
        if (!container || !this.hasData) return;

        // Clear previous gantt
        container.innerHTML = "";

        const tasks = this.formatTasks();

        // Initialize Frappe Gantt
        this.gantt = new Gantt(container, tasks, {
            view_mode: this.viewMode,
            date_format: "YYYY-MM-DD",
            popup_trigger: "click",
            custom_popup_html: (task) => {
                return `
                    <div class="gantt-popup">
                        <h5>${task.name}</h5>
                        <p>Start: ${task.start}</p>
                        <p>End: ${task.end}</p>
                        <p>Progress: ${task.progress}%</p>
                    </div>
                `;
            },
            on_click: (task) => {
                this.onTaskClick(task);
            },
            on_date_change: (task, start, end) => {
                this.onDateChange(task, start, end);
            },
            on_progress_change: (task, progress) => {
                this.onProgressChange(task, progress);
            },
        });
    }

    formatTasks() {
        const records = this.tasks;
        const dateStartField = this.props.model.meta?.dateStartField || "date_assign";
        const dateStopField = this.props.model.meta?.dateStopField || "date_deadline";

        console.log("[Gantt] Records:", records.length, records);
        console.log("[Gantt] Fields:", dateStartField, dateStopField);

        return records.map((record) => {
            const startDate = record.data[dateStartField] || record.data.create_date;
            const endDate = record.data[dateStopField] || this.addDays(startDate, 1);

            console.log("[Gantt] Task:", record.data.display_name, "start:", startDate, "end:", endDate);

            return {
                id: String(record.resId),
                name: record.data.display_name || record.data.name || "Untitled",
                start: this.formatDate(startDate),
                end: this.formatDate(endDate),
                progress: record.data.progress || 0,
                dependencies: this.getDependencies(record),
                custom_class: this.getTaskClass(record),
            };
        }).filter(task => task.start && task.end);
    }

    formatDate(date) {
        if (!date) return null;
        if (typeof date === "string") {
            return date.split(" ")[0];
        }
        if (date instanceof Date) {
            return date.toISOString().split("T")[0];
        }
        if (date.toISODate) {
            return date.toISODate();
        }
        return null;
    }

    addDays(date, days) {
        if (!date) return null;
        const d = new Date(date);
        d.setDate(d.getDate() + days);
        return d;
    }

    getDependencies(record) {
        const deps = record.data.depend_on_ids || [];
        return deps.map(id => String(id)).join(", ");
    }

    getTaskClass(record) {
        const priority = record.data.priority;
        if (priority === "2") return "gantt-urgent";
        if (priority === "1") return "gantt-high";
        return "gantt-normal";
    }

    onTaskClick(task) {
        const recordId = parseInt(task.id);
        this.props.openRecord({ resId: recordId });
    }

    onDateChange(task, start, end) {
        const recordId = parseInt(task.id);
        const dateStartField = this.props.model.meta?.dateStartField || "date_assign";
        const dateStopField = this.props.model.meta?.dateStopField || "date_deadline";

        this.props.onTaskUpdate(recordId, {
            [dateStartField]: this.formatDate(start),
            [dateStopField]: this.formatDate(end),
        });
    }

    onProgressChange(task, progress) {
        const recordId = parseInt(task.id);
        this.props.onTaskUpdate(recordId, {
            progress: progress,
        });
    }

    changeViewMode(mode) {
        if (this.gantt) {
            this.gantt.change_view_mode(mode);
        }
    }
}
