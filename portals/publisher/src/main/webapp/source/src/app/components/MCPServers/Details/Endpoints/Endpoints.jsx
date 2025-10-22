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

import React, { useState, useEffect } from 'react';
import {
    Grid,
    Paper,
    Typography,
    styled,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    Box,
    Chip,
    FormControlLabel,
    Radio,
    RadioGroup,
    CircularProgress,
} from '@mui/material';
import { FormattedMessage, useIntl } from 'react-intl';
import { isRestricted } from 'AppData/AuthManager';
import PropTypes from 'prop-types';
import { Progress } from 'AppComponents/Shared';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import RefreshIcon from '@mui/icons-material/Refresh';
import MCPServer from 'AppData/MCPServer';
import Alert from 'AppComponents/Shared/Alert';
import AddCircle from '@mui/icons-material/AddCircle';
import GeneralEndpointConfigurations from 'AppComponents/Apis/Details/Endpoints/GeneralEndpointConfigurations';
import EndpointCard from './EndpointCard';

const StyledPaper = styled(Paper)(({ theme }) => ({
    padding: theme.spacing(3),
}));

const Endpoints = ({
    apiObject,
    endpointConfiguration,
    history,
}) => {
    const [productionEndpoints, setProductionEndpoints] = useState([]);
    const [sandboxEndpoints, setSandboxEndpoints] = useState([]);
    const [endpointList, setEndpointList] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isDeleting, setIsDeleting] = useState(false);
    const [deleteConfirmation, setDeleteConfirmation] = useState({
        open: false,
        endpointType: null,
        endpoint: null,
    });
    const [refetchModal, setRefetchModal] = useState({
        open: false,
        isRefetching: false,
        refetchedOperations: [],
        refetchStrategy: 'replace',
    });
    const [sourceInfo, setSourceInfo] = useState({
        type: null,
        url: null
    });

    const intl = useIntl();

    /**
     * Parse endpoint configuration from string or object
     * @param {Object} endpoint - The endpoint object
     * @returns {Object} Parsed endpoint configuration
     */
    const parseEndpointConfig = (endpoint) => {
        return typeof endpoint.endpointConfig === 'string'
            ? JSON.parse(endpoint.endpointConfig)
            : endpoint.endpointConfig;
    };

    /**
     * Filter endpoints by type (production or sandbox)
     * @param {Array} endpoints - Array of endpoints
     * @param {string} type - 'production' or 'sandbox'
     * @returns {Array} Filtered endpoints
     */
    const filterEndpointsByType = (endpoints, type) => {
        return endpoints.filter(ep => {
            const config = parseEndpointConfig(ep);
            const endpointKey = `${type}_endpoints`;
            return config?.[endpointKey] && config[endpointKey].url;
        });
    };

    /**
     * Extract endpoint URLs for general configurations
     * @param {Array} endpoints - Array of endpoints
     * @param {string} type - 'production' or 'sandbox'
     * @returns {Array} Array of endpoint URLs
     */
    const extractEndpointUrls = (endpoints, type) => {
        return endpoints.map(ep => {
            const config = parseEndpointConfig(ep);
            return config?.[`${type}_endpoints`];
        }).filter(Boolean);
    };

    const fetchEndpoints = () => {
        setLoading(true);
        MCPServer.getMCPServerEndpoints(apiObject.id)
            .then((response) => {
                const endpoints = response.body;
                
                // Filter endpoints based on their configuration
                const filteredProductionEndpoints = filterEndpointsByType(endpoints, 'production');
                const filteredSandboxEndpoints = filterEndpointsByType(endpoints, 'sandbox');

                setProductionEndpoints(filteredProductionEndpoints);
                setSandboxEndpoints(filteredSandboxEndpoints);

                // Create endpoint URL list for general configurations
                const productionUrls = extractEndpointUrls(filteredProductionEndpoints, 'production');
                const sandboxUrls = extractEndpointUrls(filteredSandboxEndpoints, 'sandbox');
                const endpointUrlList = [...productionUrls, ...sandboxUrls];
                
                setEndpointList(endpointUrlList);
            })
            .catch((error) => {
                console.error(error);
                Alert.error(intl.formatMessage({
                    id: 'MCPServers.Details.Endpoints.Endpoints.fetch.error',
                    defaultMessage: 'Something went wrong while fetching endpoints',
                }));
            })
            .finally(() => setLoading(false));
    };

    /**
     * Detect the source information for the MCP Server to enable refetch functionality
     */
    const detectSourceInfo = () => {
        if (!apiObject.additionalProperties) {
            return;
        }

        try {
            const additionalProps = typeof apiObject.additionalProperties === 'string'
                ? JSON.parse(apiObject.additionalProperties)
                : apiObject.additionalProperties;

            if (additionalProps.url) {
                // Determine if it's an OpenAPI URL or MCP Proxy based on the MCP Server type
                if (apiObject.type === 'MCP' || apiObject.apiType === 'MCP') {
                    // Check if it's a proxy by looking at the endpoint configuration
                    const isProxy = additionalProps.isProxy ||
                                   (apiObject.context && apiObject.context.includes('/mcp-proxy/'));

                    setSourceInfo({
                        type: isProxy ? 'MCP_PROXY' : 'OPENAPI_URL',
                        url: additionalProps.url
                    });
                }
            }
        } catch (error) {
            console.error('Error parsing additional properties:', error);
        }
    };

    /**
     * Handle refetch definition button click
     */
    const handleRefetchDefinition = () => {
        if (!sourceInfo.type || !sourceInfo.url) {
            Alert.error(intl.formatMessage({
                id: 'MCPServers.Details.Endpoints.refetch.no.source.error',
                defaultMessage: 'No source URL found for this MCP Server. '
                    + 'Refetch is only available for URL-based MCP Servers.',
            }));
            return;
        }

        setRefetchModal({
            open: true,
            isRefetching: true,
            refetchedOperations: [],
            refetchStrategy: 'replace',
        });

        // Call the refetch API
        MCPServer.refetchMCPServerDefinition(apiObject.id, sourceInfo.type, sourceInfo.url)
            .then((refetchResult) => {
                setRefetchModal(prev => ({
                    ...prev,
                    isRefetching: false,
                    refetchedOperations: refetchResult.operations || [],
                }));

                Alert.success(intl.formatMessage({
                    id: 'MCPServers.Details.Endpoints.refetch.success',
                    defaultMessage: 'Successfully refetched {count} operations from the source',
                }, { count: refetchResult.operations?.length || 0 }));
            })
            .catch((error) => {
                console.error('Error refetching definition:', error);
                setRefetchModal(prev => ({
                    ...prev,
                    isRefetching: false,
                    refetchedOperations: [],
                }));

                Alert.error(intl.formatMessage({
                    id: 'MCPServers.Details.Endpoints.refetch.error',
                    defaultMessage: 'Failed to refetch definition. '
                        + 'Please check the source URL and try again.',
                }));
            });
    };

    /**
     * Handle applying the refetched operations
     */
    const handleApplyRefetch = () => {
        // Close the modal first
        setRefetchModal({
            open: false,
            isRefetching: false,
            refetchedOperations: [],
            refetchStrategy: 'replace',
        });

        // Show success message
        Alert.success(intl.formatMessage({
            id: 'MCPServers.Details.Endpoints.refetch.applied.success',
            defaultMessage: 'Tools/operations list has been updated. '
                + 'Navigate to Tools page to see the changes.',
        }));

        // Optionally refresh the endpoints to reflect any backend changes
        fetchEndpoints();
    };

    /**
     * Handle closing the refetch modal without applying changes
     */
    const handleCloseRefetchModal = () => {
        setRefetchModal({
            open: false,
            isRefetching: false,
            refetchedOperations: [],
            refetchStrategy: 'replace',
        });
    };

    useEffect(() => {
        fetchEndpoints();
        detectSourceInfo();
    }, [apiObject.id]);

    const handleDelete = (endpointType, endpoint) => {
        // Show confirmation dialog first
        setDeleteConfirmation({
            open: true,
            endpointType,
            endpoint,
        });
    };

    /**
     * Handle adding a new endpoint section (production or sandbox)
     * @param {string} targetEndpointType - The type of endpoint to add (PRODUCTION or SANDBOX)
     */
    const handleAddEndpoint = (targetEndpointType) => {
        // Determine which endpoint to update based on existing endpoints
        const isProduction = targetEndpointType === 'PRODUCTION';
        const sourceEndpoints = isProduction ? sandboxEndpoints : productionEndpoints;
        const targetEndpoints = isProduction ? productionEndpoints : sandboxEndpoints;
        
        // If source endpoints exist but target endpoints don't, update the first source endpoint
        const targetEndpointId = (sourceEndpoints.length > 0 && targetEndpoints.length === 0)
            ? sourceEndpoints[0].id
            : 'new';
        
        const baseUrl = `/mcp-servers/${apiObject.id}/endpoints`;
        const url = targetEndpointId === 'new' 
            ? `${baseUrl}/create`
            : `${baseUrl}/create/${targetEndpointId}/${targetEndpointType}`;
        
        history.push(url);
    };

    const confirmDelete = () => {
        const { endpointType, endpoint } = deleteConfirmation;
        setIsDeleting(true);
        setDeleteConfirmation({ open: false, endpointType: null, endpoint: null });
        
        try {
            // Get the current endpoint configuration
            let endpointConfig;
            if (typeof endpoint.endpointConfig === 'string') {
                endpointConfig = JSON.parse(endpoint.endpointConfig);
            } else {
                endpointConfig = endpoint.endpointConfig;
            }

            // Validate that the endpoint configuration exists
            if (!endpointConfig) {
                throw new Error('Invalid endpoint configuration');
            }

            // Create a copy of the configuration to modify
            const updatedEndpointConfig = { ...endpointConfig };

            // Remove the specified endpoint type and its security
            if (endpointType === 'PRODUCTION') {
                delete updatedEndpointConfig.production_endpoints;
                if (updatedEndpointConfig.endpoint_security) {
                    delete updatedEndpointConfig.endpoint_security.production;
                }
            } else if (endpointType === 'SANDBOX') {
                delete updatedEndpointConfig.sandbox_endpoints;
                if (updatedEndpointConfig.endpoint_security) {
                    delete updatedEndpointConfig.endpoint_security.sandbox;
                }
            } else {
                throw new Error('Invalid endpoint type');
            }

            // Prepare the update payload
            const updatePayload = {
                ...endpoint,
                endpointConfig: JSON.stringify(updatedEndpointConfig)
            };

            const deletePromise = MCPServer.updateMCPServerBackend(apiObject.id, endpoint.id, updatePayload);

            deletePromise
                .then(() => {
                    Alert.success(intl.formatMessage({
                        id: 'MCPServers.Details.Endpoints.Endpoints.endpoint.delete.success',
                        defaultMessage: 'Endpoint deleted successfully',
                    }));
                    fetchEndpoints();
                })
                .catch((error) => {
                    console.error('Error deleting endpoint:', error);
                    Alert.error(intl.formatMessage({
                        id: 'MCPServers.Details.Endpoints.Endpoints.endpoint.delete.error',
                        defaultMessage: 'Error deleting endpoint',
                    }));
                })
                .finally(() => {
                    setIsDeleting(false);
                });
        } catch (error) {
            console.error('Error preparing delete operation:', error);
            Alert.error(intl.formatMessage({
                id: 'MCPServers.Details.Endpoints.Endpoints.endpoint.delete.error',
                defaultMessage: 'Error deleting endpoint',
            }));
            setIsDeleting(false);
        }
    };

    if (loading) {
        return <Progress per={90} message='Loading Endpoints ...' />;
    }

    return (
        <Grid container spacing={2}>
            <Grid item xs={12}>
                <StyledPaper elevation={0} variant='outlined'>
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-start', mb: 3 }}>
                        <Typography variant='h5' component='h2'>
                            <FormattedMessage
                                id='Apis.Details.Endpoints.AIEndpoints.AIEndpoints.production.endpoint.label'
                                defaultMessage='Production Endpoint'
                            />
                        </Typography>
                        {productionEndpoints.length === 0 && (
                            <Button
                                variant='outlined'
                                color='primary'
                                size='small'
                                disabled={isRestricted(
                                    ['apim:mcp_server_create', 'apim:mcp_server_manage', 'apim:mcp_server_publish'],
                                    apiObject)
                                }
                                onClick={() => handleAddEndpoint('PRODUCTION')}
                                sx={{ marginLeft: 1 }}
                            >
                                <AddCircle sx={{ marginRight: 1 }} />
                                <FormattedMessage
                                    id='Apis.Details.Endpoints.add.new.endpoint'
                                    defaultMessage='Add Production Endpoint'
                                />
                            </Button>
                        )}
                    </Box>
                    {productionEndpoints.length > 0 ? (
                        productionEndpoints.map((endpoint) => (
                            <EndpointCard
                                key={endpoint.id}
                                apiObject={apiObject}
                                endpoint={endpoint}
                                isDeleting={isDeleting}
                                onDelete={() => handleDelete('PRODUCTION', endpoint)}
                                endpointConfiguration={endpointConfiguration}
                                endpointType='PRODUCTION'
                            />
                        ))
                    ) : (
                        <Typography variant='body1'>
                            <FormattedMessage
                                id='Apis.Details.Endpoints.AIEndpoints.AIEndpoints.no.production.endpoints'
                                defaultMessage='No production endpoints configured'
                            />
                        </Typography>
                    )}
                </StyledPaper>
            </Grid>
            <Grid item xs={12}>
                <StyledPaper elevation={0} variant='outlined'>
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-start', mb: 3 }}>
                        <Typography variant='h5' component='h2'>
                            <FormattedMessage
                                id='Apis.Details.Endpoints.AIEndpoints.AIEndpoints.sandbox.endpoint.label'
                                defaultMessage='Sandbox Endpoint'
                            />
                        </Typography>
                        {sandboxEndpoints.length === 0 && (
                            <Button
                                variant='outlined'
                                color='primary'
                                size='small'
                                disabled={isRestricted(
                                    ['apim:mcp_server_create', 'apim:mcp_server_manage', 'apim:mcp_server_publish'],
                                    apiObject)
                                }
                                onClick={() => handleAddEndpoint('SANDBOX')}
                                sx={{ marginLeft: 1 }}
                            >
                                <AddCircle sx={{ marginRight: 1 }} />
                                <FormattedMessage
                                    id='Apis.Details.Endpoints.add.new.endpoint'
                                    defaultMessage='Add Sandbox Endpoint'
                                />
                            </Button>
                        )}
                    </Box>
                    {sandboxEndpoints.length > 0 ? (
                        sandboxEndpoints.map((endpoint) => (
                            <EndpointCard
                                key={endpoint.id}
                                apiObject={apiObject}
                                endpoint={endpoint}
                                isDeleting={isDeleting}
                                onDelete={() => handleDelete('SANDBOX', endpoint)}
                                endpointConfiguration={endpointConfiguration}
                                endpointType='SANDBOX'
                            />
                        ))
                    ) : (
                        <Typography variant='body1'>
                            <FormattedMessage
                                id='Apis.Details.Endpoints.AIEndpoints.AIEndpoints.no.sandbox.endpoints'
                                defaultMessage='No sandbox endpoints configured'
                            />
                        </Typography>
                    )}
                </StyledPaper>
            </Grid>
            <Grid item xs={12}>
                <StyledPaper elevation={0} variant='outlined'>
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
                        <Typography variant='h5' component='h2'>
                            <FormattedMessage
                                id='Apis.Details.Endpoints.AIEndpoints.AIEndpoints.general.config.header'
                                defaultMessage='General Endpoint Configurations'
                            />
                        </Typography>
                        {sourceInfo.type && sourceInfo.url && (
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <Chip
                                    label={`Source: ${sourceInfo.type}`}
                                    size='small'
                                    variant='outlined'
                                />
                                <Button
                                    variant='outlined'
                                    color='primary'
                                    size='small'
                                    startIcon={<RefreshIcon />}
                                    disabled={isRestricted(
                                        ['apim:mcp_server_create', 'apim:mcp_server_manage', 'apim:mcp_server_publish'],
                                        apiObject) || refetchModal.isRefetching
                                    }
                                    onClick={handleRefetchDefinition}
                                >
                                    <FormattedMessage
                                        id='MCPServers.Details.Endpoints.refetch.button'
                                        defaultMessage='Refetch Definition'
                                    />
                                </Button>
                            </Box>
                        )}
                    </Box>
                    <GeneralEndpointConfigurations endpointList={endpointList} />
                </StyledPaper>
            </Grid>
            <Grid item xs={12}>
                <Button
                    type='submit'
                    variant='contained'
                    color='primary'
                    disabled={isRestricted(
                        ['apim:mcp_server_create', 'apim:mcp_server_manage', 'apim:mcp_server_publish'], apiObject)}
                    endIcon={<OpenInNewIcon />}
                    onClick={() => {
                        history.push({
                            pathname: `/mcp-servers/${apiObject.id}/deployments`,
                            state: 'deploy',
                        })
                    }}
                >
                    <FormattedMessage
                        id='MCPServers.Details.Endpoints.Endpoints.deploy.redirect.btn'
                        defaultMessage='Go to Deployments'
                    />
                </Button>
            </Grid>

            {/* Refetch Definition Modal */}
            <Dialog
                open={refetchModal.open}
                onClose={handleCloseRefetchModal}
                aria-labelledby='refetch-modal-title'
                maxWidth='md'
                fullWidth
            >
                <DialogTitle id='refetch-modal-title'>
                    <FormattedMessage
                        id='MCPServers.Details.Endpoints.refetch.modal.title'
                        defaultMessage='Refetch Definition and Tools'
                    />
                </DialogTitle>
                <DialogContent>
                    {refetchModal.isRefetching ? (
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', p: 3 }}>
                            <CircularProgress size={24} sx={{ mr: 2 }} />
                            <Typography>
                                <FormattedMessage
                                    id='MCPServers.Details.Endpoints.refetch.modal.fetching'
                                    defaultMessage='Fetching latest definition from source...'
                                />
                            </Typography>
                        </Box>
                    ) : (
                        <Box>
                            <Typography variant='body1' paragraph>
                                <FormattedMessage
                                    id='MCPServers.Details.Endpoints.refetch.modal.description'
                                    defaultMessage={'The definition has been successfully refetched from the source. '
                                        + 'Found {count} operations/tools.'}
                                    values={{ count: refetchModal.refetchedOperations.length }}
                                />
                            </Typography>

                            {refetchModal.refetchedOperations.length > 0 && (
                                <Box sx={{ mb: 3 }}>
                                    <Typography variant='subtitle1' gutterBottom>
                                        <FormattedMessage
                                            id='MCPServers.Details.Endpoints.refetch.modal.operations.title'
                                            defaultMessage='Available Operations/Tools:'
                                        />
                                    </Typography>
                                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                                        {refetchModal.refetchedOperations.map((operation) => (
                                            <Chip
                                                key={`${operation.target}-${operation.verb}`}
                                                label={`${operation.target} (${operation.verb})`}
                                                variant='outlined'
                                                size='small'
                                            />
                                        ))}
                                    </Box>
                                </Box>
                            )}

                            <Typography variant='subtitle1' gutterBottom>
                                <FormattedMessage
                                    id='MCPServers.Details.Endpoints.refetch.modal.strategy.title'
                                    defaultMessage='How would you like to handle the updated tools/operations?'
                                />
                            </Typography>
                            <RadioGroup
                                value={refetchModal.refetchStrategy}
                                onChange={(e) => setRefetchModal(prev => ({
                                    ...prev,
                                    refetchStrategy: e.target.value
                                }))}
                            >
                                <FormControlLabel
                                    value='replace'
                                    control={<Radio />}
                                    label={
                                        <Box>
                                            <Typography variant='body2' fontWeight='medium'>
                                                <FormattedMessage
                                                    id={'MCPServers.Details.Endpoints.refetch.modal.'
                                                        + 'strategy.replace.title'}
                                                    defaultMessage='Replace existing tools/operations'
                                                />
                                            </Typography>
                                            <Typography variant='caption' color='text.secondary'>
                                                <FormattedMessage
                                                    id={'MCPServers.Details.Endpoints.refetch.modal.'
                                                        + 'strategy.replace.description'}
                                                    defaultMessage={'All current tools will be replaced with '
                                                        + 'the newly fetched operations.'}
                                                />
                                            </Typography>
                                        </Box>
                                    }
                                />
                                <FormControlLabel
                                    value='keep'
                                    control={<Radio />}
                                    label={
                                        <Box>
                                            <Typography variant='body2' fontWeight='medium'>
                                                <FormattedMessage
                                                    id='MCPServers.Details.Endpoints.refetch.modal.strategy.keep.title'
                                                    defaultMessage='Keep existing tools, add new ones'
                                                />
                                            </Typography>
                                            <Typography variant='caption' color='text.secondary'>
                                                <FormattedMessage
                                                    id={'MCPServers.Details.Endpoints.refetch.modal.'
                                                        + 'strategy.keep.description'}
                                                    defaultMessage={'Existing tools will be preserved, '
                                                        + 'and new operations will be added.'}
                                                />
                                            </Typography>
                                        </Box>
                                    }
                                />
                            </RadioGroup>
                        </Box>
                    )}
                </DialogContent>
                <DialogActions>
                    <Button
                        onClick={handleCloseRefetchModal}
                        disabled={refetchModal.isRefetching}
                    >
                        <FormattedMessage
                            id='MCPServers.Details.Endpoints.refetch.modal.cancel'
                            defaultMessage='Cancel'
                        />
                    </Button>
                    <Button
                        onClick={handleApplyRefetch}
                        variant='contained'
                        disabled={refetchModal.isRefetching || refetchModal.refetchedOperations.length === 0}
                    >
                        <FormattedMessage
                            id='MCPServers.Details.Endpoints.refetch.modal.apply'
                            defaultMessage='Apply Changes'
                        />
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Delete Confirmation Dialog */}
            <Dialog
                open={deleteConfirmation.open}
                onClose={() => setDeleteConfirmation({ open: false, endpointType: null, endpoint: null })}
                aria-labelledby='delete-confirmation-dialog-title'
            >
                <DialogTitle id='delete-confirmation-dialog-title'>
                    <FormattedMessage
                        id='MCPServers.Details.Endpoints.Endpoints.delete.confirmation.title'
                        defaultMessage='Confirm Delete'
                    />
                </DialogTitle>
                <DialogContent>
                    <Typography>
                        <FormattedMessage
                            id='MCPServers.Details.Endpoints.Endpoints.delete.confirmation.message'
                            defaultMessage={
                                'Are you sure you want to delete the {endpointType} endpoint? ' +
                                'This action cannot be undone.'
                            }
                            values={{
                                endpointType: deleteConfirmation.endpointType?.toLowerCase() || 'selected'
                            }}
                        />
                    </Typography>
                </DialogContent>
                <DialogActions>
                    <Button
                        onClick={() => setDeleteConfirmation({ open: false, endpointType: null, endpoint: null })}
                        color='primary'
                    >
                        <FormattedMessage
                            id='MCPServers.Details.Endpoints.Endpoints.delete.confirmation.cancel'
                            defaultMessage='Cancel'
                        />
                    </Button>
                    <Button
                        onClick={confirmDelete}
                        color='primary'
                        variant='contained'
                        disabled={isDeleting}
                    >
                        <FormattedMessage
                            id='MCPServers.Details.Endpoints.Endpoints.delete.confirmation.delete'
                            defaultMessage='Delete'
                        />
                    </Button>
                </DialogActions>
            </Dialog>
        </Grid>
    );
}

Endpoints.propTypes = {
    apiObject: PropTypes.shape({
        id: PropTypes.string,
        apiType: PropTypes.string,
    }).isRequired,
    endpointConfiguration: PropTypes.shape({
        production_endpoints: PropTypes.arrayOf(PropTypes.shape({
            url: PropTypes.string,
        })),
        sandbox_endpoints: PropTypes.arrayOf(PropTypes.shape({
            url: PropTypes.string,
        })),
        endpoint_type: PropTypes.string,
        endpoint_security: PropTypes.shape({
            production: PropTypes.shape({}),
            sandbox: PropTypes.shape({}),
        }),
    }).isRequired,
    history: PropTypes.shape({}).isRequired,
}

export default Endpoints;
