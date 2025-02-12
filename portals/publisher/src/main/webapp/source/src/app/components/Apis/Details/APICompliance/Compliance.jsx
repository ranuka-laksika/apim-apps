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

import React, { useEffect, useState } from 'react';
import { styled } from '@mui/material/styles';
import { Grid, Card, CardContent, Typography } from '@mui/material';
import DonutChart from 'AppComponents/Shared/DonutChart';
import { FormattedMessage, useIntl } from 'react-intl';
import GovernanceAPI from 'AppData/GovernanceAPI';
import { useAPI } from 'AppComponents/Apis/Details/components/ApiContext';
import HourglassEmptyIcon from '@mui/icons-material/HourglassEmpty';
import PolicyAttachmentAdherenceSummaryTable from './PolicyAttachmentAdherenceSummaryTable';
import PolicyAdherenceSummaryTable from './PolicyAdherenceSummaryTable';
import RuleViolationSummary from './RuleViolationSummary';

const PREFIX = 'Compliance';

const classes = {
    root: `${PREFIX}-root`,
};

const Root = styled('div')(({ theme }) => ({
    [`& .${classes.root}`]: {
        ...theme.mixins.gutters(),
        paddingTop: theme.spacing(2),
        paddingBottom: theme.spacing(2),
    },
}));

