import HistoryIcon from "@mui/icons-material/History";
import Typography from "@mui/material/Typography";

import { ToolPanelButton } from "~utils/global/.toolPanelButton";

class AuditHistoryButton extends ToolPanelButton {
    static id = "audithistory";
    constructor() {
        super("audithistory", "Audit History", () => HistoryIcon, 700);
        this.description = (
            <>
                <Typography>
                    <i>See who changed what, and to what.</i>
                </Typography>
                <Typography>
                    This tool lists the <b>audit history of the record currently open</b>, one row per changed
                    attribute: date, user, action, attribute, old value and new value.
                </Typography>
                <Typography>
                    The rows can be <u>filtered by text and by date range</u>, and sorted on any column.
                </Typography>
                <Typography>
                    It needs auditing enabled on the table and the <b>View Audit History</b> privilege.
                </Typography>
            </>
        );
    }
}

export default AuditHistoryButton;
