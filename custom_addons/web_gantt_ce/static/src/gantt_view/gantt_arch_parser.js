/** @odoo-module **/

export class GanttArchParser {
    parse(xmlDoc, models, modelName) {
        // xmlDoc já é um Element XML, não uma string
        // Verificar se o elemento raiz é <gantt> ou procurar dentro dele
        let ganttNode = xmlDoc;
        if (xmlDoc.tagName !== "gantt") {
            ganttNode = xmlDoc.querySelector("gantt");
        }

        if (!ganttNode) {
            throw new Error("Gantt view requires a <gantt> root element");
        }

        return {
            dateStartField: ganttNode.getAttribute("date_start") || "date_assign",
            dateStopField: ganttNode.getAttribute("date_stop") || "date_deadline",
            defaultScale: ganttNode.getAttribute("default_scale") || "Day",
            progressField: ganttNode.getAttribute("progress") || "progress",
            colorField: ganttNode.getAttribute("color") || null,
            dependencyField: ganttNode.getAttribute("dependency_field") || "depend_on_ids",
        };
    }
}
