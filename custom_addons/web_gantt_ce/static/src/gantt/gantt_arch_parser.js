/** @odoo-module **/

import { exprToBoolean } from "@web/core/utils/strings";
import { visitXML } from "@web/core/utils/xml";

const SCALES = ["day", "week", "month", "year"];

export class GanttArchParser {
    parse(xmlDoc, models, modelName) {
        const fields = models[modelName]?.fields || {};
        const fieldNames = new Set(["display_name"]);
        const fieldMapping = {};

        // Get main attributes
        const dateStart = xmlDoc.getAttribute("date_start");
        const dateStop = xmlDoc.getAttribute("date_stop");
        const defaultGroupBy = xmlDoc.getAttribute("default_group_by");
        const color = xmlDoc.getAttribute("color");
        const progress = xmlDoc.getAttribute("progress");

        if (dateStart) {
            fieldMapping.date_start = dateStart;
            fieldNames.add(dateStart);
        }
        if (dateStop) {
            fieldMapping.date_stop = dateStop;
            fieldNames.add(dateStop);
        }
        if (defaultGroupBy) {
            fieldMapping.default_group_by = defaultGroupBy;
            fieldNames.add(defaultGroupBy);
        }
        if (color) {
            fieldMapping.color = color;
            fieldNames.add(color);
        }
        if (progress) {
            fieldMapping.progress = progress;
            fieldNames.add(progress);
        }

        // Parse scales
        let scales = [...SCALES];
        const scalesAttr = xmlDoc.getAttribute("scales");
        if (scalesAttr) {
            scales = scalesAttr.split(",").map(s => s.trim()).filter((scale) => SCALES.includes(scale));
        }
        let scale = scales.includes("month") ? "month" : scales[0];
        const defaultScale = xmlDoc.getAttribute("default_scale");
        if (defaultScale && scales.includes(defaultScale)) {
            scale = defaultScale;
        }

        // Parse booleans
        const canCreate = exprToBoolean(xmlDoc.getAttribute("create"), true);
        const canDelete = exprToBoolean(xmlDoc.getAttribute("delete"), true);
        const canEdit = exprToBoolean(xmlDoc.getAttribute("edit"), true);

        // Parse optional attributes
        const formViewId = parseInt(xmlDoc.getAttribute("form_view_id"), 10) || false;
        const jsClass = xmlDoc.getAttribute("js_class") || null;

        // Parse decorations
        const decorations = {};
        const decorationAttrs = ["decoration-danger", "decoration-warning", "decoration-success", "decoration-info"];
        for (const attr of decorationAttrs) {
            const value = xmlDoc.getAttribute(attr);
            if (value) {
                decorations[attr.replace("decoration-", "")] = value;
            }
        }

        // Parse field nodes
        const popoverFieldNodes = {};
        visitXML(xmlDoc, (node) => {
            if (node.tagName === "field") {
                const fieldName = node.getAttribute("name");
                if (fieldName) {
                    fieldNames.add(fieldName);
                    popoverFieldNodes[fieldName] = {
                        name: fieldName,
                        invisible: exprToBoolean(node.getAttribute("invisible"), false),
                        widget: node.getAttribute("widget"),
                    };
                }
            }
        });

        return {
            canCreate,
            canDelete,
            canEdit,
            dateStart,
            dateStop,
            defaultGroupBy,
            color,
            progress,
            decorations,
            fieldMapping,
            fieldNames: [...fieldNames],
            formViewId,
            jsClass,
            popoverFieldNodes,
            scale,
            scales,
        };
    }
}
