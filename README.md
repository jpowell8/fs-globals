# fs-globals

Functions and properties used globally across the FamilySearch site, available to web components.

## Installation

$ bower install --save fs-webdev/fs-globals

## Usage

You can either load `fs-globals.js` as a script tag on the page or through an HTML import using `fs-globals.html`.

## Properties

* `fetchDefaults` - Default headers and status callbacks as well as a flag for throwing errors on 400+ statuses.

## Functions

* `simpleLocale` - The current language of the page.
* `i18n` - Get the current languages translations.
* `htmlEncode` - Encode html entities.
* `htmlDecode` - Safely decode html entities.
* `fetch` - Fetch wrapper that uses `FS.fetchDefaults`.

### i18n

Get the current languages translations using `FS.taasContent`. This function is a simple stub for TaaS and should only be used by native web components. Polymer elements should continue to use [wc-i18n](https://github.com/jshcrowthe/wc-i18n).

```js
FS.taasContent = {
  en: {
    hello: 'world'
    // other keys and their translations
  },
  es: {
    hello: 'mundo'
    // ...
  }
  // other locales and their translations
};

FS.i18n('hello');  // => 'world'
```

The current language will be taken from the `lang` attribute of the `<html>` element, otherwise it will default to `en`.

If the current language does not exist in the `FS.taasContent` object, the language will default to `en`. If the requested key does not exist in the current language's translations, it will use the value from `en`. Lastly, if the current language uses sublocales (e.g. `en-gb`) and there are no translations for the full locale, it will remove sublocales until a language exists in the `FS.taasContent` object (e.g. `en-gb` will use `en`).

### htmlEncode

Encode html entities.

```js
FS.htmlEncode('<div>Hello world</div>');  // => '&lt;div&gt;hello world&lt;/div&gt;'
FS.htmlEncode('<a herf="javascript:void(0)">click</a>'); // => '&lt;a&nbsp;herf=&quot;javascript:void(0)&quot;&gt;click&lt;/a&gt;'
```

## htmlDecode

Safely decode html entities.

```js
FS.htmlEncode('&lt;div&gt;hello world&lt;/div&gt;');  // => '<div>Hello world</div>'
FS.htmlEncode('&lt;a&nbsp;herf=&quot;javascript:void(0)&quot;&gt;click&lt;/a&gt;'); // => '<a herf="javascript:void(0)">click</a>'
```

## fetch

Fetch wrapper that applies `FS.fetchDefaults`. This wrapper rejects on bad status, resolves with the body on success, and provides global headers and applies callbacks to given statuses. All behaviors have per request overrides. 

```js
  //structure of fetchDefaults:
  FS.fetchDefaults = {
    headers :  // Key value pairs or header object to set global headers
      //Defaults if unchanged:
      {
        "Accept": "application/json",
        "Accept-Lang": FS.simpleLocale(),
        "Authentication": //set per FS.User.sessionId
      }
    statusCallbacks: //Key value pairs of the form number:callback. Number is the status to pass the callback on. Callbacks are applied to fetch responses body (unless you pass a flag).
    //Defaults if unchanged
    {
      401: function () {
        window.location.reload()
      }
    }
  }

  //FS fetch API
  FS.fetch(url, fetchInit, options);
  url = 'http://familysearch.org' //A string with the url. Follows as per the fetch API.
  fetchInit =  { //The init object as per the fetch API.
    method: "post",
    headers: new Headers({'custom-header': "custom stuff"}),
    cache:  "default"
  }
  options = { //Options to override fetch defaults behavior. 
    statusCallbacks: {
      401: function (res) { //Overrides fetchDefaults 401 if set.
        return res; 
      },
      503: function (res) {
        //do something on 503's
      }
    },
    //There are no global overrides for these since that would make component fetch calls have to handle complex responses.
    doNotThrowOnBadStatus: true, //Sets flag to get default fetch reject resolve behavior.
    doNotConvertToJson: true //Sets flag to make response the full res object as a stream like native fetch.
  }
```
For information on the fetch API see:
* [https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API/Using_Fetch](https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API/Using_Fetch)