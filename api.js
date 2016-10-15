module.exports = [
    {
        description: 'Get a list of all sensors',
        method: 'GET',
        path: '/getSensors/',
        requires_authorizaton: false,
        fn: function(callback, args) {
            var getSensors = Homey.app.api.getSensors;
			var ok = getSensors();
			callback(null, ok);
        }
    }
];