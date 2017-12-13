/**
 * Create the FS object and all properties and functions needed by web components.
 * Since this script can be run by HF as well as individual web components, every
 * property and function MUST check that it exists before adding it.
 */
window.FS = (function(FS, document) {
  /**
   * Return the current language of the page. For backwards compatibility this
   * is a function instead of a property.
   */
  FS.simpleLocale = FS.simpleLocale || function() {
    return document.documentElement.getAttribute('lang') || 'en';
  };

  /**
   * Get the current language translation. This function is a simple stub for TaaS
   * that should only be used by native web components.
   * @param {string} key
   */
  FS.i18n = FS.i18n || function(key) {
    if (!this.taasContent) return '[' + key + ']';

    var locale = this.simpleLocale() || 'en';

    // locale=zz returns the TaaS key in brackets
    if (locale === 'zz'){
      return '[' + key + ']';
    }
    // locale=ke returns just the last part of the key. useful for ensuring there are
    // no hard-coded strings while not polluting the interface with really long key
    // names
    else if (locale === 'ke') {
      var keyParts = key.split('.');
      return '[' + keyParts[keyParts.length - 1] + ']';
    }

    // when we don't have locale data from the server we can only fallback to
    // navigator.languages with the current locale at the front of the list and
    // 'en' as the last of the list
    var locales = FS.locale;
    if (!locales) {

      // make sure we're using a new reference and not changing navigator.languages
      locales = [].concat(window.navigator.languages || []);
      locales.unshift(locale);
      locales.push('en');
    }

    var keyList = key.split('.');

    for (var localeIndex = 0; localeIndex < locales.length; localeIndex++) {
      var lang = locales[localeIndex];

      // keep splitting sublocales off the lang until we find a supported one
      while (!this.taasContent[lang] && lang.indexOf('-') !== -1) {
        lang = lang.substring(0, lang.lastIndexOf('-'));
      }

      if (this.taasContent[lang]) {
        var translation = this.taasContent[lang];

        for (var i = 0; i < keyList.length; i++) {

          // if the key is not found then move to the next locale
          if (!translation[ keyList[i] ]) {
            break;
          }

          translation = translation[ keyList[i] ];
        }

        // translation found
        if (i === keyList.length) {
          return translation;
        }
      }
    }

    // translation not found
    return '[' + key + ']';
  };

  /**
   * Encode html entities.
   * @param {string} text
   * @returns {string}
   */
  FS.htmlEncode = FS.htmlEncode || function(text) {
    if (!text) return '';

    var tagsToReplace = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      '\'': '&#39;',
      ' ': '&nbsp;'  // \xA0 character
    };

    return text.replace(/[&<>"'\xA0]/g, function(tag) {
      return tagsToReplace[tag];
    });
  };

  /**
   * Safely decode html entities.
   * @see https://stackoverflow.com/a/34064434/2124254
   *
   * @param {string} text
   * @returns {string}
   */
  FS.htmlDecode = FS.htmlDecode || function(text) {
    if (!text) return '';

    var doc = new DOMParser().parseFromString(text, "text/html");
    return doc.documentElement.textContent;
  };

  /**
   * This function will register global elements and attach a reference to them to FS.dialog
   * @param {string} elementName - The name of the element to register e.g. fs-person-card
   * @returns {undefined} - Returns void.
   */
  FS.dialog = FS.dialog || {};

  if (!FS.dialog.register) {
    var buffer = [];
    var bufferElements = true;

    FS.dialog.register = function(elementName) {
      if (bufferElements) {
        buffer.push(elementName);
        return;
      }
      registerElement(elementName);
    };

    function registerElement(elementName) {
      var camelCaseName = elementName.replace(/-([a-z])/g, function (g) { return g[1].toUpperCase(); });
      if (FS.dialog[camelCaseName]) {
        console.error('Attempted to create element', elementName, 'which already exists');
        return;
      }
      var element = document.createElement(elementName);
      document.body.appendChild(element);
      Object.defineProperty(FS.dialog, camelCaseName, {
        get: function() {
          return element;
        }
      });
    }

    document.addEventListener("DOMContentLoaded", function() {
      bufferElements = false;
      buffer.forEach(registerElement)
    });
  }

  /**
   * This is a small fetch wrapper that respects the headers, status redirects and a flag from fetch defaults.
   * @property {object} headers Key value pairs of headers to apply by default.
   * @property {object} statusCallbacks Key value pairs of the form key=status code, value = callback
   */
  FS.fetchDefaults = FS.fetchDefaults || {
    headers: {
      "Accept": 'application/json',
      "Content-Type": 'application/json',
      "Accept-language": FS.simpleLocale()
    },
    credentials: "same-origin",
    statusCallbacks: {
      401: function () {
        window.location.reload();
      }
    }
  };

  // TODO: remove Object.assign polyfill when IE11 supports it or we don't support IE11
  // Polyfill for Object.assign
  if (typeof Object.assign != 'function') {
    Object.assign = function(target, varArgs) { // .length of function is 2
      'use strict';
      if (target == null) { // TypeError if undefined or null
        throw new TypeError('Cannot convert undefined or null to object');
      }

      var to = Object(target);

      for (var index = 1; index < arguments.length; index++) {
        var nextSource = arguments[index];

        if (nextSource != null) { // Skip over if undefined or null
          for (var nextKey in nextSource) {
            // Avoid bugs when hasOwnProperty is shadowed
            if (Object.prototype.hasOwnProperty.call(nextSource, nextKey)) {
              to[nextKey] = nextSource[nextKey];
            }
          }
        }
      }
      return to;
    };
  }

  // TODO: remove this once all supported browsers have String.includes support
  // Polyfill for String.includes
  if (!String.prototype.includes) {
    String.prototype.includes = function(search, start) {
      'use strict';
      if (typeof start !== 'number') {
        start = 0;
      }

      if (start + search.length > this.length) {
        return false;
      } else {
        return this.indexOf(search, start) !== -1;
      }
    };
  }

  /**
   * @param {string} url             The path to the resource you are fetching
   * @param {Object} fetchInit       The init object in JSON format from fetch api. This is where you can do 1 time overwrites of headers as well.
   * @param {Object} fsFetchOptions  This is where one time status options that can be applied with the same form as fetch defaults.
   *
   * fsFetchOptionsEx = {
   *    preProcessingCallback: function(fetchInit) { return fetchInit },
   *    postProcessingCallback: function(res) { return Promise.resolve(res) },
   *    statusCallbacks: { // overrides the defaults
   *      404: function () {//do something on all 404 responses.},
   *      500: function() {//do 500 stuff},
   *    },
   *
   ******** there are no global overrides for these to keep components from having to handel complex response patterns.
   *    doNotThrowOnBadStatus: false, // Only set this to true if you want a success on 400+ status codes. The only time it throws otherwise is on network errors.
   *    doNotConvertToJson: false // set this to true if you want the full res stream passed on response objects.
   * }
   *
   *
   */
  FS.fetch = FS.fetch || function (url, fetchInit, fsFetchOptions) {
    if (!FS.fetchDefaults.headers.Authorization) {
      if (FS.User) {
        FS.fetchDefaults.headers.Authorization = FS.User.sessionId ? 'Bearer ' + FS.User.sessionId : null;
      } else {
        FS.fetchDefaults.headers.Authorization = null;
      }
    }
    if (!fsFetchOptions) {
      fsFetchOptions = {};
    }
    if (!fetchInit) {
      fetchInit = {};
    }
    var preProcessor = fsFetchOptions.preProcessingCallback || fetchInit.preProcessingCallback || undefined;
    if (preProcessor) fetchInit = preProcessor(fetchInit);

    fetchInit.method = fetchInit.method || 'get';
    fetchInit.cache = fetchInit.cache || 'default';

    fetchInit.credentials = fetchInit.credentials || FS.fetchDefaults.credentials;
    fetchInit.headers = createHeadersWithDefaults();
    var options = Object.assign({}, fetchInit, fsFetchOptions);
    var statusCallbacks = Object.assign({}, FS.fetchDefaults.statusCallbacks, options.statusCallbacks);

    var throwOnBadStatus = !options.doNotThrowOnBadStatus;
    var convertToJson = !options.doNotConvertToJson;
    return fetch(url, fetchInit).then(function (res) {
      if (statusCallbacks[res.status]) {
        return convertToJson ? statusCallbacks[res.status](convertToJsonOrReturnOriginalRes(res)) : statusCallbacks[res.status](res);
      }
      if (!res.ok && throwOnBadStatus) {
        var error = new Error('fetch call failed with status ' + res.status);
        error.response = res;
        throw error;
      }
      res = convertToJson ? convertToJsonOrReturnOriginalRes(res) : res;
      return options.postProcessingCallback ? options.postProcessingCallback(res) : res;
    });

    function convertToJsonOrReturnOriginalRes(resp) {
      // handle empty body
      var originalRes = resp;
      return resp.json()
        .catch(function(){
          return originalRes;
        })
    }


    function isHeadersObject(checkHeader) {
      return (checkHeader.has && checkHeader.get && checkHeader.set);
    }

    /**
     *  Force the input headers to be a Headers object for fetch
     *
     * @param fetchInitHeaders Input headers optionally supplied to fetch
     */
    function correctInputHeaders(fetchInitHeaders) {
      var headers = fetchInitHeaders;
      if (headers && !isHeadersObject(headers)) {
        headers = new Headers();
        Object.keys(fetchInitHeaders).forEach(function(key) {
          headers.set(key, fetchInitHeaders[key])
        });
      }
      return headers || new Headers();
    }

    function createHeadersWithDefaults() {
      var headers = correctInputHeaders(fetchInit.headers);
      Object.keys(FS.fetchDefaults.headers).forEach(function(key) {
        if (!headers.has(key)) {

          // Content-Type should only be set when body is being passed
          if (key !== 'Content-Type' || (fetchInit && fetchInit.body) ) {
            headers.set(key, FS.fetchDefaults.headers[key]);
          }

        }
      });
      return headers;
    }
  };

  /**
   * Function only used by native web components to add translations to taasContent.
   * @param {object} translations - flat translation object
   */
  FS._registerTranslations = function(translations) {
    FS.taasContent = FS.taasContent || {};

    Object.keys(translations).forEach(function(lang) {
      FS.taasContent[lang] = FS.taasContent[lang] || {};

      Object.keys(translations[lang]).forEach(function(key) {
        var keyParts = key.split('.');
        var taasContent = FS.taasContent[lang];

        // don't parse the last part of the key
        for (var i = 0; i < keyParts.length - 1; i++) {
          taasContent[ keyParts[i] ] = taasContent[ keyParts[i] ] || {};
          taasContent = taasContent[ keyParts[i] ];
        }

        var lastKey = keyParts[keyParts.length - 1];
        taasContent[lastKey] = taasContent[lastKey] || translations[lang][key];
      });
    });
  };

  FS.Cookie = FS.Cookie || {

    /**
      * @function - setCookie sets a cookie with the specified parameters--path, expires and domain are optional params. If expires is null then cookie will expire with the session.
      * @param {string} cookieID - The name of the cookie to be stored
      * @param {string} cValue - The value to be stored in the cookie
      * @param {string} [path] - The path of the cookie to be set. Defaults to "/"
      * @param {Date|string|integer} [expires] - Either a date object or date string specifying the cookie Expires, or an integer specifying the Max-Age in seconds from now. Not providing this parameter will result in the creation of a session cookie
      * @param {string} [domain] - The domain of the cookie to be set. Defaults to the current domain
      * @returns - nothing
      * @calls - document.cookie()
    */
    setCookie: function(cookieID, cValue, path, expires, domain) {
      var expDate = expires || null;
      var cPath = path || null;
      var domain = domain || null;
      var NameOfCookie = cookieID;
      var cookieString = NameOfCookie + "=" + escape(cValue);
      if(cPath){
        cookieString += ";path=" + cPath;
      }
      if(domain){
        cookieString += ";domain=" + domain;
      }
      if(expDate){
        if(typeof(expDate) === 'number') {
          cookieString += ";max-age=" + expDate;
        } else {
          if(typeof(expDate) !== 'string') {
            expDate = expDate.toUTCString();
          }
          cookieString += ";expires=" + expDate;
        }
      }
      document.cookie = cookieString;
    },

    /* Delete an existing cookie */
    unsetCookie: function(cookieID, path, domain) {
      FS.Cookie.setCookie(cookieID, null, path, "Thu, 01-Jan-1970 00:00:01 GMT", domain);
    },

    /* Returns a named cookie if available */
    getCookie: function(cookieID) {
      var dc = document.cookie, prefix = cookieID + "=", begin = dc.indexOf("; " + prefix);
      if (begin == -1) {
        begin = dc.indexOf(prefix);
        if (begin !== 0)
          return null;
      }
      else
        begin += 2;
      var end = document.cookie.indexOf(";", begin);
      if (end == -1)
        end = dc.length;
      return unescape(dc.substring(begin + prefix.length, end));
    }

  };

  (function(FS) {
   /* local and session Storage helper functions on the FS object. */
    FS.localStorage = {};
    FS.sessionStorage = {};

    var SUPPORTED = (typeof Storage !== 'undefined'),
        PREFIX = 'FS';

    //iOS 7 Private Browsing still has storage functions available, but any attempt to use them will throw a JavaScript error: "QuotaExceededError: DOM Exception 22: An attempt was made to add something to storage that exceeded the quota."
    try {localStorage.test = 0;} catch (e) {
      SUPPORTED = false;
    }

    var apis = [
      // simple/empty will not use any user id to make the key.
      // Intended to be used for all users.
      {
        name: '',
        keyMaker: makeSimpleKey
      },
      // UserData will use the helper id or the logged-in user id to make the key.
      {
        name: 'UserData',
        keyMaker: makeUserKey
      },
      // RealUserData will only use the logged-in user id to make the key.
      {
        name: 'RealUserData',
        keyMaker: makeRealUserKey
      }
    ];

    var storageNames = [ 'localStorage', 'sessionStorage' ];

    // create
    // FS.localStorage.set
    // FS.localStorage.setUserData
    // ...
    // FS.sessionStorage.get
    // FS.sessionStorage.getUserData
    // ...
    for (var i = 0; i < storageNames.length; i++) {
      var storageName = storageNames[i];

      (function(storageName) {
        for (var j = 0; j < apis.length; j++) {
          var api = apis[j];

          (function(api) {
            FS[storageName]['set' + api.name] = function(key, value) {
              return addToStorage(storageName, api.keyMaker, key, value);
            }

            FS[storageName]['get' + api.name] = function(key, parseBoolean){
              return getFromStorage(storageName, api.keyMaker, key, parseBoolean);
            }

            FS[storageName]['remove' + api.name] = function(key){
              return removeFromStorage(storageName, api.keyMaker, key);
            }
          })(api);
        }

        FS[storageName]['moveToUserData'] = function(key){
          return moveToUserData(storageName, key);
        }

        FS[storageName]['clear'] = function(){
          if(!SUPPORTED){return;}
          window[storageName].clear();
        }
      })(storageName);
    }


    // utils

    function hashCode(str) {
      var ret = 0;
      for(var i = 0, len = str.length; i < len; i++) {
          ret = (31 * ret + str.charCodeAt(i)) << 0;
      }
      return ret;
    }

    function makeKey(key, userIdGetter) {
      if (!key) return null;
      if (userIdGetter) {
        var userId = userIdGetter();
        if (!userId) return null;
        key += '-' + hashCode(userId);
      }
      return PREFIX+'.'+key;
    }

    function makeSimpleKey(key) {
      return makeKey(key);
    }

    function makeUserKey(key) {
      return makeKey(key, FS.User.getEffectiveId);
    }

    function makeRealUserKey(key) {
      return makeKey(key, FS.User.getId);
    }

    function moveToUserData(storageName, key) {
      var userId = FS.User.getEffectiveId();
      if (!userId) return;
      var value = getFromStorage(storageName, makeSimpleKey, key);
      if (value) {
        addToStorage(storageName, makeUserKey, key, value);
        removeFromStorage(storageName, makeSimpleKey, key);
      }
    }

    function addToStorage(storageName, keyMaker, key, value){
      if(!SUPPORTED){return;}

      key = keyMaker(key);
      if (!key) return;

      if (typeof value === "undefined") {
        value = null;
      }

      if (Array.isArray(value) || value === Object(value)) {
        value = JSON.stringify(value);
      }

      window[storageName].setItem(key, value);

      return true;
    }

    function getFromStorage(storageName, keyMaker, key, parseBoolean){
      if(!SUPPORTED){return null;}

      key = keyMaker(key);
      if (!key) return null;

      var item = window[storageName].getItem(key) || null;

      if (!item || item === 'null') {
        return null;
      }

      if (item.charAt(0) === "{" || item.charAt(0) === "[") {
        return JSON.parse(item);
      }

      //This is to (optionally) parse booleans such that localStorage behaves the same as userPreference
      if ( parseBoolean && (item === "true" || item === "false")) {
        return JSON.parse(item);
      }

      return item;
    }

    function removeFromStorage(storageName, keyMaker, key){
      if(!SUPPORTED){return;}

      /// if valid session, remove proper key:val
      if(FS.User.profile) {
        window[storageName].removeItem(keyMaker(key));

      // else remove all with base of key
      } else {
        for (var i=0, j=window[storageName].length; i<j; i++) {
          var value = window[storageName].key(i);
          if (value && value.indexOf("FS." + key) !== -1) {
            window[storageName].removeItem(value);
          }
        }
      }

      return true;
    }

  })(FS);

  return FS;
})(window.FS || {}, document);

