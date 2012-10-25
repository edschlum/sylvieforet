function loadGeoRMHandler() {

/*
 * Copyright (c) 2008-2011 Institut Geographique National France, released under the
 * BSD license.
 */
/*
 * @requires Geoportal/Util.js
 */
/*
 * Class: Geoportal.GeoRMHandler
 * The Geoportal framework GeoRM base class.
 */
Geoportal.GeoRMHandler= {};

/**
 * Class: Geoportal.GeoRMHandler.Updater
 * The Geoportal GeoRM Updater class.
 */
Geoportal.GeoRMHandler.Updater= OpenLayers.Class({

    /**
     * APIProperty: GeoRMKey
     * {String} The Geographic Rights Management Key
     */
    GeoRMKey: null,

    /**
     * APIProperty: serverUrl
     * {String} The GeoRM service url exposing the getToken, tokenInfo and
     * releaseToken operations.
     *      Default to *Geoportal.GeoRMHandler.GEORM_SERVER_URL*
     */
    serverUrl: null,

    /**
     * APIProperty: ttl
     * {Integer} Time to live of the token in milliseconds. Default to *600000*
     * (10 minutes).
     */
    ttl: 600000,

    /**
     * APIProperty: token
     * {Object} The name of the unique elemnt of this object is the name
     *      of the url parameter of the token. The value (String) of this
     *      element is the token.
     */
    token: null,

    /**
     *  Property: maps
     *  {Array(<OpenLayers.Map>)} List of maps objects using this GeoRMKey
     */
    maps: null,

    /**
     *  Property: tgts
     *  {Array(<Document>)} List of HTML documents using this GeoRMKey
     */
    tgts: null,

    /**
     * Property: queryUrl
     * {String} The GeoRM service url with parameters
     */
    queryUrl: null,

    /**
     * Property: lastUpdate
     * {Integer} Time of the last token key update
     */
    lastUpdate: 0,

    /**
     * Property: status
     * {Integer} current state of the token
     *      Values are :
     *|  0 : valid token
     *| >0 : update in progress (number of requests)
     *| -1 : token updated and running queued moveTo calls
     */
    status: 0,

    /**
     * Property: domHeads
     * Array({DOMElement}) internal references to the document's heads.
     */
    domHeads: null,

    /**
     * Property: scripts
     * Array({DOMElement}) internal references to the script tag used to call
     * the jsonp token in different documents.
     */
    scripts: null,

    /**
     * Property: reload
     * {Boolean} indicate if we need to reload the map when receiving a new token
     *      We need to reload a map if the layer.moveTo calling function was
     *      cancelled due to a previously unavailable token.
     *      Default to *false*
     */
    reload: false,

    /**
     * Constant: EVENT_TYPES
     * {Array(String)} Supported application event types.  Register a listener
     *     for a particular event with the following syntax:
     * (code)
     * updater.events.register(type, obj, listener);
     * (end)
     *
     * Listeners will be called with a reference to an event object.  The
     *     properties of this event depends on exactly what happened.
     *
     * All event objects have at least the following properties:
     * object - {Object} A reference to Geoportal.GeoRMHandler.Updater element.
     *
     * Supported geoRM event types:
     * tokenupdatestart - Triggered when a geoRM token is to be updated.
     * tokenupdateend - Triggerend when the update process is completed
     *      whatever the state of the token is.
     * tokenloaded - Triggered when a valid geoRM token has been received.
     */
    EVENT_TYPES: [ "tokenupdatestart", "tokenupdateend", "tokenloaded" ],

    /**
     *  APIProperty: events
     * {<OpenLayers.Events>}
     */
    events: null,

    /**
     * APIProperty: onTokenLoaded
     * {Function} Callback issued when the token is returned updated.
     *      This function expects an {<OpenLayers.Map>} as parameter.
     *
     *      Defaults to calling <OpenLayers.Map#setCenter>() with current center and zoom.
     */
    onTokenLoaded: function(map) {
        map.setCenter(map.getCenter(), map.getZoom(), false, true);
    },

    /**
     * Constructor: Geoportal.GeoRMHandler.Updater
     * Geographic Rights Management utility class for getting/updating a GeoRM token.
     *
     * Parameters:
     * geoRMKey - {String} the license key
     * serverUrl - {String} the server url
     * ttl - {Integer} the time to live (in seconds)
     * options - {Object} An optional object whose properties will be set on
     *     this instance.
     *      Currently, the following options are supported :
     *      * transport : indicates the way geographic rights management
     *      information are interchanged with the GeoRM service. Values are :
     *          * json: default value - key is sent by HTTP GET method, result
     *          comes back in JSON. Referrer is sent by the browser as an HTTP
     *          header;
     *          * referrer: same as above, but the __rfrrric__=referrer is
     *          also put in a cookie (for HTTPS connexions);
     *          * all: same as above, but the key=token is also put in
     *          a cookie (Not yet implemented).
     */
    initialize: function(geoRMKey, serverUrl, ttl, options) {
        OpenLayers.Util.extend(this,options);
        this.maps= [];
        this.tgts= [];
        this.scripts= [];
        this.domHeads=[];
        this.GeoRMKey= geoRMKey;
        this.lastUpdate= 0;

        this.serverUrl= serverUrl || Geoportal.GeoRMHandler.GEORM_SERVER_URL;
        if (this.serverUrl.charAt(this.serverUrl.length - 1) != '/') {
            this.serverUrl += '/';
        }
        if (ttl) {
            this.ttl= 1000 * ttl;
        }
        this.queryUrl= this.serverUrl + 'getToken?' +
                        "key=" + this.GeoRMKey + '&' +
                        "output=json&callback=Geoportal.GeoRMHandler.U" + this.GeoRMKey + ".callback&";

        this.events= new OpenLayers.Events(this, null, this.EVENT_TYPES);
        if (this.eventListeners instanceof Object) {
            this.eventListeners= [];
        }
        this.addOptions(options);

        OpenLayers.Event.observe(window, 'unload', this.destroy);
    },

    /**
     * Method: addOptions
     * Process options given on the license key.
     *      Processed options :
     *      * eventListeners;
     *
     * Parameters:
     * options - {Object}
     */
    addOptions: function(options) {
        if (options) {
            if (options.eventListeners && options.eventListeners instanceof Object) {
                if (!this.eventListeners) {
                    this.eventListeners= [];
                }
                this.eventListeners.push(options.eventListeners);
                this.events.on(options.eventListeners);
            }
        }
    },

    /**
     * APIMethod: addMap
     * Register a map using the license key
     *
     * Parameters:
     * map - {<Openlayers.Map>}
     */
    addMap: function(map) {
        for (var i= 0, len= this.maps.length; i<len; i++) {
            if (this.maps[i] === map) {
                return;
            }
        }
        this.maps.push(map);
        var doc= map.div.ownerDocument || OpenLayers._document;
        for (var i= 0, len= this.tgts.length; i<len; i++) {
            if (this.tgts[i]===doc) { return; }
        }
        this.tgts.push(doc);
        var head= (doc.getElementsByTagName("head").length ?
                      doc.getElementsByTagName("head")[0] :
                      doc.body);
        this.domHeads.push(head);
        // a new doc has been added :
        this.getToken();
    },

    /**
     * APIMethod: destroy
     * Release the token associated with the license key.
     */
    destroy: function() {
        OpenLayers.Event.stopObserving(window, 'unload', this.destroy);

        //TODO: call releaseToken : using this.queryUrl may conflit avec ongoing updateToken() ?
        //var queryUrl= this.serverUrl + 'releaseToken?' +
        //              "key=" + this.GeoRMKey + '&';
        //if (this.token) {
        //    for (var key in this.token) {
        //        queryUrl += key + '=' + this.token[key] + '&';
        //    }
        //}
        if (this.eventListeners) {
            for (var i= 0, l= this.eventListeners.length; i<l; i++) {
                this.events.un(this.eventListeners[i]);
            }
            this.eventListeners= null;
        }
        if (this.events) {
            this.events.destroy();
            this.events = null;
        }
        if (this.GeoRMKey) { this.GeoRMKey= null; }
        if (this.serverUrl) { this.serverUrl= null; }
        if (this.token) { this.token= null; }
        if (this.maps) { this.maps= null; }
        if (this.tgts) { this.tgts= null; }
        if (this.scripts) { this.scripts= null; }
        if (this.domHeads) { this.domHeads= null; }
        if (this.queryUrl) { this.queryUrl= null; }
    },

    /**
     * APIMethod: getToken
     * Get a token associated with the license key.
     *
     * Returns:
     * {Object} the rightsManagementKey
     */
    getToken: function () {
        if (this.domHeads.length==0) {
            return null;
        }
        var now= (new Date()).getTime();
        var invalidToken= ((!this.token) || (this.lastUpdate + this.ttl < now)) && !noconnexion;

        // do we need to update token
        if ((this.lastUpdate + this.ttl/2 < now) && !noconnexion) {
            // only update if no update is in progress
            if (this.status == 0) {
                this.lastUpdate= now;
                this.updateToken();
            }
        }

        // if status == -1 we are unqueuing the moveTo call, do not queue more calls.
        if (invalidToken && this.status >= 0) {
            this.token= null;
            this.reload= true;
            return null;
        }
        return this.token;
    },

    /**
     * Method: updateToken
     * Call the GeoRM service to update the current token.
     */
    updateToken: function () {
        if (this.events.triggerEvent("updatetokenstart")===false) {
            return;
        }
        for (var i= 0, l= this.scripts.length; i<l; i++) {
            var script= this.scripts[i];
            if (script) {
                try {
                    // document may have been destroyed ...
                    script.parentNode.removeChild(script);
                } catch (e) {
                    ;
                }
                this.scripts[i]= null;
            }
        }

        this.status++;
        if (this.status >= 10) {
            this.status= 0;
            if (this.events.triggerEvent("updatetokenstop")!==false) {
                OpenLayers.Console.error(OpenLayers.i18n('geoRM.failed',{'key':this.GeoRMKey}));
            }
            return;
        }

        var url= this.queryUrl;
        for (var key in this.token) {
            url += key + '=' + this.token[key] + '&';
        }

        for (var i= 0, l=this.domHeads.length; i<l; i++) {
            if (this.domHeads[i]==null) { continue; }
            try {
                // document may have been destroyed ...
                var script= this.domHeads[i].ownerDocument.createElement("script");
                script.setAttribute('type', 'text/javascript');
                var sUrl= url;
                // cookie referrer:
                if (this.transport=='referrer') {
                    sUrl+= Geoportal.GeoRMHandler.getCookieReferrer(this.domHeads[i]) + '&';
                }
                script.setAttribute('src', sUrl);
                this.domHeads[i].appendChild(script);
                this.scripts[i]= script;
                break;
            } catch (e) {
                this.domHeads[i]= null;
            }
        }

        if (this.timeout) {
            window.clearTimeout(this.timeout);
        }
        var retry= this.status * this.ttl/10;
        this.timeout= window.setTimeout("Geoportal.GeoRMHandler.U"+this.GeoRMKey+" && Geoportal.GeoRMHandler.U"+this.GeoRMKey+".updateToken()", retry);
    },

    /**
     * Method: callback
     * Callback function called with the json value
     *      of the token returned by the token server.
     *
     * Parameters:
     * token - {Object}
     */
    callback: function(token) {
        if (this.events.triggerEvent("updatetokenend")===false) {
            return;
        }
        if (token==null) {
            OpenLayers.Console.error(OpenLayers.i18n('geoRM.getToken',{'key':this.GeoRMKey}));
        } else if (this.status > 0) {
            this.token= token;

            if (this.timeout) {
                window.clearTimeout(this.timeout);
                this.timeout= null;
            }
            this.status= -1;

            if (this.reload) {
                for (var i= 0, len= this.maps.length; i<len; i++) {
                    if (this.events.triggerEvent("tokenloaded")!==false) {
                        this.onTokenLoaded(this.maps[i]);
                    }
                }
                this.reload= false;
            }

            // put status to "normal" after calling moveTo in order to avoid
            // that moveTo generate new updates.
            this.status= 0;

            // look if we need to update again the token
            // this.getToken();
        }
    },

    /**
     * Constant: CLASS_NAME
     * {String} *"Geoportal.GeoRMHandler.Updater"*
     */
    CLASS_NAME: "Geoportal.GeoRMHandler.Updater"
});

/**
 * Function: Geoportal.GeoRMHandler.getCookieReferrer
 * Get the referrer of the current document.
 *
 * Parameters:
 * e - {DOMElement} a document element of the current document
 * asObj - {Boolean} indicate to return an object instead of a string
 *
 * Returns:
 * {String | Object} the value of the cookie to set.
 */
Geoportal.GeoRMHandler.getCookieReferrer= function(e, asObj) {
    var cr= asObj===true? {} : '';
    if (Geoportal.Cookies.cookiesEnabled()) {
        //send referrer as URL parameter to GetToken that will forge a
        //cookie back with the relevant path, domain and max-age ...
        if (Geoportal.Cookies.get(Geoportal.GeoRMHandler.GEORM_REFERRER_COOKIENAME)===undefined) {
            var d= e || OpenLayers._document;
            d= d.ownerDocument || d;
            var w= d.defaultView || d.parentWindow;
            var o= w.opener;
            // popup's or plain page referrer:
            var ref= '';
            try {
                ref= o && o.location && o.location.href;
            } catch (e) {
                ref= d.location.href;
            }
            ref= 'referrer,' + encodeURIComponent(ref);
            cr= asObj===true? {cookie:ref} :'cookie=' + ref;
        }
    } else {
        OpenLayers.Console.warn(OpenLayers.i18n('cookies.not.enabled'));
    }
    return cr;
};

/**
 * Function: Geoportal.GeoRMHandler.getContract
 * Build the contract object from the Geoportal API.
 *      Default callback for Geoportal.GeoRMHandler.getConfig() method.
 *
 * Parameters:
 * contract - {Object} information returned by the GeoRM service.
 *      The structure holding the key's contract is :
 *      * service - {String} the GeoRM service that has returned the contract;
 *      * key - {String} the API Key;
 *      * boundingBox - {Object} hold minx, miny, maxx, maxy values
 *      (longitudes, latitudes);
 *      * resources - {Array({Object})} hold all layers available for the
 *      key. Each object holds :
 *          * name - {String} name of layer;
 *          * type - {String} type of service for this layer (WMSC, ...);
 *          * url - {String} service's URL.
 *      * tokenTimeOut - {Integer} number of seconds for GeoRM time to
 *      live.
 *      If contract hold a 'error' property, the key has no contract!
 *
 * Returns:
 * {Object} information needed by the Geoportal API stored in a global
 * variable gGEOPORTALRIGHTSMANAGEMENT, null on error. This variable contains
 * a property 'pending' whose value is the number of awaiting contrats.
 */
Geoportal.GeoRMHandler.getContract = function(contract) {
    if (gGEOPORTALRIGHTSMANAGEMENT.pending>0) {
        gGEOPORTALRIGHTSMANAGEMENT.pending--;
        if (contract.error) {
            OpenLayers.Console.warn(contract.error);
        } else {

            gGEOPORTALRIGHTSMANAGEMENT.apiKey.push(contract.key);
            gGEOPORTALRIGHTSMANAGEMENT[contract.key]= {
                tokenServer:{
                    url:contract.service,
                    ttl:contract.tokenTimeOut
                },
                tokenTimeOut:contract.tokenTimeOut,
                bounds: contract.boundingBox?
                    [ contract.boundingBox.minx, contract.boundingBox.miny, contract.boundingBox.maxx, contract.boundingBox.maxy ]
                :   [-180,-90,180,90],
                allowedGeoportalLayers:new Array(contract.resources.length),
                resources:{}
            };
            for (var i= 0, l= contract.resources.length; i<l; i++) {
                var r= contract.resources[i];
                gGEOPORTALRIGHTSMANAGEMENT[contract.key].allowedGeoportalLayers[i]= r.name+':'+r.type;
                gGEOPORTALRIGHTSMANAGEMENT[contract.key].resources[r.name+':'+r.type]= OpenLayers.Util.extend({}, r);
                if (gGEOPORTALRIGHTSMANAGEMENT.services[r.url]===undefined) {
                    if (gGEOPORTALRIGHTSMANAGEMENT.services[r.url]===undefined) {
                        gGEOPORTALRIGHTSMANAGEMENT.services[r.url]= {
                            id: '__'+r.url.replace(/[^a-z0-9.-]/gi,'_')+'__',
                            type: r.type,
                            caps: null
                        };
                    }
                }
            }
            var s= OpenLayers.Util.getElement('__'+contract.key+'__');
            if (s && s.parentNode ) { s.parentNode.removeChild(s); }
        }

        if (gGEOPORTALRIGHTSMANAGEMENT.pending==0 &&
            typeof(gGEOPORTALRIGHTSMANAGEMENT.onContractsComplete)==='function') {
            gGEOPORTALRIGHTSMANAGEMENT.onContractsComplete();
        }

    }

    return gGEOPORTALRIGHTSMANAGEMENT;
};

/**
 * Function: Geoportal.GeoRMHandler.getConfig
 * Retreive the contract's config from the given key.
 *
 * Parameters:
 * geoRMKey - {Integer} the api key.
 * callback  - {Function | String} the callback function's name to call
 *      when receiving the server's reply. If null, use
 *      'Geoportal.GeoRMHandler.getContract'.
 * serverUrl - {String} the url of the token server. If null, use
 *      Geoportal.GeoRMHandler.GEORM_SERVER_URL.
 * options - {Object} An optional object whose properties will be set on
 *     the rightsManagement key instance :
 *      * onContractsComplete : callback to use when all contracts have been received.
 *      Only used when callback parameter is null;
 *      * capabilities - {Object} holds the following properties :
 *          * proxy - {String} JSON proxy Url, defaults to
 *          Geoportal.JSON_PROXY_URL.;
 *          * callback - {Function | String} the callback function's name
 *          tocall when receiving service's capabilities. If null, use
 *          'Geoportal.GeoRMHandler.getCapabilities';
 *          * onCapabilitiesComplete : callback to use when all capabilities
 *          have been received.
 *          Only used when callback option is null.
 *
 * Returns:
 * {Integer} The number of contracts sent.
 */
Geoportal.GeoRMHandler.getConfig = function (geoRMKey, callback, serverUrl, options) {
    // check whether it is callback's return or user's call:
    if (!geoRMKey) {
        return 0;
    }
    if (typeof(geoRMKey)=='string') {
        geoRMKey= [geoRMKey];
    }
    if (geoRMKey.length==0) {
        return 0;
    }
    options= options || {};
    var gfn= function(f) {
        if (!f) { return null; }
        var fn= /\W*function\s+([\w\$]+)\(/.exec(f);
        if (!fn) { return null; }
        return fn[1];
    };
    var callbackName= !callback?
        'Geoportal.GeoRMHandler.getContract'
    :   typeof(callback)=='string'?
        callback
    :   gfn(callback);
    if (!callbackName) { return 0; }
    var doc= OpenLayers._document;
    var head= (doc.getElementsByTagName("head").length ?
                  doc.getElementsByTagName("head")[0]
              :   doc.body);
    for (var i= 0, l= geoRMKey.length; i<l; i++) {
        var s= OpenLayers.Util.getElement('__'+geoRMKey[i]+'__');
        if (s && s.parentNode ) { s.parentNode.removeChild(s); }
        s= OpenLayers._document.createElement('script');
        s.id= '__'+geoRMKey[i]+'__';
        s.setAttribute('type', 'text/javascript');
        var sUrl= (serverUrl || Geoportal.GeoRMHandler.GEORM_SERVER_URL) + 'getConfig?' +
                'key='+geoRMKey[i]+'&' +
                'output=json&' +
                'callback=' + callbackName + '&';
        // cookie referrer:
        // FIXME: in case of multiple keys, what happens to cookie ?
        if (options.transport=='referrer') {
            sUrl+= Geoportal.GeoRMHandler.getCookieReferrer(head) + '&';
        }
        if (!noConnection) s.setAttribute('src', sUrl);
        head.appendChild(s);
    }

    if (!callback) {
        if (window.gGEOPORTALRIGHTSMANAGEMENT===undefined) {
            gGEOPORTALRIGHTSMANAGEMENT= {};
        }
        OpenLayers.Util.extend(gGEOPORTALRIGHTSMANAGEMENT, {
            pending: 0,
            apiKey: [],
            services: {}
        });
        OpenLayers.Util.extend(gGEOPORTALRIGHTSMANAGEMENT, options);
        gGEOPORTALRIGHTSMANAGEMENT.pending+= geoRMKey.length;
    }

    return geoRMKey.length;
};

/**
 * Function: Geoportal.GeoRMHandler.getServicesCapabilities
 *
 * Parameters:
 * services - {Object} holds the service definition :
 *      * id - {String} unique service identifier;
 *      * url - {String} service url for GetCapabilities;
 *      * type - {String} service's type (WMS, WFS, WMSC, WMTS, ...);
 *      * caps - {Object} null or empty at the begining FIXME
 *      If null, use gGEOPORTALRIGHTSMANAGEMENT.services;
 * callback  - {Array({String}) | String} the callback function's name to call
 *      when receiving the server's reply. If null, use
 *      'Geoportal.GeoRMHandler.getCapabilities'.
 * jsonProxyUrl - {String} the url of the JSON proxy service. If null, use
 *      Geoportal.JSON_PROXY_URL.
 * options - {Object} An optional object whose properties will be set on
 *     the rightsManagement key instance :
 *      * onCapabilitiesComplete : callback to use when all capabilities have been received.
 *      Only used when callback parameter is null;
 *
 * The returned JSON object contains the following properties :
 *      * http - {Object} contains :
 *          * code - {Integer} the HTTP code of the request;
 *          * url - {String} the proxied service Url;
 *      * xml - {String} the service's capabilities as an XML string.
 *
 * Returns:
 * {Object} the services informations.
 */
Geoportal.GeoRMHandler.getServicesCapabilities = function (services, callback, jsonProxyUrl, options) {
    if (window.gGEOPORTALRIGHTSMANAGEMENT===undefined) {
        gGEOPORTALRIGHTSMANAGEMENT= {};
    }
    if (!services) {
        if (!gGEOPORTALRIGHTSMANAGEMENT.services) {
            return null;
        }
        services= gGEOPORTALRIGHTSMANAGEMENT.services;
    }
    options= options || {};
    OpenLayers.Util.applyDefaults(options, gGEOPORTALRIGHTSMANAGEMENT.capabilities);
    var gfn= function(f) {
        if (!f) { return null; }
        var fn= /\W*function\s+([\w\$]+)\(/.exec(f);
        if (!fn) { return null; }
        return fn[1];
    };
    var callbackName= !callback?
            (options.callback?
                options.callback
            :   'Geoportal.GeoRMHandler.getCapabilities')
        :   (typeof(callback)=='string'?
            callback
        :   gfn(callback));
    if (!callbackName) { return null; }
    for (var u in services) {
        var srv= services[u];
        var stp= srv.type;
        switch (srv.type) {
        case 'WFS'   :             break;
        case 'WMTS'  :             break;
        case 'WMSC'  : stp= 'WMS'; break;
        case 'WMS'   :             break;
        default      :
            srv.caps= {};
            continue;
        }
        var doc= OpenLayers._document;
        var head= (doc.getElementsByTagName("head").length ?
            doc.getElementsByTagName("head")[0]
        :   doc.body);
        var s= OpenLayers.Util.getElement(srv.id);
        if (s && s.parentNode ) { s.parentNode.removeChild(s); }
        s= OpenLayers._document.createElement('script');
        s.id= srv.id;
        s.setAttribute('type', 'text/javascript');
        var sUrl= jsonProxyUrl || options.proxy || Geoportal.JSON_PROXY_URL;
        sUrl= OpenLayers.Util.urlAppend(sUrl,
                'url=' + encodeURIComponent(OpenLayers.Util.urlAppend(u, 'SERVICE=' + stp + '&REQUEST=GetCapabilities&')) + '&' +
                'callback=' + callbackName + '&');
        s.setAttribute('src', sUrl);
        head.appendChild(s);
    }

    if (!callback) {
        //FIXME: chain getConfig() then getServicesCapabilities()
        if (options.onCapabilitiesComplete) {
            gGEOPORTALRIGHTSMANAGEMENT.onCapabilitiesComplete= options.onCapabilitiesComplete;
        }
    }

    return services;
};

/**
 * Function: Geoportal.GeoRMHandler.getCapabilities
 * Awaits for service's capabilities to be loaded, then call onCapabilitiesComplete
 * callback when all loaded to finish loading the page.
 *
 * Parameters:
 * obj - {Object} the returned JSON object
 */
Geoportal.GeoRMHandler.getCapabilities = function(obj) {
    if (!obj) { obj= {}; }
    if (!obj.http) { obj.http= {}; }
    if (!obj.http.code) { obj.http.code= 400; }
    if (!obj.http.url) { obj.http.url= 'http://localhost/?'; }
    if (!obj.xml) { obj.xml= ''; }
    var u= obj.http.url.split('?')[0];
    var srv= gGEOPORTALRIGHTSMANAGEMENT.services[u];
    if (obj.http.code!=200) {
        OpenLayers.Console.warn(OpenLayers.i18n('url.error',{'url':obj.http.url,'msg':''}));
    } else {
        if (srv) {
            var doc= OpenLayers.parseXMLString(obj.xml);
            //TODO  utility function for mapping type and parser ?
            var fmt= null;
            switch (srv.type) {
            case 'WFS'   : fmt= OpenLayers.Format.WFSCapabilities;  break;
            case 'WMTS'  : fmt= OpenLayers.Format.WMTSCapabilities; break;
            case 'WMSC'  :
            case 'WMS'   : fmt= OpenLayers.Format.WMSCapabilities;  break;
            default      :                                          break;
            }
            if (fmt) {
                var capsFmt= new fmt();
                var caps= null;
                try {
                    caps= capsFmt.read(doc);
                } catch (er) {
                    OpenLayers.Console.warn('url.error',{'url':obj.http.url,'msg':''});
                } finally {
                    if (caps && caps.exceptions) {//Service Exception
                        var msg= '';
                        for (var i= 0, l= caps.exceptions.length; i<l; i++) {
                            msg+= caps.exceptions[i]+'\n';
                        }
                        OpenLayers.Console.warn('url.error',{'url':obj.http.url,'msg':msg});
                    } else {
                        srv.caps= caps;
                    }
                }
            }
            var s= OpenLayers.Util.getElement(srv.id);
            if (s && s.parentNode ) { s.parentNode.removeChild(s); }
        }
    }
    if (srv && !srv.caps) {
        srv.caps= {};//prevent infinite loop!
    }
    for (var srv in gGEOPORTALRIGHTSMANAGEMENT.services) {
        if (gGEOPORTALRIGHTSMANAGEMENT.services[srv].caps===null) {
            return;
        }
    }
    // all capabilities loaded:
    if (typeof(gGEOPORTALRIGHTSMANAGEMENT.onCapabilitiesComplete)==='function') {
        gGEOPORTALRIGHTSMANAGEMENT.onCapabilitiesComplete();
    }
};

/**
 * Function: Geoportal.GeoRMHandler.addKey
 * Returns a token for a api Key.
 * Returns null if any problem (invalid key)
 *
 * Parameters:
 * geoRMKey - {Integer} the api key.
 * serverUrl - {String} the url of the token server.
 * ttl - {Integer} time to live of a token in seconds.
 * map - {<OpenLayers.Map>} the map to protect.
 * options - {Object} An optional object whose properties will be set on
 *     the rightsManagement key instance.
 *
 * Returns:
 * {Object} the rightsManagement key
 */
Geoportal.GeoRMHandler.addKey = function (geoRMKey, serverUrl, ttl, map, options) {
/*
    if (!Geoportal.GeoRMHandler["U" + geoRMKey]) {
        Geoportal.GeoRMHandler["U" + geoRMKey]= new Geoportal.GeoRMHandler.Updater(geoRMKey, serverUrl, ttl, options);
        Geoportal.GeoRMHandler["U" + geoRMKey].getToken();
    } else {
        Geoportal.GeoRMHandler["U" + geoRMKey].addOptions(options);
    }
    Geoportal.GeoRMHandler["U" + geoRMKey].addMap(map);
    return Geoportal.GeoRMHandler["U" + geoRMKey];
 */
    //         all except IE<=8
    var base= (OpenLayers._document.defaultView || OpenLayers._document.parentWindow).Geoportal.GeoRMHandler;
    if (!base["U" + geoRMKey]) {
        base["U" + geoRMKey]= new Geoportal.GeoRMHandler.Updater(geoRMKey, serverUrl, ttl, options);
        base["U" + geoRMKey].getToken();
    } else {
        base["U" + geoRMKey].addOptions(options);
    }
    base["U" + geoRMKey].addMap(map);
    return base["U" + geoRMKey];
};

/**
 * Constant: Geoportal.GeoRMHandler.GEORM_REFERRER_COOKIENAME
 * {String} *"__rfrrric__"*
 */
Geoportal.GeoRMHandler.GEORM_REFERRER_COOKIENAME= "__rfrrric__";

/**
 * Constant: Geoportal.GeoRMHandler.GEORM_SERVER_URL
 * {String} *"http://jeton-api.ign.fr/"*
 */
Geoportal.GeoRMHandler.GEORM_SERVER_URL= "http://jeton-api.ign.fr/";

/**
 * Constant: Geoportal.JSON_PROXY_URL
 * {String} *"http://api.ign.fr/geoportail/api/xmlproxy?output=json"*
 */
Geoportal.JSON_PROXY_URL= "http://api.ign.fr/geoportail/api/xmlproxy?output=json";

}
