
export type AuditRow = {
    /** `<auditid>` for an event with no attribute detail, `<auditid>:<attribute>` otherwise. */
    id: string,
    /** Kept for the date range filter: the grid displays dateFormatted. */
    date: Date,
    dateFormatted: string,
    user: string,
    action: string,
    attribute: string,
    oldValue: string,
    newValue: string,
}
