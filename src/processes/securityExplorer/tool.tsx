import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import Autocomplete from "@mui/material/Autocomplete";
import Box from "@mui/material/Box";
import Breadcrumbs from "@mui/material/Breadcrumbs";
import Divider from "@mui/material/Divider";
import IconButton from "@mui/material/IconButton";
import Link from "@mui/material/Link";
import List from "@mui/material/List";
import ListItem from "@mui/material/ListItem";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemText from "@mui/material/ListItemText";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import ToggleButton from "@mui/material/ToggleButton";
import ToggleButtonGroup from "@mui/material/ToggleButtonGroup";
import Typography from "@mui/material/Typography";
import { forwardRef, useMemo, useState } from "react";
import { useDebounceValue } from "usehooks-ts";

import AvatarColor from "../../utils/components/AvatarColor";
import MuiVirtuoso from "../../utils/components/MuiVirtuoso";
import { ProcessButton, type ProcessProps, type ProcessRef } from "../../utils/global/.processClass";
import { getRecordUrl } from "../../utils/global/common";
import { RetrieveRecordsByPrimaryAttributeOrGuid } from "../../utils/hooks/XrmApi/RetrieveRecordsByPrimaryAttributeOrGuid";
import { RetrieveSecurityRole } from "../../utils/hooks/XrmApi/RetrieveSecurityRole";
import {
    RetrieveSecurityRelations,
    type SecurityNode,
    type SecuritySection
} from "../../utils/hooks/XrmApi/RetrieveSecurityRelations";

class SecurityExplorerProcess extends ProcessButton {
    static id = "securityexplorer";
    constructor() {
        super("securityexplorer");
        this.process = SecurityExplorer;
    }
}

const ENTITY_OF_KIND: Record<SecurityNode["kind"], string> = {
    role: "role",
    team: "team",
    user: "systemuser"
};

const SecurityExplorer = forwardRef<ProcessRef, ProcessProps>(function SecurityExplorer(props: ProcessProps, ref) {
    const [kind, setKind] = useState<SecurityNode["kind"]>("role");
    const [stack, setStack] = useState<SecurityNode[]>([]);
    const [allBusinessUnits, setAllBusinessUnits] = useState<boolean>(true);

    const current = stack.length > 0 ? stack[stack.length - 1] : null;
    const [sections, isFetching, error] = RetrieveSecurityRelations(current, allBusinessUnits);

    return (
        <Stack direction="column" spacing={0.5} padding="10px" height="calc(100% - 20px)">
            <ToggleButtonGroup
                size="small"
                exclusive
                fullWidth
                value={kind}
                onChange={(event, value) => value && setKind(value)}>
                <ToggleButton value="role">Role</ToggleButton>
                <ToggleButton value="team">Team</ToggleButton>
                <ToggleButton value="user">User</ToggleButton>
            </ToggleButtonGroup>

            <SubjectPicker kind={kind} onPick={(node) => setStack([node])} />

            {current?.kind === "role" && (
                <ToggleButton
                    size="small"
                    value="allbu"
                    selected={allBusinessUnits}
                    onChange={() => setAllBusinessUnits((previous) => !previous)}>
                    {allBusinessUnits ? "All business units" : "Root business unit only"}
                </ToggleButton>
            )}

            {stack.length > 0 && (
                <Breadcrumbs maxItems={4} itemsAfterCollapse={2} sx={{ fontSize: "0.75rem" }}>
                    {stack.map((node, index) => (
                        <Link
                            key={`${node.kind}_${node.id}_${index}`}
                            component="button"
                            underline="hover"
                            fontSize="0.75rem"
                            color={index === stack.length - 1 ? "text.primary" : "inherit"}
                            onClick={() => setStack((previous) => previous.slice(0, index + 1))}>
                            {node.name}
                        </Link>
                    ))}
                </Breadcrumbs>
            )}

            <Divider />

            <Box flexGrow={1} minHeight={0} position="relative" display="flex" flexDirection="column">
                {error && (
                    <Typography variant="caption" color="error">
                        {error}
                    </Typography>
                )}

                {!current && (
                    <Typography variant="caption" textAlign="center" color="grey" fontSize="small">
                        Pick a {kind} to see what it is connected to.
                    </Typography>
                )}

                {current &&
                    sections.map((section) => (
                        <SectionList
                            key={section.title}
                            section={section}
                            isFetching={isFetching}
                            onDrill={(node) => setStack((previous) => [...previous, node])}
                        />
                    ))}
            </Box>
        </Stack>
    );
});

