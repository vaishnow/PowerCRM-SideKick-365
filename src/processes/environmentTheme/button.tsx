import PaletteIcon from "@mui/icons-material/Palette";
import Typography from "@mui/material/Typography";

import { ToolPanelButton } from "~utils/global/.toolPanelButton";

class EnvironmentThemeButton extends ToolPanelButton {
    static id = "environmenttheme";
    constructor() {
        super("environmenttheme", "Environment Theme", () => PaletteIcon, 340);
        this.description = (
            <>
                <Typography>
                    <i>Know which environment you are in before you change something.</i>
                </Typography>
                <Typography>
                    The tools bar is coloured according to the <b>type of the current environment</b>. An environment
                    that cannot be identified uses the <b>Production</b> colour.
                </Typography>
                <Typography>
                    Colours and texts are editable, and <u>name matching rules</u> let you separate environments
                    Dynamics reports identically, such as a <b>staging</b> environment among your sandboxes.
                </Typography>
            </>
        );
    }
}

export default EnvironmentThemeButton;