/* EXPERIMENTS.JS */

/* global FS */
(function (experiments, FS) {

  if (FS && FS.initEx && FS.defaultEx && FS.activeList && FS.setEx && FS.listEx && FS.showEx) return;

  var SHARED_KEY = 'shared-ui'
    , hostName = window.location.hostname.toLowerCase()
    , sharedExs = {}
    , localExs = {}
    , expDiv = null
    , appName = FS.appName || 'none'
    , EXPERIMENTS_COOKIE_NAME = 'fs_experiments'
    , EXPERIMENTS_COOKIE_NAME_APLPHA_SORT = 'fs_experiments_sort_alpha'
    , APP_EXPERIMENTS_COOKIE_NAME = 'fs_ex_' + appName
    , allExps = { apps: {} }
    , listOfExpNames //for search
    , expsTemplate
    , ONE_YEAR_IN_MS = 365 * 24 * 60 * 60 * 1000
    , initialized = false;


  /* Styles for DOM experiment list */
  var css = '#fs-experiment-list{z-index:9999;position:absolute;top:5px;left:5px;background-color:#7D6AAD;max-height:95%;overflow:auto;padding:8px;width:325px;border-radius:5px;box-shadow:5px 10px 15px 0 #999}#fs-experiment-list header{overflow:auto;display:inline-block;margin-bottom:-5px}#fs-experiment-list header h4{color:#fff;padding:0;margin:0;cursor:pointer;font-weight:700}#fs-experiment-list header h4 span{font-size:10px}#fs-experiment-list .tools:hover{text-decoration:underline}#fs-experiment-list .tools{float:right;padding-left:10px;text-decoration:none;color:#fff;font-size:15px}#fs-experiment-list section span{position:relative;top:5px;cursor:pointer;padding:5px;background-color:#ddd;width:125px;height:45px;font-size:14px;font-weight:700;text-align:center;display:inline-block;text-transform:uppercase;margin-top:0;transition:all .1s ease-in-out}#fs-experiment-list section span.selected:hover{background-color:#fff}#fs-experiment-list section span.selected{top:0;background-color:#fff}#fs-experiment-list section span:hover{background-color:#ccc}#fs-experiment-list ul{list-style-type:none;margin:-22px 0 0;background-color:#fff;padding:10px;position:relative;border-radius:0 5px 5px;min-height:10px}#fs-experiment-list section label:hover{background-color:rgba(125,106,173,.44)}#fs-experiment-list section label{display:block;padding:0;font-size:14px}#fs-experiment-list section label input{margin:3px}#fs-experiment-list .hide_search{display:block}#fs-experiment-list #searchBox{width:310px;padding:5px 5px 5px 10px;margin:10px 0 20px;font-weight:700;border-radius:5px;border:0;font-size:14px;outline:0;background-color:#584686;color:#fff}#fs-experiment-list .close-experiments{font-weight:700;line-height:10px;color:#584686;text-decoration:none;margin-left:5px}#fs-experiment-list #pin-experiments{width:15px;height:15px;border-radius:50% 50% 50% 0;background:#584686;transform:rotate(-45deg);display:inline-block;float:right;margin:2px 5px 0 0}#fs-experiment-list #pin-experiments:after{content:"";width:6px;height:6px;border-radius:50px;display:inline-block;background-color:#fff;margin:0 0 5px 4px}',
    head = document.head || document.getElementsByTagName('head')[0],
    style = document.createElement('style');
    style.appendChild(document.createTextNode(css));

  head.appendChild(style);


  function deserializeExperiments(cookie, templates) {
    if(! (typeof(cookie) === 'string' && cookie.length)) return;

    if (cookie.indexOf('u=') === -1) return {};

    var userId = cookie.match(/u=[^,]+/)[0].replace('u=','')
      , apps = cookie.split('&')
      , exps = { userId: userId }
      , appData = exps.apps = {};

    var setFeatures = function(app, template) {
      if (! template) return;
      var features = app.features = {}
        , values = app.values
        , dirty = app.dirtyFeatures = []
        , names = Object.keys(template);

      names.map(function(name, idx) {
        var value = values[idx] === '1'
          , origValue = !! template[name];

        features[name] = value;
      });
    };

    apps.map(function(item) {
      var app;
      try {
        var name = item.match(/a=[^,]+/)[0].replace('a=','');

        app = appData[name] = {};

        if (name !== 'shared-ui' && name !== appName) {
          appData[name] = item;
          return;
        }

        app.stamp = item.match(/s=[^,]+/)[0].replace('s=','');
        app.values = item.match(/v=[^,]+/)[0].replace('v=','');
        setFeatures(app, (templates[name] || {}).features);
        delete app.values;
        app.bucket = item.match(/b=[^,]+/)[0].replace('b=','');
        return app;
      } catch(e) {
        console.error('Old Experiment is bad');
      }
    });

    return exps;
  } // deserializeExperiments()

  function serializeExperiments(exps, username) {
    var contents = []
      , expApps = exps.apps || {}
      , expAppKeys = Object.keys(expApps);

    function serialize(appExps, appName) {
      // Not re-serializing other-app experiments
      if (typeof appExps === 'string') return appExps;

      var parts = [ 'a=' + (appName ? appName : '') ]
        , features = appExps.features || {}
        , featureKeys = Object.keys(features);

      parts.push('s=' + appExps.stamp);
      var values = '';

      for(var i = 0; i < featureKeys.length; i++) {
        values += features[featureKeys[i]] ? '1' : '0';
      }
      parts.push('v=' + values);
      parts.push('b=' + appExps.bucket);
      return parts;
    }

    if (exps.apps) {
      for(var i = 0; i < expAppKeys.length; i++) {
        contents.push(serialize(expApps[expAppKeys[i]], expAppKeys[i]));
      }
    } else {
      contents.push(serialize(exps));
    }

    return 'u=' + username + ',' + contents.join('&');
  }

  function getExperimentsFromCookie() {
    var cookieString = FS.Cookie.getCookie(EXPERIMENTS_COOKIE_NAME) || ''
      , appCookieString = FS.Cookie.getCookie(APP_EXPERIMENTS_COOKIE_NAME) || ''
      , exps = {}
      , appExps = {};

    if (!(cookieString || appCookieString)) {
      return {};
    }

    if (!expsTemplate && window.manifest) {
      expsTemplate = window.manifest.experiments;
    }

    try {
      allExps = deserializeExperiments(cookieString, expsTemplate.apps);
    } catch (e) {
      allExps = { apps: {} };
    }

    allExps.apps[appName] = allExps.apps[appName] || appExps || { features: {} };
    allExps.apps[SHARED_KEY] = allExps.apps[SHARED_KEY] || { features: {} };

    return allExps.apps;
  }

  function setExperimentsCookie(exs, sharedExs) {
    var experiments = allExps
      , expireDateTime = new Date((new Date()).getTime() + (ONE_YEAR_IN_MS)) //set expiration date for 1 year
      , serialized;

    serialized = serializeExperiments(experiments, experiments.userId);
    FS.Cookie.setCookie(EXPERIMENTS_COOKIE_NAME, serialized, "/", expireDateTime);
  }

  function clearExperimentsCookie() {
    FS.Cookie.unsetCookie(EXPERIMENTS_COOKIE_NAME, "/");
    FS.Cookie.unsetCookie(APP_EXPERIMENTS_COOKIE_NAME, "/");
  }

  function setAlphabeticalSort(){
    FS.Cookie.setCookie(EXPERIMENTS_COOKIE_NAME_APLPHA_SORT, "1", "/");
    document.querySelector("body").removeChild(document.querySelector("#fs-experiment-list"));
    FS.listEx();
  }

  function unsetAlphabeticalSort(){
    FS.Cookie.unsetCookie(EXPERIMENTS_COOKIE_NAME_APLPHA_SORT, "/");
    document.querySelector("body").removeChild(document.querySelector("#fs-experiment-list"));
    FS.listEx();
  }

  function getClassNames(exs) {
    var classNames = [];
    if(exs) {
      for(var ex in exs.features) {
        if(!exs.features[ex]) {
          continue;
        }
        else if(typeof exs.features[ex] === 'boolean' || typeof exs.features[ex] === 'number') {
          classNames.push("ex_" + ex);
        } else {
          for(var vName in exs.features[ex]) {
            if(exs.features[ex][vName]) {
              classNames.push("ex_" + ex + " ex_" + ex + "_" + vName);
              break;
            }
          }
        }
      }
    }
    return classNames;
  }

  function addLines(container, exs, title) {

    function makeLine(name, value) {
      var li = document.createElement("li");
        li.id = name;
        li.setAttribute("class", "hide_search");
      var label = document.createElement("label");
      var input = document.createElement("input");
        input.type = "checkbox";
        input.value = name;
        if (value === "checked") {
          input.setAttribute("checked", value);
        }

        input.setAttribute("onclick","javascript:FS.setEx('" + input.value + "', !FS.showEx('" + input.value + "'))");

        label.appendChild(input);
        label.innerHTML += "&nbsp;" + name;
        li.appendChild(label);

      container.appendChild(li);
    }

    var exName, exVal, keys = [];

    var callMakeLine = function(exName) {
      if (exs.features.hasOwnProperty(exName)) {
        exVal = exs.features[exName];

        if(typeof exVal === 'boolean' || typeof exVal === 'number') {
          makeLine(exName, exVal ? "checked" : "");
        } else {//object with variants
          for(var vName in exVal) {
            if (exVal.hasOwnProperty(vName)) {
              makeLine(exName + "#" + vName, exVal[vName] ? "checked" : "");
            }
          }
        }
      }
    }

    if (FS.Cookie.getCookie(EXPERIMENTS_COOKIE_NAME_APLPHA_SORT) != undefined) {
      for (exName in exs.features) {
        callMakeLine(exName);
      }
    } else { // Sort based on the cookie
      Object.keys(exs.features || exs).sort().forEach(function (exName) {
        callMakeLine(exName);
      });
    }
  }

  /* Inits Experiments */
  FS.initEx = function() {
    getExperimentsFromCookie();

    var classNames = [];
    localExs = allExps.apps[appName] || (allExps.apps[appName] = {});
    sharedExs = allExps.apps[SHARED_KEY] || (allExps.apps[SHARED_KEY] = {});

    if (Object.keys(localExs).length === 0) { localExs.features = {} }
    if (Object.keys(sharedExs).length === 0) { sharedExs.features = {} }
    listOfExpNames = Object.keys(localExs.features).concat(Object.keys(sharedExs.features));

    /* Add classes to html tag for each experiment so css styles can be targeted */
    classNames = classNames.concat(getClassNames(localExs));
    classNames = classNames.concat(getClassNames(sharedExs));

    document.documentElement.className += " " + classNames.join(' ');

    /* Dispatch an event in case someone is listening */
    var evt = document.createEvent('HTMLEvents');
    evt.initEvent('ExReady', true, false);
    window.dispatchEvent(evt);

    initialized = true;
  }

  // Public Variables and Methods
  window.FS = Object.assign((typeof FS === "object" ? FS : {}), {

    defaultEx: function(template) {
      expsTemplate = template;
    },

    activeList: function() {
      var active = [],
          name;
      for (name in localExs.features) {
        if (FS.showEx(name)) {
          active.push(name);
        }
      }
      for (name in sharedExs.features) {
        if (FS.showEx(name)) {
          active.push(name);
        }
      }
      return active;
    },

    setEx: function (name, value) {
      console.log("Running setEX", name, value);
      value = value ? 1 : 0;
      var apps = allExps.apps
        , obj = (apps[appName].features || (apps[appName].features = {}))
        , sharedObj = (apps[SHARED_KEY].features || (apps[SHARED_KEY].features = {}))
        , toks = name.split('#');

      if(toks.length === 2) {
        if(sharedObj[toks[0]] !== undefined) {
          sharedObj = sharedObj[toks[0]] = sharedObj[toks[0]] || {};
        } else {
          obj = obj[toks[0]] = obj[toks[0]] || {};
        }

        name = toks[1];
      }

      // both the shared and app experiments must be in sync, otherwise, if an experiment
      // is in both lists you'll never be able to change it from listEx() or setEx()
      if(sharedObj[name] !== undefined) {//shared experiment
        sharedObj[name] = value;
        if(sharedExs.dirtyFeatures && sharedExs.dirtyFeatures.join(' ').indexOf(toks[0]) === -1) { //add feature name to dirtyFeature array if it's not already there
          sharedExs.dirtyFeatures.push(toks[0]);
        }
      }

      // unit tests do not populate the experiment object so we need to allow them to
      // dynamically set any experiment name. This prevents dynamically setting an
      // experiment in the app list if it already exists in the shared list
      if(obj[name] !== undefined || sharedObj[name] === undefined) {//app experiment
        obj[name] = value;
        if(localExs.dirtyFeatures && localExs.dirtyFeatures.join(' ').indexOf(toks[0]) === -1) { //add feature name to dirtyFeature array if it's not already there
          localExs.dirtyFeatures.push(toks[0]);
        }
      }

      setExperimentsCookie();
    },

    listEx: function() {
      expDiv = document.createElement("div");
        expDiv.id = "fs-experiment-list";
        expDiv.innerHTML = "<header><h4>FS Experiments <span>&#x25BC;</span></h4></header>";


      /* CLOSE div */
      var closeDiv = document.createElement("a");
        closeDiv.href = "javascript: void(0);";
        closeDiv.setAttribute("class", "tools close-experiments");
        closeDiv.innerHTML = "x";
        closeDiv.onclick = function() {
          document.querySelector("body").removeChild(document.querySelector("#fs-experiment-list"));
        }

      expDiv.appendChild(closeDiv);


      /* RESET div */
      var resetDiv = document.createElement("a");
        resetDiv.href = "javascript: void(0);";
        resetDiv.setAttribute("class", "tools");
        resetDiv.innerHTML = "Reset";
        resetDiv.onclick = function() {
          clearExperimentsCookie();
          window.location.reload();
        };

      expDiv.appendChild(resetDiv);


      /* SORT div */
      var sort_alphabetically = FS.Cookie.getCookie(EXPERIMENTS_COOKIE_NAME_APLPHA_SORT) != undefined;

      if (sort_alphabetically) {
        var unsetSort = document.createElement("a");
          unsetSort.href = "javascript: void(0);";
          unsetSort.setAttribute("class", "tools");
          unsetSort.setAttribute("style", "color:grey;");
          unsetSort.innerHTML = "A-z";
          unsetSort.onclick = function() {
            unsetAlphabeticalSort();
          };

        expDiv.appendChild(unsetSort);

      } else {
        var alphaSort = document.createElement("a");
          alphaSort.href = "javascript: void(0);";
          alphaSort.setAttribute("class", "tools");
          alphaSort.innerHTML = "A-z";
          alphaSort.onclick = function() {
            setAlphabeticalSort();
          };

        expDiv.appendChild(alphaSort);
      }


      /* Pin Experiments */
      var pinDiv = document.createElement("a");
        pinDiv.href = "javascript: void(0);";
        pinDiv.id = "pin-experiments";
        pinDiv.onclick = function() {
          if (FS.sessionStorage.get("fs-experiments-sticky")) {
            FS.sessionStorage.remove("fs-experiments-sticky");
            document.querySelector("#pin-experiments").style.backgroundColor = "#584686";
          } else {
            FS.sessionStorage.set("fs-experiments-sticky", { state: "show"});
            document.querySelector("#pin-experiments").style.backgroundColor = "#FF7600";
          }
        }

      expDiv.appendChild(pinDiv);


      /* Search Box */
      var searchBox = document.createElement("input");
        searchBox.id = "searchBox";
        searchBox.placeholder = "search";
        searchBox.style.display = "block"; //so we can hide it later

        searchBox.onkeyup = function() {
          var search_results = [];
          var search_filter = document.querySelector("#searchBox").value.toLowerCase();

          listOfExpNames.map(function(e) {
            if (e.toLowerCase().indexOf(search_filter) !== -1) {
              search_results.push(e);
            }
          })

          /* First hide everything */
          if (search_filter.length > 0) {
            var all = document.querySelectorAll(".hide_search");

            for (var i=0,j=all.length; i<j; i++) {
              all[i].style.display = "none";
            }
          }

          /* Show experiments found */
          search_results.map(function(e) {
            document.querySelector("#" + e).style.display = "block";
          });
        }

      expDiv.appendChild(searchBox);


      /* Experiment section */
      expSection = document.createElement("section");
      expSection.style.display = "block";

      if (sharedExs) {
        createExperimentGroup(sharedExs, "Shared");
      }

      if (localExs) {
        createExperimentGroup(localExs, appName.charAt(0).toUpperCase() + appName.slice(1)); //TODO: Add sanitation
      }

      // Prevent the experiments list from scrolling the document
      FS.Helpers.preventParentScroll(expDiv);

      // Append experiment div to body
      expDiv.appendChild(expSection);

      document.body.insertBefore(expDiv, document.body.childNodes[0]);




      /* CUSTOMIZE Experiment list based on session storage */
      if (FS.sessionStorage.get("fs-experiments-sticky")) {
        document.querySelector("#pin-experiments").style.backgroundColor = "#FF7600";

        if (FS.sessionStorage.get("fs-experiments-sticky").state === "hide") {
          document.querySelector("#fs-experiment-list section").style.display = "none";
          document.querySelector("#fs-experiment-list #searchBox").style.display = "none";
        }
      }

      // toggle experiment list
      document.querySelector("#fs-experiment-list header").onclick = function() {
        var section = document.querySelector("#fs-experiment-list section");
        var searchBox = document.querySelector("#fs-experiment-list #searchBox");

        if (section.style.display === "block") {
          FS.sessionStorage.set("fs-experiments-sticky", { state: "hide"});
          section.style.display = "none";
          searchBox.style.display = "none";
        } else {
          FS.sessionStorage.set("fs-experiments-sticky", { state: "show"});
          section.style.display = "block";
          searchBox.style.display = "block";
        }
      };

      if (FS.sessionStorage.get("fs-experiments-tab")) {
        document.querySelector("#css-tab-shared").click();
      } else {
        document.querySelector("#css-tab-app").click();
      }

      function createExperimentGroup(groupExps, appName) {
        var span = document.createElement("span");
          span.id = (appName === "Shared") ? "css-tab-shared" : "css-tab-app";
          span.innerHTML = appName;

        expSection.insertBefore(span, expSection.firstChild);
        // expSection.appendChild(span)

        var groupContainer = document.createElement("ul");
        groupContainer.id = (appName === "Shared") ? span.id + "-content" : span.id + "-content";
        groupContainer.style.display = "block";
        expSection.appendChild(groupContainer);

        span.onclick = function() {
          toggleLists(groupContainer.id);
        };

        addLines(groupContainer, groupExps);
      }

    },

    showEx: function (name, defaultValue) {
      if (!initialized) FS.initEx();
      if (name === null || name.length === 0) {
        return true;
      }

      if (defaultValue === undefined) {
        defaultValue = false;
      }

      var obj = (localExs.features || (localExs.features = {})),
          sharedObj = (sharedExs.features || (sharedExs.features = {})),
          toks = name.split('#'),
          appResult = false,
          sharedResult = false;

      if(toks.length === 2) {
        if(sharedObj[toks[0]] !== undefined) {
          sharedObj = sharedObj[toks[0]] = sharedObj[toks[0]] || {};
        } else {
          obj = obj[toks[0]] = obj[toks[0]] || {};
        }
        name = toks[1];
      }

      if ((obj[name] === undefined) && (sharedObj[name] === undefined)) {
        return defaultValue;
      }

      appResult = obj[name] ? true : false;//TODO: This will need to change to return variant names
      sharedResult = sharedObj[name] ? true : false;//TODO: This will need to change to return variant names

      if(appResult) {
        return appResult;
      } else {
        return sharedResult;
      }
    }
  });

  var arrows = {
    down: "&#x25BC;",
    left: "&#x25C0;"
  };

  function toggleLists(name) {
    document.querySelector("#" + name).style.display = "block";
    if (name === "css-tab-shared-content") {
      FS.sessionStorage.set("fs-experiments-tab", "shared");
      document.querySelector("#css-tab-app-content").style.display = "none";
      document.querySelector("#css-tab-shared").setAttribute("class", "selected");
      document.querySelector("#css-tab-app").setAttribute("class", "");
    } else {
      FS.sessionStorage.remove("fs-experiments-tab");
      document.querySelector("#css-tab-shared-content").style.display = "none";
      document.querySelector("#css-tab-app").setAttribute("class", "selected");
      document.querySelector("#css-tab-shared").setAttribute("class", "");
    }
  }

  //Initialization Code
  document.addEventListener("DOMContentLoaded", function() {
    var exsFromGlobalNamespace = typeof experiments == "object" ? experiments : {}; //base experiment list off of global 'experiments' variable, if it exists

    //Although exsFromGlobalNamespace is passed into FS.initEx, it is never used.
    if (!initialized) FS.initEx(exsFromGlobalNamespace);

    // if expDiv is not null, experiments have already been initialized
    if(FS && FS.qs && FS.qs.listEx && expDiv === null || FS.sessionStorage.get("fs-experiments-sticky")) {
      FS.listEx();
    }
  });
})(window.experiments, window.FS);

