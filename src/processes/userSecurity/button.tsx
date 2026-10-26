import AdminPanelSettingsIcon from "@mui/icons-material/AdminPanelSettings";
import Typography from "@mui/material/Typography";

import { ToolPanelButton } from "~utils/global/.toolPanelButton";

class UserSecurityButton extends ToolPanelButton {
    static id = "usersecurity";
    constructor() {
        super("usersecurity", "User Security", () => AdminPanelSettingsIcon, 500);
        this.description = (
            <>
                <Typography>
                    <i>Know what you can do, and why.</i>
                </Typography>
                <Typography>
                    This tool shows the <b>details</b>, <b>security roles</b>, <b>team memberships</b> and{" "}
                    <b>effective privileges</b> of a user.
                </Typography>
                <Typography>It opens on the current user, and any other user can be selected.</Typography>
            </>
        );
    }
}

export default UserSecurityButton;
