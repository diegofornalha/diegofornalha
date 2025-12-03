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
        this.dragState = {
            isDragging: false,
            draggedRow: null,
            draggedTaskId: null,
            startY: 0,
            placeholder: null,
        };

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
            this.cleanupVerticalDrag();
        });
    }

    cleanupVerticalDrag() {
        document.removeEventListener('mousemove', this.handleVerticalDrag);
        document.removeEventListener('mouseup', this.handleVerticalDragEnd);
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
            date_format: "YYYY-MM-DD HH:mm",
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

        // Setup vertical drag for reordering
        this.setupVerticalDrag(container);
    }

    setupVerticalDrag(container) {
        // Find SVG and create HTML overlay for drag handles
        const svg = container.querySelector('svg.gantt');
        if (!svg) return;

        // Create overlay container positioned over SVG
        let overlay = container.querySelector('.gantt-drag-overlay');
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.className = 'gantt-drag-overlay';
            overlay.style.cssText = `
                position: absolute;
                top: 0;
                left: 0;
                pointer-events: none;
                z-index: 50;
            `;
            container.style.position = 'relative';
            container.appendChild(overlay);
        }
        overlay.innerHTML = '';

        // Find all bar-wrapper elements and create handles
        const barWrappers = container.querySelectorAll('.bar-wrapper');

        barWrappers.forEach((wrapper) => {
            const bar = wrapper.querySelector('.bar');
            if (!bar) return;

            // Get bar position from SVG
            const barRect = bar.getBBox();
            const svgRect = svg.getBoundingClientRect();
            const containerRect = container.getBoundingClientRect();

            // Create drag handle in HTML overlay - positioned at fixed left margin
            const dragHandle = document.createElement('div');
            dragHandle.className = 'gantt-drag-handle';
            dragHandle.innerHTML = '⋮⋮';
            dragHandle.dataset.taskId = wrapper.getAttribute('data-id');
            dragHandle.style.cssText = `
                position: absolute;
                left: 5px;
                top: ${barRect.y + barRect.height / 2 - 10}px;
                cursor: grab;
                padding: 4px 6px;
                color: #999;
                font-size: 14px;
                user-select: none;
                pointer-events: auto;
                background: rgba(255, 255, 255, 0.9);
                border-radius: 3px;
                opacity: 0;
                transition: opacity 0.2s ease;
            `;

            // Show on hover
            dragHandle.addEventListener('mouseenter', () => {
                dragHandle.style.opacity = '1';
                dragHandle.style.color = '#714b67';
            });
            dragHandle.addEventListener('mouseleave', () => {
                if (!this.dragState.isDragging) {
                    dragHandle.style.opacity = '0';
                }
            });

            dragHandle.addEventListener('mousedown', (e) => {
                this.startVerticalDrag(e, wrapper, dragHandle);
            });

            overlay.appendChild(dragHandle);
        });

        // Also show handles when hovering over bars
        barWrappers.forEach((wrapper) => {
            const taskId = wrapper.getAttribute('data-id');
            wrapper.addEventListener('mouseenter', () => {
                const handle = overlay.querySelector(`[data-task-id="${taskId}"]`);
                if (handle) handle.style.opacity = '0.7';
            });
            wrapper.addEventListener('mouseleave', () => {
                const handle = overlay.querySelector(`[data-task-id="${taskId}"]`);
                if (handle && !this.dragState.isDragging) handle.style.opacity = '0';
            });
        });

        // Bind event handlers
        this.handleVerticalDrag = this.handleVerticalDrag.bind(this);
        this.handleVerticalDragEnd = this.handleVerticalDragEnd.bind(this);
    }

    startVerticalDrag(e, wrapper, handle) {
        e.preventDefault();
        e.stopPropagation();

        const container = this.ganttRef.el;
        const barWrappers = Array.from(container.querySelectorAll('.bar-wrapper'));
        const taskId = wrapper.getAttribute('data-id');

        // Get bar positions for visual feedback
        const bar = wrapper.querySelector('.bar');
        const barY = bar ? bar.getBBox().y : 0;
        const rowHeight = 38; // Standard row height in Frappe Gantt

        this.dragState = {
            isDragging: true,
            draggedRow: wrapper,
            draggedTaskId: taskId,
            startY: e.clientY,
            initialIndex: barWrappers.indexOf(wrapper),
            barWrappers: barWrappers,
            handle: handle,
            barY: barY,
            rowHeight: rowHeight,
        };

        // Visual feedback - change bar opacity
        wrapper.style.opacity = '0.5';
        handle.style.opacity = '1';
        handle.style.cursor = 'grabbing';

        document.addEventListener('mousemove', this.handleVerticalDrag);
        document.addEventListener('mouseup', this.handleVerticalDragEnd);
    }

    handleVerticalDrag(e) {
        if (!this.dragState.isDragging) return;

        const { draggedRow, barWrappers, handle, rowHeight, initialIndex } = this.dragState;
        const deltaY = e.clientY - this.dragState.startY;
        const moveCount = Math.round(deltaY / rowHeight);

        // Move the handle visually to follow cursor
        if (handle) {
            const currentTop = parseFloat(handle.style.top) || 0;
            handle.style.top = `${this.dragState.barY + rowHeight / 2 - 10 + deltaY}px`;
        }

        if (moveCount !== 0) {
            let newIndex = initialIndex + moveCount;
            newIndex = Math.max(0, Math.min(barWrappers.length - 1, newIndex));

            // Highlight target row
            barWrappers.forEach((wrapper, index) => {
                if (index === newIndex && wrapper !== draggedRow) {
                    wrapper.style.outline = '2px dashed #714b67';
                } else if (wrapper !== draggedRow) {
                    wrapper.style.outline = '';
                }
            });

            this.dragState.targetIndex = newIndex;
        }
    }

    handleVerticalDragEnd(e) {
        if (!this.dragState.isDragging) return;

        const { draggedRow, draggedTaskId, initialIndex, targetIndex, barWrappers, handle } = this.dragState;

        // Reset visual state
        draggedRow.style.opacity = '';
        barWrappers.forEach((wrapper) => {
            wrapper.style.outline = '';
        });

        // Reset handle
        if (handle) {
            handle.style.cursor = 'grab';
            handle.style.opacity = '0';
        }

        // If position changed, update sequence
        if (targetIndex !== undefined && targetIndex !== initialIndex) {
            // Calculate new sequences based on position
            const movedTaskId = parseInt(draggedTaskId);

            // Build new order array
            const newOrder = [];
            barWrappers.forEach((wrapper, index) => {
                const id = parseInt(wrapper.getAttribute('data-id'));
                if (index === targetIndex) {
                    newOrder.push(movedTaskId);
                }
                if (id !== movedTaskId) {
                    newOrder.push(id);
                }
            });
            if (targetIndex === barWrappers.length) {
                newOrder.push(movedTaskId);
            }

            // Update sequences for all affected tasks
            console.log('[Gantt] Updating task sequences:', newOrder);
            this.updateTaskSequences(newOrder);
        }

        // Cleanup
        document.removeEventListener('mousemove', this.handleVerticalDrag);
        document.removeEventListener('mouseup', this.handleVerticalDragEnd);

        this.dragState = {
            isDragging: false,
            draggedRow: null,
            draggedTaskId: null,
            startY: 0,
            handle: null,
        };
    }

    async updateTaskSequences(newOrder) {
        // Update sequence for each task based on new order
        for (let i = 0; i < newOrder.length; i++) {
            const taskId = newOrder[i];
            await this.props.onTaskUpdate(taskId, {
                sequence: i * 10, // Use increments of 10 for flexibility
            });
        }

        // Reload to reflect changes
        if (this.props.model && this.props.model.load) {
            await this.props.model.load({});
        }
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
            // Preservar data e hora para escalas como Half Day
            // Formato esperado: "YYYY-MM-DD HH:MM"
            const d = new Date(date);
            if (!isNaN(d.getTime())) {
                const year = d.getFullYear();
                const month = String(d.getMonth() + 1).padStart(2, '0');
                const day = String(d.getDate()).padStart(2, '0');
                const hours = String(d.getHours()).padStart(2, '0');
                const minutes = String(d.getMinutes()).padStart(2, '0');
                return `${year}-${month}-${day} ${hours}:${minutes}`;
            }
            return date.split(" ")[0];
        }
        if (date instanceof Date) {
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            const hours = String(date.getHours()).padStart(2, '0');
            const minutes = String(date.getMinutes()).padStart(2, '0');
            return `${year}-${month}-${day} ${hours}:${minutes}`;
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
        if (priority === "3") return "gantt-urgent";  // Urgente (verde)
        if (priority === "2") return "gantt-very-high"; // Muito alta (vermelho)
        if (priority === "1") return "gantt-high";    // Alta (laranja)
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
