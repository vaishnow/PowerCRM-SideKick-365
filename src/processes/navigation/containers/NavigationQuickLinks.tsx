import Box from '@mui/material/Box';
import AccountTreeIcon from '@mui/icons-material/AccountTree';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';
import AppsIcon from '@mui/icons-material/Apps';
import AssignmentIcon from '@mui/icons-material/Assignment';
import BugReportIcon from '@mui/icons-material/BugReport';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import CodeIcon from '@mui/icons-material/Code';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import DeleteSweepIcon from '@mui/icons-material/DeleteSweep';
import DescriptionIcon from '@mui/icons-material/Description';
import DnsIcon from '@mui/icons-material/Dns';
import GroupsIcon from '@mui/icons-material/Groups';
import HistoryIcon from '@mui/icons-material/History';
import LinkIcon from '@mui/icons-material/Link';
import MailIcon from '@mui/icons-material/Mail';
import ManageAccountsIcon from '@mui/icons-material/ManageAccounts';
import ManageSearchIcon from '@mui/icons-material/ManageSearch';
import MapIcon from '@mui/icons-material/Map';
import PersonIcon from '@mui/icons-material/Person';
import SettingsIcon from '@mui/icons-material/Settings';
import TableChartIcon from '@mui/icons-material/TableChart';
import TableViewIcon from '@mui/icons-material/TableView';
import TuneIcon from '@mui/icons-material/Tune';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import { useEffect, useState } from 'react';

import ComponentContainer from '../../../utils/components/ComponentContainer';
import MessageManager from '../../../utils/global/MessageManager';
import { STORAGE_NavigationFavorites } from '../../../utils/global/var';
import { useCurrentRecord } from '../../../utils/hooks/use/useCurrentRecord';
import { MessageType } from '../../../utils/types/Message';
import type { NavigationButton } from '../../../utils/types/NavigationButton';
import DirectNavigationButton from '../components/NavigationButton';
import { PowerAutomateIcon } from '../icons';

const DEFAULT_SOLUTION_ID = 'fd140aaf-4df4-11dd-bd17-0019b9312238';
const GROUPS = ['Customize', 'Monitor', 'Data', 'Security', 'Email'];

interface QuickLink {
    label: string
    group: string
    tooltip: string
    icon: JSX.Element
    url: string
    classicUrl?: string
}

