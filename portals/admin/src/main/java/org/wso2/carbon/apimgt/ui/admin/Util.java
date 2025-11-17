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
package org.wso2.carbon.apimgt.ui.admin;

import com.google.gson.Gson;
import com.google.gson.GsonBuilder;
import java.io.BufferedReader;
import java.io.FileNotFoundException;
import java.io.FileReader;
import java.util.Arrays;
import java.util.Map;
import javax.servlet.ServletContext;
import org.apache.commons.logging.Log;
import org.apache.commons.logging.LogFactory;
import org.wso2.carbon.apimgt.api.APIManagementException;
import org.wso2.carbon.apimgt.impl.utils.APIUtil;

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
        String realPath = context.getRealPath(path);
        if (log.isDebugEnabled()) {
            log.debug("Reading JSON file from path: " + realPath);
        }
        BufferedReader bufferedReader = new BufferedReader(new FileReader(realPath));
        Gson gson = (new GsonBuilder()).setPrettyPrinting().create();
        Map<String, Object> jsonMap = (Map) gson.fromJson(bufferedReader, Map.class);
        if (log.isDebugEnabled()) {
            log.debug("Successfully read JSON file from path: " + realPath);
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
        }

        if (!nestedJson.containsKey(pathStrings[pathStrings.length - 1])) {
            if (log.isDebugEnabled()) {
                log.debug("Final path key not found: " + pathStrings[pathStrings.length - 1]);
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
        int mgtTransportPort = APIUtil.getCarbonTransportPort("https"); // This is the actual server port (management) , Not the proxy port
        String loopbackOrigin = "https://" + host + ":" + mgtTransportPort; // Unless there is a port offset this is https://localhost:9443
        if (log.isDebugEnabled()) {
            log.debug("Constructed loopback origin: " + loopbackOrigin + " for host: " + host);
        }
        return loopbackOrigin;
    }

    public static String getIDPOrigin() throws APIManagementException {
        if (log.isDebugEnabled()) {
            log.debug("Retrieving external IDP origin");
        }
        return APIUtil.getExternalIDPOrigin();
    }

    public static String getIDPCheckSessionEndpoint() throws APIManagementException {
        if (log.isDebugEnabled()) {
            log.debug("Retrieving external IDP check session endpoint");
        }
        return APIUtil.getExternalIDPCheckSessionEndpoint();
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
                log.debug("App context after removing proxy context: " + appContext + ", original context: "
                        + context + ", proxy context: " + proxyContext);
            }
        }
        return appContext;
    }    
}
