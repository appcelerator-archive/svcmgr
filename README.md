A simple service manager.

[![NPM](https://nodei.co/npm/svcmgr.png?downloads=true&stars=true)](https://nodei.co/npm/svcmgr/)

## Installation

	[sudo] npm install svcmgr

## Overview

svcmgr is a really simple service manager that loads, starts, stops, and unloads
Node modules.

A service module can export any of the 4 lifecycle handlers: `load`, `start`,
`stop`, and `unload`.

Service modules can also have dependencies. You can declare them by export a
`dependencies` property with an array of dependencies. When a service is being
loaded, it will load the dependencies first, then pass them to the service's
lifecycle handlers.

## Example

main.js

	var svcmgr = require('svcmgr');

	svcmgr.setup({
		// arbitrary config settings to pass to all services
		logger: console
	});

	svcmgr.load(['myservice'], function (err, services) {
		console.info('main: all services loaded');

		svcmgr.start(function () {
			console.info('main: all services started');
		});
	});

	var exiting = false;
	process.on('exit', function () {
		if (!exiting) {
			console.info('main: shutting down');
			svcmgr.unload(function () {
				console.info('main: all services stopped and unloaded');
			});
		}
	});

	// listen for ctrl-c
	process.on('SIGINT', function () {
		exiting = true;
		console.log('\nmain: ctrl-c detected, shutting down');
		svcmgr.unload(function () {
			console.info('main: all services stopped and unloaded');
			process.exit(0);
		});
	});

myservice.js

	var timer;

	exports.dependencies = [ 'mydep' ];

	exports.load = function (deps, cfg, callback) {
		// init stuff
		console.info('myservice: load handler');
		callback();
	};

	exports.start = function (deps, cfg, callback) {
		// start stuff
		console.info('myservice: start handler');
		console.info('myservice: calling sayHello() in 3 seconds...');
		timer = setTimeout(function () {
			deps['mydep'].sayHello("World!");
		}, 3000);
		callback();
	};

	exports.stop = function (deps, cfg, callback) {
		// stop stuff
		clearTimeout(timer);
		console.info('myservice: stop handler');
		callback();
	};

	exports.unload = function (deps, cfg, callback) {
		// shutdown stuff
		console.info('myservice: unload handler');
		callback();
	};

mydep.js

	var hello;

	exports.load = function (cfg) {
		hello = cfg.hello || "Hello";
	};

	exports.sayHello = function (msg) {
		console.info('mydep: ' + hello + ' ' + msg);
	};

## License

This project is open source and provided under the Apache Public License
(version 2). Please make sure you see the `LICENSE` file included in this
distribution for more details on the license.  Also, please take notice of the
privacy notice at the end of the file.

#### (C) Copyright 2014, [Appcelerator](http://www.appcelerator.com/) Inc. All Rights Reserved.
