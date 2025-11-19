/*
 *  Copyright (c) 2017-2023, WSO2 LLC (https://www.wso2.com).
 *
 *  WSO2 LLC licenses this file to you under the Apache License,
 *  Version 2.0 (the "License"); you may not use this file except
 *  in compliance with the License.
 *  You may obtain a copy of the License at
 *
 *  http://www.apache.org/licenses/LICENSE-2.0
 *
 *  Unless required by applicable law or agreed to in writing,
 *  software distributed under the License is distributed on an
 *  "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 *  KIND, either express or implied.  See the License for the
 *  specific language governing permissions and limitations
 *  under the License.
 */
package org.wso2.carbon.apimgt.ui.devportal;

import com.google.gson.Gson;
import com.google.gson.GsonBuilder;

import java.io.BufferedReader;
import java.io.FileNotFoundException;
import java.io.FileReader;
import java.util.Arrays;
import java.util.Map;
import javax.servlet.ServletContext;
import javax.servlet.http.HttpServletRequest;

import org.apache.commons.logging.Log;
import org.apache.commons.logging.LogFactory;
import org.wso2.carbon.apimgt.api.APIManagementException;
import org.wso2.carbon.apimgt.impl.utils.APIUtil;
import org.wso2.carbon.registry.core.exceptions.RegistryException;
import org.wso2.carbon.utils.CarbonUtils;

/**
 * Class for the utility functions needed by the services
 */
public class Util {

    private static final Log log = LogFactory.getLog(Util.class);

    /**
     * Read a json file from the directory and output as a Map object.
     * @param path    path to the json file
     * @param context servlet context of the web application
     * @return map of read json file
     * @throws FileNotFoundException if the file is not found in the given path
     */
    public static Map<String, Object> readJsonFile(String path, ServletContext context) throws FileNotFoundException {
        if (log.isDebugEnabled()) {
            log.debug("Reading JSON file from path: " + path);
        }
        String realPath = context.getRealPath(path);
        if (realPath == null) {
            log.warn("Unable to resolve real path for: " + path);
            throw new FileNotFoundException("Real path not found for: " + path);
        }
        BufferedReader bufferedReader = new BufferedReader(new FileReader(realPath));
        Gson gson = (new GsonBuilder()).setPrettyPrinting().create();
        Map<String, Object> jsonMap = (Map) gson.fromJson(bufferedReader, Map.class);
        if (log.isDebugEnabled()) {
            log.debug("Successfully read JSON file from path: " + path);
        }
        return jsonMap;
    }

    /**
     * Returns the value in the given path of the nested tree map. <br> "." separate 2 levels in Map tree.
     * @param json json object to be read
     * @param path path to the required value separated by "." for each level
     * @return value in the given path of the nested tree map
     */
    public static Object readJsonObj(Map json, String path) {
        if (log.isDebugEnabled()) {
            log.debug("Reading JSON object from path: " + path);
        }
        if (json == null) {
            log.warn("JSON object is null, cannot read path: " + path);
            return null;
        }
        if (path == null || path.isEmpty()) {
            log.warn("Path is null or empty, cannot read from JSON object");
            return null;
        }
        String[] pathStrings = path.split("\\.");
        Map nestedJson = json;

        for (String pathString : Arrays.copyOfRange(pathStrings, 0, pathStrings.length - 1)) {
            if (!nestedJson.containsKey(pathString)) {
                if (log.isDebugEnabled()) {
                    log.debug("Path not found in JSON object: " + pathString);
                }
                return null;
            }
            nestedJson = (Map) nestedJson.get(pathString);
            if (nestedJson == null) {
                log.warn("Null value encountered while traversing JSON path at: " + pathString);
                return null;
            }
        }

        if (!nestedJson.containsKey(pathStrings[pathStrings.length - 1])) {
            if (log.isDebugEnabled()) {
                log.debug("Final path key not found in JSON object: " + pathStrings[pathStrings.length - 1]);
            }
            return null;
        }
        return nestedJson.get(pathStrings[pathStrings.length - 1]);
    }

    /**
     * Get the loopback (localhost) origin (scheme + hostname + port), This origin is used for making
     * internal(within the web app node), API calls.For example DCR call, Token generation, User Info, Token Introspect,
     * Revoke etc.
     * @param host host name
     * @return returns the loopback origin constructed using the host
     */
    public static String getLoopbackOrigin(String host) {
        if (log.isDebugEnabled()) {
            log.debug("Constructing loopback origin for host: " + host);
        }
        if (host == null || host.isEmpty()) {
            log.warn("Host is null or empty, cannot construct loopback origin");
            return null;
        }
        int mgtTransportPort = APIUtil.getCarbonTransportPort("https");
        String loopbackOrigin = "https://" + host + ":" + mgtTransportPort;
        if (log.isDebugEnabled()) {
            log.debug("Loopback origin constructed: " + loopbackOrigin);
        }
        return loopbackOrigin;
    }

