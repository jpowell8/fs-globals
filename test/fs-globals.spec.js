describe('fs-globals', function() {
  var el;

  function setTranslations() {
    FS.taasContent = {
      en: {
        foo: 'bar',
        lorium: 'ipsum',
        nested: {
          foo: 'barium'
        }
      },
      es: {
        foo: 'bár',
        nested: {}
      },
      de: {
        foo: 'bär'
      },
      "en-us": {
        foo: 'baar'
      }
    };
  }





  describe('i18n', function() {

    it('should return they key in brackets if translations are not set', function() {
      expect(FS.i18n('foo')).to.equal('[foo]');
    });

    it('should return the translations for the default lang (en)', function() {
      setTranslations();

      expect(FS.i18n('foo')).to.equal('bar');
    });

    it('should return the translations for FS.simpleLocale', function() {
      FS.simpleLocale = 'de';

      expect(FS.i18n('foo')).to.equal('bär');
    });

    it('should find nested keys', function() {
      FS.simpleLocale = 'en';

      expect(FS.i18n('nested.foo')).to.equal('barium');
    });

    it('should accept sublocales', function() {
      FS.simpleLocale = 'en-us';

      expect(FS.i18n('foo')).to.equal('baar');
    });

    it('should return translations for the first supported lang when the lang uses sublocales', function() {
      FS.simpleLocale = 'en-us-foo-bar';

      expect(FS.i18n('foo')).to.equal('baar');

      FS.simpleLocale = 'en-gb-nk1-ab2';

      expect(FS.i18n('foo')).to.equal('bar');
    });

    it('should return translations for the default lang (en) when the lang isn\'t supported', function() {
      FS.simpleLocale = 'zh';

      expect(FS.i18n('foo')).to.equal('bar');
    });

    it('should return translations for the default lang (en) when the lang doesn\'t contain the desired key', function() {
      FS.simpleLocale = 'es';

      expect(FS.i18n('lorium')).to.equal('ipsum');
    });

    it('should return translations for the default lang (en) for the nested key when the lang doesn\'t contain the desired key', function() {
      FS.simpleLocale = 'es';

      expect(FS.i18n('nested.foo')).to.equal('barium');
    });

    it('should return the key in brackets if the default lang (en) doesn\'t contain the desired key', function() {

      expect(FS.i18n('undefined')).to.equal('[undefined]');
    });

    it('should return the key in brackets if the lang is zz', function() {
      FS.simpleLocale = 'zz';

      expect(FS.i18n('foo')).to.equal('[foo]');
    });

    it('should return the last part of the ky in brackets if the lang is ke', function() {
      FS.simpleLocale = 'ke';

      expect(FS.i18n('foo.bar.baz')).to.equal('[baz]');
    });

    it('should use FS.locale if it\s set', function() {
      FS.simpleLocale = 'en';
      FS.locale = ['de', 'en'];

      expect(FS.i18n('foo')).to.equal('bär');
    });
  });





  describe('_registerTranslations', function() {

    beforeEach(function() {
      FS.taasContent = null;
    });

    it('should deep merge the flattened translations onto FS.taasContent', function() {
      FS._registerTranslations({
        en: {
          'shared.thing.FOO': 'bar',
          'shared.thing.LORIUM': 'ipsum'
        }
      });

      expect(FS.taasContent).to.eql({
        en: {
          shared: {
            thing: {
              FOO: 'bar',
              LORIUM: 'ipsum'
            }
          }
        }
      });
    });

    it('should not override what already exists in FS.taasContent', function() {
      FS.taasContent = {
        en: {
          shared: {
            thing: {
              FOO: 'bar'
            }
          }
        }
      };

      FS._registerTranslations({
        en: {
          'shared.thing.FOO': 'barium',
          'shared.thing.LORIUM': 'ipsum'
        }
      });

      expect(FS.taasContent).to.eql({
        en: {
          shared: {
            thing: {
              FOO: 'bar',
              LORIUM: 'ipsum'
            }
          }
        }
      });
    });
  });





  describe('htmlEncode', function() {

    it('should encode the html entities &<>\'"\\xA0', function() {
      var str = FS.htmlEncode('&<>\'"\xA0');
      expect(str).to.equal('&amp;&lt;&gt;&#39;&quot;&nbsp;');
    });

    it('should return an empty string if nothing was passed in', function() {
      expect(FS.htmlEncode()).to.equal('');
    });

  });





  describe('htmlDecode', function() {

    it('should not allow xss attacks', function(done) {
      var str = `"<img src='dummy' onerror='window.badFn()'>`;

      // this should not be reached otherwise we are vulnerable to xss
      window.badFn = function() {
        done(new Error('vulnerable to XSS!'));
      }

      // if after 500ms nothing happened (enough time for the network call
      // to return 404), the test passes
      setTimeout(done, 500);

      // typically decoding is done through using `innerHTML` of an element.
      // however this is an XSS vulnerability. uncomment the code below and
      // comment out the `FS.person = person` to see this in action:
      //
      // var div = document.createElement('div');
      // div.innerHTML = str;

      FS.htmlDecode(str);
    });

    it('should return an empty string if nothing was passed in', function() {
      expect(FS.htmlDecode()).to.equal('');
    });

  });

});