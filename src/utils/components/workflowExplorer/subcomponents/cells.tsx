import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import Box from "@mui/material/Box";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import { GridActionsCellItem, type GridColDef } from "@mui/x-data-grid";
import React from "react";

import { getRecordUrl } from "../../../global/common";
import useCopyWithSnack from "../../../hooks/use/useCopyWithSnack";
import DetailTooltip, { type DetailField } from "../../DetailTooltip";

export function StateDot(props: { color: string; label: string }) {
    return (
        <Tooltip title={props.label} disableInteractive arrow>
            <Box display="flex" alignItems="center" justifyContent="center" width="100%" height="100%">
                <Box width={10} height={10} borderRadius="50%" bgcolor={props.color} />
            </Box>
        </Tooltip>
    );
}

export function NameCell(props: { name: string; fields: DetailField[] }) {
    return (
        <DetailTooltip fields={props.fields}>
            <Typography variant="body2" noWrap lineHeight="normal" sx={{ cursor: "default" }}>
                {props.name}
            </Typography>
        </DetailTooltip>
    );
}

/** showInMenu must also sit on this wrapper: the grid reads it off the element
 * returned by getActions, not off the GridActionsCellItem inside. */
function CopyActionItem(props: { label: string; value: string; showInMenu?: boolean }) {
    const copy = useCopyWithSnack({ textPrefix: props.label });
    return (
        <GridActionsCellItem
            icon={<ContentCopyIcon />}
            label={`Copy ${props.label}`}
            onClick={() => copy(props.value)}
            showInMenu={props.showInMenu}
        />
    );
}

export type ActionLink = { label: string; url: string | null; icon: React.ReactElement };

/**
 * Actions menu shared by every grid. The row id comes from the grid's getRowId,
 * so each grid keeps its own primary key without configuring it twice.
 */
export function buildActionsColumn(entityName: string, getLinks?: (row: any) => ActionLink[]): GridColDef {
    return {
        type: "actions",
        field: "actions",
        headerName: "",
        width: 40,
        disableColumnMenu: true,
        sortable: false,
        resizable: false,
        hideable: false,
        getActions: (params) => [
            <GridActionsCellItem
                icon={<OpenInNewIcon />}
                label="Open record in new tab"
                onClick={() => window.open(getRecordUrl(entityName, String(params.id)), "_blank")}
                showInMenu
            />,
            <CopyActionItem label="id" value={String(params.id)} showInMenu />,
            <CopyActionItem label="name" value={params.row.name} showInMenu />,
            ...(getLinks?.(params.row) ?? [])
                .filter((link) => link.url)
                .map((link) => (
                    <GridActionsCellItem
                        icon={link.icon}
                        label={link.label}
                        onClick={() => window.open(link.url!, "_blank")}
                        showInMenu
                    />
                ))
        ]
    };
}
