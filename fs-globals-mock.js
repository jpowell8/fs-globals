window.FS = window.FS || {};
FS.User = FS.User || {};
FS.User.sessionId = FS.User.sessionId || 'sessionId';
FS.Analytics = { trackData:function() {}, trackLink: function() {}, trackPageView: function() {},
  trackValue: function(){}, updatePageViewData: function() {} };

// WARNING: This file is intended to only be run within tests and requires sinonjs
// Besides ensuring that window.fetch is never actually called during a test, this method
// can be spied on or matched for specific parameters. (i.e. FS.fetchStub.withArgs(...).returns(...) )
FS.fetchStub = FS.fetchStub || sinon.stub(window,"fetch");
