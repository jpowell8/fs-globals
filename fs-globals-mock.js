window.FS = window.FS || {};
FS.User = FS.User || {};
FS.User.sessionId = FS.User.sessionId || 'sessionId';
FS.Analytics = { trackData:function() {}, trackLink: function() {}, trackPageView: function() {},
  trackValue: function(){}, updatePageViewData: function() {} };

// WARNING: This file is intended to only be run within tests and requires sinonjs
// Besides ensuring that window.fetch is never actually called during a test, this method
// can be spied on or matched for specific parameters. (i.e. FS.fetchStub.withArgs(...).returns(...) )
if (window && window.fetch) {
  FS.fetchStub = FS.fetchStub || sinon.stub(window, "fetch");
}
FS.showEx = function (experiment) {
  return false;
};
FS.fetch = function (url, fetchInit, fsFetchOptions) {
  console.warn("FS.fetch called without being mocked !!!" + " url:" + url );

  // return a promise that never resolves
  return new Promise(function (){});
};
