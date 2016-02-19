/**
 * Copyright (c) 2015-present, Facebook, Inc.
 * All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree. An additional grant
 * of patent rights can be found in the PATENTS file in the same directory.
 */
'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var fs = require('fs');
var path = require('fast-path');

var NODE_MODULES_DIR = path.sep + 'node_modules' + path.sep;

var DependencyGraphHelpers = function () {
  function DependencyGraphHelpers(_ref) {
    var _ref$roots = _ref.roots;
    var roots = _ref$roots === undefined ? [] : _ref$roots;
    var _ref$providesModuleNo = _ref.providesModuleNodeModules;
    var providesModuleNodeModules = _ref$providesModuleNo === undefined ? [] : _ref$providesModuleNo;
    var _ref$assetExts = _ref.assetExts;
    var assetExts = _ref$assetExts === undefined ? [] : _ref$assetExts;

    _classCallCheck(this, DependencyGraphHelpers);

    this._hasteRegex = _buildHasteRegex(this._resolveHastePackages(providesModuleNodeModules, roots));
    this._assetExts = assetExts;
  }

  /**
   * An item in the `providesModuleNodeModule` array is an object containing two keys:
   *  * 'name' - the package name
   *  * 'parent' - if a string, it's the name of the parent package of the module in
   *  the dep tree. If null, it signifies that we should look for this package at
   *  the top level of the module tree.
   *
   * We try to resolve the specified module...but if we can't, we fallback to looking
   * in 'node_modules/[package name]' (this satisfies use cases where the actual
   * 'react-native' package is one of the root dirs, such as when we run tests
   * or examples).
   */


  _createClass(DependencyGraphHelpers, [{
    key: '_resolveHastePackages',
    value: function _resolveHastePackages(packages, roots) {
      var packagePathForPackage = function packagePathForPackage(_ref2, rootDir) {
        var name = _ref2.name;
        var parent = _ref2.parent;

        var packagePath = undefined;
        if (parent) {
          if (!Array.isArray(parent)) {
            parent = [parent];
          }
          parent.push(name);
          packagePath = rootDir + NODE_MODULES_DIR + parent.join(NODE_MODULES_DIR);
        } else {
          packagePath = rootDir + NODE_MODULES_DIR + name;
        }

        if (packagePath.endsWith(path.sep)) {
          return packagePath.slice(0, -1);
        } else {
          return packagePath;
        }
      };

      var hastePackages = [];
      packages.forEach(function (p) {
        roots.forEach(function (rootDir) {
          var packagePath = packagePathForPackage(p, rootDir);
          try {
            var stats = fs.statSync(packagePath);
            if (stats && stats.isDirectory()) {
              hastePackages.push(packagePath);
            }
          } catch (e) {
            // if we don't find the package, let's just default to node_modules/[package name]
            hastePackages.push(packagePathForPackage({ name: p.name }, rootDir));
          }
        });
      });
      return hastePackages;
    }

    /**
     * This method has three possible outcomes:
     *
     * 1) A file is not in 'node_modules' at all (some type of file in the project).
     * 2) The file is in 'node_modules', and it's contained in one of the
     * 'providesModuleNodeModules' packages.
     * 3) It's in 'node_modules' but not in a 'providesModuleNodeModule' package,
     * so it's just a normal node_module.
     *
     * This method uses a regex to do the directory testing, rather than for loop
     * and `indexOf` in order to get perf wins.
     */

  }, {
    key: 'isNodeModulesDir',
    value: function isNodeModulesDir(file) {
      var index = file.indexOf(NODE_MODULES_DIR);
      if (index === -1) {
        return false;
      }

      return !this._hasteRegex.test(file);
    }
  }, {
    key: 'isAssetFile',
    value: function isAssetFile(file) {
      return this._assetExts.indexOf(this.extname(file)) !== -1;
    }
  }, {
    key: 'extname',
    value: function extname(name) {
      return path.extname(name).substr(1);
    }
  }]);

  return DependencyGraphHelpers;
}();

/**
 * Given a list of directories, build a regex that takes the form:
 * 	^((?![module's node_modules dir])[module dir])|
 * 	 ((?![next module's node_modules dir])[next module dir])|...
 *
 * This is an alternative to looping through any of the providesModuleNodeModules
 * during `isNodeModulesDir`, which is run tens of thousands of times in a typical
 * project. A regex is much faster in this use-case.
 */


function _buildHasteRegex(dirs) {
  var dirRegexes = [];
  dirs.forEach(function (dir) {
    var dirRegex = '((?!' + escapeRegExp(dir + NODE_MODULES_DIR) + ')' + escapeRegExp(dir + path.sep) + ')';
    dirRegexes.push(dirRegex);
  });

  return new RegExp('^' + dirRegexes.join('|'));
}

function escapeRegExp(str) {
  return str.replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g, '\\$&');
}

module.exports = DependencyGraphHelpers;