    public static String getIDPOrigin() throws APIManagementException {
        if (log.isDebugEnabled()) {
            log.debug("Retrieving external IDP origin");
        }
        String idpOrigin = APIUtil.getExternalIDPOrigin();
        if (log.isDebugEnabled()) {
            log.debug("Retrieved IDP origin: " + idpOrigin);
        }
        return idpOrigin;
    }

    public static String getIDPCheckSessionEndpoint() throws APIManagementException {
        if (log.isDebugEnabled()) {
            log.debug("Retrieving IDP check session endpoint");
        }
        String endpoint = APIUtil.getExternalIDPCheckSessionEndpoint();
        if (log.isDebugEnabled()) {
            log.debug("Retrieved IDP check session endpoint: " + endpoint);
        }
        return endpoint;
    }

    public static String getTenantBaseStoreContext(HttpServletRequest request, String context)
            throws APIManagementException {
        String tenantDomain = getTenantDomain(request);
        if (log.isDebugEnabled()) {
            log.debug("Retrieving tenant based store context for tenant: " + tenantDomain);
        }
        String tenantContext = APIUtil.getTenantBasedDevPortalContext(tenantDomain);
        if (tenantContext == null) {
            if (log.isDebugEnabled()) {
                log.debug("Tenant context not found, using default context: " + context);
            }
            return context;
        }
        if (log.isDebugEnabled()) {
            log.debug("Retrieved tenant context: " + tenantContext + " for tenant: " + tenantDomain);
        }
        return tenantContext;
    }

    public static String getTenantBasedLoginCallBack(HttpServletRequest request, String loginSuffix)
            throws APIManagementException {
        String tenantDomain = getTenantDomain(request);
        if (log.isDebugEnabled()) {
            log.debug("Retrieving tenant based login callback for tenant: " + tenantDomain);
        }
        Map storeDomainMapping = APIUtil.getTenantBasedStoreDomainMapping(tenantDomain);
        if (storeDomainMapping != null) {
            if (storeDomainMapping.get("login") != null) {
                String loginUrl = (String) storeDomainMapping.get("login");
                if (log.isDebugEnabled()) {
                    log.debug("Login callback URL retrieved for tenant: " + tenantDomain);
                }
                return loginUrl;
            }
            String customUrl = "https://" + storeDomainMapping.get("customUrl") + loginSuffix;
            if (log.isDebugEnabled()) {
                log.debug("Constructed login callback URL using custom URL for tenant: " + tenantDomain);
            }
            return customUrl;
        } else {
            if (log.isDebugEnabled()) {
                log.debug("Store domain mapping not found for tenant: " + tenantDomain);
            }
            return null;
        }
    }

    public static String getTenantBasedLogoutCallBack(HttpServletRequest request, String logoutSuffix)
            throws APIManagementException {
        String tenantDomain = getTenantDomain(request);
        if (log.isDebugEnabled()) {
            log.debug("Retrieving tenant based logout callback for tenant: " + tenantDomain);
        }
        Map storeDomainMapping = APIUtil.getTenantBasedStoreDomainMapping(tenantDomain);
        if (storeDomainMapping != null) {
            if (storeDomainMapping.get("logout") != null) {
                String logoutUrl = (String) storeDomainMapping.get("logout");
                if (log.isDebugEnabled()) {
                    log.debug("Logout callback URL retrieved for tenant: " + tenantDomain);
                }
                return logoutUrl;
            }
            String customUrl = "https://" + storeDomainMapping.get("customUrl") + logoutSuffix;
            if (log.isDebugEnabled()) {
                log.debug("Constructed logout callback URL using custom URL for tenant: " + tenantDomain);
            }
            return customUrl;
        } else {
            if (log.isDebugEnabled()) {
                log.debug("Store domain mapping not found for tenant: " + tenantDomain);
            }
            return null;
        }
    }

    public static boolean isPerTenantServiceProviderEnabled(HttpServletRequest request)
            throws APIManagementException, RegistryException {
        String tenantDomain = getTenantDomain(request);
        if (log.isDebugEnabled()) {
            log.debug("Checking if per-tenant service provider is enabled for tenant: " + tenantDomain);
        }
        boolean isEnabled = APIUtil.isPerTenantServiceProviderEnabled(tenantDomain);
        if (log.isDebugEnabled()) {
            log.debug("Per-tenant service provider enabled status for tenant " + tenantDomain + ": " + isEnabled);
        }
        return isEnabled;
    }

