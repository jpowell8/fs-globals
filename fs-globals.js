/**
 * Create the FS object and all properties and functions needed by web components.
 * Since this script can be run by HF as well as individual web components, every
 * property and function MUST check that it exists before adding it.
 */
window.FS = (function(FS, document) {
  FS.simpleLocale = FS.simpleLocale || document.documentElement.getAttribute('lang');

  FS.fetchDefaults = FS.fetchDefaults || {
    headers: {
      "Content-Type": 'application/json',
      "accept-language": FS.simpleLocale
    },
    credentials: "same-origin",
    statusCallbacks: {
      401: function () {
        window.location.reload();
        return;
      }
    }
  };

  /**
   * Get the current language translation. This function is a simple stub for TaaS
   * that should only be used by native web components.
   * @param {string} key
   */
  FS.i18n = FS.i18n || function(key) {
    if (!this.taasContent) return '[' + key + ']';

    var locale = this.simpleLocale || 'en';

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
    }

    function registerElement(elementName) {
      var camelCaseName = elementName.replace(/-([a-z])/g, function (g) { return g[1].toUpperCase(); });
      if (FS.dialog[camelCaseName]) {
        console.error('Attempted to create element', elementName, 'which already exists');
        return;
      }
      var element = document.createElement(elementName);
      document.body.append(element)
      Object.defineProperty(FS.dialog, camelCaseName, {
        get: function() {
          return element;
        }
      });
    };

    document.addEventListener("DOMContentLoaded", function(event) {
      bufferElements = false
      buffer.forEach(registerElement)
    });
  }

  /**
   * This is a small fetch wrapper that respects the headers, status redirects and a flag from fetch defaults.
   * @property {object} headers Key value pairs of headers to apply by default.
   * @property {object} statusCallbacks Key value pairs of the form key=status code, value = callback
   * @param {string} url                  The path to the resource you are fetching
   * @param {JSON object} fetchInit       The init object from fetch api. This is where you can do 1 time overwrites of headers as well.
   * @param {JSON object} fsFetchOptions       This is where one time status options that can be applied with the same form as fetch defaults.
   *
   * fsFetchOptionsEx = {
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

    if (!fetchInit) {
      fetchInit = {
        method: "get",
        cache: "default"
      };
    }

    fetchInit.credentials = FS.fetchDefaults.credentials || fetchInit.credentials;
    fetchInit.headers = createHeadersWithDefaults()
    var options = Object.assign({}, fetchInit, fsFetchOptions);
    var statusCallbacks = Object.assign({}, FS.fetchDefaults.statusCallbacks, options.statusCallbacks);

    var throwOnBadStatus = !options.doNotThrowOnBadStatus;
    var convertToJson = !options.doNotConvertToJson;

    return fetch(url, fetchInit).then(function (res) {
      if (statusCallbacks[res.status]) {
        if( !res.body && convertToJson ) { //Makes responses with no body mostly 204's not throw on res.json()
          res.body = {};
        }
        return convertToJson ? statusCallbacks[res.status](res.json()) : statusCallbacks[res.status](res);
      }
      if (!res.ok && throwOnBadStatus) {
        var error = new Error('fetch call failed with status ' + res.status);
        error.response = res;
        throw error;
      }
      if( !res.body && convertToJson ) { //Makes responses with no body mostly 204's not throw on res.json()
        res.body = {};
      }
      return convertToJson ? res.json() : res;
    });

    function createHeadersWithDefaults() {
      var headers = fetchInit.headers || new Headers();
      if (!headers.has) {
        // this is not a headers object, it's just an object - this is not what the spec says to do
        headers = Object.assign({}, FS.fetchDefaults.headers, fetchInit.headers);
      } else {
        // this is a headers object, so we'll append any headers we don't have
        Object.keys(FS.fetchDefaults.headers).forEach(function(key){
          if (!headers.has(key)) {
            headers.append(key, FS.fetchDefaults.headers[key])
          }
        })

      }
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

  return FS;
})(window.FS || {}, document);
