import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Tooltip from "@mui/material/Tooltip";


interface DirectNavigationButtonProps {
    icon: JSX.Element
    onClick: () => void
    label: string
    tooltip: string
    onContextMenu?: (e: React.MouseEvent<HTMLButtonElement>) => void
}
export const tileSx = {
    width: '84px',
    maxWidth: 'none',
    height: '60px',
    flexDirection: 'column',
    gap: '2px',
    padding: '4px',
    fontSize: '0.7rem',
    lineHeight: 1.15,
    textTransform: 'none',
    '& > svg, & > img, & .MuiButton-startIcon svg, & .MuiButton-startIcon img': { height: '22px', width: 'auto' },
} as const;

export default function DirectNavigationButton(props: DirectNavigationButtonProps) {
    const { icon, onClick, label, tooltip, onContextMenu } = props;

    return (
        <Tooltip placement='left' title={tooltip} disableInteractive arrow>
            <Button
                variant='outlined'
                onClick={() => onClick()}
                onContextMenu={onContextMenu}
                sx={tileSx}
            >
                {icon}
                <Box sx={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', textAlign: 'center' }}>
                    {label}
                </Box>
            </Button>
        </Tooltip>
    )
}
