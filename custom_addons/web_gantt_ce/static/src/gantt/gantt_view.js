/** @odoo-module **/

import { registry } from "@web/core/registry";
import { GanttArchParser } from "./gantt_arch_parser";
import { GanttModel } from "./gantt_model";
import { GanttController } from "./gantt_controller";
import { GanttRenderer } from "./gantt_renderer";

export const ganttView = {
    type: "gantt",

    display_name: "Gantt",
    icon: "fa fa-tasks",
    multiRecord: true,
    searchMenuTypes: ["filter", "favorite"],

    ArchParser: GanttArchParser,
    Controller: GanttController,
    Model: GanttModel,
    Renderer: GanttRenderer,

    buttonTemplate: "web_gantt_ce.GanttController.controlButtons",

    props: (genericProps, view) => {
        const { ArchParser } = view;
        const { arch, relatedModels, resModel } = genericProps;
        const archInfo = new ArchParser().parse(arch, relatedModels, resModel);
        return {
            ...genericProps,
            Model: view.Model,
            Renderer: view.Renderer,
            buttonTemplate: view.buttonTemplate,
            archInfo,
        };
    },
};

registry.category("views").add("gantt", ganttView);