export default function Compliance() {
    const intl = useIntl();
    const [api] = useAPI();
    const artifactId = api.id;
    const [statusCounts, setStatusCounts] = useState({ passed: 0, failed: 0 });
    const [complianceStatus, setComplianceStatus] = useState('');

    useEffect(() => {
        // Skip the API call if this is a revision
        if (api.isRevision) {
            return undefined;
        }

        const abortController = new AbortController();
        const restApi = new GovernanceAPI();

        restApi.getComplianceByAPIId(artifactId, { signal: abortController.signal })
            .then((response) => {
                setComplianceStatus(response.body.status);
                const policyMap = new Map();

                response.body.governedPolicyAttachments.forEach(policyAttachment => {
                    policyAttachment.policyValidationResults.forEach(result => {
                        // If policy not in map or if existing result is older, update the map
                        if (!policyMap.has(result.id)) {
                            policyMap.set(result.id, result);
                        }
                    });
                });

                // Count statuses from unique policies
                const counts = Array.from(policyMap.values()).reduce((acc, result) => {
                    if (result.status === 'PASSED') acc.passed += 1;
                    if (result.status === 'FAILED') acc.failed += 1;
                    return acc;
                }, { passed: 0, failed: 0 });

                setStatusCounts(counts);
            })
            .catch((error) => {
                if (!abortController.signal.aborted) {
                    console.error('Error fetching policy adherence data:', error);
                    setStatusCounts({ passed: 0, failed: 0 });
                }
            });

        return () => {
            abortController.abort();
        };
    }, [artifactId, api.isRevision]);

    if (api.isRevision) {
        return (
            <Root>
                <Typography variant='h4' component='h2' align='left'>
                    <FormattedMessage
                        id='Apis.Details.Compliance.topic.header'
                        defaultMessage='Compliance Summary'
                    />
                </Typography>
                <Grid container spacing={4}>
                    {/* Rule Violation Summary section */}
                    <Grid item xs={12}>
                        <Card elevation={3}

                            sx={{
                                display: 'flex',
                                justifyContent: 'center',
                                alignItems: 'center',
                                minHeight: 200,
                                backgroundColor: 'background.paper',
                                padding: 2,
                                borderRadius: 1,
                            }}
                        >
                            <Typography variant='h5' component='div' color='text.secondary'>
                                <FormattedMessage
                                    id='Apis.Details.Compliance.revision.message'
                                    defaultMessage={'Compliance summary is not available for API revisions.'
                                        + ' Please navigate to the current API version to view the compliance summary.'}
                                />
                            </Typography>
                        </Card>
                    </Grid>
                </Grid>
            </Root>
        );
    }

    if (complianceStatus === 'PENDING') {
        return (
            <Root>
                <Typography variant='h4' component='h2' align='left'>
                    <FormattedMessage
                        id='Apis.Details.Compliance.topic.header'
                        defaultMessage='Compliance Summary'
                    />
                </Typography>
                <Card 
                    elevation={3}
                    sx={{
                        mt: 2,
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        padding: 4,
                    }}
                >
                    <HourglassEmptyIcon
                        sx={{
                            fontSize: 60,
                            color: 'action.disabled',
                            mb: 2,
                        }}
                    />
                    <Typography
                        variant='h5'
                        color='text.secondary'
                        gutterBottom
                        sx={{ fontWeight: 'medium' }}
                    >
                        <FormattedMessage
                            id='Apis.Details.Compliance.check.progress'
                            defaultMessage='Compliance Check in Progress'
                        />
                    </Typography>
                    <Typography
                        variant='body1'
                        color='text.secondary'
                        align='center'
                    >
                        <FormattedMessage
                            id='Apis.Details.Compliance.check.progress.message'
                            defaultMessage='The compliance check is currently in progress. This may take a few moments.'
                        />
                    </Typography>
                </Card>
            </Root>
        );
    }

    return (
        <Root>
            <Typography variant='h4' component='h2' align='left'>
                <FormattedMessage
                    id='Apis.Details.Compliance.topic.header'
                    defaultMessage='Compliance Summary'
                />
            </Typography>
            <Grid container spacing={4}>
                {/* Rule Violation Summary section */}
                <Grid item xs={12}>
                    <Card elevation={3}>
                        <CardContent>
                            <RuleViolationSummary artifactId={artifactId} />
                        </CardContent>
                    </Card>
                </Grid>

                {/* Policy Attachment Adherence Summary section */}
                <Grid item xs={12}>
                    <Card elevation={3}
                        sx={{
                            '& .MuiTableCell-footer': {
                                border: 0
                            },
                        }}>
                        <CardContent>
                            <Typography
                                variant='body1'
                                sx={{ fontWeight: 'bold', mb: 2 }}
                            >
                                <FormattedMessage
                                    id='Apis.Details.Compliance.policyAttachment.adherence.summary'
                                    defaultMessage='Policy Attachment Adherence Summary'
                                />
                            </Typography>
                            <PolicyAttachmentAdherenceSummaryTable artifactId={artifactId} />
                        </CardContent>
                    </Card>
                </Grid>

                {/* Policy Adherence Summary section */}
                <Grid item xs={12} md={4}>
                    <Card elevation={3}>
                        <CardContent>
                            <Typography
                                variant='body1'
                                sx={{ fontWeight: 'bold', mb: 2 }}
                            >
                                <FormattedMessage
                                    id='Apis.Details.Compliance.policy.adherence'
                                    defaultMessage='Policy Adherence'
                                />
                            </Typography>
                            <DonutChart
                                colors={['#2E96FF', '#FF5252']}
                                data={[
                                    {
                                        id: 0,
                                        value: statusCounts.passed,
                                        label: `${intl.formatMessage({
                                            id: 'Apis.Details.Compliance.passed',
                                            defaultMessage: 'Passed'
                                        })} (${statusCounts.passed})`
                                    },
                                    {
                                        id: 1,
                                        value: statusCounts.failed,
                                        label: `${intl.formatMessage({
                                            id: 'Apis.Details.Compliance.failed',
                                            defaultMessage: 'Failed'
                                        })} (${statusCounts.failed})`
                                    },
                                ]}
                            />
                        </CardContent>
                    </Card>
                </Grid>

                <Grid item xs={12} md={8}>
                    <Card elevation={3} sx={{
                        '& .MuiTableCell-footer': {
                            border: 0
                        },
                    }}>
                        <CardContent>
                            <Typography
                                variant='body1'
                                sx={{ fontWeight: 'bold', mb: 2 }}
                            >
                                <FormattedMessage
                                    id='Apis.Details.Compliance.policy.adherence.summary'
                                    defaultMessage='Policy Adherence Summary'
                                />
                            </Typography>
                            <PolicyAdherenceSummaryTable artifactId={artifactId} />
                        </CardContent>
                    </Card>
                </Grid>
            </Grid>
        </Root>
    );
}
