/**
 * svcmgr - A simple service manager
 *
 * @copyright
 * Copyright (c) 2014 by Appcelerator, Inc. All Rights Reserved.
 *
 * @license
 * Licensed under the terms of the Apache Public License
 * Please see the LICENSE included with this distribution for details.
 */

var async = require('async'),
	fs = require('fs'),
	path = require('path'),
	config = {},
	services = {},
	logger = function () {};

/**
 * Mixes multiple objects into a single object.
 * @param {Object} dest - The destination to mix all source objects into
 * @param {Object} [...] - One or more sources to copy properties from
 * @returns {Object} The original destination
 */
function mix(dest) {
	var i = 1,
		l = arguments.length,
		p,
		src;
	dest || (dest = {});
	while (i < l) {
		src = arguments[i++];
		for (p in src) {
			src.hasOwnProperty(p) && (dest[p] = src[p]);
		}
	}
	return dest;
}

/**
 * Set the default config for all services.
 * @param {Object} cfg - Configuration object
 * @returns {Module} The svcmgr module
 */
exports.setup = function setup(cfg) {
	mix(config, cfg);
	return exports;
};

/**
 * Loads the specified services.
 * @param {String|Array} svcs - The name of the service to load, or an array of services to load
 * @param {Object} [cfg] - Configuration object
 * @param {Function} [callback] - A function to call when all services have been loaded
 */
exports.load = function load(service, cfg, callback) {
	if (typeof cfg === 'function') {
		callback = cfg;
		cfg = {};
	}
	if (typeof callback !== 'function') {
		callback = function () {};
	}

	cfg = mix({}, config, cfg);

	if (typeof cfg.logger === 'function') {
		logger = cfg.logger;
	} else if (cfg.logger && typeof cfg.logger === 'object') {
		if (cfg.logger.addLevel) {
			cfg.logger.addLevel('svcmgr', 'blue');
			logger = cfg.logger.svcmgr;
		} else {
			logger = console.info;
		}
	}

	async.eachSeries(
		Array.isArray(service) ? service : [service],

		function (svc, next) {
			if (!svc || services[svc]) return next();

			logger('loading "%s"', svc);

			if (module.parent) {
				if (!Array.isArray(module.paths)) {
					module.paths = [];
				}
				var dir = path.dirname(module.parent.filename);
				if (module.paths.indexOf(dir) === -1) {
					module.paths.unshift(dir);
				}
				dir = path.join(dir, 'node_modules');
				if (module.paths.indexOf(dir) === -1) {
					module.paths.unshift(dir);
				}
			}

			var moduleFile = require.resolve(svc),
				mod = require(moduleFile);

			services[svc] = {
				module: mod,
				running: false,
				filename: moduleFile,
				deps: null
			};

			exports.load(mod.dependencies, function () {
				if (mod.dependencies) {
					services[svc].deps = {};
					(Array.isArray(mod.dependencies) ? mod.dependencies : [mod.dependencies]).forEach(function (dep) {
						services[dep] && (services[svc].deps[dep] = services[dep].module);
					});
				}

				if (typeof mod.load !== 'function') return next();

				if (services[svc].deps) {
					if (mod.load.length > 2) {
						return mod.load(services[svc].deps, cfg, next);
					}
					mod.load(services[svc].deps, cfg);
				} else if (mod.load.length > 1) {
					mod.load(cfg, next);
				} else {
					mod.load(cfg);
					next();
				}
			});
		},

		function (err) {
			if (err) {
				callback(err);
			} else {
				callback(null, services);
			}
		}
	);
};

function getOrderedServices(whitelist) {
	var sorted = [];
	whitelist && !Array.isArray(whitelist) && (whitelist = [whitelist]);
	(function walk(svcs) {
		Array.isArray(svcs) || (svcs = [svcs]);
		svcs.forEach(function (svc) {
			if (svc && sorted.indexOf(svc) === -1 && (!whitelist || whitelist.indexOf(svc) != -1)) {
				walk(services[svc].module.dependencies);
				sorted.push(svc);
			}
		});
	})(Object.keys(services));
	return sorted;
}

