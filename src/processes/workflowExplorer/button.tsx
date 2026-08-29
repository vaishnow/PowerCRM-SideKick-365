import AccountTreeIcon from "@mui/icons-material/AccountTree";
import Typography from "@mui/material/Typography";

import { ToolPanelButton } from "~utils/global/.toolPanelButton";

class WorkflowExplorerButton extends ToolPanelButton {
    static id = "workflowexplorer";
    constructor() {
        super("workflowexplorer", "Workflows", () => AccountTreeIcon, 500);
        this.description = (
            <>
                <Typography>
                    <i>See every automation attached to a table.</i>
                </Typography>
                <Typography>
                    Select an entity to list its <b>workflows</b>, <b>dialogs</b>, <b>business rules</b>, <b>actions</b>
                    , <b>business process flows</b>, <b>cloud flows</b> and <b>plugin steps</b>.
                </Typography>
                <Typography>
                    Each row is compact: <u>hover a name</u> to see its full configuration, triggers and filtering
                    attributes.
                </Typography>
            </>
        );
    }
}

export default WorkflowExplorerButton;
