/*
 * Copyright (c) 2019, WSO2 Inc. (http://www.wso2.org) All Rights Reserved.
 *
 * WSO2 Inc. licenses this file to you under the Apache License,
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
import { styled } from '@mui/material/styles';
import PropTypes from 'prop-types';
import TextField from '@mui/material/TextField';
import Grid from '@mui/material/Grid';
import { InputAdornment, IconButton, Icon, Select, MenuItem, Box } from '@mui/material';
import CircularProgress from '@mui/material/CircularProgress';
import Chip from '@mui/material/Chip';
import Typography from '@mui/material/Typography';
import { FormattedMessage } from 'react-intl';
import APIValidation from 'AppData/APIValidation';
import FormControl from '@mui/material/FormControl';
import FormHelperText from '@mui/material/FormHelperText';
import FormLabel from '@mui/material/FormLabel';
import API from 'AppData/api';
import { green } from '@mui/material/colors';

const PREFIX = 'DefaultAPIForm';

const classes = {
    mandatoryStar: `${PREFIX}-mandatoryStar`,
    helperTextContext: `${PREFIX}-helperTextContext`,
    endpointValidChip: `${PREFIX}-endpointValidChip`,
    endpointInvalidChip: `${PREFIX}-endpointInvalidChip`,
    endpointErrorChip: `${PREFIX}-endpointErrorChip`,
    iconButton: `${PREFIX}-iconButton`,
    iconButtonValid: `${PREFIX}-iconButtonValid`,
    radioOutline: `${PREFIX}-radioOutline`,
    label: `${PREFIX}-label`,
    newLabel: `${PREFIX}-newLabel`,
};

const StyledGrid = styled(Grid)(({ theme }) => ({
    [`& .${classes.mandatoryStar}`]: {
        color: theme.palette.error.main,
        marginLeft: theme.spacing(0.1),
    },

    [`& .${classes.helperTextContext}`]: {
        '& p': {
            textOverflow: 'ellipsis',
            width: 400,
            display: 'block',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
        },
    },

    [`& .${classes.endpointValidChip}`]: {
        color: 'green',
        border: '1px solid green',
    },

    [`& .${classes.endpointInvalidChip}`]: {
        color: '#ffd53a',
        border: '1px solid #ffd53a',
    },

    [`& .${classes.endpointErrorChip}`]: {
        color: 'red',
        border: '1px solid red',
    },

    [`& .${classes.iconButton}`]: {
        padding: theme.spacing(1),
    },

    [`& .${classes.iconButtonValid}`]: {
        padding: theme.spacing(1),
        color: green[500],
    },

    [`& .${classes.radioOutline}`]: {
        display: 'flex',
        alignItems: 'center',
        padding: '10px', // Adjust the padding for the desired outline size
        marginTop: '10px',
        marginLeft: '15px',
        marginRight: '8px',
        borderRadius: '8px', // Adjust the border-radius for a square outline
        transition: 'border 0.3s', // Add transition for a smooth color change
        '&.Mui-checked': {
            border: `2px solid ${theme.palette.primary.main}`, // Change to blue when selected
        },
    },

    [`& .${classes.label}`]: {
        marginLeft: '10px', // Adjust as needed for spacing between the radio button and label
    },

    [`& .${classes.newLabel}`]: {
        backgroundColor: 'green', // Blue color
        color: 'white',
        fontWeight: 'bold',
        fontSize: '0.6rem',
        padding: '2px 4px', // Adjust padding as needed
        borderRadius: '4px', // Adjust border-radius for rounded corners
        marginLeft: '10px', // Adjust margin as needed
        display: 'inline-block', // Ensure inline display
    },

}));

/**
 *
 * Return the actual API context that will be exposed in the gateway.
 * If the context value contains `{version}` placeholder text it will be replaced with the actual version value.
 * If there is no such placeholder text in the context, The version will be appended to the context
 * i:e /context/version
 * Parameter expect an object containing `context` and `version` properties.
 * @param {String} context API Context
 * @param {String} version API Version string
 * @param isWebSocket check whether it is a webSocketAPI
 * @returns {String} Derived actual context string
 */
