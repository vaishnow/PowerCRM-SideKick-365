import ManageAccountsIcon from "@mui/icons-material/ManageAccounts";
import Typography from "@mui/material/Typography";

import { ToolPanelButton } from "~utils/global/.toolPanelButton";

class SecurityExplorerButton extends ToolPanelButton {
    static id = "securityexplorer";
    constructor() {
        super("securityexplorer", "Security Explorer", () => ManageAccountsIcon, 500);
        this.description = (
            <>
                <Typography>
                    <i>Follow the thread, both ways.</i>
                </Typography>
                <Typography>
                    This tool walks the security graph in reverse: pick a <b>role</b> to see the users and teams
                    holding it, or a <b>team</b> to see its members.
                </Typography>
                <Typography>
                    Every result can be clicked to keep drilling, and the <b>breadcrumb</b> steps back.
                </Typography>
            </>
        );
    }
}

export default SecurityExplorerButton;
