/*
 * Copyright (c) 2025, WSO2 LLC. (http://www.wso2.org) All Rights Reserved.
 *
 * WSO2 LLC. licenses this file to you under the Apache License,
 * Version 2.0 (the "License"); you may not use this file except
 * in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied. See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import React from 'react';
import { FormattedMessage, useIntl } from 'react-intl';
import {
    Typography,
    IconButton,
    Card,
    CardContent,
    CardActions,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    FormControlLabel,
    Checkbox,
    CircularProgress,
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import CodeIcon from '@mui/icons-material/Code';
import RefreshIcon from '@mui/icons-material/Refresh';
import Drawer from '@mui/material/Drawer';
import Tooltip from '@mui/material/Tooltip';
import Box from '@mui/material/Box';
import PropTypes from 'prop-types';
import * as monaco from 'monaco-editor'
import { Editor as MonacoEditor, loader } from '@monaco-editor/react';
import { styled } from '@mui/material/styles';
import { isRestricted } from 'AppData/AuthManager';
import { useHistory } from 'react-router-dom';
import MCPServer from 'AppData/MCPServer';
import Alert from 'AppComponents/Shared/Alert';

const PREFIX = 'EndpointCard';

// load Monaco from node_modules instead of CDN
loader.config({ monaco });

const classes = {
    cardContent: `${PREFIX}-cardContent`,
    cardActions: `${PREFIX}-cardActions`,
    endpointInfo: `${PREFIX}-endpointInfo`,
    endpointUrl: `${PREFIX}-endpointUrl`,
    warningChip: `${PREFIX}-warningChip`,
    primaryActionButton: `${PREFIX}-primaryActionButton`,
};

const StyledCard = styled(Card)(({ theme }) => ({
    [`& .${classes.cardContent}`]: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: theme.spacing(2),
    },

    [`& .${classes.cardActions}`]: {
        padding: theme.spacing(1),
        display: 'flex',
        alignItems: 'center',
        gap: theme.spacing(1),
    },

    [`& .${classes.endpointInfo}`]: {
        display: 'flex',
        flexDirection: 'column',
        gap: theme.spacing(0.5),
    },

    [`& .${classes.endpointUrl}`]: {
        color: theme.palette.text.secondary,
    },

    [`& .${classes.warningChip}`]: {
        borderColor: theme.palette.error.main,
        color: theme.palette.error.main,
        height: '24px',
        '& .MuiChip-icon': {
            color: theme.palette.error.main,
            marginLeft: '8px',
            fontSize: '16px',
        },
        '& .MuiChip-label': {
            padding: '0 8px',
        },
    },

    [`& .${classes.primaryActionButton}`]: {
        width: '120px',
    },
}));

const EndpointCard = ({
    endpoint,
    apiObject,
    isDeleting,
    onDelete,
    endpointType,
}) => {
    const history = useHistory();
    const intl = useIntl();
    const [open, setOpen] = React.useState(false);
    const [refetchDialogOpen, setRefetchDialogOpen] = React.useState(false);
    const [isRefetching, setIsRefetching] = React.useState(false);
    const [keepCurrentTools, setKeepCurrentTools] = React.useState(true);

    const toggleDefinitionViewDrawer = (state) => () => {
        setOpen(state);
    }

    const getEndpointUrl = () => {
        let endpointConfig;
        if (typeof endpoint.endpointConfig === 'string') {
            endpointConfig = JSON.parse(endpoint.endpointConfig);
        } else {
            endpointConfig = endpoint.endpointConfig;
        }

        if (endpointType === 'PRODUCTION') {
            return endpointConfig.production_endpoints?.url || 'No URL configured';
        } else if (endpointType === 'SANDBOX') {
            return endpointConfig.sandbox_endpoints?.url || 'No URL configured';
        }

        return 'No URL configured';
    }

    const getEndpointName = () => {
        return endpoint.name || 'No Name Configured';
    }

    const getApiDefinition = () => {
        const apiDef = endpoint.definition || '{}';
        if (typeof apiDef === 'string') {
            const parsedDef = JSON.parse(apiDef);
            return JSON.stringify(parsedDef, null, 2);
        }
        return JSON.stringify(apiDef, null, 2);
    }

    /**
     * Check if delete button should be disabled based on endpoint configuration
     * @returns {boolean} True if delete should be disabled (only one endpoint section exists)
     */
    const shouldDisableDelete = () => {
        let endpointConfig;
        if (typeof endpoint.endpointConfig === 'string') {
            endpointConfig = JSON.parse(endpoint.endpointConfig);
        } else {
            endpointConfig = endpoint.endpointConfig;
        }

        // Check if both production and sandbox endpoints exist
        const hasProduction = endpointConfig.production_endpoints && 
            endpointConfig.production_endpoints.url && 
            endpointConfig.production_endpoints.url.trim() !== '';
        const hasSandbox = endpointConfig.sandbox_endpoints && 
            endpointConfig.sandbox_endpoints.url && 
            endpointConfig.sandbox_endpoints.url.trim() !== '';

        // If only one endpoint section exists, disable delete
        return (hasProduction && !hasSandbox) || (!hasProduction && hasSandbox);
    };

    const editorOptions = {
        selectOnLineNumbers: true,
        readOnly: true,
        minimap: {
            enabled: false,
        },
    };

    /**
     * Handle the refetch operation - refetch the definition from the backend
     */
    const handleRefetch = () => {
        setRefetchDialogOpen(true);
    };

    /**
     * Confirm and execute the refetch operation
     */
    const confirmRefetch = async () => {
        setIsRefetching(true);
        setRefetchDialogOpen(false);

        try {
            const endpointUrl = getEndpointUrl();

            // Determine the type of MCP server based on the API creation method
            // For now, we'll assume it's an OpenAPI-based server and use validateOpenAPIByUrl
            // In a real implementation, we'd need to check the server type first

            const validateResponse = await MCPServer.validateOpenAPIByUrl(endpointUrl, { returnContent: true });

            if (validateResponse && validateResponse.body) {
                // Successfully refetched the definition
                Alert.success(intl.formatMessage({
                    id: 'MCPServers.Details.Endpoints.EndpointCard.refetch.success',
                    defaultMessage: 'Definition refetched successfully. {action} tools based on the new definition.',
                }, {
                    action: keepCurrentTools ? 'Keeping current' : 'Creating new'
                }));

                // Here you would typically update the MCP server with the new definition
                // For now, we'll just show a success message
                // In a full implementation, you'd call an API to update the server definition
                // and optionally regenerate tools based on the keepCurrentTools flag

            } else {
                throw new Error('Invalid response from validation');
            }
        } catch (error) {
            console.error('Error refetching definition:', error);
            Alert.error(intl.formatMessage({
                id: 'MCPServers.Details.Endpoints.EndpointCard.refetch.error',
                defaultMessage: 'Error refetching definition. Please check the endpoint URL and try again.',
            }));
        } finally {
            setIsRefetching(false);
        }
    };

    /**
     * Cancel the refetch operation
     */
    const cancelRefetch = () => {
        setRefetchDialogOpen(false);
        setKeepCurrentTools(true); // Reset to default
    };

    return (
        <StyledCard
            sx={{ mb: 2, '&:last-child': { mb: 0 } }}
            variant='outlined'
        >
            <CardContent className={classes.cardContent}>
                <div className={classes.endpointInfo}>
                    <Typography variant='subtitle1'>
                        {getEndpointName()}
                    </Typography>
                    <Typography variant='body2' className={classes.endpointUrl}>
                        {getEndpointUrl()}
                    </Typography>
                </div>
                <CardActions className={classes.cardActions}>
                    <>
                        <Tooltip title='View Backend Definition'  >
                            <IconButton
                                size='small'
                                onClick={toggleDefinitionViewDrawer(true)}
                            >
                                <CodeIcon fontSize='small' />
                            </IconButton>
                        </Tooltip>
                        <Drawer
                            anchor='right'
                            open={open}
                            onClose={toggleDefinitionViewDrawer(false)}
                            sx={{
                                zIndex: 1300,
                                '& .MuiDrawer-paper': {
                                    width: '45%',
                                    height: '100vh',
                                    backgroundColor: '#ffffff',
                                    color: '#000000',
                                    zIndex: 1300,
                                },
                            }}
                            ModalProps={{
                                container: document.body,
                                style: { zIndex: 1300 }
                            }}
                        >
                            <Box
                                role='presentation'
                                sx={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
                                <Typography variant='h6' sx={{ p: 2, flexShrink: 0 }}>
                                    <FormattedMessage
                                        id='Apis.Details.Endpoints.AIEndpoints.EndpointCard.backend.api.definition'
                                        defaultMessage='Backend API Definition'
                                    />
                                </Typography>
                                <Box
                                    sx={{
                                        flex: 1,
                                        minHeight: 0,
                                        overflowY: 'auto',
                                    }}
                                    px={2}
                                    pb={2}
                                >
                                    <MonacoEditor
                                        language='json'
                                        width='100%'
                                        height='100%'
                                        value={getApiDefinition()}
                                        options={editorOptions}
                                        theme='vs-dark'
                                    />
                                </Box>
                            </Box>
                        </Drawer>
                    </>
                    <Tooltip title='Refetch Tool List/Operation List'>
                        <IconButton
                            size='small'
                            onClick={handleRefetch}
                            disabled={
                                isRestricted([
                                    'apim:mcp_server_view',
                                    'apim:mcp_server_create',
                                    'apim:mcp_server_manage',
                                    'apim:mcp_server_publish',
                                    'apim:mcp_server_import_export',
                                ], apiObject) || isRefetching
                            }
                        >
                            {isRefetching ? (
                                <CircularProgress size={16} />
                            ) : (
                                <RefreshIcon fontSize='small' />
                            )}
                        </IconButton>
                    </Tooltip>
                    <IconButton
                        size='small'
                        onClick={() => {
                            history.push(
                                '/mcp-servers/' + apiObject.id + '/endpoints/' + endpoint.id + '/' + endpointType,
                            );
                        }}
                        disabled={
                            isRestricted([
                                'apim:mcp_server_view',
                                'apim:mcp_server_create',
                                'apim:mcp_server_manage',
                                'apim:mcp_server_publish',
                                'apim:mcp_server_import_export',
                            ], apiObject)
                        }
                    >
                        <EditIcon fontSize='small' />
                    </IconButton>
                    <span>
                        <IconButton
                            size='small'
                            color='error'
                            onClick={() => onDelete()}
                            disabled={
                                isRestricted(
                                    [
                                        'apim:mcp_server_view',
                                        'apim:mcp_server_create',
                                        'apim:mcp_server_manage',
                                        'apim:mcp_server_publish',
                                        'apim:mcp_server_import_export',
                                    ],
                                    apiObject,
                                ) ||
                                isDeleting ||
                                shouldDisableDelete()
                            }
                        >
                            <DeleteIcon fontSize='small' />
                        </IconButton>
                    </span>
                </CardActions>
            </CardContent>

            {/* Refetch Confirmation Dialog */}
            <Dialog
                open={refetchDialogOpen}
                onClose={cancelRefetch}
                aria-labelledby='refetch-confirmation-dialog-title'
                maxWidth='sm'
                fullWidth
            >
                <DialogTitle id='refetch-confirmation-dialog-title'>
                    <FormattedMessage
                        id='MCPServers.Details.Endpoints.EndpointCard.refetch.confirmation.title'
                        defaultMessage='Refetch Tool List/Operation List'
                    />
                </DialogTitle>
                <DialogContent>
                    <Typography gutterBottom>
                        <FormattedMessage
                            id='MCPServers.Details.Endpoints.EndpointCard.refetch.confirmation.message'
                            defaultMessage={
                                'This will refetch the definition from the backend endpoint ' +
                                'and update the available tools/operations.'
                            }
                        />
                    </Typography>
                    <FormControlLabel
                        control={
                            <Checkbox
                                checked={keepCurrentTools}
                                onChange={(e) => setKeepCurrentTools(e.target.checked)}
                                name='keepCurrentTools'
                                color='primary'
                            />
                        }
                        label={
                            <FormattedMessage
                                id='MCPServers.Details.Endpoints.EndpointCard.refetch.keep.current.tools'
                                defaultMessage='Keep current tool list (recommended)'
                            />
                        }
                    />
                    <Typography variant='body2' color='textSecondary' sx={{ ml: 4, mt: 1 }}>
                        <FormattedMessage
                            id='MCPServers.Details.Endpoints.EndpointCard.refetch.keep.current.tools.help'
                            defaultMessage={
                                'If unchecked, existing tools will be replaced with new tools ' +
                                'based on the refetched definition.'
                            }
                        />
                    </Typography>
                </DialogContent>
                <DialogActions>
                    <Button onClick={cancelRefetch} color='primary'>
                        <FormattedMessage
                            id='MCPServers.Details.Endpoints.EndpointCard.refetch.confirmation.cancel'
                            defaultMessage='Cancel'
                        />
                    </Button>
                    <Button
                        onClick={confirmRefetch}
                        color='primary'
                        variant='contained'
                        disabled={isRefetching}
                    >
                        <FormattedMessage
                            id='MCPServers.Details.Endpoints.EndpointCard.refetch.confirmation.refetch'
                            defaultMessage='Refetch'
                        />
                    </Button>
                </DialogActions>
            </Dialog>
        </StyledCard>
    );
};

EndpointCard.propTypes = {
    endpoint: PropTypes.shape({
        id: PropTypes.string,
        name: PropTypes.string,
        endpointConfig: PropTypes.shape({
            production_endpoints: PropTypes.shape({
                url: PropTypes.string,
            }),
            sandbox_endpoints: PropTypes.shape({
                url: PropTypes.string,
            }),
            endpoint_security: PropTypes.shape({
                production: PropTypes.shape({}),
                sandbox: PropTypes.shape({}),
            }),
        }),
        definition: PropTypes.string,
    }).isRequired,
    onDelete: PropTypes.func.isRequired,
    isDeleting: PropTypes.bool.isRequired,
    apiObject: PropTypes.shape({
        id: PropTypes.string,
    }).isRequired,
    endpointType: PropTypes.oneOf(['PRODUCTION', 'SANDBOX']).isRequired,
};

export default EndpointCard;
