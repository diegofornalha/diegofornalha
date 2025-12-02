/** @odoo-module **/

import { serializeDate, serializeDateTime, deserializeDate, deserializeDateTime } from "@web/core/l10n/dates";
import { KeepLast } from "@web/core/utils/concurrency";
import { Model } from "@web/model/model";

const { DateTime } = luxon;

export class GanttModel extends Model {
    static services = ["orm", "notification"];

    setup(params, { orm, notification }) {
        this.keepLast = new KeepLast();
        this.orm = orm;
        this.notification = notification;

        this.meta = {
            ...params,
            resModel: params.resModel,
            fields: params.fields || {},
            archInfo: params.archInfo || {},
        };

        this.data = {
            records: {},
            groups: [],
            range: null,
        };
    }

    async load(params = {}) {
        Object.assign(this.meta, params);

        if (!this.meta.date) {
            this.meta.date = params.context?.initial_date
                ? deserializeDateTime(params.context.initial_date).startOf("day")
                : DateTime.local().startOf("day");
        }

        const data = { ...this.data };
        await this.keepLast.add(this.updateData(data));
        this.data = data;
        this.notify();
    }

    get records() {
        return Object.values(this.data.records);
    }

    get groups() {
        return this.data.groups;
    }

    get scale() {
        return this.meta.archInfo.scale || "month";
    }

    get scales() {
        return this.meta.archInfo.scales || ["day", "week", "month", "year"];
    }

    get canCreate() {
        return this.meta.archInfo.canCreate;
    }

    get canEdit() {
        return this.meta.archInfo.canEdit;
    }

    get canDelete() {
        return this.meta.archInfo.canDelete;
    }

    get resModel() {
        return this.meta.resModel;
    }

    get formViewId() {
        return this.meta.archInfo.formViewId;
    }

    get exportedState() {
        return { date: this.meta.date };
    }

    async updateData(data) {
        data.range = this.computeRange();
        data.records = await this.loadRecords(data);
        data.groups = this.groupRecords(data.records);
    }

    computeRange() {
        const { scale } = this.meta.archInfo;
        const date = this.meta.date || DateTime.local();

        let start = date.startOf(scale === "week" ? "week" : scale);
        let end = date.endOf(scale === "week" ? "week" : scale);

        // Extend range for month view
        if (scale === "month") {
            start = start.startOf("week");
            end = end.endOf("week");
        }

        return { start, end };
    }

    async loadRecords(data) {
        const { resModel, archInfo, context, domain } = this.meta;
        const fieldNames = archInfo.fieldNames || ["display_name"];

        const rawRecords = await this.orm.searchRead(
            resModel,
            domain || [],
            [...new Set([...fieldNames, "id", "display_name"])],
            { context: context || {} }
        );

        const records = {};
        for (const rawRecord of rawRecords) {
            records[rawRecord.id] = this.normalizeRecord(rawRecord);
        }
        return records;
    }

    normalizeRecord(rawRecord) {
        const { archInfo } = this.meta;
        const { dateStart, dateStop, progress, color, defaultGroupBy } = archInfo;

        const startValue = rawRecord[dateStart];
        const stopValue = rawRecord[dateStop] || rawRecord[dateStart];

        let start = null;
        let end = null;

        if (startValue) {
            start = startValue.includes("T") || startValue.includes(" ")
                ? deserializeDateTime(startValue)
                : deserializeDate(startValue);
        }
        if (stopValue) {
            end = stopValue.includes("T") || stopValue.includes(" ")
                ? deserializeDateTime(stopValue)
                : deserializeDate(stopValue);
        }

        const groupValue = defaultGroupBy ? rawRecord[defaultGroupBy] : null;
        let groupId = null;
        let groupName = "Sem grupo";

        if (Array.isArray(groupValue)) {
            groupId = groupValue[0];
            groupName = groupValue[1] || `ID ${groupValue[0]}`;
        } else if (groupValue) {
            groupId = groupValue;
            groupName = String(groupValue);
        }

        return {
            id: rawRecord.id,
            title: rawRecord.display_name || `Record ${rawRecord.id}`,
            start,
            end,
            progress: progress ? (rawRecord[progress] || 0) : 0,
            colorIndex: color ? rawRecord[color] : null,
            groupId,
            groupName,
            rawRecord,
        };
    }

    groupRecords(records) {
        const { defaultGroupBy } = this.meta.archInfo;

        if (!defaultGroupBy) {
            return [{ id: "__all__", name: "Todas as tarefas", records: Object.values(records) }];
        }

        const groups = {};
        for (const record of Object.values(records)) {
            const key = record.groupId ?? "__undefined__";
            if (!groups[key]) {
                groups[key] = {
                    id: key,
                    name: record.groupName,
                    records: [],
                };
            }
            groups[key].records.push(record);
        }

        return Object.values(groups);
    }

    async createRecord(values) {
        const { resModel, archInfo, context } = this.meta;
        const data = {
            [archInfo.dateStart]: serializeDateTime(values.start),
        };
        if (archInfo.dateStop) {
            data[archInfo.dateStop] = serializeDateTime(values.end);
        }
        if (values.name) {
            data.name = values.name;
        }

        const id = await this.orm.create(resModel, [data], { context });
        await this.load();
        return id;
    }

    async updateRecord(recordId, changes) {
        const { resModel, archInfo, context } = this.meta;
        const data = {};

        if (changes.start) {
            data[archInfo.dateStart] = serializeDateTime(DateTime.fromJSDate(changes.start));
        }
        if (changes.end && archInfo.dateStop) {
            data[archInfo.dateStop] = serializeDateTime(DateTime.fromJSDate(changes.end));
        }
        if (changes.progress !== undefined && archInfo.progress) {
            data[archInfo.progress] = changes.progress;
        }

        await this.orm.write(resModel, [recordId], data, { context });
        await this.load();
    }

    async deleteRecord(recordId) {
        await this.orm.unlink(this.meta.resModel, [recordId]);
        await this.load();
    }
}
