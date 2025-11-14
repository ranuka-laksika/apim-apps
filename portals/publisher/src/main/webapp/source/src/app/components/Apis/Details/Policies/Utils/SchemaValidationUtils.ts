/*
 * Copyright (c) 2024, WSO2 Inc. (http://www.wso2.org) All Rights Reserved.
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

/**
 * Parse JSONPath expression into segments
 * @param {string} jsonPath The JSONPath expression
 * @returns {string[]} Array of path segments
 */
const parseJsonPath = (jsonPath: string): string[] => {
    // Remove leading $. if present
    let path = jsonPath.trim();
    if (path.startsWith('$.')) {
        path = path.substring(2);
    } else if (path.startsWith('$')) {
        path = path.substring(1);
    }

    if (path === '' || path === '.') {
        return []; // Root access
    }

    // Split by dots and filter out empty segments
    return path.split('.').filter(segment => segment.length > 0);
};

/**
 * Validate path segments against JSON schema
 * @param {string[]} segments The path segments
 * @param {any} schema The current schema object
 * @returns {boolean} True if the path is valid
 */
const validatePathSegments = (segments: string[], schema: any): boolean => {
    if (segments.length === 0) {
        return true;
    }

    const currentSegment = segments[0];
    const remainingSegments = segments.slice(1);

    // Handle schema references
    if (schema.$ref) {
        // For simplicity, assume $ref is valid
        return true;
    }

    // Handle object schemas
    if (schema.type === 'object' || schema.properties) {
        if (schema.properties && schema.properties[currentSegment]) {
            return validatePathSegments(remainingSegments, schema.properties[currentSegment]);
        } else if (schema.additionalProperties) {
            // Allow additional properties
            if (typeof schema.additionalProperties === 'object') {
                return validatePathSegments(remainingSegments, schema.additionalProperties);
            }
            return true;
        }
        return false;
    }

    // Handle array schemas
    if (schema.type === 'array' || schema.items) {
        // Check if segment is array access (numeric index or special syntax)
        const isArrayAccess = /^\d+$/.test(currentSegment) ||
                              currentSegment === '*' ||
                              currentSegment.startsWith('[');
        if (isArrayAccess) {
            return validatePathSegments(remainingSegments, schema.items || {});
        }
        return false;
    }

    // Handle allOf, oneOf, anyOf
    if (schema.allOf || schema.oneOf || schema.anyOf) {
        const schemas = schema.allOf || schema.oneOf || schema.anyOf;
        return schemas.some((subSchema: any) =>
            validatePathSegments(segments, subSchema)
        );
    }

    // If schema type is not object or array, and we still have segments, path is invalid
    return remainingSegments.length === 0;
};

/**
 * Validate JSONPath against a single JSON schema
 * @param {string} jsonPath The JSONPath expression to validate
 * @param {any} schema The JSON schema object
 * @returns {boolean} True if the JSONPath is valid for the schema
 */
const validateJsonPathAgainstSingleSchema = (jsonPath: string, schema: any): boolean => {
    if (!schema || !jsonPath) {
        return false;
    }

    try {
        // Parse JSONPath expression
        const pathSegments = parseJsonPath(jsonPath);
        if (pathSegments.length === 0) {
            return true; // Root level access is always valid
        }

        // Validate path against schema
        return validatePathSegments(pathSegments, schema);
    } catch (error) {
        console.warn('Error validating JSONPath segments:', error);
        return false;
    }
};

/**
 * Get OpenAPI operation object for given target and verb
 * @param {any} apiSpec The OpenAPI specification
 * @param {string} target The API resource target
 * @param {string} verb The HTTP verb
 * @returns {any} The OpenAPI operation object or null
 */
const getOpenAPIOperation = (apiSpec: any, target: string, verb: string): any => {
    if (!apiSpec.paths || !target || !verb) {
        return null;
    }

    const operation = apiSpec.paths[target] && apiSpec.paths[target][verb.toLowerCase()];
    return operation || null;
};

/**
 * Extract request body schema from OpenAPI operation
 * @param {any} operation The OpenAPI operation object
 * @returns {any} The request body schema or null
 */
