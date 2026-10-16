
export type AuditRow = {
    /** `<auditid>` for an event with no attribute detail, `<auditid>:<attribute>` otherwise. */
    id: string,
    date: Date,
    user: string,
    /** Guid behind `user`, for the link to the systemuser record. */
    userId: string,
    action: string,
    attribute: string,
    oldValue: string,
    newValue: string,
    /** Target of oldValue/newValue when the changed column is a lookup, else empty. */
    oldEntity: string,
    oldId: string,
    newEntity: string,
    newId: string,
    /** Raw audit columns, hidden in the grid by default. Event level: an audit record fanning out
     * to several attribute rows repeats these on each of them. */
    auditid: string,
    operation: string,
    objectTypeCode: string,
    attributeMask: string,
    changeData: string,
    transactionId: string,
    callingUser: string,
    callingUserId: string,
    userAdditionalInfo: string,
    /** The audited record this row was fetched for: several can be viewed together. */
    sourceEntityName: string,
    sourceRecordId: string,
}

export type AuditSource = {
    entityName: string,
    recordId: string,
}
