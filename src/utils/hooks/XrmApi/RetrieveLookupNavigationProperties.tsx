import { useEffect, useState } from 'react'
import { debugLog } from '../../global/common';

/**
 * Navigation property name to use in "<navproperty>@odata.bind", per target entity.
 * Polymorphic lookups (several Targets) need the target-qualified name, which is only
 * authoritative in the ManyToOne relationship metadata.
 */
export function RetrieveLookupNavigationProperties(entityname: string, attributename: string) {

    const [data, setData] = useState<{ [target: string]: string }>({});

    useEffect(() => {
        debugLog("RetrieveLookupNavigationProperties");
        if (!entityname || !attributename) {
            setData({});
            return;
        }
        async function fetchData() {
            const response = await fetch(
                Xrm.Utility.getGlobalContext().getClientUrl() +
                "/api/data/v9.0/EntityDefinitions(LogicalName='" + entityname +
                "')/ManyToOneRelationships?$select=ReferencedEntity,ReferencingEntityNavigationPropertyName&$filter=ReferencingAttribute eq '" + attributename + "'", {
                method: "GET",
                headers: {
                    "OData-MaxVersion": "4.0",
                    "OData-Version": "4.0",
                    "Content-Type": "application/json; charset=utf-8",
                    "Accept": "application/json"
                }
            });

            const results = await response.json();
            setData(Object.fromEntries(
                results.value?.map((r: any) => [r.ReferencedEntity, r.ReferencingEntityNavigationPropertyName]) ?? []
            ));
        }
        setData({});
        fetchData();

    }, [entityname, attributename]);

    return data;
}