/**
 * Starts a service or all services.
 * @param {Array|String} [service] - The name of the service to start, or all services if no service specified
 * @param {Object} [cfg] - Configuration object
 * @param {Function} [callback] - A function to call when all services have been started
 */
exports.start = function start(service, cfg, callback) {
	if (typeof service === 'function') {
		callback = service;
		cfg = {};
		service = null;
	} else if (service && typeof service === 'object') {
		cfg = service;
		service = null;
	}

	if (typeof cfg === 'function') {
		callback = cfg;
		cfg = {};
	}

	cfg = mix({}, config, cfg);

	async.eachSeries(getOrderedServices(service), function (svc, next) {
		if (!services[svc]) return next();
		if (services[svc].running) {
			logger('"%s" already running', svc);
			return next();
		}

		function cb(err) {
			if (!err) {
				services[svc].running = true;
			}
			next();
		}

		var mod = services[svc].module;
		if (typeof mod.start !== 'function') return cb();

		logger('starting "%s"', svc);

		var deps = services[svc].deps;
		if (deps) {
			if (mod.start.length > 2) {
				return mod.start(deps, cfg, cb);
			}
			mod.start(deps, cfg);
		} else if (mod.start.length > 1) {
			return mod.start(cfg, cb);
		} else {
			mod.start(cfg);
		}
		cb();
	}, callback);
};

/**
 * Stops a service, if running.
 * @param {Array|String} [service] - The name of the service to stop, or all services if no service specified
 * @param {Object} [cfg] - Configuration object
 * @param {Function} [callback] - A function to call when all services have been stopped
 */
exports.stop = function stop(service, cfg, callback) {
	if (typeof service === 'function') {
		callback = service;
		cfg = {};
		service = null;
	} else if (service && typeof service === 'object') {
		cfg = service;
		service = null;
	}

	if (typeof cfg === 'function') {
		callback = cfg;
		cfg = {};
	}

	cfg = mix({}, config, cfg);

	async.eachSeries(getOrderedServices(service), function (svc, next) {
		if (!services[svc] || !services[svc].running) return next();

		var mod = services[svc].module;
		if (typeof mod.stop !== 'function') return next();

		logger('stopping "%s"', svc);

		var deps = services[svc].deps;
		if (deps) {
			if (mod.stop.length > 2) {
				return mod.stop(deps, cfg, next);
			}
			mod.stop(deps, cfg);
		} else if (mod.stop.length > 1) {
			return mod.stop(cfg, next);
		} else {
			mod.stop(cfg);
		}
		next();
	}, callback);
};

/**
 * Unloads a service.
 * @param {Array|String} [service] - The name of the service to unload, or all services if no service specified
 * @param {Object} [cfg] - Configuration object
 * @param {Function} [callback] - A function to call when all services have been unloaded
 */
exports.unload = function unload(service, cfg, callback) {
	if (typeof service === 'function') {
		callback = service;
		cfg = {};
		service = null;
	} else if (service && typeof service === 'object') {
		cfg = service;
		service = null;
	}

	if (typeof cfg === 'function') {
		callback = cfg;
		cfg = {};
	}

	cfg = mix({}, config, cfg);

	var svcs = getOrderedServices(service).reverse();

	async.eachSeries(svcs, function (svc, next) {
		if (!services[svc]) return next();

		// stop all the services first
		exports.stop(svc, cfg, next);
	}, function () {
		// now unload the services
		async.eachSeries(svcs, function (svc, next) {
			function cb() {
				delete require.cache[services[svc].filename];
				delete services[svc];
				next();
			}

			var mod = services[svc].module;
			if (typeof mod.unload !== 'function') return cb();

			logger('unloading "%s"', svc);

			var deps = services[svc].deps;
			if (deps) {
				if (mod.unload.length > 2) {
					return mod.unload(deps, cfg, cb);
				}
				mod.unload(deps, cfg);
			} else if (mod.unload.length > 1) {
				return mod.unload(cfg, cb);
			} else {
				mod.unload(cfg);
			}
			cb();
		});
	}, callback);
};