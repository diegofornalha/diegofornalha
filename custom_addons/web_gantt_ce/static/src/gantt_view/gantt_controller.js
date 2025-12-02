/** @odoo-module **/

import { Component, useState } from "@odoo/owl";
import { useService, useBus } from "@web/core/utils/hooks";
import { useModelWithSampleData } from "@web/model/model";
import { Layout } from "@web/search/layout";
import { useSetupAction } from "@web/search/action_hook";
import { standardViewProps } from "@web/views/standard_view_props";
import { GanttRenderer } from "./gantt_renderer";

export class GanttController extends Component {
    static template = "web_gantt_ce.GanttController";
    static components = { Layout, GanttRenderer };
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
    }
}
