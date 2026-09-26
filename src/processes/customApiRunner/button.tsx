import PlayCircleOutlineIcon from "@mui/icons-material/PlayCircleOutline";
import Typography from "@mui/material/Typography";

import { ToolPanelButton } from "~utils/global/.toolPanelButton";

class CustomApiRunnerButton extends ToolPanelButton {
    static id = "customapirunner";
    constructor() {
        super("customapirunner", "API Runner", () => PlayCircleOutlineIcon, 450);
        this.description = (
            <>
                <Typography>
                    <i>Call your messages without writing a line of code.</i>
                </Typography>
                <Typography>
                    Pick a <b>Custom API</b> or any other custom message, fill its <b>request parameters</b> and execute
                    it. Bound and unbound operations are both supported, as are <b>functions</b> and <b>actions</b>.
                </Typography>
                <Typography>
                    The same <b>bypass</b> and <b>impersonation</b> options as the Update Record tool apply, so you can
                    test a plugin with custom logic disabled or run the message as another user.
                </Typography>
                <Typography>The response is displayed as a browsable JSON tree.</Typography>
            </>
        );
    }
}

export default CustomApiRunnerButton;
