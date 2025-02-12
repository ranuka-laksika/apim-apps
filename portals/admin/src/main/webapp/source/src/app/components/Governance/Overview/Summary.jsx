/* eslint-disable */
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
import { useIntl } from 'react-intl';
import ContentBase from 'AppComponents/AdminPages/Addons/ContentBase';
import { Grid, Card, CardContent, Typography } from '@mui/material';
import DonutChart from 'AppComponents/Shared/DonutChart';
import ApiComplianceTable from './ApiComplianceTable';
import PolicyAttachmentAdherenceTable from './PolicyAttachmentAdherenceTable';
import GovernanceAPI from 'AppData/GovernanceAPI';

export default function Summary() {
    const intl = useIntl();
    const [policyAttachmentAdherence, setPolicyAttachmentAdherence] = useState({
        followedPolicyAttachments: 0,
        violatedPolicyAttachments: 0,
        unAppliedPolicyAttachments: 0
    });
    const [apiCompliance, setApiCompliance] = useState({
        compliantArtifacts: 0,
        nonCompliantArtifacts: 0,
        notApplicableArtifacts: 0,
        pendingArtifacts: 0
    });

    useEffect(() => {
        const restApi = new GovernanceAPI();

        Promise.all([
            restApi.getPolicyAttachmentAdherenceSummary(),
            restApi.getComplianceSummaryForAPIs()
        ])
            .then(([policyAttachmentResponse, artifactResponse]) => {
                // Set Policy Adherence
                setPolicyAttachmentAdherence({
                    followedPolicyAttachments: policyAttachmentResponse.body.followed || 0,
                    violatedPolicyAttachments: policyAttachmentResponse.body.violated || 0,
                    unAppliedPolicyAttachments: policyAttachmentResponse.body.unApplied || 0
                });

                // Set API compliance
                setApiCompliance({
                    compliantArtifacts: artifactResponse.body.compliant || 0,
                    nonCompliantArtifacts: artifactResponse.body.nonCompliant || 0,
                    notApplicableArtifacts: artifactResponse.body.notApplicable || 0,
                    pendingArtifacts: artifactResponse.body.pending || 0
                });
            })
            .catch((error) => {
                console.error('Error fetching compliance data:', error);
            });
    }, []);

    return (
        <ContentBase
            width='full'
            title={intl.formatMessage({
                id: 'Governance.Overview.title',
                defaultMessage: 'Overview',
            })}
            pageStyle='paperLess'
        >
            <Grid container spacing={4} alignItems='left'>
                <Grid item xs={12} md={6} lg={4}>
                    <Card elevation={3}>
                        <CardContent>
                            <Typography
                                variant='body1'
                                sx={{ fontWeight: 'bold', mb: 2 }}
                            >
                                {intl.formatMessage({
                                    id: 'Governance.Overview.Summary.policyAttachment.adherence',
                                    defaultMessage: 'Policy Attachment Adherence',
                                })}
                            </Typography>
                            <DonutChart
                                data={[
                                    {
                                        id: 0,
                                        value: policyAttachmentAdherence.followedPolicyAttachments,
                                        label: intl.formatMessage({
                                            id: 'Governance.Overview.Summary.policyAttachment.followed',
                                            defaultMessage: 'Followed ({count})',
                                        }, { count: policyAttachmentAdherence.followedPolicyAttachments })
                                    },
                                    {
                                        id: 1,
                                        value: policyAttachmentAdherence.violatedPolicyAttachments,
                                        label: intl.formatMessage({
                                            id: 'Governance.Overview.Summary.policyAttachment.violated',
                                            defaultMessage: 'Violated ({count})',
                                        }, { count: policyAttachmentAdherence.violatedPolicyAttachments })
                                    },
                                    {
                                        id: 2,
                                        value: policyAttachmentAdherence.unAppliedPolicyAttachments,
                                        label: intl.formatMessage({
                                            id: 'Governance.Overview.Summary.policyAttachment.not.applied',
                                            defaultMessage: 'Not Applied ({count})',
                                        }, { count: policyAttachmentAdherence.unAppliedPolicyAttachments })
                                    }
                                ]}
                            />
                        </CardContent>
                    </Card>
                </Grid>
                <Grid item xs={12} md={6} lg={4}>
                    <Card elevation={3}>
                        <CardContent>
                            <Typography
                                variant='body1'
                                sx={{ fontWeight: 'bold', mb: 2 }}
                            >
                                {intl.formatMessage({
                                    id: 'Governance.Overview.Summary.api.compliance',
                                    defaultMessage: 'API Compliance',
                                })}
                            </Typography>
                            <DonutChart
                                data={[
                                    {
                                        id: 0,
                                        value: apiCompliance.compliantArtifacts,
                                        label: intl.formatMessage({
                                            id: 'Governance.Overview.Summary.api.compliant',
                                            defaultMessage: 'Compliant ({count})',
                                        }, { count: apiCompliance.compliantArtifacts })
                                    },
                                    {
                                        id: 1,
                                        value: apiCompliance.nonCompliantArtifacts,
                                        label: intl.formatMessage({
                                            id: 'Governance.Overview.Summary.api.non.compliant',
                                            defaultMessage: 'Non-Compliant ({count})',
                                        }, { count: apiCompliance.nonCompliantArtifacts })
                                    },
                                    {
                                        id: 2,
                                        value: apiCompliance.pendingArtifacts,
                                        label: intl.formatMessage({
                                            id: 'Governance.Overview.Summary.api.pending',
                                            defaultMessage: 'Pending ({count})',
                                        }, { count: apiCompliance.pendingArtifacts })
                                    },
                                    {
                                        id: 3,
                                        value: apiCompliance.notApplicableArtifacts,
                                        label: intl.formatMessage({
                                            id: 'Governance.Overview.Summary.api.not.applicable',
                                            defaultMessage: 'Not Applicable ({count})',
                                        }, { count: apiCompliance.notApplicableArtifacts })
                                    }
                                ]}
                                colors={['#2E96FF', '#FF5252', '#FFC107', 'grey']}
                            />
                        </CardContent>
                    </Card>
                </Grid>
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
                                {intl.formatMessage({
                                    id: 'Governance.Overview.Summary.api.compliance.details',
                                    defaultMessage: 'API Compliance Details',
                                })}
                            </Typography>
                            <ApiComplianceTable />
                        </CardContent>
                    </Card>
                </Grid>
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
                                {intl.formatMessage({
                                    id: 'Governance.Overview.Summary.policyAttachment.adherence.details',
                                    defaultMessage: 'Policy Attachment Adherence Details',
                                })}
                            </Typography>
                            <PolicyAttachmentAdherenceTable />
                        </CardContent>
                    </Card>
                </Grid>
            </Grid>
        </ContentBase >
    );
}
