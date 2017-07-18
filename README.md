# fs-globals
## A simple FS stub for your web components
An fs object for use in web components.
## Usage:
From the command line.
```
bower install https://github.com/fs-webdev/fs-globals.git --save
```
In your component.
```javascript
<link rel='import' src='../fs-globals'>
```
## Supported FS functions:
```javascript
  FS.simpleLocale() //Appropriate language in query param, cookie, accept language header or EN.
  FS.locale //Array of languages based on query param, cookie, accept language header or EN.
  FS.fetchDefaults //JSON Object of default headers and status callbacks as well as a flag for throwing errors on 400+ statuses.
  FS.fetch(url, fetchInit, statusCallbackOverrides) //FS fetch wrapper that applies headers and status callbacks from FS.fetchDefaults.
```
This object will grow to encompass the full FS object.
