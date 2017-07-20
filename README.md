# fs-globals

Functions and properties used globally across the FamilySearch site, available to web components.

## Installation

$ bower install --save fs-webdev/fs-globals

## Usage

You can either load `fs-globals.js` as a script tag on the page or through an HTML import using `fs-globals.html`.

## Properties

* `simpleLocale` - The current language of the page.
* `fetchDefaults` - Default headers and status callbacks as well as a flag for throwing errors on 400+ statuses.

## Functions

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

Fetch wrapper that uses `FS.fetchDefaults`.