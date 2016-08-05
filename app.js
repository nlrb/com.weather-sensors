//this is the right one
"use strict";

var util = require('util');
var driverBTHR968 = require('./drivers/BTHR968/driver.js');
var driverTHGR122NX = require('./drivers/THGR122NX/driver.js');
var convert = require('./baseConverter.js').jan.ConvertBase;
var initFlag = 1;

var self = module.exports = {

    init: function () {
        
        console.log('app driverBTHR968 connect test  temp = ', driverBTHR968.temp)

        if (initFlag) {
            initFlag = 0;
            var Signal = Homey.wireless('433').Signal;
            var signal = new Signal('oregonV2');

            signal.register(function (err, success) {
                if (err != null) console.log('oregonSignal: err', err, 'success', success);
                else { console.log('signal oregonv2  registered')}
            });

            //Start receiving
            signal.on('payload', function (payload, first) {
                var rxData = parseRXData(payload); //Convert received array to usable data
                
            });

        }













    },
    deleted: function () {

    },
    capabilities: function () {

    }





}


var parseRXData = function (payLoad)
//http://stackoverflow.com/questions/3756880/best-way-to-get-two-nibbles-out-of-a-byte-in-javascript

{

    var payLoadString = bitArrayToString(payLoad);
    var payLoadArray = bitStringToBitArray(payLoadString);
    var data = payLoadArray








    var oregonBTHR968Device = {};
    var oregonTHGR122NXDevice = {};  // to put in if data are readable 
    


    util.log('data = array length ', data.length);
    // var data = [];
    // first make data length even
    console.log("arraylength isnoteven   ", !isEven(data.length));
    if (!isEven(data.length)) {
        data.splice(data.lenght - 1, 1);

    };

    util.log('data = array length after making even ', data.length);

    // v2.1 first extract all uneven bits, they are inverted message

    for (var i = data.length - 1; i >= 0; i--) {
        //  util.log('data i ', i);
        if (!isEven(i)) {
            data.splice(i, 1);
        };
    };
    util.log('data = array length after removing uneven bits ', data.length);

    // make string form array
    var datastring = data.join('');
    //first 4 nibbles are address
    var deviceaddressstring = datastring.slice(0, 16);
    util.log('deviceaddressstring  length ', deviceaddressstring.length);

    //   util.log('deviceaddressstring  before nibble lsfb ', deviceaddressstring);

    var nibble1 = deviceaddressstring.slice(0, 4);
    var nibble2 = deviceaddressstring.slice(4, 8);
    var nibble3 = deviceaddressstring.slice(8, 12);
    var nibble4 = deviceaddressstring.slice(12, 16);

    var nibble1 = lsbfNibble(nibble1);
    var nibble2 = lsbfNibble(nibble2);
    var nibble3 = lsbfNibble(nibble3);
    var nibble4 = lsbfNibble(nibble4);

    deviceaddressstring = nibble1 + nibble2 + nibble3 + nibble4;

    util.log('deviceaddressstring  after nibble lsfb ', deviceaddressstring);



    var hexaddress = convert.bin2hex(deviceaddressstring);
    util.log('device address hex ', hexaddress);

    var SensorID = hexaddress;

    // if data are readable and konwn sensor
    if (hexaddress == '5d60' || hexaddress == "1d20") {

        //5th nibbel channel
        var channelnibble = datastring.slice(16, 20);

        channelnibble = lsbfNibble(channelnibble);
        util.log('channel lsfb nibble ', channelnibble);

        var channel = channelnibble.slice(4, 4);

        //nibble 6,7 rollingcode
        var rollingCodenibble1 = lsbfNibble(datastring.slice(20, 24));
        var rollingCodenibble2 = lsbfNibble(datastring.slice(24, 28));

        // mark the inversion of nibbles in and outside
        var rollingCode = convert.bin2hex(rollingCodenibble2 + rollingCodenibble1);
        util.log('rolling code ', rollingCode);

        // 8th nibble is battery
        // bit 0x4 is = battery low = 0100
        var batterynibble = lsbfNibble(datastring.slice(28, 32));
        util.log('batterynibble ', batterynibble);

        //var batterynibblehex = convert.bin2hex(batterynibble);
        //util.log('batterynibblehex  ', batterynibblehex);

        var batteryFlagBit = batterynibble.slice(1, 2);

        util.log('batteryFlagBit ', batteryFlagBit);
        var battery;
        var batteryforhomey;

        if (batteryFlagBit == '1') {
            battery = 'empty';
            batteryforhomey = 10;
            util.log('battery  ', battery);
        }
        else if (batteryFlagBit == '0') {
            battery = 'OK';
            batteryforhomey = 90;
            util.log('battery  ', battery);
        };


        // nibbles 8 to 11
        //  mark the inversion of nibbles in and outside

        var temperatureNibble1 = lsbfNibble(datastring.slice(32, 36));
        var temperatureNibble2 = lsbfNibble(datastring.slice(36, 40));
        var temperatureNibble3 = lsbfNibble(datastring.slice(40, 44));
        var temperatureNibble4 = lsbfNibble(datastring.slice(44, 48));

        var temperatureHex = convert.bin2hex(temperatureNibble4 + temperatureNibble3 + temperatureNibble2 + temperatureNibble1);

        util.log('temperaturehex  ', temperatureHex);

        var temperature = convert.bin2hex(temperatureNibble3) + convert.bin2hex(temperatureNibble2) + '.' + convert.bin2hex(temperatureNibble1)

        util.log(' negative temparaturesignhex  ', convert.bin2hex(temperatureNibble4));

        if (!(convert.bin2hex(temperatureNibble4) == 0))
        { temperature = '-' + temperature; }

        util.log('temperaturehex  ', temperature);



        //nibbles 13,12 humidity in percent

        var humidityNibble1 = lsbfNibble(datastring.slice(48, 52));
        var humidityNibble2 = lsbfNibble(datastring.slice(52, 56));

        var humidityhex = convert.bin2hex(humidityNibble2) + convert.bin2hex(humidityNibble1);
        var humidity = humidityhex; // means bcd hex numbers are digital numbers
        util.log('humidityhex  ', humidityhex + '  %');

        // nibbles 14,15 unknown


        var nibble14 = lsbfNibble(datastring.slice(56, 60));
        var nibble15 = lsbfNibble(datastring.slice(60, 64));

        var u14to15hex = convert.bin2hex(nibble15) + convert.bin2hex(nibble14);
        util.log('unknownhex  ', u14to15hex);
        util.log('unknowndec  ', convert.hex2dec(u14to15hex));


        //nibbles 18..16  barometer
        //http://www.cs.stir.ac.uk/~kjt/software/comms/wmr928.html

        

        //  add direct info to right driver
        if (hexaddress == '5d60') {
            var baroNibble1 = lsbfNibble(datastring.slice(64, 68));
            var baroNibble2 = lsbfNibble(datastring.slice(68, 72));
            var baroNibble3 = lsbfNibble(datastring.slice(72, 76));



            //convert.bin2hex(baroNibble3) = always 0xC
            var baroHex = convert.bin2hex(baroNibble1) + convert.bin2hex(baroNibble2);
            util.log('barohex  ', baroHex);
            var baroDec = convert.hex2dec(baroHex);
            util.log('baroDex  ', baroDec);
            var barometerdec = parseInt(baroDec) + 856;


            util.log('barometer  ', barometerdec);

            var pressure = barometerdec;

            var forecasthex = convert.bin2hex(baroNibble3);
            var forecast;
            //Forecast:  2 = Cloudy, 3 = Rainy, 6 = Cloudy with Sun, C = Sunny
            switch (forecasthex) {
                case "C":
                    forecast = "Sunny";
                    break;
                case "6":
                    forecast = "Cloudy with Sun";
                    break;
                case "3":
                    forecast = "Rainy";
                    break;
                case "2":
                    forecast = "Cloudy";
                    break;
            }



            util.log('forecast ? ', forecast);



            //nibbles 20..19  checksum ?

            var nibble19 = lsbfNibble(datastring.slice(80, 84));
            util.log('nibble19  ', nibble19);
            var nibble20 = lsbfNibble(datastring.slice(84, 88));
            util.log('nibble20  ', nibble20);
            var chksm19to20hex = convert.bin2hex(nibble19) + convert.bin2hex(nibble20);
            util.log('chksm19to20hex  ', chksm19to20hex);
            util.log('chksm19to20dec  ', convert.hex2dec(chksm19to20hex));




            //  3 bytes to go 










      



        oregonBTHR968Device =
            {
                id: SensorID + rollingCode,
                SensorID: SensorID,
                channel: channel,
                rollingCode: rollingCode,
                battery: batteryforhomey,
                temperature: parseFloat(parseFloat(temperature).toFixed(2)),
                humidity: parseInt(humidity),
                pressure: parseInt((Number(pressure)).toFixed(2)),
                forecast: forecast
            };


        var homeyDevice =
            {
                data: { id: oregonBTHR968Device.id },
                name: oregonBTHR968Device.id,
                capabilities: ["measure_humidity", "measure_pressure", "measure_temperature", "measure_battery"],
                measure_temperature: oregonBTHR968Device.temperature,
                measure_humidity: oregonBTHR968Device.humidity,
                measure_pressure: oregonBTHR968Device.pressure,
                measure_battery: oregonBTHR968Device.battery,
            };

        function checkIfDeviceIsInHod(deviceIn) {
            var matches = driverBTHR968.homeyDevices.filter(function (d) {
                return d.address == deviceIn.address;
            });
            return matches ? matches : null;
        }

        // a = array obj = element
        function contains(a, obj) {
            for (var i = 0; i < a.length; i++) {
                if (a[i].data.id == obj.data.id) {
                    return true;
                }
            }
            return false;
        }

       // console.log('567 parserxdata homeyDevices', util.inspect(homeyDevices, false, null))

        if (!contains(driverBTHR968.homeyDevices, homeyDevice)) {
            driverBTHR968.homeyDevices.push(homeyDevice);
        } else {

            driverBTHR968.updateCapabilitiesHomeyDevice(homeyDevice);
        }
        // return homeyDevices;
        }; // if 5d60

       // THGR122NX
        if (hexaddress == '1d20') {

            oregonTHGR122NXDevice =
                {
                    id: SensorID + rollingCode,
                    SensorID: SensorID,
                    channel: channel,
                    rollingCode: rollingCode,
                    battery: batteryforhomey,
                    temperature: parseFloat(parseFloat(temperature).toFixed(2)),
                    humidity: parseInt(humidity),
                    pressure: parseInt((Number(pressure)).toFixed(2)),
                    forecast: forecast
                };


            var homeyDevice =
                {
                    data: { id: oregonTHGR122NXDevice.id },
                    name: oregonTHGR122NXDevice.id,
                    capabilities: ["measure_temperature","measure_humidity" , "measure_battery"],
                    measure_temperature: oregonTHGR122NXDevice.temperature,
                    measure_humidity: oregonTHGR122NXDevice.humidity,
                    measure_battery: oregonTHGR122NXDevice.battery,
                };

            function checkIfDeviceIsInHod(deviceIn) {
                var matches = driverTHGR122NX.homeyDevices.filter(function (d) {
                    return d.address == deviceIn.address;
                });
                return matches ? matches : null;
            }

            // a = array obj = element
            function contains(a, obj) {
                for (var i = 0; i < a.length; i++) {
                    if (a[i].data.id == obj.data.id) {
                        return true;
                    }
                }
                return false;
            }

            // console.log('567 parserxdata homeyDevices', util.inspect(homeyDevices, false, null))

            if (!contains(driverTHGR122NX.homeyDevices, homeyDevice)) {
                driverTHGR122NX.homeyDevices.push(homeyDevice);
            } else {

                driverTHGR122NX.updateCapabilitiesHomeyDevice(homeyDevice);
            }










        };












    }; //if correct device



};

