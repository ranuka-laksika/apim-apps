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
package org.wso2.carbon.apimgt.ui.publisher;

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
import org.wso2.carbon.registry.api.RegistryException;
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
        try {
            BufferedReader bufferedReader = new BufferedReader(new FileReader(realPath));
            Gson gson = (new GsonBuilder()).setPrettyPrinting().create();
            Map<String, Object> jsonMap = (Map) gson.fromJson(bufferedReader, Map.class);
            if (log.isDebugEnabled()) {
                log.debug("Successfully read JSON file from path: " + path);
            }
            return jsonMap;
        } catch (FileNotFoundException e) {
            log.error("JSON file not found at path: " + (path != null ? path : "null"), e);
            throw e;
        }
    }

    /**
     * Returns the value in the given path of the nested tree map. <br> "." separate 2 levels in Map tree.
     * @param json json object to be read
     * @param path path to the required value separated by "." for each level
     * @return value in the given path of the nested tree map
     */
    public static Object readJsonObj(Map json, String path) {
        if (log.isDebugEnabled()) {
            log.debug("Reading JSON object with path: " + path);
        }
        String[] pathStrings = path.split("\\.");
        Map nestedJson = json;

        for (String pathString : Arrays.copyOfRange(pathStrings, 0, pathStrings.length - 1)) {
            if (!nestedJson.containsKey(pathString)) {
                log.warn("Path element '" + (pathString != null ? pathString : "null")
                        + "' not found in JSON for path: " + (path != null ? path : "null"));
                return null;
            }
            nestedJson = (Map) nestedJson.get(pathString);
        }

        if (!nestedJson.containsKey(pathStrings[pathStrings.length - 1])) {
            log.warn("Final path element '" + (pathStrings[pathStrings.length - 1] != null
                    ? pathStrings[pathStrings.length - 1] : "null") + "' not found in JSON for path: "
                    + (path != null ? path : "null"));
            return null;
        }
        return nestedJson.get(pathStrings[pathStrings.length - 1]);
    }
    
    /**
     * Get the loopback (localhost) origin (scheme + hostname + port), This origin is used for making
     * internal(within the web app node), API calls.For example DCR call, Token generation, User Info, Token Introspect,
     * Revoke etc.
     * @param host
     * @return String loopback origin
     */
    public static String getLoopbackOrigin(String host) {
        // This is the actual server port (management), not the proxy port
        int mgtTransportPort = APIUtil.getCarbonTransportPort("https");
        String loopbackOrigin = "https://" + host + ":" + mgtTransportPort;
        if (log.isDebugEnabled()) {
            log.debug("Generated loopback origin: " + loopbackOrigin);
        }
        return loopbackOrigin; // Unless there is a port offset this is https://localhost:9443
    }

    public static String getIDPOrigin() throws APIManagementException {
        try {
            String idpOrigin = APIUtil.getExternalIDPOrigin();
            if (log.isDebugEnabled()) {
                log.debug("Retrieved IDP origin: " + (idpOrigin != null ? idpOrigin : "null"));
            }
            return idpOrigin;
        } catch (APIManagementException e) {
            log.error("Failed to retrieve external IDP origin", e);
            throw e;
        }
    }

    public static String getIDPCheckSessionEndpoint() throws APIManagementException {
        try {
            String endpoint = APIUtil.getExternalIDPCheckSessionEndpoint();
            if (log.isDebugEnabled()) {
                log.debug("Retrieved IDP check session endpoint: " + (endpoint != null ? endpoint : "null"));
            }
            return endpoint;
        } catch (APIManagementException e) {
            log.error("Failed to retrieve external IDP check session endpoint", e);
            throw e;
        }
    }

    public static String getTenantBasePublisherContext(HttpServletRequest request, String context)
            throws APIManagementException {
        String tenantDomain = getTenantDomain(request);
        String tenantContext = APIUtil.getTenantBasedPublisherContext(tenantDomain);
        String resultContext = tenantContext != null && !tenantContext.equals(" ") ? tenantContext : context;
        if (tenantContext == null || tenantContext.equals(" ")) {
            log.warn("Tenant context not found for tenant '" + (tenantDomain != null ? tenantDomain : "null")
                    + "', using fallback context: " + (context != null ? context : "null"));
        }
        if (log.isDebugEnabled()) {
            log.debug("Tenant base publisher context for tenant " + tenantDomain + ": " + resultContext);
        }
        return resultContext;
    }

    public static String getTenantBasedLoginCallBack(HttpServletRequest request, String loginSuffix)
            throws APIManagementException {
        String tenantDomain = getTenantDomain(request);
        Map publisherDomainMapping = APIUtil.getTenantBasedPublisherDomainMapping(tenantDomain);
        if (publisherDomainMapping != null) {
            if (publisherDomainMapping.get("login") != null) {
                String loginCallback = (String) publisherDomainMapping.get("login");
                if (log.isDebugEnabled()) {
                    log.debug("Login callback URL for tenant " + tenantDomain + ": " + loginCallback);
                }
                return loginCallback;
            }
            String customUrl = "https://" + publisherDomainMapping.get("customUrl") + loginSuffix;
            if (log.isDebugEnabled()) {
                log.debug("Generated login callback URL for tenant " + tenantDomain + ": " + customUrl);
            }
            return customUrl;
        } else {
            if (log.isDebugEnabled()) {
                log.debug("No publisher domain mapping found for tenant: " + tenantDomain);
            }
            return null;
        }
    }

    public static String getTenantBasedLogoutCallBack(HttpServletRequest request, String logoutSuffix)
            throws APIManagementException {
        String tenantDomain = getTenantDomain(request);
        Map publisherDomainMapping = APIUtil.getTenantBasedPublisherDomainMapping(tenantDomain);
        if (publisherDomainMapping != null) {
            if (publisherDomainMapping.get("logout") != null) {
                String logoutCallback = (String) publisherDomainMapping.get("logout");
                if (log.isDebugEnabled()) {
                    log.debug("Logout callback URL for tenant " + tenantDomain + ": " + logoutCallback);
                }
                return logoutCallback;
            }
            String customUrl = "https://" + publisherDomainMapping.get("customUrl") + logoutSuffix;
            if (log.isDebugEnabled()) {
                log.debug("Generated logout callback URL for tenant " + tenantDomain + ": " + customUrl);
            }
            return customUrl;
        } else {
            if (log.isDebugEnabled()) {
                log.debug("No publisher domain mapping found for tenant: " + tenantDomain);
            }
            return null;
        }
    }

    public static boolean isPerTenantServiceProviderEnabled(HttpServletRequest request)
            throws APIManagementException, RegistryException {
        String tenantDomain = getTenantDomain(request);
        try {
            boolean isEnabled = APIUtil.isPerTenantServiceProviderEnabled(tenantDomain);
            if (log.isDebugEnabled()) {
                log.debug("Per-tenant service provider enabled for tenant '"
                        + (tenantDomain != null ? tenantDomain : "null") + "': " + isEnabled);
            }
            return isEnabled;
        } catch (APIManagementException | RegistryException e) {
            log.error("Failed to check if per-tenant service provider is enabled for tenant: "
                    + (tenantDomain != null ? tenantDomain : "null"), e);
            throw e;
        }
    }

    public static String getTenantDomain(HttpServletRequest request) {
        String tenantDomain = request.getParameter("tenant");
        if (tenantDomain == null) {
            tenantDomain = request.getHeader("X-WSO2-Tenant");
            if (tenantDomain == null) {
                tenantDomain = "carbon.super";
                log.warn("Tenant domain not found in request parameter or X-WSO2-Tenant header, "
                        + "using default: carbon.super");
            }
        }
        if (log.isDebugEnabled()) {
            log.debug("Retrieved tenant domain: " + tenantDomain);
        }
        return tenantDomain;
    }

    public static String getServiceProviderTenantDomain(HttpServletRequest request)
            throws APIManagementException, RegistryException {
        String tenantDomain = getTenantDomain(request);
        String spTenantDomain;
        if (isPerTenantServiceProviderEnabled(request)) {
            spTenantDomain = tenantDomain;
        } else {
            spTenantDomain = "carbon.super";
        }
        if (log.isDebugEnabled()) {
            log.debug("Service provider tenant domain for tenant " + tenantDomain + ": " + spTenantDomain);
        }
        return spTenantDomain;
    }

    public static boolean isEnableEmailUserName() {
        boolean isEnableEmailUserName = Boolean.parseBoolean(
                CarbonUtils.getServerConfiguration().getFirstProperty("EnableEmailUserName"));
        if (log.isDebugEnabled()) {
            log.debug("Email username enabled: " + isEnableEmailUserName);
        }
        if (isEnableEmailUserName) {
            return isEnableEmailUserName;
        } else {
            return false;
        }
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
        String appContext = context;
        if (proxyContext != null && !proxyContext.isEmpty()) {
            appContext = appContext.replace(proxyContext, "");
            if (log.isDebugEnabled()) {
                log.debug("App context after replacing proxy context '" + proxyContext + "': " + appContext);
            }
        }
        return appContext;
    }
}
