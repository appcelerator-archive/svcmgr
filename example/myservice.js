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