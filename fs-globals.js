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
      document.body.append(element);
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

            FS[storageName]['get' + api.name] = function(key){
              return getFromStorage(storageName, api.keyMaker, key);
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

    function getFromStorage(storageName, keyMaker, key){
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
