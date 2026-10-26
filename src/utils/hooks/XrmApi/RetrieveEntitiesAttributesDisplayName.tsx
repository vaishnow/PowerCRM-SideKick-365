import { useEffect, useState } from "react";

import { debugLog } from "../../global/common";

/**
 * Display names of attributes spread over several entities, keyed `entity.attribute`. An entity
 * whose metadata cannot be read is left out, so its attributes keep their logical name.
 */
export function RetrieveEntitiesAttributesDisplayName(keys: string[]) {
    const [data, setData] = useState<Record<string, string>>({});

    // The callers rebuild the array on every render: the effect follows its content instead.
    const _keys = keys.join(",");

    useEffect(() => {
        debugLog("RetrieveEntitiesAttributesDisplayName");
        if (!_keys) return;

        const attributesByEntity: Record<string, string[]> = {};
        _keys.split(",").forEach((key) => {
            const [entityName, attribute] = key.split(".");
            (attributesByEntity[entityName] ??= []).push(attribute);
        });

        async function fetchData() {
            const results = await Promise.allSettled(
                Object.entries(attributesByEntity).map(async ([entityName, attributes]) => {
                    const metadata = await Xrm.Utility.getEntityMetadata(entityName, attributes);
                    return metadata.Attributes.get().map(
                        (attribute) => [`${entityName}.${attribute.LogicalName}`, attribute.DisplayName] as const
                    );
                })
            );

            const names: Record<string, string> = {};
            results.forEach((result) => {
                if (result.status === "rejected") {
                    debugLog("RetrieveEntitiesAttributesDisplayName", result.reason);
                    return;
                }
                result.value.forEach(([key, name]) => {
                    if (name) names[key] = name;
                });
            });
            setData(names);
        }
        fetchData();
    }, [_keys]);

    return data;
}