function NavigationQuickLinks(props: NavigationButton) {
    const { environmentId, clientUrl } = props;

    const { entityName } = useCurrentRecord();
    const [entityMetadataId, setEntityMetadataId] = useState<string | null>(null);
    const [menu, setMenu] = useState<{ top: number, left: number, link: QuickLink } | null>(null);
    const [search, setSearch] = useState('');
    const [favorites, setFavorites] = useState<string[]>([]);

    useEffect(() => {
        setEntityMetadataId(null);
        if (!entityName) return;
        let stale = false;
        // getEntityMetadata does not return MetadataId
        fetch(`${clientUrl}/api/data/v9.2/EntityDefinitions(LogicalName='${entityName}')?$select=MetadataId`)
            .then((response) => response.json())
            .then((result) => !stale && setEntityMetadataId(result.MetadataId ?? null))
            .catch(() => !stale && setEntityMetadataId(null));
        return () => { stale = true; };
    }, [clientUrl, entityName]);

    useEffect(() => {
        MessageManager.sendMessage(MessageType.GETCONFIGURATION, { key: STORAGE_NavigationFavorites })
            .then((response: string[] | null) => setFavorites(response ?? []));
    }, []);

    const toggleFavorite = (label: string) => {
        const next = favorites.includes(label) ? favorites.filter((f) => f !== label) : [...favorites, label];
        setFavorites(next);
        MessageManager.sendMessage(MessageType.SETCONFIGURATION, { key: STORAGE_NavigationFavorites, configurations: next });
    };

    const maker = `https://make.powerapps.com/environments/${environmentId}`;
    const appId = new URLSearchParams(window.location.search).get('appid');
    const entityList = (etn: string) => `${clientUrl}/main.aspx?pagetype=entitylist&etn=${etn}`;
    const securityClassic = `${clientUrl}/tools/AdminSecurity/adminsecurity_area.aspx`;
    const links: QuickLink[] = [
        {
            label: 'Settings',
            group: 'Customize',
            tooltip: 'Environment Settings (right-click: classic)',
            icon: <SettingsIcon />,
            url: `${clientUrl}/main.aspx?pagetype=control&controlName=PowerAdmin.EnvironmentSettings.NavigatorPage`,
            classicUrl: `${clientUrl}/main.aspx?settingsonly=true`
        },
        ...(environmentId ? [{
            label: 'Tables',
            group: 'Customize',
            tooltip: 'Power Apps Tables (right-click: classic Default Solution)',
            icon: <TableChartIcon />,
            url: `${maker}/entities`,
            classicUrl: `${clientUrl}/tools/solution/edit.aspx?id=${DEFAULT_SOLUTION_ID}`
        }] : []),
        ...(environmentId && entityMetadataId ? [{
            label: 'Current Table',
            group: 'Customize',
            tooltip: 'Current table in Power Apps (right-click: classic customization)',
            icon: <TableViewIcon />,
            url: `${maker}/entities/${entityMetadataId}`,
            classicUrl: `${clientUrl}/tools/systemcustomization/entities/manageentity.aspx?id=%7b${entityMetadataId}%7d`
        }] : []),
        ...(environmentId ? [{
            label: 'Solution History',
            group: 'Customize',
            tooltip: 'Solution History (right-click: classic)',
            icon: <HistoryIcon />,
            url: `${maker}/solutionsHistory`,
            classicUrl: `${clientUrl}/main.aspx?pagetype=entitylist&etn=msdyn_solutionhistory`
        }] : []),
        {
            label: 'Personal Settings',
            group: 'Customize',
            tooltip: 'Personal Options',
            icon: <ManageAccountsIcon />,
            url: `${clientUrl}/tools/personalsettings/dialogs/personalsettings.aspx`
        },
        ...(environmentId && appId ? [{
            label: 'Current App',
            group: 'Customize',
            tooltip: 'Current app in App Designer (Navigation = sitemap)',
            icon: <AppsIcon />,
            url: `https://make.powerapps.com/e/${environmentId}/s/${DEFAULT_SOLUTION_ID}/app/edit/${appId}`
        }] : []),
        ...(environmentId ? [{
            label: 'Web Resources',
            group: 'Customize',
            tooltip: 'Default Solution in Power Apps (right-click: classic)',
            icon: <CodeIcon />,
            url: `${maker}/solutions/${DEFAULT_SOLUTION_ID}`,
            classicUrl: `${clientUrl}/tools/solution/edit.aspx?id=${DEFAULT_SOLUTION_ID}`
        }] : []),
        { label: 'Env Variables', group: 'Customize', tooltip: 'Environment Variable Definitions', icon: <TuneIcon />, url: entityList('environmentvariabledefinition') },
        { label: 'Connection Refs', group: 'Customize', tooltip: 'Connection References', icon: <LinkIcon />, url: entityList('connectionreference') },
        {
            label: 'Audit Summary',
            group: 'Monitor',
            tooltip: 'Audit Summary View (right-click: classic)',
            icon: <ManageSearchIcon />,
            url: `${clientUrl}/main.aspx?pagetype=entitylist&etn=audit`,
            classicUrl: `${clientUrl}/tools/audit/audit_summary.aspx`
        },
        ...(environmentId ? [{
            label: 'Cloud Flows',
            group: 'Monitor',
            tooltip: 'Power Automate Cloud Flows (right-click: classic Processes)',
            icon: <PowerAutomateIcon />,
            url: `https://make.powerautomate.com/environments/${environmentId}/flows`,
            classicUrl: `${clientUrl}/main.aspx?pagetype=entitylist&etn=workflow`
        }] : []),
        {
            label: 'System Jobs',
            group: 'Monitor',
            tooltip: 'System Jobs',
            icon: <AssignmentIcon />,
            url: `${clientUrl}/main.aspx?pagetype=entitylist&etn=asyncoperation`
        },
        {
            label: 'Plugin Trace Logs',
            group: 'Monitor',
            tooltip: 'Plug-in Trace Logs',
            icon: <BugReportIcon />,
            url: `${clientUrl}/main.aspx?pagetype=entitylist&etn=plugintracelog`
        },
        { label: 'Bulk Delete Jobs', group: 'Monitor', tooltip: 'Bulk Deletion System Jobs', icon: <DeleteSweepIcon />, url: entityList('bulkdeleteoperation') },
        { label: 'Import Jobs', group: 'Monitor', tooltip: 'Solution Import Jobs', icon: <CloudUploadIcon />, url: entityList('importjob') },
        { label: 'Duplicate Rules', group: 'Data', tooltip: 'Duplicate Detection Rules', icon: <ContentCopyIcon />, url: entityList('duplicaterule') },
        { label: 'Data Maps', group: 'Data', tooltip: 'Data Import Maps', icon: <MapIcon />, url: entityList('importmap') },
        { label: 'Document Templates', group: 'Data', tooltip: 'Excel / Word Templates', icon: <DescriptionIcon />, url: entityList('documenttemplate') },
        { label: 'Users', group: 'Security', tooltip: 'Users (right-click: classic Security)', icon: <PersonIcon />, url: entityList('systemuser'), classicUrl: securityClassic },
        { label: 'Teams', group: 'Security', tooltip: 'Teams (right-click: classic Security)', icon: <GroupsIcon />, url: entityList('team'), classicUrl: securityClassic },
        // modern role grid does not load, classic list does
        { label: 'Roles', group: 'Security', tooltip: 'Security Roles (classic)', icon: <AdminPanelSettingsIcon />, url: `${clientUrl}/_root/homepage.aspx?etc=1036` },
        { label: 'Business Units', group: 'Security', tooltip: 'Business Units (right-click: classic Security)', icon: <AccountTreeIcon />, url: entityList('businessunit'), classicUrl: securityClassic },
        { label: 'Mailboxes', group: 'Email', tooltip: 'Mailboxes', icon: <MailIcon />, url: entityList('mailbox') },
        { label: 'Server Profiles', group: 'Email', tooltip: 'Email Server Profiles', icon: <DnsIcon />, url: entityList('emailserverprofile') }
    ];

    const visible = links.filter((link) => link.label.toLowerCase().includes(search.toLowerCase()));
    const sections: [string, QuickLink[]][] = [
        ['Favorites', visible.filter((link) => favorites.includes(link.label))],
        ...GROUPS.map((group): [string, QuickLink[]] => [group, visible.filter((link) => link.group === group)])
    ];

    return (
        <>
            <TextField size='small' fullWidth placeholder='Search links' value={search} onChange={(e) => setSearch(e.target.value)} />
            {sections.filter(([, sectionLinks]) => sectionLinks.length).map(([group, sectionLinks]) => (
                <ComponentContainer key={group} width='100%' Legends={{ top: { position: 'center', component: group, padding: '5px' } }}>
                    <Box display='flex' flexWrap='wrap' gap={1} justifyContent='center' padding='5px'>
                        {sectionLinks.map((link) => (
                            <DirectNavigationButton
                                key={link.label}
                                icon={link.icon}
                                label={link.label}
                                tooltip={link.tooltip}
                                onClick={() => window.open(link.url, '_blank')}
                                onContextMenu={(e) => {
                                    e.preventDefault();
                                    setMenu({ top: e.clientY, left: e.clientX, link });
                                }}
                            />
                        ))}
                    </Box>
                </ComponentContainer>
            ))}
            <Menu
                open={!!menu}
                onClose={() => setMenu(null)}
                anchorReference='anchorPosition'
                anchorPosition={menu ? { top: menu.top, left: menu.left } : undefined}
            >
                {menu?.link.classicUrl && (
                    <MenuItem onClick={() => { window.open(menu.link.classicUrl, '_blank'); setMenu(null); }}>
                        Open in classic
                    </MenuItem>
                )}
                <MenuItem onClick={() => { toggleFavorite(menu!.link.label); setMenu(null); }}>
                    {menu && favorites.includes(menu.link.label) ? 'Remove from favorites' : 'Add to favorites'}
                </MenuItem>
            </Menu>
        </>
    )
}

export default NavigationQuickLinks;
