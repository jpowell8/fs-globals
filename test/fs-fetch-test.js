var expect = chai.expect;
var nativeFetch = window.fetch;
var fetchResponse = {

};

window.fetch = function (url, fetchInit, options) {
  return Promise.resolve(fetchResponse);
};

//Polyfill Object.assign for PhantomJs
if (typeof Object.assign != 'function') {
  Object.assign = function (target, varArgs) { // .length of function is 2
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

//mock some endpoints for tests
fetchMock.mock('http://test.familysearch.com', {
  body: { a: 'b' }
});
fetchMock.mock('http://test.familysearch.com/222', {
  status: 222,
  body: { b: 'c' }
});
fetchMock.mock('http://test.familysearch.com/223', {
  status: 223,
  body: { c: 'd' }
});
fetchMock.mock('http://test.familysearch.com/204', {
  status: 204
});
fetchMock.mock('http://test.familysearch.com/403', {
  status: 403
});


describe("fs object is inserted on the page", function () {
  it("should have FS", function () {
    expect(window.FS).to.exist;
  });
});

describe("FS.fetch() ", function () {
  describe("Fetch defaults", function () {
    it("should populate FS.fetchDefaults with JSON object", function () {
      expect(FS.fetchDefaults).to.be.an.instanceof(Object);
      expect(true).to.be(false);
    });
  });
  describe("FS.fetch calls ", function () {

    it("should call with default headers if none are passed", function (done) {
      FS.fetch('http://test.familysearch.com').then(function (res) {
        expect(res).to.eql({ a: 'b' });
        expect(fetchMock.lastCall()[1].headers.get('Accept-Language')).to.eql("en");
        expect(fetchMock.lastCall()[1].headers.get('accept')).to.eql("application/json");
      }).then(done, done);
    });

    it("should respect headers from fetchInit", function (done) {
      FS.fetch('http://test.familysearch.com', {
        headers: {
          "test": "test"
        }
      }).then(function (res) {
        expect(fetchMock.lastCall()[1].headers.get('test')).to.eql("test");
      }).then(done, done);
    });

    it("fetchInit should win over defaults", function (done) {
      FS.fetch('http://test.familysearch.com', {
        headers: {
          "accept": "test"
        }
      }).then(function (res) {
        expect(fetchMock.lastCall()[1].headers.has('Accept')).to.be.true;
        expect(fetchMock.lastCall()[1].headers.get('Accept')).to.eql("test");
      }).then(done, done);
    });

    it("should respect default callbacks on status", function (done) {
      FS.fetchDefaults.statusCallbacks[222] = function (res) {
        return "default"
      };
      FS.fetch('http://test.familysearch.com/222').then(function (res) {
        expect(res).to.eql("default");
      }).then(done, done);
    });

    it("should respect options.callbacks on status", function (done) {
      FS.fetch('http://test.familysearch.com/223',
        {},
        {
          statusCallbacks: {
            223: function (res) { return "init" }
          }
        }).then(function (res) {
          expect(res).to.eql("init");
        }).then(done, done);
    });

    it("options should win default statusCallbacks", function (done) {
      FS.fetch('http://test.familysearch.com/222',
        {},
        {
          statusCallbacks: {
            222: function (res) { return "init" }
          }
        }).then(function (res) {
          expect(res).to.eql("init");
        }).then(done, done);
    });

    it("should handle bodies that dont exist", function (done) {
      FS.fetch('http://test.familysearch.com/204').then(function (res) {
        expect(res.status).to.eql(204); // If res is .json()'d res.status is undefined
      }).then(done, done);
    });

    it("should through on 400+ when doNotRejectOnBadRequest flag is not passed", function (done) {
      FS.fetch('http://test.familysearch.com/403').catch(function (err) {
        expect(err.message).to.eql('fetch call failed with status 403');
      }).then(done, done);
    });

    it("should not through on 400+ when doNotRejectOnBadRequest flag is passed", function (done) {
      FS.fetch('http://test.familysearch.com/403', {}, {
        doNotThrowOnBadStatus: true
      }).then(function (res) {
        expect(res.status).to.eql(403);
      }).then(done, done);
    });

    it("should not convert to json when no doNotConvertToJson is passed as true", function (done) {
      FS.fetch('http://test.familysearch.com', {}, {
        doNotConvertToJson: true
      }).then(function (res) {
        expect(res.status).to.eql(200);
      }).then(done, done);
    });

    it ("should match default header and correct case", function (done) {
      FS.fetch('http://test.familysearch.com', {
        headers: {
          "coNteNt-tYPe": "test"
        }
      }).then(function (res) {
        expect(fetchMock.lastCall()[1].headers.has("coNteNt-tYPe")).to.be.true;
        expect(fetchMock.lastCall()[1].headers.get("Content-Type")).to.eql("test");
      }).then(done, done);
    });

    it ("should match default header and correct case for type Headers", function (done) {
      var headers = new Headers();
      headers.append("coNteNt-tYPe", "test");

      FS.fetch('http://test.familysearch.com', {
        headers: headers
      }).then(function (res) {
        expect(fetchMock.lastCall()[1].headers.get("coNteNt-tYPe")).to.eql("test");
        expect(fetchMock.lastCall()[1].headers.get("Content-Type")).to.eql("test");
        expect(fetchMock.lastCall()[1].headers.has("Content-Type")).to.be.true;
      }).then(done, done);
    });

    it ("should not set default Content-Type header without body", function (done) {
      FS.fetch('http://test.familysearch.com', {
      }).then(function (res) {
        expect(fetchMock.lastCall()[1].headers["Content-Type"]).to.be.undefined;
      }).then(done, done);
    });

  });
});
