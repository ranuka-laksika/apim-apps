import React, { useEffect, useState, useRef } from 'react';
import PropTypes from 'prop-types';
import 'swagger-ui-react/swagger-ui.css';
import SwaggerUILib from 'swagger-ui-react';
import CustomPadLock from './CustomPadLock';

const disableAuthorizeAndInfoPlugin = function (spec) {
    return {
        wrapComponents: {
            info: () => () => null,
            authorizeBtn: () => () => null,
            authorizeOperationBtn: () => () => null,
            OperationSummary: (original) => (props) => {
                return <CustomPadLock BaseLayout={original} oldProps={props} spec={spec} />;
            },
        },
    };
};

/**
 *
 * @class SwaggerUI
 * @extends {Component}
 */
const SwaggerUI = (props) => {
    const {
        spec, accessTokenProvider, authorizationHeader, api,
    } = props;

    const securitySchemeRef = useRef(props.securitySchemeType);
    const authorizationHeaderRef = useRef(authorizationHeader);

    useEffect(() => {
        securitySchemeRef.current = props.securitySchemeType;
    }, [props.securitySchemeType]);

    useEffect(() => {
        authorizationHeaderRef.current = authorizationHeader;
    }, [authorizationHeader]);

    const componentProps = {
        spec,
        validatorUrl: null,
        defaultModelsExpandDepth: -1,
        docExpansion: 'list',
        requestInterceptor: (req) => {
            const { url } = req;
            const { context } = api;
            const currentSecuritySchemeType = securitySchemeRef.current;
            const currentAuthHeader = authorizationHeaderRef.current;
            const patternToCheck = `${context}/*`;
            if (currentSecuritySchemeType === 'API-KEY') {
                req.headers[currentAuthHeader] = accessTokenProvider();
            } else if (currentSecuritySchemeType === 'BASIC') {
                req.headers[currentAuthHeader] = 'Basic ' + accessTokenProvider();
            } else if (currentSecuritySchemeType === 'TEST') {
                req.headers[currentAuthHeader] = accessTokenProvider();
            } else if (api.advertiseInfo && api.advertiseInfo.advertised) {
                if (currentAuthHeader) {
                    req.headers[currentAuthHeader] = accessTokenProvider();
                }
            } else {
                req.headers[currentAuthHeader] = 'Bearer ' + accessTokenProvider();
            }
            if (url.endsWith(patternToCheck)) {
                req.url = url.substring(0, url.length - 2);
            } else if (url.includes(patternToCheck + '?')) { // Check for query parameters.
                const splitTokens = url.split('/*?');
                req.url = splitTokens.length > 1 ? splitTokens[0] + '?' + splitTokens[1] : splitTokens[0];
            }

            // Handle multipart/form-data Content-Type for individual parts
            if (req.body && typeof req.body.entries === 'function') {
                try {
                    const { paths } = spec;
                    const pathsObj = paths || {};
                    let operationSpec = null;

                    // Extract path and method from request
                    const { pathname } = new URL(url);

                    // Find matching path in spec
                    for (const pathKey of Object.keys(pathsObj)) {
                        const pathPattern = pathKey.replace(/\{[^}]+\}/g, '[^/]+');
                        const regex = new RegExp(`^${pathPattern}$`);
                        if (regex.test(pathname) || pathname.includes(pathKey.replace(/\{[^}]+\}/g, ''))) {
                            const method = req.method.toLowerCase();
                            operationSpec = pathsObj[pathKey][method];
                            break;
                        }
                    }

                    // Get request body schema and encoding
                    if (operationSpec && operationSpec.requestBody
                        && operationSpec.requestBody.content
                        && operationSpec.requestBody.content['multipart/form-data']) {
                        const multipartContent = operationSpec.requestBody.content['multipart/form-data'];
                        const requestBodySchema = multipartContent.schema;
                        const encoding = multipartContent.encoding || {};

                        // Create new FormData with proper Content-Type headers
                        const newFormData = new FormData();

                        for (const [key, value] of req.body.entries()) {
                            let contentType = null;

                            // Check encoding field first
                            if (encoding[key] && encoding[key].contentType) {
                                contentType = encoding[key].contentType;
                            } else if (requestBodySchema
                                && requestBodySchema.properties
                                && requestBodySchema.properties[key]) {
                                // Check schema properties for type
                                const propertySchema = requestBodySchema.properties[key];

                                // According to OpenAPI spec, object types default to application/json
                                if (propertySchema.type === 'object') {
                                    contentType = 'application/json';
                                } else if (propertySchema.type === 'string' && propertySchema.format === 'binary') {
                                    contentType = 'application/octet-stream';
                                } else if (propertySchema.type === 'string') {
                                    contentType = 'text/plain';
                                }
                            }

                            // Add part with Content-Type if determined
                            if (contentType && !(value instanceof File)) {
                                const blob = new Blob([value], { type: contentType });
                                newFormData.append(key, blob, key);
                            } else if (contentType && value instanceof File) {
                                // For file uploads, use the determined content type if not already set
                                const fileWithType = new File([value], value.name, {
                                    type: value.type || contentType,
                                });
                                newFormData.append(key, fileWithType);
                            } else {
                                newFormData.append(key, value);
                            }
                        }

                        req.body = newFormData;
                    }
                } catch (error) {
                    if (console && console.warn) {
                        console.warn('Error processing multipart/form-data encoding:', error);
                    }
                }
            }

            return req;
        },
        defaultModelExpandDepth: -1,
        plugins: [disableAuthorizeAndInfoPlugin(spec)],
    };
    const [render, setRender] = useState();
    const [layoutRender, setlayoutRender] = useState();

    useEffect(() => {
        if (!layoutRender) return;
        const len = document.querySelectorAll('.opblock .authorization__btn');
        for (let i = 0; i < len.length; i++) {
            len[i].remove();
        }
        document.querySelector('.schemes select').setAttribute('id', 'schemes');
        document.getElementById('unlocked').parentNode.parentNode.remove();
        setlayoutRender(false);
    }, [layoutRender]);

    useEffect(() => {
        setlayoutRender(true);
    }, [render]);

    return (
        <>
            <SwaggerUILib {...componentProps} />
            {setRender}
        </>
    );
};

SwaggerUI.propTypes = {
    accessTokenProvider: PropTypes.func.isRequired,
    authorizationHeader: PropTypes.string.isRequired,
    securitySchemeType: PropTypes.string.isRequired,
    api: PropTypes.shape({
        context: PropTypes.string.isRequired,
    }).isRequired,
    spec: PropTypes.string.isRequired,
};
export default SwaggerUI;
