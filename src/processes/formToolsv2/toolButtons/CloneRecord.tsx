import { useContext, useEffect, useState } from 'react';

import FileCopyIcon from '@mui/icons-material/FileCopy';
import { Checkbox, ListItemText, ListSubheader, Menu, MenuItem } from '@mui/material';
import dayjs from 'dayjs';

import { formatId, getCurrentDynamics365DateTimeFormat, GetPrimaryIdAttribute } from '../../../utils/global/common';
import MessageManager from '../../../utils/global/MessageManager';
import { STORAGE_CloneIgnoredFields } from '../../../utils/global/var';
import { useEffectOnce } from '../../../utils/hooks/use/useEffectOnce';
import { MessageType } from '../../../utils/types/Message';
import { type IToolButtonStandard, FormToolButton } from '../shared/FormToolButton';
import { FormToolContext } from '../shared/context';

const ignorableFields = ["statecode", "statuscode", "createdon", "createdby", "modifiedon", "modifiedby", "versionnumber", "ownerid"];
const polymorphicLookups = ["ownerid", "customerid", "regardingobjectid"];
const extraqsMaxLength = 1800;

// extraqs values are encoded twice: once here for the separators, once by encodeURIComponent on the whole string.
function escapeExtraqsValue(value: string) {
    return value.replace(/%/g, "%25").replace(/=/g, "%3D").replace(/&/g, "%26");
}

function buildExtraqs(pairs: [string, string][]) {
    return encodeURIComponent(pairs.map(([key, value]) => `${key}=${escapeExtraqsValue(value)}`).join("&"));
}

function toExtraqsPairs(attribute: Xrm.Attributes.Attribute, skippedFields: string[]): [string, string][] {
    const name = attribute.getName();
    if (skippedFields.includes(name)) return [];

    const value = attribute.getValue();
    if (value === null || value === undefined || (Array.isArray(value) && value.length === 0)) return [];

    switch (attribute.getAttributeType()) {
        case "lookup": {
            const lookup = (value as Xrm.LookupValue[])[0];
            if (!lookup) return [];
            const pairs: [string, string][] = [[name, lookup.id], [`${name}name`, lookup.name ?? ""]];
            if (polymorphicLookups.includes(name)) pairs.push([`${name}type`, lookup.entityType]);
            return pairs;
        }
        case "datetime": {
            const dateTimeFormat = getCurrentDynamics365DateTimeFormat();
            const isDateOnly = (attribute as Xrm.Attributes.DateAttribute).getFormat() === "date";
            return [[name, dayjs(value as Date).format(isDateOnly ? dateTimeFormat.ShortDatePattern : dateTimeFormat.ShortDateTimePattern)]];
        }
        case "multiselectoptionset":
            return [[name, `[${(value as number[]).join(",")}]`]];
        case "boolean":
            return [[name, value ? "true" : "false"]];
        default:
            return [[name, String(value)]];
    }
}

function CloneRecord(props: IToolButtonStandard) {

    const { formContext } = useContext(FormToolContext);

    const [ignoredFields, setIgnoredFields] = useState<string[]>(ignorableFields);
    const [primaryIdAttribute, setPrimaryIdAttribute] = useState<string>("");
    const [contextMenu, setContextMenu] = useState<{ mouseX: number, mouseY: number } | null>(null);

    useEffectOnce(() => {
        MessageManager.sendMessage(MessageType.GETCONFIGURATION, { key: STORAGE_CloneIgnoredFields }).then(
            function (response: string[] | null) {
                setIgnoredFields(response ?? ignorableFields);
            }
        );
    });

    // Resolved ahead of the click so that openClonedRecord stays synchronous: an awaited call before
    // window.open breaks the user gesture chain and gets the tab blocked as a popup.
    useEffect(() => {
        const entityName = formContext?.data?.entity?.getEntityName();
        if (!entityName) return;
        GetPrimaryIdAttribute(entityName).then(setPrimaryIdAttribute);
    }, [formContext]);

    const toggleIgnoredField = (fieldName: string) => {
        const updatedIgnoredFields = ignoredFields.includes(fieldName)
            ? ignoredFields.filter(field => field !== fieldName)
            : [...ignoredFields, fieldName];

        setIgnoredFields(updatedIgnoredFields);
        MessageManager.sendMessage(MessageType.SETCONFIGURATION, { key: STORAGE_CloneIgnoredFields, configurations: updatedIgnoredFields });
    }

    const openContextMenu = (event: React.MouseEvent<HTMLElement>) => {
        event.preventDefault();
        setContextMenu({ mouseX: event.clientX, mouseY: event.clientY });
    }

    const openClonedRecord = () => {
        if (!formContext?.data?.entity) {
            Xrm.Navigation.openAlertDialog({ text: "No record form found. Open a record before cloning." });
            return;
        }

        const entityName = formContext.data.entity.getEntityName();
        const skippedFields = primaryIdAttribute ? [...ignoredFields, primaryIdAttribute] : ignoredFields;

        const formId = formContext.ui?.formSelector?.getCurrentItem?.()?.getId?.();
        const formIdPairs: [string, string][] = formId ? [["formid", formatId(formId)]] : [];

        const keptPairs = formContext.getAttribute().flatMap(attribute => toExtraqsPairs(attribute, skippedFields));

        const droppedFields: string[] = [];
        while (keptPairs.length && buildExtraqs([...keptPairs, ...formIdPairs]).length > extraqsMaxLength) {
            const longestIndex = keptPairs.reduce((longest, pair, index) => pair[1].length > keptPairs[longest][1].length ? index : longest, 0);
            droppedFields.push(keptPairs[longestIndex][0]);
            keptPairs.splice(longestIndex, 1);
        }

        const appId = new URLSearchParams(window.location.search).get("appid");
        const url = `${window.location.origin}${window.location.pathname}?pagetype=entityrecord&etn=${entityName}${appId ? `&appid=${appId}` : ""}&extraqs=${buildExtraqs([...keptPairs, ...formIdPairs])}`;

        window.open(url, "_blank");

        if (droppedFields.length) {
            Xrm.Navigation.openAlertDialog({ text: `The clone URL was too long. These fields were not copied: ${droppedFields.join(", ")}.` });
        }
    }

    return (
        <>
            <FormToolButton
                controlled={false}
                icon={<FileCopyIcon />}
                tooltip='Clone Record'
                onClick={openClonedRecord}
                onContextMenu={openContextMenu}
            />
            <Menu
                open={contextMenu !== null}
                onClose={() => setContextMenu(null)}
                anchorReference='anchorPosition'
                anchorPosition={contextMenu ? { top: contextMenu.mouseY, left: contextMenu.mouseX } : undefined}
            >
                <ListSubheader>Fields ignored when cloning</ListSubheader>
                {ignorableFields.map(fieldName => (
                    <MenuItem key={fieldName} dense onClick={() => toggleIgnoredField(fieldName)}>
                        <Checkbox checked={ignoredFields.includes(fieldName)} size='small' />
                        <ListItemText primary={fieldName} />
                    </MenuItem>
                ))}
            </Menu>
        </>
    );
}

export default CloneRecord;
