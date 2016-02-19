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

jest.autoMockOff().dontMock('graceful-fs');

var Fastfs = require('../fastfs');

var _require = require('events');

var EventEmitter = _require.EventEmitter;

var fs = require('fs');
var path = require('path');

var fileName = path.resolve(__dirname, 'fastfs-data');
var contents = fs.readFileSync(fileName, 'utf-8');

describe('fastfs:', function () {
  var fastfs = undefined;
  var crawling = Promise.resolve([fileName]);
  var roots = [__dirname];
  var watcher = new EventEmitter();

  beforeEach(function (done) {
    fastfs = new Fastfs('arbitrary', roots, watcher, { crawling: crawling });
    fastfs.build().then(done);
  });

  describe('partial reading', function () {
    // these are integrated tests that read real files from disk

    pit('reads a file while a predicate returns true', function () {
      return fastfs.readWhile(fileName, function () {
        return true;
      }).then(function (readContent) {
        return expect(readContent).toEqual(contents);
      });
    });

    pit('invokes the predicate with the new chunk, the invocation index, and the result collected so far', function () {
      var predicate = jest.genMockFn().mockReturnValue(true);
      return fastfs.readWhile(fileName, predicate).then(function () {
        var aggregated = '';
        var calls = predicate.mock.calls;

        expect(calls).not.toEqual([]);

        calls.forEach(function (call, i) {
          var _call = _slicedToArray(call, 1);

          var chunk = _call[0];

          aggregated += chunk;
          expect(chunk).not.toBe('');
          expect(call).toEqual([chunk, i, aggregated]);
        });

        expect(aggregated).toEqual(contents);
      });
    });

    pit('stops reading when the predicate returns false', function () {
      var predicate = jest.genMockFn().mockImpl(function (_, i) {
        return i !== 0;
      });
      return fastfs.readWhile(fileName, predicate).then(function (readContent) {
        var calls = predicate.mock.calls;

        expect(calls.length).toBe(1);
        expect(readContent).toBe(calls[0][2]);
      });
    });

    pit('after reading the whole file with `readWhile`, `read()` still works', function () {
      // this test allows to reuse the results of `readWhile` for `readFile`
      return fastfs.readWhile(fileName, function () {
        return true;
      }).then(function () {
        fastfs.readFile(fileName).then(function (readContent) {
          return expect(readContent).toEqual(contents);
        });
      });
    });

    pit('after reading parts of the file with `readWhile`, `read()` still works', function () {
      return fastfs.readWhile(fileName, function () {
        return false;
      }).then(function () {
        fastfs.readFile(fileName).then(function (readContent) {
          return expect(readContent).toEqual(contents);
        });
      });
    });
  });
});