    public static String getTenantDomain(HttpServletRequest request) {
        if (request == null) {
            log.warn("HttpServletRequest is null, returning default tenant domain: carbon.super");
            return "carbon.super";
        }
        String tenantDomain = request.getParameter("tenant");
        if (tenantDomain == null) {
            tenantDomain = request.getHeader("X-WSO2-Tenant");
            if (tenantDomain == null) {
                tenantDomain = "carbon.super";
                if (log.isDebugEnabled()) {
                    log.debug("Tenant domain not found in request, using default: carbon.super");
                }
            }
        }
        if (log.isDebugEnabled()) {
            log.debug("Resolved tenant domain: " + tenantDomain);
        }
        return tenantDomain;
    }

    public static String getCustomUrlEnabledDomain(HttpServletRequest request) {
        if (request == null) {
            log.warn("HttpServletRequest is null, cannot retrieve custom URL enabled domain");
            return null;
        }
        String customUrlDomain = request.getHeader("X-WSO2-Tenant");
        if (log.isDebugEnabled()) {
            log.debug("Custom URL enabled domain: " + customUrlDomain);
        }
        return customUrlDomain;
    }

    public static String getTenantBasedCustomUrl(HttpServletRequest request) throws APIManagementException {
        String tenantDomain = getTenantDomain(request);
        if (log.isDebugEnabled()) {
            log.debug("Retrieving tenant based custom URL for tenant: " + tenantDomain);
        }
        Map storeDomainMapping = APIUtil.getTenantBasedStoreDomainMapping(tenantDomain);
        if (storeDomainMapping != null) {
            String customUrl = "https://" + storeDomainMapping.get("customUrl");
            if (log.isDebugEnabled()) {
                log.debug("Retrieved custom URL for tenant " + tenantDomain + ": " + customUrl);
            }
            return customUrl;
        } else {
            if (log.isDebugEnabled()) {
                log.debug("Store domain mapping not found for tenant: " + tenantDomain);
            }
            return null;
        }
    }

    public static String getServiceProviderTenantDomain(HttpServletRequest request)
            throws APIManagementException, RegistryException {
        String tenantDomain = getTenantDomain(request);
        if (log.isDebugEnabled()) {
            log.debug("Determining service provider tenant domain for tenant: " + tenantDomain);
        }
        if (isPerTenantServiceProviderEnabled(request)) {
            if (log.isDebugEnabled()) {
                log.debug("Per-tenant service provider enabled, using tenant domain: " + tenantDomain);
            }
            return tenantDomain;
        } else {
            if (log.isDebugEnabled()) {
                log.debug("Per-tenant service provider disabled, using default: carbon.super");
            }
            return "carbon.super";
        }
    }

    public static boolean isEnableEmailUserName() {
        if (log.isDebugEnabled()) {
            log.debug("Checking if email username is enabled");
        }
        boolean isEnableEmailUserName = Boolean.parseBoolean(
                CarbonUtils.getServerConfiguration().getFirstProperty("EnableEmailUserName"));
        if (log.isDebugEnabled()) {
            log.debug("Email username enabled: " + isEnableEmailUserName);
        }
        return isEnableEmailUserName;
    }

    /**
     * Deciding what to process as app context. <br>
     * If the settings.json has the following definition, <br><br>
     * <p> ( case 1 ) - appContext is <b>'/devportal'</b>
     * <pre>
     *     context: '/devportal'
     * </pre>
     *
     * <p> ( case 2 ) - appContext is <b>'/apim/devportal'</b>
     * <pre>
     *     context: '/devportal'
     *     proxy_context_path: '/apim',
     * </pre>
     * @param proxyContext proxy context path
     * @param context      relevant app context
     * @return returns the app context replacing the proxy context if exists
     */
    public static String getAppContextForServerUrl(String context, String proxyContext) {
        if (log.isDebugEnabled()) {
            log.debug("Getting app context for server URL. Context: " + context + ", ProxyContext: "
                    + proxyContext);
        }
        if (context == null) {
            log.warn("Context is null, returning empty string");
            return "";
        }
        String appContext = context;
        if (proxyContext != null && !proxyContext.isEmpty()) {
            appContext = appContext.replace(proxyContext, "");
            if (log.isDebugEnabled()) {
                log.debug("Replaced proxy context, new app context: " + appContext);
            }
        }
        return appContext;
    }
}
