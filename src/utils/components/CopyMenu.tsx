import React, { useCallback } from 'react'
import { Menu, MenuItem } from "@mui/material";
import useCopyWithSnack from '../hooks/use/useCopyWithSnack';

interface CopyMenuProps {
    onClose?: () => void,
    anchorElement?: Element | (() => Element) | null,
    items: {
        title: string,
        content: string
    }[],
    children?: React.ReactNode
}
function CopyMenu(props: CopyMenuProps) {
    const { onClose, anchorElement, items, children } = props;

    const copy = useCopyWithSnack({ callback: onClose });

    const handleOnClick = useCallback((value: string) => {
        copy(value);
    }, [copy]);

    return (
        <>
            <Menu
                anchorEl={anchorElement}
                open={!!anchorElement}
                onClose={onClose}
            >
                {
                    items.map(item => {
                        if (item.content !== undefined) {
                            return (
                                <MenuItem key={`copyMenu${item.title}`} onClick={() => handleOnClick(item.content)}>Copy {item.title}</MenuItem>
                            );
                        }
                        else {
                            return null;
                        }
                    })
                }
                {children}

            </Menu>
        </>
    );
}

export default CopyMenu;