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
            archInfo.dependencyField || "depend_on_ids",
            "priority",
            "sequence",
            "parent_id",
            "create_date",
            "user_ids",  // For user avatars
        ]);
        return [...fieldNames];
    }

    async load(searchParams = {}) {
        const domain = searchParams.domain || [];
        const context = searchParams.context || {};

        console.log("[GanttModel] load called with domain:", domain);
        console.log("[GanttModel] resModel:", this.resModel);
        console.log("[GanttModel] fieldNames:", this.meta.fieldNames);

        try {
            const result = await this.keepLast.add(
                this.orm.searchRead(
                    this.resModel,
                    domain,
                    this.meta.fieldNames,
                    { context, order: "sequence, id" }
                )
            );

            console.log("[GanttModel] searchRead result:", result);

            // Collect all user IDs to fetch their names
            const allUserIds = new Set();
            result.forEach(record => {
                const userIds = record.user_ids || [];
                userIds.forEach(id => allUserIds.add(id));
            });

            // Fetch user names
            let userNames = {};
            if (allUserIds.size > 0) {
                try {
                    const users = await this.orm.searchRead(
                        'res.users',
                        [['id', 'in', [...allUserIds]]],
                        ['id', 'name'],
                        { context }
                    );
                    users.forEach(user => {
                        userNames[user.id] = user.name;
                    });
                    console.log("[GanttModel] User names loaded:", userNames);
                } catch (e) {
                    console.warn("[GanttModel] Could not load user names:", e);
                }
            }

            this.data.records = result.map((record) => ({
                resId: record.id,
                data: {
                    ...record,
                    _userNames: userNames, // Store user names for avatar lookup
                },
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
