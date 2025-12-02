/** @odoo-module **/

import { Model } from "@web/model/model";
import { KeepLast } from "@web/core/utils/concurrency";

export class GanttModel extends Model {
    static services = ["orm"];

    setup(params, services) {
        this.keepLast = new KeepLast();
        this.orm = services.orm;

        this.resModel = params.resModel;
        this.fields = params.fields;
        this.archInfo = params.archInfo;

        this.meta = {
            resModel: params.resModel,
            dateStartField: params.archInfo.dateStartField || "date_assign",
            dateStopField: params.archInfo.dateStopField || "date_deadline",
            scale: params.archInfo.defaultScale || "Day",
            progressField: params.archInfo.progressField || "progress",
            dependencyField: params.archInfo.dependencyField || "depend_on_ids",
            fieldNames: this._getFieldNames(params.archInfo),
        };

        this.data = {
            records: [],
        };
    }

    _getFieldNames(archInfo) {
        const fieldNames = new Set([
            "id",
            "display_name",
            "name",
            archInfo.dateStartField || "date_assign",
            archInfo.dateStopField || "date_deadline",
            archInfo.progressField || "progress",
            "priority",
            archInfo.dependencyField || "depend_on_ids",
            "create_date",
        ]);
        return [...fieldNames];
    }

    async load(params = {}) {
        Object.assign(this.meta, params);
        const domain = params.domain || [];
        const context = params.context || {};

        try {
            const result = await this.keepLast.add(
                this.orm.searchRead(
                    this.resModel,
                    domain,
                    this.meta.fieldNames,
                    { context }
                )
            );

            this.data.records = result.map((record) => ({
                resId: record.id,
                data: record,
            }));
        } catch (e) {
            console.error("GanttModel load error:", e);
            this.data.records = [];
        }

        this.notify();
    }

    hasData() {
        return this.data.records.length > 0;
    }

    async updateRecord(recordId, changes) {
        await this.orm.write(this.resModel, [recordId], changes);
    }

    setScale(scale) {
        this.meta.scale = scale;
        this.notify();
    }

    get scale() {
        return this.meta.scale;
    }

    get records() {
        return this.data.records;
    }

    get dateStartField() {
        return this.meta.dateStartField;
    }

    get dateStopField() {
        return this.meta.dateStopField;
    }
}
