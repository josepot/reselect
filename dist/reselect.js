(function (global, factory) {
  if (typeof define === "function" && define.amd) {
    define("Reselect", ["exports"], factory);
  } else if (typeof exports !== "undefined") {
    factory(exports);
  } else {
    var mod = {
      exports: {}
    };
    factory(mod.exports);
    global.Reselect = mod.exports;
  }
})(this, function (exports) {
  "use strict";

  exports.__esModule = true;
  exports.subscribe = subscribe;
  exports.emitError = emitError;
  var subscribers = {};
  var currentSubscriberId = 0;

  function unsubscribe(id) {
    delete subscribers[id];
  }

  function subscribe(fn) {
    var subscriptionId = currentSubscriberId++;
    subscribers[subscriptionId] = fn;
    return unsubscribe.bind(null, subscriptionId);
  }

  function emitError() {
    for (var _len = arguments.length, args = Array(_len), _key = 0; _key < _len; _key++) {
      args[_key] = arguments[_key];
    }

    var subscribersIds = Object.keys(subscribers);
    subscribersIds.forEach(function (id) {
      return subscribers[id].apply(subscribers, args);
    });
  }
});
(function (global, factory) {
  if (typeof define === "function" && define.amd) {
    define('Reselect', ['exports', './error_subscriptions'], factory);
  } else if (typeof exports !== "undefined") {
    factory(exports, require('./error_subscriptions'));
  } else {
    var mod = {
      exports: {}
    };
    factory(mod.exports, global.error_subscriptions);
    global.Reselect = mod.exports;
  }
})(this, function (exports, _error_subscriptions) {
  'use strict';

  exports.__esModule = true;
  exports.subscribeToErrors = exports.createSelector = undefined;
  exports.defaultMemoize = defaultMemoize;
  exports.createSelectorCreator = createSelectorCreator;
  exports.createStructuredSelector = createStructuredSelector;

  var errorSubscriptions = _interopRequireWildcard(_error_subscriptions);

  function _interopRequireWildcard(obj) {
    if (obj && obj.__esModule) {
      return obj;
    } else {
      var newObj = {};

      if (obj != null) {
        for (var key in obj) {
          if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key];
        }
      }

      newObj.default = obj;
      return newObj;
    }
  }

  function _toConsumableArray(arr) {
    if (Array.isArray(arr)) {
      for (var i = 0, arr2 = Array(arr.length); i < arr.length; i++) {
        arr2[i] = arr[i];
      }

      return arr2;
    } else {
      return Array.from(arr);
    }
  }

  function defaultEqualityCheck(a, b) {
    return a === b;
  }

  function defaultMemoize(func) {
    var equalityCheck = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : defaultEqualityCheck;

    var lastArgs = null;
    var lastResult = null;
    var isEqualToLastArg = function isEqualToLastArg(value, index) {
      return equalityCheck(value, lastArgs[index]);
    };
    return function () {
      for (var _len = arguments.length, args = Array(_len), _key = 0; _key < _len; _key++) {
        args[_key] = arguments[_key];
      }

      if (lastArgs === null || lastArgs.length !== args.length || !args.every(isEqualToLastArg)) {
        lastResult = func.apply(undefined, args);
      }
      lastArgs = args;
      return lastResult;
    };
  }

  function getDependencies(funcs) {
    var dependencies = Array.isArray(funcs[0]) ? funcs[0] : funcs;

    if (!dependencies.every(function (dep) {
      return typeof dep === 'function';
    })) {
      var dependencyTypes = dependencies.map(function (dep) {
        return typeof dep;
      }).join(', ');
      throw new Error('Selector creators expect all input-selectors to be functions, ' + ('instead received the following types: [' + dependencyTypes + ']'));
    }

    return dependencies;
  }

  function createSelectorCreator(memoize) {
    for (var _len2 = arguments.length, memoizeOptions = Array(_len2 > 1 ? _len2 - 1 : 0), _key2 = 1; _key2 < _len2; _key2++) {
      memoizeOptions[_key2 - 1] = arguments[_key2];
    }

    return function () {
      for (var _len3 = arguments.length, funcs = Array(_len3), _key3 = 0; _key3 < _len3; _key3++) {
        funcs[_key3] = arguments[_key3];
      }

      var recomputations = 0;
      var resultFunc = funcs.pop();
      var dependencies = getDependencies(funcs);

      var memoizedResultFunc = memoize.apply(undefined, [function () {
        for (var _len4 = arguments.length, args = Array(_len4), _key4 = 0; _key4 < _len4; _key4++) {
          args[_key4] = arguments[_key4];
        }

        recomputations++;
        try {
          return resultFunc.apply(undefined, args);
        } catch (e) {
          errorSubscriptions.emitError(e, resultFunc, args, dependencies);
          throw e;
        }
      }].concat(memoizeOptions));

      var selector = function selector(state, props) {
        for (var _len5 = arguments.length, args = Array(_len5 > 2 ? _len5 - 2 : 0), _key5 = 2; _key5 < _len5; _key5++) {
          args[_key5 - 2] = arguments[_key5];
        }

        var params = dependencies.map(function (dependency) {
          return dependency.apply(undefined, [state, props].concat(args));
        });
        return memoizedResultFunc.apply(undefined, _toConsumableArray(params));
      };

      selector.resultFunc = resultFunc;
      selector.recomputations = function () {
        return recomputations;
      };
      selector.resetRecomputations = function () {
        return recomputations = 0;
      };
      return selector;
    };
  }

  var createSelector = exports.createSelector = createSelectorCreator(defaultMemoize);

  function createStructuredSelector(selectors) {
    var selectorCreator = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : createSelector;

    if (typeof selectors !== 'object') {
      throw new Error('createStructuredSelector expects first argument to be an object ' + ('where each property is a selector, instead received a ' + typeof selectors));
    }
    var objectKeys = Object.keys(selectors);
    return selectorCreator(objectKeys.map(function (key) {
      return selectors[key];
    }), function () {
      for (var _len6 = arguments.length, values = Array(_len6), _key6 = 0; _key6 < _len6; _key6++) {
        values[_key6] = arguments[_key6];
      }

      return values.reduce(function (composition, value, index) {
        composition[objectKeys[index]] = value;
        return composition;
      }, {});
    });
  }

  var subscribeToErrors = exports.subscribeToErrors = errorSubscriptions.subscribe;
});
