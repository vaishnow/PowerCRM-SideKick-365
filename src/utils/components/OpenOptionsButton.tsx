import type { ButtonPropsVariantOverrides } from '@mui/material';
import type { OverridableStringUnion } from '@mui/types';
import { Button } from '@mui/material';
import { MessageType } from '../types/Message';
import MessageManager from '../global/MessageManager';
// import ExtensionTarget from '../types/ExtensionTarget';
import { isFirefox } from '~utils/global/var';


export type OpenOptionsButtonProps = {
    text?: string | null;
    variant?: OverridableStringUnion<"text" | "outlined" | "contained", ButtonPropsVariantOverrides>
};

function OpenOptionsButton(props: OpenOptionsButtonProps) {
    const { text, variant } = props;

    return (
        isFirefox ? null :
            <Button variant={variant} onClick={() => {
                MessageManager.sendMessage(MessageType.OPENOPTIONS);
            }}>
                {text ?? 'Open option screen'}
            </Button>
    );
}

export default OpenOptionsButton;
