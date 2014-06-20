var hello;

exports.load = function (cfg) {
	hello = cfg.hello || "Hello";
};

exports.sayHello = function (msg) {
	console.info('mydep: ' + hello + ' ' + msg);
};