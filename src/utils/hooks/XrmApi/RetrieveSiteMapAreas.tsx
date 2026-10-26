import { useState, useEffect, useMemo } from 'react'
import { debugLog, debugError } from '../../global/common';
import { RetrieveEntities } from './RetrieveEntities';

export interface SiteMapSubArea {
    id: string
    title: string
    entity?: string
}

export interface SiteMapArea {
    id: string
    title: string
    subAreas: SiteMapSubArea[]
}

/**
 * The default sitemap labels its elements with a ResourceId pointing at a server resource string,
 * which is not exposed over the Web API. Derive something readable from the id itself.
 */
function prettifyResourceId(resourceId: string) {
    const lastSegment = resourceId.split(/[._]/).filter(Boolean).pop() ?? resourceId;
    return lastSegment.replace(/([a-z0-9])([A-Z])/g, "$1 $2");
}

// Solution component type for SiteMap, used to link an app module to its sitemap.
const COMPONENTTYPE_SITEMAP = 62;

async function retrieveSiteMapXml(appModuleIdUnique: string | null) {
    if (appModuleIdUnique) {
        const components = await Xrm.WebApi.online.retrieveMultipleRecords("appmodulecomponent",
            `?$select=objectid&$filter=componenttype eq ${COMPONENTTYPE_SITEMAP} and _appmoduleidunique_value eq ${appModuleIdUnique}`);

        const siteMapId = components.entities[0]?.["objectid"];
        if (!siteMapId) return null;

        const siteMap = await Xrm.WebApi.online.retrieveRecord("sitemap", siteMapId, "?$select=sitemapxml");
        return siteMap?.["sitemapxml"] ?? null;
    }

    const result = await Xrm.WebApi.online.retrieveMultipleRecords("sitemap", "?$select=sitemapxml&$filter=isappaware eq false");
    return result.entities[0]?.["sitemapxml"] ?? null;
}

/**
 * usersettings.homepagearea / homepagesubarea store SiteMap Area and SubArea ids.
 * Pass an app module unique id to read that app's sitemap, or null for the classic default one.
 */
export function RetrieveSiteMapAreas(appModuleIdUnique: string | null): [SiteMapArea[], boolean] {

    const [data, setData] = useState<SiteMapArea[]>([]);
    const [isFetching, setFetching] = useState<boolean>(true);

    const [entities] = RetrieveEntities();

    useEffect(() => {
        debugLog("RetrieveSiteMapAreas");

        async function fetchData() {
            try {
                const sitemapXml = await retrieveSiteMapXml(appModuleIdUnique);

                if (!sitemapXml) {
                    setData([]);
                    setFetching(false);
                    return;
                }

                const document = new DOMParser().parseFromString(sitemapXml, "text/xml");
                const languageId = Xrm.Utility.getGlobalContext().userSettings.languageId;

                const titleOf = (element: Element) => {
                    const titles = Array.from(element.querySelectorAll(":scope > Titles > Title"));
                    const localized = titles.find(title => title.getAttribute("LCID") === String(languageId)) ?? titles[0];
                    return localized?.getAttribute("Title") || element.getAttribute("Title") || "";
                };

                const areas = Array.from(document.querySelectorAll("SiteMap > Area")).map<SiteMapArea>(area => {
                    const areaId = area.getAttribute("Id") ?? "";
                    const areaResourceId = area.getAttribute("ResourceId") ?? "";
                    return {
                        id: areaId,
                        title: titleOf(area) || (areaResourceId && prettifyResourceId(areaResourceId)) || areaId,
                        subAreas: Array.from(area.querySelectorAll("Group > SubArea")).map<SiteMapSubArea>(subArea => {
                            const subAreaId = subArea.getAttribute("Id") ?? "";
                            const subAreaResourceId = subArea.getAttribute("ResourceId") ?? "";
                            return {
                                id: subAreaId,
                                // Left empty when only a ResourceId is available, so the entity display name can win below.
                                title: titleOf(subArea) || (subAreaResourceId && prettifyResourceId(subAreaResourceId)) || subAreaId,
                                entity: subArea.getAttribute("Entity") ?? undefined
                            };
                        })
                    };
                });

                setData(areas.filter(area => area.id));
            }
            catch (error) {
                debugError("RetrieveSiteMapAreas", error);
                setData([]);
            }

            setFetching(false);
        }

        setData([]);
        setFetching(true);
        fetchData();

    }, [appModuleIdUnique]);

    // Entity subareas get their real display name from metadata, which beats any id-derived guess.
    const areasWithEntityNames = useMemo(() => {
        if (entities.length === 0) return data;

        const nameByLogicalName = new Map(entities.map(entity => [entity.logicalname, entity.name]));

        return data.map(area => ({
            ...area,
            subAreas: area.subAreas.map(subArea => ({
                ...subArea,
                title: (subArea.entity && nameByLogicalName.get(subArea.entity)) || subArea.title
            }))
        }));
    }, [data, entities]);

    return [areasWithEntityNames, isFetching];
}
