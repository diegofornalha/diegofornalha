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
            isVerticalDrag: false,
            draggedRow: null,
            draggedTaskId: null,
            startX: 0,
            startY: 0,
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
        const tasks = this.formatTasks();
        return tasks.length > 0;
    }

    get viewMode() {
        return this.props.model.meta?.scale || "Day";
    }

    renderGantt() {
        const container = this.ganttRef.el;
        if (!container || !this.hasData) return;

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

        // Setup vertical drag detection on bars
        this.setupVerticalDrag(container);
    }

    setupVerticalDrag(container) {
        const barWrappers = container.querySelectorAll('.bar-wrapper');

        // Bind event handlers
        this.handleVerticalDrag = this.handleVerticalDrag.bind(this);
        this.handleVerticalDragEnd = this.handleVerticalDragEnd.bind(this);

        barWrappers.forEach((wrapper) => {
            const bar = wrapper.querySelector('.bar');
            if (!bar) return;

            // Add visual indicator that bars can be reordered
            wrapper.style.cursor = 'move';

            // Listen for mousedown on the bar
            bar.addEventListener('mousedown', (e) => {
                // Don't interfere with resize handles
                if (e.target.classList.contains('handle')) return;

                const taskId = wrapper.getAttribute('data-id');
                const barWrappers = Array.from(container.querySelectorAll('.bar-wrapper'));
                const barRect = bar.getBBox();

                this.dragState = {
                    isDragging: true,
                    isVerticalDrag: false,
                    draggedRow: wrapper,
                    draggedTaskId: taskId,
                    startX: e.clientX,
                    startY: e.clientY,
                    initialIndex: barWrappers.indexOf(wrapper),
                    barWrappers: barWrappers,
                    barY: barRect.y,
                    rowHeight: 38,
                    verticalThreshold: 15, // Pixels to move before considering vertical drag
                };

                document.addEventListener('mousemove', this.handleVerticalDrag);
                document.addEventListener('mouseup', this.handleVerticalDragEnd);
            });
        });

        // Add tooltip hint
        this.addDragHint(container);
    }

    addDragHint(container) {
        // Add a subtle tooltip on first hover
        let hintShown = false;
        const barWrappers = container.querySelectorAll('.bar-wrapper');

        barWrappers.forEach((wrapper) => {
            wrapper.addEventListener('mouseenter', () => {
                if (!hintShown && !this.dragState.isDragging) {
                    // Show hint only once per session
                    const hint = document.createElement('div');
                    hint.className = 'gantt-drag-hint';
                    hint.innerHTML = 'Arraste para cima/baixo para reordenar';
                    hint.style.cssText = `
                        position: fixed;
                        bottom: 20px;
                        left: 50%;
                        transform: translateX(-50%);
                        background: rgba(113, 75, 103, 0.9);
                        color: white;
                        padding: 8px 16px;
                        border-radius: 4px;
                        font-size: 13px;
                        z-index: 9999;
                        animation: fadeInOut 3s ease forwards;
                    `;
                    document.body.appendChild(hint);
                    hintShown = true;

                    // Add animation style if not exists
                    if (!document.querySelector('#gantt-hint-style')) {
                        const style = document.createElement('style');
                        style.id = 'gantt-hint-style';
                        style.textContent = `
                            @keyframes fadeInOut {
                                0% { opacity: 0; }
                                10% { opacity: 1; }
                                80% { opacity: 1; }
                                100% { opacity: 0; }
                            }
                        `;
                        document.head.appendChild(style);
                    }

                    setTimeout(() => hint.remove(), 3000);
                }
            });
        });
    }

    handleVerticalDrag(e) {
        if (!this.dragState.isDragging) return;

        const { draggedRow, barWrappers, startX, startY, rowHeight, initialIndex, verticalThreshold } = this.dragState;
        const deltaX = Math.abs(e.clientX - startX);
        const deltaY = e.clientY - startY;

        // Determine if this is a vertical drag (more vertical movement than horizontal)
        if (!this.dragState.isVerticalDrag) {
            if (Math.abs(deltaY) > verticalThreshold && Math.abs(deltaY) > deltaX) {
                // This is a vertical drag - cancel Frappe's horizontal drag
                this.dragState.isVerticalDrag = true;

                // Visual feedback
                draggedRow.style.opacity = '0.5';
                draggedRow.style.transition = 'opacity 0.2s';

                // Stop Frappe Gantt's internal drag
                e.stopPropagation();
            } else if (deltaX > verticalThreshold) {
                // This is a horizontal drag - let Frappe handle it
                this.cleanupDragState();
                return;
            }
        }

        if (this.dragState.isVerticalDrag) {
            e.preventDefault();
            e.stopPropagation();

            const moveCount = Math.round(deltaY / rowHeight);

            if (moveCount !== 0) {
                let newIndex = initialIndex + moveCount;
                newIndex = Math.max(0, Math.min(barWrappers.length - 1, newIndex));

                // Highlight target row
                barWrappers.forEach((wrapper, index) => {
                    if (index === newIndex && wrapper !== draggedRow) {
                        wrapper.style.outline = '2px dashed #714b67';
                        wrapper.style.outlineOffset = '-2px';
                    } else if (wrapper !== draggedRow) {
                        wrapper.style.outline = '';
                    }
                });

                this.dragState.targetIndex = newIndex;
            }
        }
    }

    handleVerticalDragEnd(e) {
        if (!this.dragState.isDragging) return;

        const { draggedRow, draggedTaskId, initialIndex, targetIndex, barWrappers, isVerticalDrag } = this.dragState;

        // Reset visual state
        if (draggedRow) {
            draggedRow.style.opacity = '';
            draggedRow.style.transition = '';
        }

        barWrappers?.forEach((wrapper) => {
            wrapper.style.outline = '';
        });

        // If was a vertical drag and position changed, update sequence
        if (isVerticalDrag && targetIndex !== undefined && targetIndex !== initialIndex) {
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

            console.log('[Gantt] Vertical drag - updating task sequences:', newOrder);
            this.updateTaskSequences(newOrder);
        }

        this.cleanupDragState();
    }

    cleanupDragState() {
        document.removeEventListener('mousemove', this.handleVerticalDrag);
        document.removeEventListener('mouseup', this.handleVerticalDragEnd);

        this.dragState = {
            isDragging: false,
            isVerticalDrag: false,
            draggedRow: null,
            draggedTaskId: null,
            startX: 0,
            startY: 0,
        };
    }

    async updateTaskSequences(newOrder) {
        for (let i = 0; i < newOrder.length; i++) {
            const taskId = newOrder[i];
            await this.props.onTaskUpdate(taskId, {
                sequence: i * 10,
            });
        }

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
        if (priority === "3") return "gantt-urgent";
        if (priority === "2") return "gantt-very-high";
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
