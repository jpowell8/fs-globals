module.exports = function(config) {
  config.set({
    basePath: '',
    singleRun: false,
    autoWatch: false,
    frameworks: ['mocha', 'chai'],
    files: [
      'fs-globals.js',
      'test/fs-globals.spec.js'
    ],
    browsers: ['Chrome'],
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