function actualContext({ context, version }, isWebSocket) {
    let initialContext;
    // eslint-disable-next-line no-unused-expressions
    isWebSocket ? (initialContext = '{channel}/{version}') : (initialContext = '{context}/{version}');
    if (context) {
        initialContext = context;
        if (context.indexOf('{version}') < 0) {
            initialContext = context + '/{version}';
        }
    }
    if (version) {
        initialContext = initialContext.replace('{version}', version);
    }
    return initialContext;
}

/**
 * Improved API create default form
 *
 * @export
 * @param {*} props
 * @returns
 */
export default function DefaultAPIForm(props) {
    const {
        onChange, onValidate, api, isAPIProduct, multiGateway,
        isWebSocket, children, appendChildrenBeforeEndpoint, hideEndpoint,
        readOnlyAPIEndpoint,
    } = props;

    const [validity, setValidity] = useState({});
    const [isEndpointValid, setIsEndpointValid] = useState();
    const [statusCode, setStatusCode] = useState('');
    const [isUpdating, setUpdating] = useState(false);
    const [isErrorCode, setIsErrorCode] = useState(false);
    const iff = (condition, then, otherwise) => (condition ? then : otherwise);

    // Check the provided API validity on mount, TODO: Better to use Joi schema here ~tmkb
    useEffect(() => {
        onValidate(Boolean(api.name)
            && (Boolean(api.version))
            && Boolean(api.context));
    }, []);

    const updateValidity = (newState) => {
        let isFormValid = Object.entries(newState).length > 0
            && Object.entries(newState)
                .map(([, value]) => value === null || value === undefined)
                .reduce((acc, cVal) => acc && cVal); // Aggregate the individual validation states
        // TODO: refactor following redundant validation.
        // The valid state should available in the above reduced state ~tmkb
        isFormValid = isFormValid
            && Boolean(api.name)
            && Boolean(api.version)
            && Boolean(api.context);
        onValidate(isFormValid, validity);
        setValidity(newState);
    };
    /**
     * Trigger the provided onValidate call back on each input validation run
     * Do the validation state aggregation and call the onValidate method with aggregated value
     * @param {string} field The input field.
     * @param {string} value Validation state object
     */
    function validate(field, value) {
        switch (field) {
            case 'name': {
                const nameValidity = APIValidation.apiName.validate(value, { abortEarly: false }).error;
                if (nameValidity === null) {
                    APIValidation.apiParameter.validate(field + ':' + value).then((result) => {
                        if (result === true) {
                            updateValidity({
                                ...validity,
                                name: {
                                    details:
                                        [{
                                            message: <FormattedMessage
                                                id='Apis.Create.Components.DefaultAPIForm.validation.error.name.exists'
                                                defaultMessage='Name {value} already exists'
                                                values={{ value }}
                                            />,
                                        }],
                                },
                            });
                        } else {
                            updateValidity({ ...validity, name: nameValidity });
                        }
                    });
                } else {
                    updateValidity({ ...validity, name: nameValidity });
                }
                break;
            }
            case 'context': {
                let contextValidity = APIValidation.apiContext.required().validate(value, { abortEarly: false })
                    .error;
                const apiContext = value.startsWith('/') ? value : '/' + value;
                if (contextValidity === null) {
                    const splitContext = apiContext.split('/');
                    for (const param of splitContext) {
                        if (param !== null && param !== '{version}') {
                            if (param.includes('{version}')) {
                                contextValidity = APIValidation.apiContextWithoutKeyWords.required()
                                    .validate(value, { abortEarly: false }).error;
                                updateValidity({
                                    ...validity,
                                    // eslint-disable-next-line max-len
                                    context: {
                                        details:
                                            [{
                                                message: <FormattedMessage
                                                    id={'Apis.Create.Components.DefaultAPIForm.validation.error.'
                                                        + 'version.exists.as.a.substring.in.path.param'}
                                                    defaultMessage={'{version} cannot exist as a substring in a '
                                                        + 'path param'}
                                                />,
                                            }]
                                    },
                                });
                            } else if (param.includes('{') || param.includes('}')) {
                                contextValidity = APIValidation.apiContextWithoutKeyWords.required()
                                    .validate(value, { abortEarly: false }).error;
                                updateValidity({
                                    ...validity,
                                    // eslint-disable-next-line max-len
                                    context: {
                                        details: [{
                                            message: <FormattedMessage
                                                id={'Apis.Create.Components.DefaultAPIForm.validation.error.curly.'
                                                    + 'braces.cannot.be.in.path.param'}
                                                defaultMessage='{ or } cannot exist as a substring in a path param'
                                            />,
                                        }]
                                    },
                                });
                            }
                        }
                    }

                    let charCount = 0;

                    if (contextValidity === null) {
                        for (const a of apiContext) {
                            if (a === '(') {
                                charCount++;
                            } else if (a === ')') {
                                charCount--;
                            }
                            if (charCount < 0) {
                                updateValidity({
                                    ...validity,
                                    // eslint-disable-next-line max-len
                                    context: {
                                        details: [{
                                            message: <FormattedMessage
                                                id={'Apis.Create.Components.DefaultAPIForm.validation.error.'
                                                    + 'unbalanced.parantheses'}
                                                defaultMessage='Parentheses should be balanced in API context'
                                            />,
                                        }]
                                    },
                                });
                            }
                        }

                        if (charCount > 0) {
                            updateValidity({
                                ...validity,
                                // eslint-disable-next-line max-len
                                context: {
                                    details: [{
                                        message: <FormattedMessage
                                            id={'Apis.Create.Components.DefaultAPIForm.validation.error.'
                                                + 'unbalanced.parantheses'}
                                            defaultMessage='Parentheses should be balanced in API context'
                                        />,
                                    }]
                                },
                            });
                        }
                    }
                    if (contextValidity === null && charCount === 0) {
                        APIValidation.apiParameter.validate(field + ':' + apiContext).then((result) => {
                            if (result === true) {
                                updateValidity({
                                    ...validity,
                                    // eslint-disable-next-line max-len
                                    context: { details: [{ message: isWebSocket ? apiContext + ' channel already exists' : apiContext + ' context already exists' }] },
                                });
                            } else {
                                updateValidity({ ...validity, context: contextValidity, version: null });
                            }
                        });
                    }
                } else {
                    updateValidity({ ...validity, context: contextValidity });
                }
                break;
            }
            case 'version': {
                const versionValidity = APIValidation.apiVersion.required().validate(value).error;
                updateValidity({ ...validity, version: versionValidity });
                break;
            }
            case 'endpoint': {
                if (isWebSocket && value && value.length > 0) {
                    const wsUrlValidity = APIValidation.wsUrl.validate(value).error;
                    updateValidity({ ...validity, endpointURL: wsUrlValidity });
                }
                break;
            }
            default: {
                break;
            }
        }
    }

    function testEndpoint(endpoint) {
        setUpdating(true);
        const restApi = new API();
        restApi.testEndpoint(endpoint)
            .then((result) => {
                if (result.body.error !== null) {
                    setStatusCode(result.body.error);
                    setIsErrorCode(true);
                } else {
                    setStatusCode(result.body.statusCode + ' ' + result.body.statusMessage);
                    setIsErrorCode(false);
                }
                if (result.body.statusCode >= 200 && result.body.statusCode < 300) {
                    setIsEndpointValid(true);
                    setIsErrorCode(false);
                } else {
                    setIsEndpointValid(false);
                }
            }).finally(() => {
                setUpdating(false);
            });
    }

    return (
        <StyledGrid item md={12}>
            <form noValidate autoComplete='off'>
                <TextField
                    autoFocus
                    fullWidth
                    id='api-name'
                    error={Boolean(validity.name)}
                    label={(
                        <>
                            <FormattedMessage id='Apis.Create.Components.DefaultAPIForm.name' defaultMessage='Name' />
                            <sup className={classes.mandatoryStar}>*</sup>
                        </>
                    )}
                    helperText={
                        validity.name
                        && validity.name.details.map((detail, index) => {
                            return <div style={{ marginTop: index !== 0 && '10px' }}>{detail.message}</div>;
                        })
                    }
                    value={api.name}
                    name='name'
                    onChange={onChange}
                    InputProps={{
                        id: 'itest-id-apiname-input',
                        onBlur: ({ target: { value } }) => {
                            validate('name', value);
                        },
                    }}
                    InputLabelProps={{
                        for: 'itest-id-apiname-input',
                    }}
                    margin='normal'
                    variant='outlined'
                />
                <Grid container spacing={2}>
                    {!isAPIProduct ? (
                        <>
                            <Grid item md={8} xs={6}>
                                <TextField
                                    fullWidth
                                    id='context'
                                    error={Boolean(validity.context)}
                                    label={(
                                        <>
                                            {isWebSocket ? (
                                                <FormattedMessage
                                                    id='Apis.Create.Components.DefaultAPIForm.api.channel'
                                                    defaultMessage='Channel'
                                                />
                                            ) : (
                                                <FormattedMessage
                                                    id='Apis.Create.Components.DefaultAPIForm.api.context'
                                                    defaultMessage='Context'
                                                />
                                            )}
                                            <sup className={classes.mandatoryStar}>*</sup>
                                        </>
                                    )}
                                    name='context'
                                    value={api.context}
                                    onChange={onChange}
                                    InputProps={{
                                        id: 'itest-id-apicontext-input',
                                        onBlur: ({ target: { value } }) => {
                                            validate('context', value);
                                        },
                                    }}
                                    InputLabelProps={{
                                        for: 'itest-id-apicontext-input',
                                    }}
                                    helperText={
                                        (validity.context
                                            && validity.context.details.map((detail, index) => {
                                                return (
                                                    <div style={{ marginTop: index !== 0 && '10px' }}>
                                                        {detail.message}
                                                    </div>
                                                );
                                            }))
                                        // eslint-disable-next-line max-len
                                        || (
                                            <FormattedMessage
                                                id='Apis.Create.Components.DefaultAPIForm.api.actual.context.helper'
                                                defaultMessage={'API will be exposed in {actualContext}'
                                                    + ' context at the gateway'}
                                                values={{ actualContext: actualContext(api, isWebSocket) }}
                                            />
                                        )
                                    }
                                    classes={{ root: classes.helperTextContext }}
                                    margin='normal'
                                    variant='outlined'
                                />
                            </Grid>
                            <Grid item md={4} xs={6}>
                                <TextField
                                    fullWidth
                                    id='version'
                                    error={Boolean(validity.version)}
                                    label={(
                                        <>
                                            <FormattedMessage
                                                id='Apis.Create.Components.DefaultAPIForm.version'
                                                defaultMessage='Version'
                                            />
                                            <sup className={classes.mandatoryStar}>*</sup>
                                        </>
                                    )}
                                    name='version'
                                    value={api.version}
                                    onChange={onChange}
                                    InputProps={{
                                        id: 'itest-id-apiversion-input',
                                        onBlur: ({ target: { value } }) => {
                                            validate('version', value);
                                        },
                                    }}
                                    InputLabelProps={{
                                        for: 'itest-id-apiversion-input',
                                    }}
                                    helperText={validity.version && validity.version.message}
                                    margin='normal'
                                    variant='outlined'
                                />
                            </Grid>
                        </>
                    ) : (
                        <>
                            <Grid item md={8} xs={6}>
                                <TextField
                                    fullWidth
                                    id='context'
                                    error={Boolean(validity.context)}
                                    label={(
                                        <>
                                            <FormattedMessage
                                                id='Apis.Create.Components.DefaultAPIForm.api.product.context'
                                                defaultMessage='Context'
                                            />
                                            <sup className={classes.mandatoryStar}>*</sup>
                                        </>
                                    )}
                                    name='context'
                                    value={api.context}
                                    onChange={onChange}
                                    InputProps={{
                                        onBlur: ({ target: { value } }) => {
                                            validate('context', value);
                                        },
                                    }}
                                    helperText={
                                        (validity.context
                                            && validity.context.details.map((detail, index) => {
                                                return (
                                                    <div
                                                        key={detail.message}
                                                        style={{ marginTop: index !== 0 && '10px' }}
                                                    >
                                                        {detail.message}
                                                    </div>
                                                );
                                            }))
                                        || (
                                            <FormattedMessage
                                                id={'Apis.Create.Components.DefaultAPIForm.api.product.'
                                                    + 'actual.context.helper'}
                                                defaultMessage={'API Product will be exposed in {actualContext}'
                                                    + 'context at the gateway'}
                                                values={{ actualContext: actualContext(api) }}
                                            />
                                        )
                                    }
                                    margin='normal'
                                    variant='outlined'
                                />
                            </Grid>
                            <Grid item md={4} xs={6}>
                                <TextField
                                    fullWidth
                                    id='version'
                                    error={Boolean(validity.version)}
                                    label={(
                                        <>
                                            <FormattedMessage
                                                id='Apis.Create.Components.DefaultAPIForm.api.product.version'
                                                defaultMessage='Version'
                                            />
                                            <sup className={classes.mandatoryStar}>*</sup>
                                        </>
                                    )}
                                    name='version'
                                    value={api.version}
                                    onChange={onChange}
                                    InputProps={{
                                        id: 'itest-id-apiversion-input',
                                        onBlur: ({ target: { value } }) => {
                                            validate('version', value);
                                        },
                                    }}
                                    InputLabelProps={{
                                        for: 'itest-id-apiversion-input',
                                    }}
                                    helperText={validity.version && validity.version.message}
                                    margin='normal'
                                    variant='outlined'
                                />
                            </Grid>
                        </>
                    )}
                </Grid>
                {appendChildrenBeforeEndpoint && !!children && children}
                {!isAPIProduct && !hideEndpoint && (
                    <TextField
                        fullWidth
                        id='itest-id-apiendpoint-input'
                        disabled={readOnlyAPIEndpoint !== null}
                        label={(
                            <FormattedMessage
                                id='Apis.Create.Components.DefaultAPIForm.api.endpoint'
                                defaultMessage='Endpoint'
                            />
                        )}
                        name='endpoint'
                        value={api.endpoint}
                        onChange={onChange}
                        helperText={
                            (validity.endpointURL
                                && validity.endpointURL.details.map((detail, index) => {
                                    return (
                                        <div style={{ marginTop: index !== 0 && '10px' }}>
                                            {detail.message}
                                        </div>
                                    );
                                }))
                        }
                        error={Boolean(validity.endpointURL)}
                        margin='normal'
                        variant='outlined'
                        InputProps={{
                            onBlur: ({ target: { value } }) => {
                                validate('endpoint', value);
                            },
                            endAdornment: (
                                <InputAdornment position='end'>
                                    {statusCode && (
                                        <Chip
                                            label={statusCode}
                                            className={isEndpointValid ? classes.endpointValidChip : iff(
                                                isErrorCode,
                                                classes.endpointErrorChip, classes.endpointInvalidChip,
                                            )}
                                            variant='outlined'
                                        />
                                    )}
                                    {!isWebSocket && (
                                        <IconButton
                                            className={isEndpointValid ? classes.iconButtonValid : classes.iconButton}
                                            aria-label='TestEndpoint'
                                            onClick={() => testEndpoint(api.endpoint)}
                                            disabled={isUpdating}
                                            size='large'>
                                            {isUpdating
                                                ? <CircularProgress size={20} />
                                                : (
                                                    <Icon>
                                                        check_circle
                                                    </Icon>
                                                )}
                                        </IconButton>
                                    )}
                                </InputAdornment>
                            ),
                        }}
                    />
                )}
                {multiGateway && multiGateway.length > 1 && 
                    <Grid container spacing={2}>
                        <FormControl component='fieldset' fullWidth>
                            <FormLabel sx={{ marginLeft: '15px', marginTop: '20px' }}>
                                <FormattedMessage
                                    id='Apis.Create.Components.DefaultAPIForm.select.gateway.type'
                                    defaultMessage='Select Gateway type'
                                />
                                <sup className={classes.mandatoryStar}>*</sup>
                            </FormLabel>
                            <Select
                                id='gateway-type-select'
                                value={api.gatewayType}
                                defaultValue={multiGateway[0].value}
                                onChange={onChange}
                                fullWidth
                                sx={{ marginLeft: '15px', marginTop: '10px', minWidth: 200 }}
                                inputProps={{ name: 'gatewayType', id: 'gateway-type-select' }}
                            >
                                <MenuItem disabled value=''>
                                    <FormattedMessage
                                        id='Apis.Create.Components.DefaultAPIForm.select.gateway.type.placeholder'
                                        defaultMessage='Please select a gateway type'
                                    />
                                </MenuItem>
                                {multiGateway.map((gateway) => 
                                    <MenuItem key={gateway.value} value={gateway.value}>
                                        <Box>
                                            <Grid container direction='row' gap={1} alignItems='center'>
                                                <Grid item>
                                                    <Typography variant='body1'>
                                                        {gateway.name}
                                                    </Typography>
                                                </Grid>
                                                {gateway.isNew && 
                                                    <Grid item>
                                                        <Chip label='New' color='success' size='small' />
                                                    </Grid>
                                                }
                                            </Grid>
                                            <Typography variant='body2' color='textSecondary'>
                                                {gateway.description}
                                            </Typography>
                                        </Box>
                                    </MenuItem>
                                )}
                            </Select>
                            <FormHelperText sx={{ marginLeft: '15px' }}>
                                <FormattedMessage
                                    id={'Apis.Create.Components.DefaultAPIForm.'
                                        + 'select.gateway.type.helper.text'}
                                    defaultMessage='Select the gateway type where your API will run.'
                                />
                            </FormHelperText>
                        </FormControl>
                    </Grid>
                }
                {!appendChildrenBeforeEndpoint && !!children && children}
            </form>
            <Grid container direction='row' justifyContent='flex-end' alignItems='center'>
                <Grid item>
                    <Typography variant='caption' display='block' gutterBottom>
                        <sup style={{ color: 'red' }}>*</sup>
                        {' '}
                        <FormattedMessage
                            id='Apis.Create.Components.DefaultAPIForm.mandatory.fields'
                            defaultMessage='Mandatory fields'
                        />
                    </Typography>
                </Grid>
            </Grid>
        </StyledGrid>
    );
}

DefaultAPIForm.defaultProps = {
    onValidate: () => { },
    api: {}, // Uncontrolled component
    isWebSocket: false,
    readOnlyAPIEndpoint: null,
};
DefaultAPIForm.propTypes = {
    api: PropTypes.shape({}),
    multiGateway: PropTypes.isRequired,
    isAPIProduct: PropTypes.shape({}).isRequired,
    isWebSocket: PropTypes.shape({}),
    onChange: PropTypes.func.isRequired,
    onValidate: PropTypes.func,
    readOnlyAPIEndpoint: PropTypes.string,
};
