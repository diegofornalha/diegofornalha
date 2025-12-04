/** @odoo-module **/

import { Component, useState, useRef, onMounted } from "@odoo/owl";
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
        });

        this.colorsDropdownRef = useRef("colorsDropdown");

        onMounted(() => {
            // Listen for custom event from renderer
            document.addEventListener('gantt-task-selected', this.onTaskSelected.bind(this));
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
        };
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

    async onTaskUpdate(recordId, changes) {
        await this.model.updateRecord(recordId, changes);
        await this.model.load({
            domain: this.props.domain,
            context: this.props.context,
        });
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
                btn.innerHTML = '<span class="fullscreen-icon">✕</span> Sair';
            } else {
                btn.innerHTML = '<span class="fullscreen-icon">⛶</span> Expandir';
            }
        }
    }

    savePreference(key, value) {
        try {
            const prefs = JSON.parse(localStorage.getItem('gantt_preferences') || '{}');
            prefs[key] = value;
            localStorage.setItem('gantt_preferences', JSON.stringify(prefs));
        } catch (e) {
            console.warn('[Gantt] Could not save preference');
        }
    }

    // Handle task selection from renderer
    onTaskSelected(event) {
        const { taskId, taskName, taskPriority } = event.detail;
        console.log('[GanttController] Task selected:', taskId, taskName, taskPriority);

        this.state.selectedTask = {
            id: taskId,
            name: taskName,
            priority: taskPriority,
        };

        // Open the colors dropdown programmatically
        this.openColorsDropdown();
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
        console.log('[GanttController] Changing priority of task', taskId, 'to', priority);

        await this.onTaskUpdate(taskId, { priority: String(priority) });

        // Update local state
        this.state.selectedTask.priority = String(priority);
    }

    // Open the selected task form
    onOpenSelectedTask() {
        if (!this.state.selectedTask) return;

        const taskId = parseInt(this.state.selectedTask.id);
        console.log('[GanttController] Opening task form:', taskId);

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
}
