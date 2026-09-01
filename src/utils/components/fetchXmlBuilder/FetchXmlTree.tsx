import AddIcon from "@mui/icons-material/Add";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import KeyboardArrowRightIcon from "@mui/icons-material/KeyboardArrowRight";
import Autocomplete, { createFilterOptions } from "@mui/material/Autocomplete";
import Box from "@mui/material/Box";
import Checkbox from "@mui/material/Checkbox";
import FormControlLabel from "@mui/material/FormControlLabel";
import IconButton from "@mui/material/IconButton";
import ListItemText from "@mui/material/ListItemText";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { useContext, useEffect, useMemo, useState } from "react";

import { MetadataContext } from "../MetadataBrowser/MetadataContextProvider";
import {
    addChild,
    allowedChildren,
    CONDITION_OPERATORS,
    elementChildren,
    getScopeEntityName,
    NODE_SCHEMA,
    removeNode,
    setAttr,
    VALUELESS_OPERATORS,
    type NodeAttributeEditor
} from "./utils/fetchXml";

type PickerOption = { id: string; label: string };

const pickerSx = { minWidth: 190 };

const filterOptions = createFilterOptions<PickerOption>({
    ignoreAccents: true,
    ignoreCase: true,
    matchFrom: "any",
    stringify: (option) => option.label + ";" + option.id
});

type FetchXmlTreeProps = {
    doc: Document;
    isAggregate: boolean;
    /** Called after any mutation so the owner can re-serialise the document. */
    onChange: () => void;
};

function FetchXmlTree(props: FetchXmlTreeProps) {
    const { doc, isAggregate, onChange } = props;

    return (
        <Box sx={{ overflow: "auto", height: "100%", p: 1 }}>
            <TreeNode node={doc.documentElement} depth={0} isAggregate={isAggregate} onChange={onChange} isRoot />
        </Box>
    );
}

type TreeNodeProps = {
    node: Element;
    depth: number;
    isAggregate: boolean;
    onChange: () => void;
    isRoot?: boolean;
};

function TreeNode(props: TreeNodeProps) {
    const { node, depth, isAggregate, onChange, isRoot } = props;

    const [expanded, setExpanded] = useState(true);
    const [addAnchor, setAddAnchor] = useState<HTMLElement | null>(null);

    const children = elementChildren(node);
    const descriptor = NODE_SCHEMA[node.tagName];
    const addable = allowedChildren(node);

    const handleAdd = (tagName: string) => {
        addChild(node, tagName);
        setAddAnchor(null);
        setExpanded(true);
        onChange();
    };

    return (
        <>
            <Stack direction="row" spacing={0.5} alignItems="center" flexWrap="wrap" pl={depth * 2} py={0.25}>
                <IconButton
                    size="small"
                    onClick={() => setExpanded(!expanded)}
                    sx={{ visibility: children.length ? "visible" : "hidden" }}>
                    {expanded ? <KeyboardArrowDownIcon fontSize="small" /> : <KeyboardArrowRightIcon fontSize="small" />}
                </IconButton>

                <Typography variant="body2" fontFamily="monospace" fontWeight="bold" pr={0.5}>
                    {node.tagName}
                </Typography>

                {descriptor ? (
                    descriptor.editors
                        .filter((editor) => !editor.aggregateOnly || isAggregate)
                        .map((editor) => (
                            <AttributeEditor
                                key={editor.name}
                                node={node}
                                editor={editor}
                                onChange={onChange}
                            />
                        ))
                ) : (
                    <ReadOnlyAttributes node={node} />
                )}

                {addable.length > 0 && (
                    <IconButton size="small" title="Add child node" onClick={(e) => setAddAnchor(e.currentTarget)}>
                        <AddIcon fontSize="small" />
                    </IconButton>
                )}
                {!isRoot && (
                    <IconButton
                        size="small"
                        title="Remove node"
                        onClick={() => {
                            removeNode(node);
                            onChange();
                        }}>
                        <DeleteOutlineIcon fontSize="small" />
                    </IconButton>
                )}

                <Menu anchorEl={addAnchor} open={!!addAnchor} onClose={() => setAddAnchor(null)}>
                    {addable.map((tagName) => (
                        <MenuItem key={tagName} onClick={() => handleAdd(tagName)}>
                            {tagName}
                        </MenuItem>
                    ))}
                </Menu>
            </Stack>

            {expanded &&
                children.map((child, index) => (
                    <TreeNode
                        key={`${index}-${child.tagName}`}
                        node={child}
                        depth={depth + 1}
                        isAggregate={isAggregate}
                        onChange={onChange}
                    />
                ))}
        </>
    );
}

