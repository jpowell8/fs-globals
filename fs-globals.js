(function (window, document, undefined) {
  if (typeof window.FS === 'undefined') {
    /* Global init for FS object if it doesn't exist*/
    window.FS = {
      JSON: {
        parse: function (json, error) {
          var config
            , error = error || "Unspecified error";

          try {
            config = JSON.parse(json);
          } catch (e) {
            console.info("Unable to parse JSON: " + error, json);
            console.error(e);
            config = {};
          }
          return config;
        }
      },

      htmlEncode: function (text, includeFormatting) {
        var retVal = "";
        if (text) {
          retVal = text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;").replace(/\xA0/g, "&nbsp;");
          if (includeFormatting) {
            retVal = retVal.replace(/\r{0,1}\n/g, "<br/>");
            if (includeFormatting === "all") {
              retVal = retVal.replace(/\t/g, "<span style=\"display:inline-block;width:3em;\"/>");
            }
          }
        }
        return retVal;
      },

      htmlDecode: function (html, includeFormatting) {
        var retVal = "";

        if (html) {
          if (includeFormatting) {
            FS._htmlDecodeDiv.innerHTML = html.replace(/\t|\r{0,1}\n/g, "").replace(/<br\s*\/{0,1}>/gi, "\n").replace(/<span style="display\:inline\-block\;width\:3em\;"\/>/g, "\t");
          }
          else {
            FS._htmlDecodeDiv.innerHTML = html.replace(/\t/g, "").replace(/<br\s*\/{0,1}>/gi, "\n");
          }
          retVal = FS._htmlDecodeDiv.textContent;
          FS._htmlDecodeDiv.innerHTML = ""; // Clear it out so we don't leave unused data hanging around
        }

        return retVal;
      },

      Helpers: {
        convertStringToBool: function (str) {
          var bool = false;
          if (typeof str === 'string' || str === true) {
            bool = /^true$/i.test(str);
          }
          return bool;
        },

        /* Returns a function, that, as long as it continues to be invoked, will not
         * be triggered. The function will be called after it stops being called for
         * N milliseconds. If `immediate` is passed, trigger the function on the
         * leading edge, instead of the trailing.
         * Copied from Underscore.js under the following license: https://github.com/jashkenas/underscore/blob/master/LICENSE
        */
        debounce: function (func, wait, immediate) {
          var timeout;
          return function () {
            var context = this, args = arguments;
            var later = function () {
              timeout = null;
              if (!immediate) func.apply(context, args);
            };
            var callNow = immediate && !timeout;
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
            if (callNow) func.apply(context, args);
          };
        },


        /**
         * Prevents a child element from scrolling a parent element (aka document).
         * Taken from CodePen.io
         * @see {@link http://codepen.io/Merri/pen/nhijD/}
         * @param {Element} element - Scrolling element.
         */
        preventParentScroll: function (element) {
          var html = document.getElementsByTagName('html')[0],
            htmlTop = 0,
            htmlBlockScroll = 0,
            minDeltaY,
            // this is where you put all your logic
            wheelHandler = function (e) {
              // do not prevent scrolling if element can't scroll
              if (element.scrollHeight <= element.clientHeight) return;

              // normalize Y delta
              if (minDeltaY > Math.abs(e.deltaY) || !minDeltaY) {
                minDeltaY = Math.abs(e.deltaY);
              }

              // prevent other wheel events and bubbling in general
              if (e.stopPropagation) {
                e.stopPropagation();
              } else {
                e.cancelBubble = true;
              }

              // if the height of the element is not a whole integer, we need to check for
              // rounding errors
              var rect = element.getBoundingClientRect()
              var scrollHeight = element.scrollHeight + (parseInt(rect.height) - rect.height)

              // most often you want to prevent default scrolling behavior (full page scroll!)
              if ((e.deltaY < 0 && element.scrollTop === 0) ||
                (e.deltaY > 0 && ((scrollHeight | 0) === element.scrollTop + element.clientHeight || element.scrollHeight === element.scrollTop + element.clientHeight))) {
                if (e.preventDefault) {
                  e.preventDefault();
                } else {
                  e.returnValue = false;
                }
              } else {
                // safeguard against fast scroll in IE and mac
                if (!htmlBlockScroll) {
                  htmlTop = html.scrollTop;
                }
                htmlBlockScroll++;
                // even IE11 updates scrollTop after the wheel event :/
                setTimeout(function () {
                  htmlBlockScroll--;
                  if (!htmlBlockScroll && html.scrollTop !== htmlTop) {
                    html.scrollTop = htmlTop;
                  }
                }, 0);
              }
            },
            // here we do only compatibility stuff
            mousewheelCompatibility = function (e) {
              // no need to convert more than this, we normalize the value anyway
              e.deltaY = -e.wheelDelta;
              // and then call our main handler
              wheelHandler(e);
            };

          // do not add twice!
          if (element.removeWheelListener) return;

          if (element.addEventListener) {
            element.addEventListener('wheel', wheelHandler, false);
            element.addEventListener('mousewheel', mousewheelCompatibility, false);
            // expose a remove method
            element.removeWheelListener = function () {
              element.removeEventListener('wheel', wheelHandler, false);
              element.removeEventListener('mousewheel', mousewheelCompatibility, false);
              element.removeWheelListener = undefined;
            };
          }
        }
      }
    };
  }

  /**
   * Sets locale from the meta tag where snow normally sets it. If not set gives en.
   */
  FS.locale = FS.locale || (function () {
    var localeMeta = document.querySelector('meta[name=allLocales]');
    return localeMeta ? localeMeta.content.split(',') : ['en'];
  })()

  FS.simpleLocale = FS.simpleLocale || function () {
    return FS.locale[0];
  }

  FS.dialog = FS.dialog || {}

  /**
   * This function will register global elements and attach a reference to them to FS.dialog
   * @param {string} elementName - The name of the element to register e.g. fs-person-card
   * @returns {undefined} - Returns void.
   */
  var buffer = [];
  var bufferElements = true;
  FS.dialog.register = FS.dialog.register || function(elementName) {
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
    })
  };

  document.addEventListener("DOMContentLoaded", function(event) {
    bufferElements = false
    buffer.forEach(registerElement)
  });

  /**
   * This is a small fetch wrapper that respects the headers, status redirects and a flag from fetch defaults.
   * @property {object} headers Key value pairs of headers to apply by default.
   * @property {object} statusCallbacks Key value pairs of the form key=status code, value = callback
   */
  FS.fetchDefaults = FS.fetchDefaults || {
    headers: {
      "Content-Type": 'application/json',
      "accept-language": FS.locale
    },
    credentials: "same-origin",
    statusCallbacks: {
      401: function () {
        window.location.reload();
        return;
      }
    }
  }
  /**
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
  }
})(window, document);
