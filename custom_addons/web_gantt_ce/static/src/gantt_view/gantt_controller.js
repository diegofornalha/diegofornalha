/** @odoo-module **/

import { Component, useState, useRef, onMounted, onWillUnmount } from "@odoo/owl";
import { useService, useBus } from "@web/core/utils/hooks";
import { useModelWithSampleData } from "@web/model/model";
import { Layout } from "@web/search/layout";
import { useSetupAction } from "@web/search/action_hook";
import { standardViewProps } from "@web/views/standard_view_props";
import { GanttRenderer } from "./gantt_renderer";
import { Dropdown } from "@web/core/dropdown/dropdown";
import { DropdownItem } from "@web/core/dropdown/dropdown_item";

export class GanttController extends Component {
    static template = "web_gantt_ce.GanttController";
    static components = { Layout, GanttRenderer, Dropdown, DropdownItem };
    static props = {
        ...standardViewProps,
        Model: Function,
        Renderer: Function,
        archInfo: Object,
    };

    setup() {
        this.actionService = useService("action");
        this.orm = useService("orm");

        this.model = useModelWithSampleData(this.props.Model, this.modelParams);

        useBus(this.model.bus, "update", () => this.render(true));

        useSetupAction({
            getLocalState: () => ({}),
        });

        this.state = useState({
            scale: this.props.archInfo.defaultScale || "Day",
            selectedTask: null,  // { id, name, priority }
            colorsDropdownOpen: false,
            filterUserId: null,  // null = show all, number = filter by user
        });

        this.colorsDropdownRef = useRef("colorsDropdown");

        this.onTaskSelectedBound = this.onTaskSelected.bind(this);
        this.onClickOutsideBound = this.onClickOutside.bind(this);
        this.onCreateTaskBound = this.onCreateTask.bind(this);

        onMounted(() => {
            // Listen for custom event from renderer
            document.addEventListener('gantt-task-selected', this.onTaskSelectedBound);
            // Listen for clicks outside to deselect
            document.addEventListener('click', this.onClickOutsideBound);
            // Listen for create task event (double-click on empty area)
            document.addEventListener('gantt-create-task', this.onCreateTaskBound);
        });

        onWillUnmount(() => {
            document.removeEventListener('gantt-task-selected', this.onTaskSelectedBound);
            document.removeEventListener('click', this.onClickOutsideBound);
            document.removeEventListener('gantt-create-task', this.onCreateTaskBound);
        });
    }

    get modelParams() {
        return {
            resModel: this.props.resModel,
            fields: this.props.fields,
            archInfo: this.props.archInfo,
        };
    }

    get scales() {
        return ["Quarter Day", "Half Day", "Day", "Week", "Month", "Year"];
    }

    get rendererProps() {
        return {
            model: this.model,
            openRecord: this.openRecord.bind(this),
            onTaskUpdate: this.onTaskUpdate.bind(this),
            filterUserId: this.state.filterUserId,
        };
    }

    get assignedUsers() {
        return this.model.getAssignedUsers();
    }

    onUserFilterChange(userId) {
        this.state.filterUserId = userId;
        // State change will trigger re-render automatically
    }

    onUserFilterSelectChange(ev) {
        const value = ev.target.value;
        const userId = value ? parseInt(value) : null;
        this.onUserFilterChange(userId);
    }

    onPrioritySelectChange(ev) {
        const priority = ev.target.value;
        this.onPriorityChange(priority);
    }

    async openRecord(params) {
        const { resId } = params;
        await this.actionService.doAction({
            type: "ir.actions.act_window",
            res_model: this.props.resModel,
            res_id: resId,
            views: [[false, "form"]],
            target: "current",
        });
    }

    async onTaskUpdate(recordId, changes, options = {}) {
        const { skipReload = false } = options;

        await this.model.updateRecord(recordId, changes);

        // Optimistic update: skip reload to prevent flickering
        // The visual state is already correct from the drag
        if (!skipReload) {
            await this.model.load({
                domain: this.props.domain,
                context: this.props.context,
            });
        }
    }

    onScaleChange(ev) {
        const scale = ev.target.value;
        this.state.scale = scale;
        this.model.setScale(scale);
        // Save preference
        this.savePreference('scale', scale);
    }

