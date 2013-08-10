/*
  Copyright 2013 Lucio M. Tato

  Permission is hereby granted, free of charge, to any person obtaining a copy
  of this software and associated documentation files (the "Software"), to
  deal in the Software without restriction, including without limitation the
  rights to use, copy, modify, merge, publish, distribute, sublicense, and/or
  sell copies of the Software, and to permit persons to whom the Software is
  furnished to do so, subject to the following conditions:

  The above copyright notice and this permission notice shall be included in
  all copies or substantial portions of the Software.

  THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
  IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
  FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
  AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
  LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
  FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS
  IN THE SOFTWARE.
*/

var Fiber = require('fibers');

function get_current_fiber() {
  var f = Fiber.current;
  if (f === undefined) {
    throw new Error('You need to start a fiber first!');
  }
  return f;
}

function Wait() {
  var fiber = get_current_fiber();
  var hasValue = false;
  var value;
  var multiple = false;
  var cb = function() {
    if (arguments.length > 1) {
      multiple = true;
      cb.set(Array.prototype.slice.call(arguments));
    } else {
      cb.set(arguments[0]);
    }
  };
  cb.set = function(val) {
    if (hasValue) throw new Error('Wait value already set!');
    value = val;
    hasValue = true;
    if (Fiber.current !== fiber && fiber.started) {
      fiber.run();
    }
  };
  cb.wait = function() {
    while (!hasValue) {
      Fiber.yield();
    }
    return true;
  };
  cb.ready = function() {
    return hasValue;
  };
  cb.get = function() {
    cb.wait();
    var val = value;
    hasValue = false;
    value = undefined;
    if (cb.__throw) {
      var err;
      if (multiple) {
        multiple = false;
        err = val.shift();
        if (val.length <= 1) {
          val = val[0];
        }
      } else {
        err = val;
        val = undefined;
      }
      if (err) throw err;
    }
    return val;
  };
  return cb;
}
module.exports = Wait;

Wait.t = function() {
  var p = Wait();
  p.__throw = true;
  return p;
};

Wait.start = function(f) {
  Fiber(function(args) {
    f.apply(undefined, args);
  }).run(Array.prototype.slice.call(arguments, 1));
  return undefined;
};

Wait.task = function(f) {
  return function() {
    var self = this;
    Fiber(function(args) {
      f.apply(self, args);
    }).run(arguments);
  };
  return undefined;
};

Wait.waitAny = function() {
  while (true) {
    for (i = 0; i < arguments.length; ++i) {
      if (arguments[i].ready()) {
        return arguments[i];
      }
    }
    Fiber.yield();
  }
}

Wait.waitAll = function() {
  for (i = 0; i < arguments.length; ++i) {
    arguments[i].wait();
  }
  return undefined;
}

Wait.sleep = function(ms) {
  var wake = false;
  var fiber = get_current_fiber();
  setTimeout(function() {
    wake = true;
    fiber.run();
  }, ms);
  while (!wake) {
    Fiber.yield();
  }
  return undefined;
};