function SubjectPicker(props: { kind: SecurityNode["kind"]; onPick: (node: SecurityNode) => void }) {
    const { kind, onPick } = props;

    const [search, setSearch] = useState<string>("");
    const [debouncedSearch] = useDebounceValue(search, 300);

    // Roles come from the deduped root-role list; teams and users are searched server-side.
    const [roles] = RetrieveSecurityRole();
    const searchResults = RetrieveRecordsByPrimaryAttributeOrGuid(
        ENTITY_OF_KIND[kind],
        kind === "role" ? null : debouncedSearch
    );

    const options = useMemo<SecurityNode[]>(() => {
        if (kind === "role") {
            return roles.map((role) => ({ kind: "role", id: role.roleid, name: role.name, uniqueId: role.uniqueid }));
        }
        if (kind === "team") {
            return searchResults.entities.map((team: any) => ({ kind: "team", id: team.teamid, name: team.name }));
        }
        return searchResults.entities.map((user: any) => ({
            kind: "user",
            id: user.systemuserid,
            name: user.fullname
        }));
    }, [kind, roles, searchResults]);

    return (
        <Autocomplete
            size="small"
            options={options}
            getOptionLabel={(option) => option.name ?? ""}
            isOptionEqualToValue={(option, value) => option.id === value.id}
            filterOptions={kind === "role" ? undefined : (allOptions) => allOptions}
            onInputChange={(event, value) => setSearch(value)}
            onChange={(event, option) => option && onPick(option)}
            renderInput={(params) => (
                <TextField {...params} size="small" placeholder={`Search a ${kind} or paste a Guid`} />
            )}
        />
    );
}

function SectionList(props: {
    section: SecuritySection;
    isFetching: boolean;
    onDrill: (node: SecurityNode) => void;
}) {
    const { section, isFetching, onDrill } = props;

    return (
        <Box flex="1 1 0" minHeight={0} display="flex" flexDirection="column">
            <Typography variant="overline" lineHeight={1.6}>
                {section.title} ({section.items.length})
            </Typography>

            {isFetching ? (
                <Typography variant="caption" color="grey">
                    Retrieving...
                </Typography>
            ) : section.items.length === 0 ? (
                <Typography variant="caption" color="grey">
                    None.
                </Typography>
            ) : (
                <List sx={{ width: "100%", height: "100%", pt: 0 }}>
                    <MuiVirtuoso
                        data={section.items}
                        itemContent={(index, node: SecurityNode) => <NodeItem node={node} onDrill={onDrill} />}
                    />
                </List>
            )}
        </Box>
    );
}

function NodeItem(props: { node: SecurityNode; onDrill: (node: SecurityNode) => void }) {
    const { node, onDrill } = props;

    return (
        <ListItem
            disablePadding
            secondaryAction={
                <IconButton
                    size="small"
                    onClick={() => window.open(getRecordUrl(ENTITY_OF_KIND[node.kind], node.id), "_blank")}>
                    <OpenInNewIcon fontSize="small" />
                </IconButton>
            }>
            <ListItemButton dense onClick={() => onDrill(node)} sx={{ height: 35 }}>
                {node.kind === "user" && (
                    <AvatarColor fullname={node.name} size={24} sx={() => ({ mr: 1 })} />
                )}
                <ListItemText primary={node.name} primaryTypographyProps={{ noWrap: true }} />
            </ListItemButton>
        </ListItem>
    );
}

export default SecurityExplorerProcess;