var numberToBitArray = function (number, bit_count) {
    var result = [];
    for (var i = 0; i < bit_count; i++)
        result[i] = (number >> i) & 1;
    return result;
};

var bitArrayToNumber = function (bits) {
    return parseInt(bits.join(""), 2);
};

var bitStringToBitArray = function (str) {
    var result = [];
    for (var i = 0; i < str.length; i++)
        result.push(str.charAt(i) == '1' ? 1 : 0);
    return result;
};

var bitArrayToString = function (bits) {
    return bits.join("");
};





function lsbfNibble(nib) {
    //  util.log('nibble as par for f   ', nib);

    var lsfbnib = ""
    lsfbnib = nib.slice(3);
    // util.log('nibble0  ', lsfbnib);
    lsfbnib += nib.slice(2, 3);
    //  util.log('nibble1  ', lsfbnib);
    lsfbnib += nib.slice(1, 2);
    //  util.log('nibble2  ', lsfbnib);
    lsfbnib += nib.slice(0, 1);
    //  util.log('nibble3  ', lsfbnib);

    return lsfbnib;
};

// create global unique identifier
function guid() {
    function s4() {
        return Math.floor((1 + Math.random()) * 0x10000)
            .toString(16)
            .substring(1);
    }
    return s4() + s4() + + s4() + s4() +
        s4() + s4() + s4() + s4();
}

function isEven(n) {
    return n % 2 == 0;
}