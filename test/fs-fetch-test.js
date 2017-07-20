var expect = chai.expect;
//Polyfill Object.assign for PhantomJs
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

describe("fs object is inserted on the page", function () {
  it ("should have FS", function () {
    expect(window.FS).to.exist;
  });
});

describe("FS.fetch() ", function () {
  describe("Fetch defaults" , function () {
    it( "should populate FS.fetchDefaults with JSON object", function () {
      expect(FS.fetchDefaults).to.be.an.instanceof(Object); 
    });
  });
  describe("FS.fetch calls ", function () {
    it("should call with default headers if none are passed", function (done) {
      this.timeout(5000);
      fetchMock.mock('http://mytest.com', {
        response:200,
        body: {
          test: "This is the body"
        }
      });
      FS.fetch('http://mytest.com').then(function (res) {
        console.log(res);
        done()
      }).catch(function (err) {
          console.log("error thrown");
          console.log(err.message);
        done();
      });
    });
    it("should respect headers from fetchInit", function () {});
    it("should overwrite default headers with those in fetchInit", function () {});
    it("should respect default callbacks on status", function () {});
    it("should respect options.callbacks on status", function () {});
    it("should overwrite default with options callbacks on status", function () {});
    it("should handle bodies that dont exist", function () {});
    it("should through on 400+ when doNotRejectOnBadRequest flag is not passed", function () {});
    it("should not through on 400+ when doNotRejectOnBadRequest flag is passed", function () {});
    it("should convert to json when no doNotConvertToJson is passed", function () {});
    it("should not convert to json when no doNotConvertToJson is passed as true", function () {});
  });
});
