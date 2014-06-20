var svcmgr = require('..');

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