/** Tags without a schema entry still round-trip: they are shown, not edited. */
function ReadOnlyAttributes(props: { node: Element }) {
    const { node } = props;
    const text = Array.from(node.attributes)
        .map((attribute) => `${attribute.name}="${attribute.value}"`)
        .join(" ");

    return (
        <Typography variant="caption" fontFamily="monospace" color="text.secondary">
            {text}
        </Typography>
    );
}

function AttributeEditor(props: { node: Element; editor: NodeAttributeEditor; onChange: () => void }) {
    const { node, editor, onChange } = props;

    const value = node.getAttribute(editor.name) ?? "";

    const set = (newValue: string | null) => {
        setAttr(node, editor.name, newValue);
        onChange();
    };

    if (editor.name === "value" && VALUELESS_OPERATORS.has(node.getAttribute("operator") ?? "")) {
        return null;
    }

    switch (editor.kind) {
        case "bool":
            return (
                <FormControlLabel
                    label={<Typography variant="caption">{editor.name}</Typography>}
                    control={
                        <Checkbox
                            size="small"
                            checked={value === "true"}
                            onChange={(e) => set(e.target.checked ? "true" : null)}
                        />
                    }
                />
            );
        case "select":
            if (editor.name === "operator") {
                return (
                    <SearchPicker
                        label={editor.name}
                        value={value}
                        options={CONDITION_OPERATORS.map((option) => ({ id: option, label: option }))}
                        onChange={set}
                    />
                );
            }
            return (
                <TextField
                    select
                    size="small"
                    label={editor.name}
                    value={value}
                    onChange={(e) => set(e.target.value)}
                    sx={{ width: 130 }}>
                    <MenuItem value="">
                        <em>none</em>
                    </MenuItem>
                    {(editor.options ?? []).map((option) => (
                        <MenuItem key={option} value={option}>
                            {option}
                        </MenuItem>
                    ))}
                </TextField>
            );
        case "entity":
            return <EntityPicker label={editor.name} value={value} onChange={set} />;
        case "attribute":
            return <AttributePicker label={editor.name} value={value} scopeEntity={getScopeEntityName(node)} onChange={set} />;
        default:
            return (
                <TextField
                    size="small"
                    label={editor.name}
                    value={value}
                    onChange={(e) => set(e.target.value)}
                    sx={{ width: 130 }}
                />
            );
    }
}

function EntityPicker(props: { label: string; value: string; onChange: (value: string | null) => void }) {
    const { entitiesMetadata } = useContext(MetadataContext);

    const options = useMemo(
        () =>
            entitiesMetadata.map((entity) => ({
                id: entity.LogicalName,
                label: entity.DisplayName?.UserLocalizedLabel?.Label ?? entity.LogicalName
            })),
        [entitiesMetadata]
    );

    return <SearchPicker {...props} options={options} />;
}

function AttributePicker(props: {
    label: string;
    value: string;
    scopeEntity: string;
    onChange: (value: string | null) => void;
}) {
    const { scopeEntity, ...pickerProps } = props;
    const { attributesMetadata, retrieveAttributes } = useContext(MetadataContext);

    useEffect(() => {
        if (scopeEntity) {
            retrieveAttributes(scopeEntity);
        }
    }, [scopeEntity, retrieveAttributes]);

    const options = useMemo(
        () =>
            (attributesMetadata[scopeEntity] ?? [])
                .filter((attribute) => !attribute.AttributeOf)
                .map((attribute) => ({
                    id: attribute.LogicalName,
                    label: attribute.DisplayName?.UserLocalizedLabel?.Label ?? attribute.LogicalName
                })),
        [attributesMetadata, scopeEntity]
    );

    return <SearchPicker {...pickerProps} options={options} />;
}

/**
 * Free text is always allowed: metadata may not be loaded yet, and FetchXML accepts aliases and
 * operators this build does not know about. The input is fully controlled by the XML attribute.
 */
function SearchPicker(props: {
    label: string;
    value: string;
    options: PickerOption[];
    onChange: (value: string | null) => void;
}) {
    const { label, value, options, onChange } = props;

    return (
        <Autocomplete
            freeSolo
            size="small"
            sx={pickerSx}
            options={options}
            inputValue={value}
            filterOptions={filterOptions}
            getOptionLabel={(option) => (typeof option === "string" ? option : option.id)}
            onInputChange={(event, newValue, reason) => {
                if (reason !== "reset") {
                    onChange(newValue);
                }
            }}
            onChange={(event, option) => onChange(typeof option === "string" ? option : option?.id ?? null)}
            renderInput={(params) => <TextField {...params} label={label} />}
            renderOption={(optionProps, option) => (
                <li {...optionProps} key={option.id} style={{ paddingTop: 0, paddingBottom: 0 }}>
                    <ListItemText primary={option.label} secondary={option.id} />
                </li>
            )}
        />
    );
}

export default FetchXmlTree;
