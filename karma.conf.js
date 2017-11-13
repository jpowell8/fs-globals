module.exports = function(config) {
  config.set({
    basePath: '',
    
    singleRun: false,
    autoWatch: false,
    frameworks: ['mocha', 'chai'],
    files: [
      'fs-globals.js',
      'test/fs-globals.spec.js',
      {pattern: 'node_modules/es6-promise/dist/es6-promise.auto.min.js', included: true },
      {pattern: 'node_modules/whatwg-fetch/fetch.js', included: true },
      {pattern: 'node_modules/fetch-mock/es5/client-browserified.js', included: true },
      {pattern: 'bower_components/**/*.js', included: false},
      {pattern: 'fs-globals.js', included: true },
      {pattern: 'test/**.js', included: true }
    ],
    browsers: ['Chrome','PhantomJS'],
    reporters: ['progress', 'coverage'],
    preprocessors: {
      'fs-globals.js': ['coverage']
    },
    coverageReporter: {
      dir : 'coverage/',
      reporters: [
        {type: 'lcov', subdir: '.'},
        {type: 'text-summary'}
      ]
    }
  });
};