    onFullscreenClick() {
        const ganttView = document.querySelector('.o_gantt_view');
        if (!ganttView) return;

        const isFullscreen = ganttView.classList.toggle('fullscreen');
        const btn = document.querySelector('.o_gantt_fullscreen_btn');

        if (btn) {
            if (isFullscreen) {
                btn.innerHTML = '<span class="fullscreen-icon">✕</span>';
            } else {
                btn.innerHTML = '<span class="fullscreen-icon">⛶</span>';
            }
        }
    }

    savePreference(key, value) {
        try {
            const prefs = JSON.parse(localStorage.getItem('gantt_preferences') || '{}');
            prefs[key] = value;
            localStorage.setItem('gantt_preferences', JSON.stringify(prefs));
        } catch (e) {
            // Silently ignore
        }
    }

    // Handle task selection from renderer
    onTaskSelected(event) {
        const { taskId, taskName, taskPriority } = event.detail;

        this.state.selectedTask = {
            id: taskId,
            name: taskName,
            priority: taskPriority,
        };

        // Open the colors dropdown programmatically
        this.openColorsDropdown();
    }

    // Handle clicks outside to deselect task
    onClickOutside(event) {
        // Don't deselect if clicking on: task bar, priority selector, task name button, or control panel
        const isBarClick = event.target.closest('.bar-wrapper');
        const isPriorityClick = event.target.closest('.o_gantt_priority_selector');
        const isTaskNameClick = event.target.closest('.o_gantt_task_name_btn');
        const isControlPanelClick = event.target.closest('.o_control_panel');

        if (!isBarClick && !isPriorityClick && !isTaskNameClick && !isControlPanelClick && this.state.selectedTask) {
            this.state.selectedTask = null;
        }
    }

    openColorsDropdown() {
        // Find and click the colors dropdown button to open it
        setTimeout(() => {
            const dropdownBtn = document.querySelector('.o_gantt_colors_btn');
            if (dropdownBtn && !dropdownBtn.classList.contains('show')) {
                dropdownBtn.click();
            }
        }, 50);
    }

    // Change priority from the dropdown
    async onPriorityChange(priority) {
        if (!this.state.selectedTask) return;

        const taskId = parseInt(this.state.selectedTask.id);

        await this.onTaskUpdate(taskId, { priority: String(priority) });

        // Update local state
        this.state.selectedTask.priority = String(priority);
    }

    // Open the selected task form
    onOpenSelectedTask() {
        if (!this.state.selectedTask) return;

        const taskId = parseInt(this.state.selectedTask.id);
        this.openRecord({ resId: taskId });
    }

    // Get priority info for display
    get priorities() {
        return [
            { value: '3', label: 'Urgente', color: '#28a745' },
            { value: '2', label: 'Muito Alta', color: '#dc3545' },
            { value: '1', label: 'Alta', color: '#fd7e14' },
            { value: '0', label: 'Normal', color: '#714b67' },
        ];
    }

    getPriorityLabel(priority) {
        const found = this.priorities.find(p => p.value === priority);
        return found ? found.label : 'Normal';
    }

    getPriorityColor(priority) {
        const found = this.priorities.find(p => p.value === priority);
        return found ? found.color : '#714b67';
    }

    // Handle create task event (double-click on empty area)
    async onCreateTask(event) {
        const { date } = event.detail;

        // Get the date fields from archInfo
        const dateStartField = this.props.archInfo.dateStartField || "date_assign";
        const dateStopField = this.props.archInfo.dateStopField || "date_deadline";

        // Calculate end date (1 day after start)
        const startDate = new Date(date);
        const endDate = new Date(startDate);
        endDate.setDate(endDate.getDate() + 1);

        // Format dates
        const formatDate = (d) => {
            const year = d.getFullYear();
            const month = String(d.getMonth() + 1).padStart(2, '0');
            const day = String(d.getDate()).padStart(2, '0');
            return `${year}-${month}-${day}`;
        };

        // Get project_id from context if available
        const projectId = this.props.context?.default_project_id || this.props.context?.active_id;

        // Open form to create new task with pre-filled dates
        await this.actionService.doAction({
            type: "ir.actions.act_window",
            res_model: this.props.resModel,
            views: [[false, "form"]],
            target: "current",
            context: {
                ...this.props.context,
                default_project_id: projectId,
                [`default_${dateStartField}`]: formatDate(startDate),
                [`default_${dateStopField}`]: formatDate(endDate),
            },
        });
    }
}
