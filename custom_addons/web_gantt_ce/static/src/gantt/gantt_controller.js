/** @odoo-module **/

import { _t } from "@web/core/l10n/translation";
import { useService } from "@web/core/utils/hooks";
import { Layout } from "@web/search/layout";
import { useModelWithSampleData } from "@web/model/model";
import { useSetupAction } from "@web/search/action_hook";
import { standardViewProps } from "@web/views/standard_view_props";
import { ViewScaleSelector } from "@web/views/view_components/view_scale_selector";
import { SearchBar } from "@web/search/search_bar/search_bar";
import { CogMenu } from "@web/search/cog_menu/cog_menu";

import { Component, useState } from "@odoo/owl";

export const SCALE_LABELS = {
    day: _t("Dia"),
    week: _t("Semana"),
    month: _t("Mês"),
    year: _t("Ano"),
};

export class GanttController extends Component {
    static components = {
        Layout,
        SearchBar,
        ViewScaleSelector,
        CogMenu,
    };
    static template = "web_gantt_ce.GanttController";
    static props = {
        ...standardViewProps,
        Model: Function,
        Renderer: Function,
        archInfo: Object,
        buttonTemplate: { type: String, optional: true },
    };

    setup() {
        this.action = useService("action");
        this.orm = useService("orm");

        this.model = useModelWithSampleData(this.props.Model, this.modelParams);

        useSetupAction({
            getLocalState: () => this.model.exportedState,
        });

        this.state = useState({
            scale: this.props.archInfo.scale || "month",
        });
    }

    get modelParams() {
        const { archInfo, resModel, fields, domain, context } = this.props;
        return {
            archInfo,
            resModel,
            fields,
            domain,
            context,
        };
    }

    get rendererProps() {
        return {
            model: this.model,
            archInfo: this.props.archInfo,
            openRecord: this.openRecord.bind(this),
            onRecordUpdate: this.onRecordUpdate.bind(this),
        };
    }

    get scaleLabels() {
        return SCALE_LABELS;
    }

    get scales() {
        return this.props.archInfo.scales || ["day", "week", "month", "year"];
    }

    setScale(scale) {
        this.state.scale = scale;
        this.model.load({ scale });
    }

    async openRecord(record) {
        await this.action.doAction({
            type: "ir.actions.act_window",
            res_model: this.props.resModel,
            res_id: record.id,
            views: [[this.props.archInfo.formViewId || false, "form"]],
            target: "current",
        });
    }

    async onRecordUpdate(record, changes) {
        await this.model.updateRecord(record.id, changes);
    }

    async setDate(move) {
        const { DateTime } = luxon;
        let date = this.model.meta.date || DateTime.local();
        const scale = this.state.scale || "month";

        switch (move) {
            case "next":
                date = date.plus({ [`${scale}s`]: 1 });
                break;
            case "previous":
                date = date.minus({ [`${scale}s`]: 1 });
                break;
            case "today":
                date = DateTime.local().startOf("day");
                break;
        }
        await this.model.load({ date });
    }
}