const getRequestBodySchema = (operation: any): any => {
    if (!operation.requestBody || !operation.requestBody.content) {
        return null;
    }

    // Check for JSON content types
    const jsonContentTypes = ['application/json', 'application/json; charset=utf-8'];
    for (const contentType of jsonContentTypes) {
        const content = operation.requestBody.content[contentType];
        if (content && content.schema) {
            return content.schema;
        }
    }

    return null;
};

/**
 * Extract response schemas from OpenAPI operation
 * @param {any} operation The OpenAPI operation object
 * @returns {any[]} Array of response schemas
 */
const getResponseSchemas = (operation: any): any[] => {
    const schemas: any[] = [];

    if (!operation.responses) {
        return schemas;
    }

    // Iterate through all response codes
    Object.values(operation.responses).forEach((response: any) => {
        if (response.content) {
            // Check for JSON content types
            const jsonContentTypes = ['application/json', 'application/json; charset=utf-8'];
            for (const contentType of jsonContentTypes) {
                const content = response.content[contentType];
                if (content && content.schema) {
                    schemas.push(content.schema);
                }
            }
        }
    });

    return schemas;
};

/**
 * Validates if a JSONPath exists in the given OpenAPI schema
 * @param {string} jsonPath The JSONPath expression to validate
 * @param {any} api The API object containing OpenAPI specification
 * @param {string} target The API resource target (e.g., "/menu", "/order/{orderId}")
 * @param {string} verb The HTTP verb (e.g., "GET", "POST", "PUT", "DELETE")
 * @returns {boolean} True if the JSONPath is valid for the operation schema, false otherwise
 */
export const validateJsonPathAgainstSchema = (
    jsonPath: string,
    api: any,
    target: string,
    verb: string
): boolean => {
    if (!jsonPath || jsonPath.trim() === '') {
        return true; // Empty jsonPath is allowed (means entire payload)
    }

    if (!api || !api.apiDefinition) {
        return true; // Cannot validate if no schema is available
    }

    try {
        const apiSpec = JSON.parse(api.apiDefinition);

        // Get the operation from the OpenAPI spec
        const operation = getOpenAPIOperation(apiSpec, target, verb);
        if (!operation) {
            return true; // Cannot validate if operation not found
        }

        // Get request and response schemas
        const requestSchema = getRequestBodySchema(operation);
        const responseSchemas = getResponseSchemas(operation);

        // Validate JSONPath against request schema
        if (requestSchema && validateJsonPathAgainstSingleSchema(jsonPath, requestSchema)) {
            return true;
        }

        // Validate JSONPath against response schemas
        for (const responseSchema of responseSchemas) {
            if (validateJsonPathAgainstSingleSchema(jsonPath, responseSchema)) {
                return true;
            }
        }

        return false;
    } catch (error) {
        console.warn('Error validating JSONPath against schema:', error);
        return true; // Return true on error to avoid blocking valid configurations
    }
};

/**
 * Get a user-friendly error message for invalid JSONPath
 * @param {string} jsonPath The invalid JSONPath
 * @param {any} api The API object
 * @param {string} target The API resource target
 * @param {string} verb The HTTP verb
 * @returns {string} Error message
 */
export const getJsonPathValidationError = (
    jsonPath: string,
    api: any,
    target: string,
    verb: string
): string => {
    if (!jsonPath || jsonPath.trim() === '') {
        return '';
    }

    if (!api || !api.apiDefinition) {
        return 'Cannot validate JSONPath: API schema not available';
    }

    try {
        const apiSpec = JSON.parse(api.apiDefinition);
        const operation = getOpenAPIOperation(apiSpec, target, verb);

        if (!operation) {
            const operationName = `${verb.toUpperCase()} ${target}`;
            return `Cannot validate JSONPath: Operation ${operationName} not found in API specification`;
        }

        const requestSchema = getRequestBodySchema(operation);
        const responseSchemas = getResponseSchemas(operation);

        if (!requestSchema && responseSchemas.length === 0) {
            return 'Cannot validate JSONPath: No request or response schema found for this operation';
        }

        const operationName = `${verb.toUpperCase()} ${target}`;
        return `JSONPath "${jsonPath}" does not exist in the request or response schema for ${operationName}`;
    } catch (error) {
        return 'Error validating JSONPath against schema';
    }
};