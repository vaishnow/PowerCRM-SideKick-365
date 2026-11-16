import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import IconButton from "@mui/material/IconButton";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import Tooltip from "@mui/material/Tooltip";
import { useState } from "react";

import { getRecordUrls } from "../global/common";

interface OpenRecordButtonProps {
    entityName: string;
    recordId: string;
    tooltip?: string;
}

function OpenRecordButton(props: OpenRecordButtonProps) {
    const { entityName, recordId, tooltip } = props;

    const [anchorElement, setAnchorElement] = useState<HTMLElement | null>(null);

    const open = (url: string) => {
        window.open(url, "_blank");
        setAnchorElement(null);
    };

    const urls = anchorElement ? getRecordUrls(entityName, recordId) : null;

    return (
        <>
            <Tooltip title={tooltip ?? "Open record"} disableInteractive>
                <IconButton size="small" onClick={(event) => setAnchorElement(event.currentTarget)}>
                    <OpenInNewIcon fontSize="small" />
                </IconButton>
            </Tooltip>

            <Menu anchorEl={anchorElement} open={!!anchorElement} onClose={() => setAnchorElement(null)}>
                <MenuItem onClick={() => urls && open(urls.uci)}>Unified Interface</MenuItem>
                <MenuItem onClick={() => urls && open(urls.legacy)}>Legacy</MenuItem>
                <MenuItem onClick={() => urls && open(urls.admin)}>Admin center (list)</MenuItem>
            </Menu>
        </>
    );
}

export default OpenRecordButton;
