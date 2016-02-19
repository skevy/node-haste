/**
 * Copyright (c) 2015-present, Facebook, Inc.
 * All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree. An additional grant
 * of patent rights can be found in the PATENTS file in the same directory.
 */
'use strict';

var _slicedToArray = function () { function sliceIterator(arr, i) { var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"]) _i["return"](); } finally { if (_d) throw _e; } } return _arr; } return function (arr, i) { if (Array.isArray(arr)) { return arr; } else if (Symbol.iterator in Object(arr)) { return sliceIterator(arr, i); } else { throw new TypeError("Invalid attempt to destructure non-iterable instance"); } }; }();

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

jest.dontMock('absolute-path').dontMock('json-stable-stringify').dontMock('../fastfs').dontMock('../lib/extractRequires').dontMock('../lib/replacePatterns').dontMock('../DependencyGraph/docblock').dontMock('../Module');

jest.mock('fs');

var Fastfs = require('../fastfs');
var Module = require('../Module');
var ModuleCache = require('../ModuleCache');
var DependencyGraphHelpers = require('../DependencyGraph/DependencyGraphHelpers');
var Promise = require('promise');
var fs = require('graceful-fs');

var packageJson = JSON.stringify({
  name: 'arbitrary',
  version: '1.0.0',
  description: "A require('foo') story"
});

function mockFS(rootChildren) {
  fs.__setMockFilesystem({ root: rootChildren });
}

function mockPackageFile() {
  mockFS({ 'package.json': packageJson });
}

function mockIndexFile(indexJs) {
  mockFS({ 'index.js': indexJs });
}

describe('Module', function () {
  var fileWatcher = {
    on: function on() {
      return undefined;
    },
    isWatchman: function isWatchman() {
      return Promise.resolve(false);
    }
  };
  var fileName = '/root/index.js';

  var cache = undefined,
      fastfs = undefined;

  var createCache = function createCache() {
    return {
      get: jest.genMockFn().mockImplementation(function (filepath, field, cb) {
        return cb(filepath);
      }),
      invalidate: jest.genMockFn(),
      end: jest.genMockFn()
    };
  };

  var createModule = function createModule(options) {
    return new Module(_extends({}, options, {
      cache: cache,
      fastfs: fastfs,
      file: options && options.file || fileName,
      depGraphHelpers: new DependencyGraphHelpers(),
      moduleCache: new ModuleCache({ fastfs: fastfs, cache: cache })
    }));
  };

  var createJSONModule = function createJSONModule(options) {
    return createModule(_extends({}, options, { file: '/root/package.json' }));
  };

  beforeEach(function (done) {
    cache = createCache();
    fastfs = new Fastfs('test', ['/root'], fileWatcher, { crawling: Promise.resolve([fileName, '/root/package.json']), ignore: [] });

    fastfs.build().then(done);
  });

  describe('Module ID', function () {
    var moduleId = 'arbitraryModule';
    var source = '/**\n       * @providesModule ' + moduleId + '\n       */\n    ';

    var module = undefined;
    beforeEach(function () {
      module = createModule();
    });

    describe('@providesModule annotations', function () {
      beforeEach(function () {
        mockIndexFile(source);
      });

      pit('extracts the module name from the header', function () {
        return module.getName().then(function (name) {
          return expect(name).toEqual(moduleId);
        });
      });

      pit('identifies the module as haste module', function () {
        return module.isHaste().then(function (isHaste) {
          return expect(isHaste).toBe(true);
        });
      });

      pit('does not transform the file in order to access the name', function () {
        var transformCode = jest.genMockFn().mockReturnValue(Promise.resolve());
        return createModule({ transformCode: transformCode }).getName().then(function () {
          return expect(transformCode).not.toBeCalled();
        });
      });

      pit('does not transform the file in order to access the haste status', function () {
        var transformCode = jest.genMockFn().mockReturnValue(Promise.resolve());
        return createModule({ transformCode: transformCode }).isHaste().then(function () {
          return expect(transformCode).not.toBeCalled();
        });
      });
    });

    describe('@provides annotations', function () {
      beforeEach(function () {
        mockIndexFile(source.replace(/@providesModule/, '@provides'));
      });

      pit('extracts the module name from the header if it has a @provides annotation', function () {
        return module.getName().then(function (name) {
          return expect(name).toEqual(moduleId);
        });
      });

      pit('identifies the module as haste module', function () {
        return module.isHaste().then(function (isHaste) {
          return expect(isHaste).toBe(true);
        });
      });

      pit('does not transform the file in order to access the name', function () {
        var transformCode = jest.genMockFn().mockReturnValue(Promise.resolve());
        return createModule({ transformCode: transformCode }).getName().then(function () {
          return expect(transformCode).not.toBeCalled();
        });
      });

      pit('does not transform the file in order to access the haste status', function () {
        var transformCode = jest.genMockFn().mockReturnValue(Promise.resolve());
        return createModule({ transformCode: transformCode }).isHaste().then(function () {
          return expect(transformCode).not.toBeCalled();
        });
      });
    });

    describe('no annotation', function () {
      beforeEach(function () {
        mockIndexFile('arbitrary(code);');
      });

      pit('uses the file name as module name', function () {
        return module.getName().then(function (name) {
          return expect(name).toEqual(fileName);
        });
      });

      pit('does not identify the module as haste module', function () {
        return module.isHaste().then(function (isHaste) {
          return expect(isHaste).toBe(false);
        });
      });

      pit('does not transform the file in order to access the name', function () {
        var transformCode = jest.genMockFn().mockReturnValue(Promise.resolve());
        return createModule({ transformCode: transformCode }).getName().then(function () {
          return expect(transformCode).not.toBeCalled();
        });
      });

      pit('does not transform the file in order to access the haste status', function () {
        var transformCode = jest.genMockFn().mockReturnValue(Promise.resolve());
        return createModule({ transformCode: transformCode }).isHaste().then(function () {
          return expect(transformCode).not.toBeCalled();
        });
      });
    });
  });

  describe('Code', function () {
    var fileContents = 'arbitrary(code)';
    beforeEach(function () {
      mockIndexFile(fileContents);
    });

    pit('exposes file contents as `code` property on the data exposed by `read()`', function () {
      return createModule().read().then(function (_ref) {
        var code = _ref.code;
        return expect(code).toBe(fileContents);
      });
    });

    pit('exposes file contents via the `getCode()` method', function () {
      return createModule().getCode().then(function (code) {
        return expect(code).toBe(fileContents);
      });
    });
  });

  describe('Extrators', function () {

    pit('uses custom require extractors if specified', function () {
      mockIndexFile('');
      var module = createModule({
        extractor: function extractor(code) {
          return { deps: { sync: ['foo', 'bar'] } };
        }
      });

      return module.getDependencies().then(function (actual) {
        return expect(actual).toEqual(['foo', 'bar']);
      });
    });

    pit('uses a default extractor to extract dependencies', function () {
      mockIndexFile('\n        require(\'dependency-a\');\n        import * as b from "dependency-b";\n        export {something} from \'dependency-c\';\n      ');

      var module = createModule();
      return module.getDependencies().then(function (dependencies) {
        return expect(dependencies.sort()).toEqual(['dependency-a', 'dependency-b', 'dependency-c']);
      });
    });

    pit('does not extract dependencies from files annotated with @extern', function () {
      mockIndexFile('\n        /**\n         * @extern\n         */\n        require(\'dependency-a\');\n        import * as b from "dependency-b";\n        export {something} from \'dependency-c\';\n      ');

      var module = createModule();
      return module.getDependencies().then(function (dependencies) {
        return expect(dependencies).toEqual([]);
      });
    });

    pit('does not extract dependencies from JSON files', function () {
      mockPackageFile();
      var module = createJSONModule();
      return module.getDependencies().then(function (dependencies) {
        return expect(dependencies).toEqual([]);
      });
    });
  });

  describe('Custom Code Transform', function () {
    var transformCode = undefined;
    var fileContents = 'arbitrary(code);';
    var exampleCode = '\n      ' + 'require' + '(\'a\');\n      ' + 'System.import' + '(\'b\');\n      ' + 'require' + '(\'c\');';

    beforeEach(function () {
      transformCode = jest.genMockFn();
      mockIndexFile(fileContents);
      transformCode.mockReturnValue(Promise.resolve({ code: '' }));
    });

    pit('passes the module and file contents to the transform function when reading', function () {
      var module = createModule({ transformCode: transformCode });
      return module.read().then(function () {
        expect(transformCode).toBeCalledWith(module, fileContents, undefined);
      });
    });

    pit('passes any additional options to the transform function when reading', function () {
      var module = createModule({ transformCode: transformCode });
      var transformOptions = { arbitrary: Object() };
      return module.read(transformOptions).then(function () {
        return expect(transformCode.mock.calls[0][2]).toBe(transformOptions);
      });
    });

    pit('passes the module and file contents to the transform if the file is annotated with @extern', function () {
      var module = createModule({ transformCode: transformCode });
      var fileContents = '\n        /**\n         * @extern\n         */\n      ';
      mockIndexFile(fileContents);
      return module.read().then(function () {
        expect(transformCode).toBeCalledWith(module, fileContents, { extern: true });
      });
    });

    pit('passes the module and file contents to the transform for JSON files', function () {
      mockPackageFile();
      var module = createJSONModule({ transformCode: transformCode });
      return module.read().then(function () {
        expect(transformCode).toBeCalledWith(module, packageJson, { extern: true });
      });
    });

    pit('does not extend the passed options object if the file is annotated with @extern', function () {
      var module = createModule({ transformCode: transformCode });
      var fileContents = '\n        /**\n         * @extern\n         */\n      ';
      mockIndexFile(fileContents);
      var options = { arbitrary: 'foo' };
      return module.read(options).then(function () {
        expect(options).not.toEqual(jasmine.objectContaining({ extern: true }));
        expect(transformCode).toBeCalledWith(module, fileContents, _extends({}, options, { extern: true }));
      });
    });

    pit('does not extend the passed options object for JSON files', function () {
      mockPackageFile();
      var module = createJSONModule({ transformCode: transformCode });
      var options = { arbitrary: 'foo' };
      return module.read(options).then(function () {
        expect(options).not.toEqual(jasmine.objectContaining({ extern: true }));
        expect(transformCode).toBeCalledWith(module, packageJson, _extends({}, options, { extern: true }));
      });
    });

    pit('uses the code that `transformCode` resolves to to extract dependencies', function () {
      transformCode.mockReturnValue(Promise.resolve({ code: exampleCode }));
      var module = createModule({ transformCode: transformCode });

      return module.getDependencies().then(function (dependencies) {
        expect(dependencies).toEqual(['a', 'c']);
      });
    });

    pit('uses dependencies that `transformCode` resolves to, instead of extracting them', function () {
      var mockedDependencies = ['foo', 'bar'];
      transformCode.mockReturnValue(Promise.resolve({
        code: exampleCode,
        dependencies: mockedDependencies
      }));
      var module = createModule({ transformCode: transformCode });

      return module.getDependencies().then(function (dependencies) {
        expect(dependencies).toEqual(mockedDependencies);
      });
    });

    pit('forwards all additional properties of the result provided by `transformCode`', function () {
      var mockedResult = {
        code: exampleCode,
        arbitrary: 'arbitrary',
        dependencyOffsets: [12, 764],
        map: { version: 3 },
        subObject: { foo: 'bar' }
      };
      transformCode.mockReturnValue(Promise.resolve(mockedResult));
      var module = createModule({ transformCode: transformCode });

      return module.read().then(function (result) {
        expect(result).toEqual(jasmine.objectContaining(mockedResult));
      });
    });

    pit('exposes the transformed code rather than the raw file contents', function () {
      transformCode.mockReturnValue(Promise.resolve({ code: exampleCode }));
      var module = createModule({ transformCode: transformCode });
      return Promise.all([module.read(), module.getCode()]).then(function (_ref2) {
        var _ref3 = _slicedToArray(_ref2, 2);

        var data = _ref3[0];
        var code = _ref3[1];

        expect(data.code).toBe(exampleCode);
        expect(code).toBe(exampleCode);
      });
    });

    pit('exposes the raw file contents as `source` property', function () {
      var module = createModule({ transformCode: transformCode });
      return module.read().then(function (data) {
        return expect(data.source).toBe(fileContents);
      });
    });

    pit('exposes a source map returned by the transform', function () {
      var map = { version: 3 };
      transformCode.mockReturnValue(Promise.resolve({ map: map, code: exampleCode }));
      var module = createModule({ transformCode: transformCode });
      return Promise.all([module.read(), module.getMap()]).then(function (_ref4) {
        var _ref5 = _slicedToArray(_ref4, 2);

        var data = _ref5[0];
        var sourceMap = _ref5[1];

        expect(data.map).toBe(map);
        expect(sourceMap).toBe(map);
      });
    });

    describe('Caching based on options', function () {
      var module = undefined;
      beforeEach(function () {
        module = createModule({ transformCode: transformCode });
      });

      var callsEqual = function callsEqual(_ref6, _ref7) {
        var _ref9 = _slicedToArray(_ref6, 2);

        var path1 = _ref9[0];
        var key1 = _ref9[1];

        var _ref8 = _slicedToArray(_ref7, 2);

        var path2 = _ref8[0];
        var key2 = _ref8[1];

        expect(path1).toEqual(path2);
        expect(key1).toEqual(key2);
      };

      it('gets dependencies from the cache with the same cache key for the same transform options', function () {
        var options = { some: 'options' };
        module.getDependencies(options); // first call
        module.getDependencies(options); // second call

        var calls = cache.get.mock.calls;

        callsEqual(calls[0], calls[1]);
      });

      it('gets dependencies from the cache with the same cache key for the equivalent transform options', function () {
        module.getDependencies({ a: 'b', c: 'd' }); // first call
        module.getDependencies({ c: 'd', a: 'b' }); // second call

        var calls = cache.get.mock.calls;

        callsEqual(calls[0], calls[1]);
      });

      it('gets dependencies from the cache with different cache keys for different transform options', function () {
        module.getDependencies({ some: 'options' });
        module.getDependencies({ other: 'arbitrary options' });
        var calls = cache.get.mock.calls;

        expect(calls[0][1]).not.toEqual(calls[1][1]);
      });

      it('gets code from the cache with the same cache key for the same transform options', function () {
        var options = { some: 'options' };
        module.getCode(options); // first call
        module.getCode(options); // second call

        var calls = cache.get.mock.calls;

        callsEqual(calls[0], calls[1]);
      });

      it('gets code from the cache with the same cache key for the equivalent transform options', function () {
        module.getCode({ a: 'b', c: 'd' }); // first call
        module.getCode({ c: 'd', a: 'b' }); // second call

        var calls = cache.get.mock.calls;

        callsEqual(calls[0], calls[1]);
      });

      it('gets code from the cache with different cache keys for different transform options', function () {
        module.getCode({ some: 'options' });
        module.getCode({ other: 'arbitrary options' });
        var calls = cache.get.mock.calls;

        expect(calls[0][1]).not.toEqual(calls[1][1]);
      });
    });
  });
});