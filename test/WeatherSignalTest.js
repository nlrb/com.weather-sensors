global.Homey = console;
const utils = require('../node_modules/utils');
const alecto = require('../node_modules/alecto');
const auriol = require('../node_modules/auriol');
const cresta = require('../node_modules/cresta');
const labs = require('../node_modules/labs');
const lacrosse = require('../node_modules/lacrosse');
const oregon = require('../node_modules/oregon');
const upm = require('../node_modules/upm');

alecto.init();
auriol.init();
cresta.init();
labs.init();
lacrosse.init();
oregon.init();
upm.init();
utils.setDebug(false);

var encryptCresta = (data) => {
  let calcCRC = (b) => {
      if (b & 0x80) { b ^= 0x95 };
      let c = b ^ (b >> 1);
      if (b & 0x1) { c ^= 0x5f };
      if (c & 0x1) { b ^= 0x5f };
      return b ^ (c >> 1);
  };
  let result = [];
  let cs1 = 0;
  let cs2 = 0;
  for (let x = 0; x < data.length; x += 2) {
    let byte = utils.hex2dec(data.slice(x, x + 2));
    // encode byte
    let enc;
    for (enc = 0; byte; byte <<= 1) {
      enc ^= byte;
      enc &= 0xff;
    }
    cs1 ^= enc;
    cs2 = calcCRC(cs2 ^ enc);
    // make binary
    byte = ('00000000' + parseInt(enc, 10).toString(2)).slice(-8);
    for (let i = 7; i >= 0; i--) {
      result.push(Number(byte[i]));
    }
    result.push(0);
  }
  cs1 &= 0xff;
  byte = '0' + ('00000000' + parseInt(cs1, 10).toString(2)).slice(-8);
  for (let i = 8; i >= 0; i--) {
    result.push(Number(byte[i]));
  }
  // Add CRC
  byte = '0' + ('00000000' + parseInt(calcCRC(cs1 ^ cs2), 10).toString(2)).slice(-8);
  for (let i = 8; i >= 0; i--) {
    result.push(Number(byte[i]));
  }

  return result;
}

var testSignals = [
  // Alecto v1
  { data: [1,0,0,1,0,1,0,1,0,0,1,0,0,0,0,1,0,0,0,0,1,1,0,1,1,1,1,1,1,1,0,0,1,1,0,0,0], protocol: "alectov1",
    result: {id:'82',name:'WS-1050',channel:2,data:{temperature:22.3,button:false,lowbattery:false}}
  },
  // Alecto v1 rain gauge
  {
    data:[0,1,0,1,0,1,1,1 ,0,1,1,0, 1,1,0,0, 0,0,1,1,0,1,1,0,1,1,0,0,0,0,0,0, 1,0,1,1], protocol: "alectov1",
    result: {id:'234',data:{raintotal:219,lowbattery:false}}
  },
  // Alecto v3
  { data: [0,1,0,0,0,1,1,1,0,0,0,1,0,0,0,0,1,1,1,0,0,0,1,0,0,0,1,0,1,0,0,1,0,1,1,1,0,1,1,1], protocol: "alectov3",
    result: {id:'113',name:'WH2A',data:{temperature:22.6,humidity:41}}
  }, // WS-1100
  { data: [0,1,0,0,0,0,0,1,1,0,1,0,0,0,1,0,0,1,1,0,1,1,1,1,0,0,1,0,1,0,0,1,1,0,0,1,1,0,0,1], protocol: "alectov3",
    result: {id:'26',channel:1,name:'WS-1100',data:{temperature:22.3,humidity:41,lowbattery:false}}
  },
  { // Viking Art Nr: 02035
    data: [1,0,1,0,0,1,0,1,0,1,1,1,0,1,0,0,0,1,1,1,0,0,1,1,1,1,1,1,1,1,1,1,1,1,0,0,0,0,0,1,1], protocol: "alectov3",
    result: {id:'174',channel:3,name:'WH2', data:{temperature:-23.1}}
  },
  { // Fine Offset HW2
    data: [1,1,0,1,0,0,1,0,0,0,0,1,1,1,0,0,0,0,1,1,1,1,0,0,1,1,1,1,1,1,1,1,1,1,0,1,0,0,1,0,1,0], protocol: "alectov3",
    result: {id:'135',channel:1,name:'WH2',data:{temperature:24.3}}
  },
  { // Fine Offset HW2
    data: [1,1,0,1,0,0,1,1,1,1,1,0,0,0,0,0,0,0,1,0,0,0,1,1,0,1,1,1,1,1,1,1,1,1,0,1,1,1,0,1,0,0], protocol: "alectov3",
    result: {id:'248',channel:8,name:'WH2',data:{temperature:14.1}}
  },
  { // Telldus FT007TH
    data: [1,1,0,1,0,0,1,0,0,0,0,1,1,1,0,0,0,0,1,1,1,1,0,1,0,0,0,0,1,0,1,1,0,1,1,0,0,0,0,0,1,0], protocol: "alectov3",
    result: {id:'135',channel:1,name:'WH2',data:{temperature:24.4,humidity:45}}
  },
  /*
  { // Fine Offset HW2
    data: [1,1,0,1,0,0,1,0,1,0,0,1,1,1,0,0,0,0,1,1,0,1,0,1,1,0,0,0,1,1,1,0,1,1,0,1,1,0,0,1,0,1], protocol: "alectov3"
  },
  { // Fine Offset HW2
    data:[1,1,0,1,0,0,1,1,1,1,1,0,0,0,0,0,0,0,1,0,0,0,1,1,0,1,1,1,1,1,1,1,1,1,0,1,1,1,0,1,0,0], protocol: "alectov3"
  },
  { // Fine Offset HW2
    data: [1,1,0,1,0,0,1,0,1,0,0,1,1,1,0,0,0,0,1,1,0,1,0,1,1,0,0,0,1,1,1,0,1,1,0,1,1,0,0,1,0,1], protocol: "alectov3"
  },
  { // Fine Offset HW2
    data: [1,1,0,1,0,0,1,1,0,0,0,1,1,1,0,0,0,0,1,0,1,1,1,1,0,1,0,0,1,1,1,1,0,1,1,0,0,0,0,1,0,1], protocol: "alectov3"
  },
  { // Fine Offset HW2
    data: [1,1,0,1,0,0,1,0,1,0,0,1,1,1,0,0,0,0,1,1,0,1,0,1,1,0,0,0,1,1,1,0,1,1,0,1,1,0,0,1,0,1], protocol: "alectov3"
  },
  { // Fine Offset HW2
    data: [1,1,0,1,0,0,1,1,0,0,0,1,1,1,0,0,0,0,1,0,1,1,1,1,0,1,0,0,1,1,1,1,0,1,1,0,0,0,0,1,0,1], protocol: "alectov3"
  },
  { // Fine Offset HW2
    data: [1,1,0,1,0,0,1,1,1,1,0,1,1,1,0,0,0,0,1,0,0,0,1,0,1,1,0,1,0,1,0,1,1,1,1,0,0,1,0,0,0,1], protocol: "alectov3"
  },
  { // Fine Offset HW2
    data: [1,1,0,1,0,0,1,0,1,0,0,1,1,1,0,0,0,0,1,1,0,1,0,1,1,0,0,0,1,1,1,0,1,1,0,1,1,0,0,1,0,1], protocol: "alectov3"
  },
  { // Fine Offset HW2
    data: [1,1,0,1,0,0,1,1,0,0,0,1,1,1,0,0,0,0,1,0,1,1,1,1,0,1,0,0,1,1,1,1,0,1,1,0,0,0,0,1,0,1], protocol: "alectov3"
  },
  */
  { // Fine Offset HW2
    data: [1,1,0,1,0,0,1,1,1,1,0,1,1,1,0,0,0,0,1,0,0,0,1,0,1,1,0,1,0,1,0,1,1,1,1,0,0,1,0,0,0,1], protocol: "alectov3",
    result: {id:'247',channel:8,name:'WH2',data:{temperature:13.9,humidity: 87}}
  },
  { // Fine Offset HW2
    data: [1,1,0,1,0,0,1,1,0,0,0,1,1,1,0,0,0,0,1,0,1,1,1,1,0,1,0,0,1,1,1,1,0,1,1,0,0,0,0,1,0,1], protocol: "alectov3",
    result: {id:'199',channel:5,name:'WH2',data:{temperature:18.9,humidity: 61}}
  },
  { // WS-1100
    data: [0,1,0,0,1,0,1,1,0,1,0,1,0,0,1,0,1,0,0,0,1,0,0,0,0,1,0,0,0,0,0,0,1,0,0,1,0,0,1,1], protocol: "alectov3",
    result: {id:'181',channel:1,name:'WS-1100',data:{temperature:24.8,humidity:64,lowbattery:false}}
  },
  { // Auriol Z31130
    data: [0,1,1,1,1,1,1,1,1,0,0,0,0,0,0,0,1,1,1,0,0,0,0,1,1,1,1,1,0,0,1,1,0,0,0,1], protocol: "auriol1",
    result: {id:'127',channel:1,data:{temperature:22.5,humidity:49,lowbattery:false}}
  },
  // Cresta
  { // TH
    data: '45ce5e87c151f3', protocol: "cresta", func: encryptCresta,
    result: {id:'45',channel:2,data:{temperature:18.7,humidity:51,lowbattery:false}}
  },
  { // W
    data: '8fd68c25c124c1349003a8', protocol: "cresta", func: encryptCresta,
    result: {id:'8f',channel:0,data:{temperature:'12.5',windchill:12.4,averagespeed:3.4,currentspeed:3.9,direction:90,lowbattery:true}}
  },
  { // UV
    data: '8fd0cd0722012800', protocol: "cresta", func: encryptCresta,
    result: {id:'8f',channel:0,data:{temperature:20.7,uvvalue:1.2,uvindex: 2.8,uvlevel:0,lowbattery:true}}
  },
  { // R
    data: '80cc8ed00066', protocol: "cresta", func: encryptCresta,
    result: {id:'80',channel:0,data:{raintotal:145.6,lowbattery:false}}
  },
  {
    data: [1,0,1,1,0,0,1,1,0,0,1,0,1,1,1,0,1,0,0,1,0,1,0,0,0,1,0,0,0,0,1,0,1,1,1,0,0,1,1,1,1,1,0,1,0,1,0,1,1,1,1,0,0,0,1,0,1,0,1,0,1,0,0,1,1,0,0,0,0,1,1,0,1,0,1,0,1,1,0,0,0], protocol: "cresta",
    result: {id:'57',channel:2,data:{temperature:23.8,humidity:47,lowbattery:false}}
  },
  { // Labs BL999
    data: [0,1,0,0,0,1,0,0,0,1,0,0,0,0,0,1,1,1,0,1,0,0,0,0,1,1,0,1,1,0,1,1,1,0,0,0], protocol: "labs",
    result: {name:'BL999',id:'8',channel:1,data:{temperature:18.4,humidity:64,lowbattery:false}}
  },
  // LaCrosse TX2
  {
    data: [0,0,0,0,0,0,0,1,0,0,0,0,0,1,1,1,0,0,1,0,0,0,1,1,0,1,1,1,0,0,1,0,0,0,0,0], protocol: "lacrosse1",
    result: {id:'8',data:{temperature:22.3}}
  },
  // LaCrosse TX3
  {
    data: [0,0,0,0,0,1,0,1,1,1,0,0,0,1,1,1,0,0,1,0,1,0,0,1,0,1,1,1,0,0,1,0,0,1,1,0], protocol: "lacrosse1",
    result: {id:'46',data:{temperature:22.9}}
  },
  {
    data: [1,1,1,0,0,1,0,1,1,1,0,1,0,1,0,1,0,0,1,0,0,0,0,0,0,1,0,1,0,0,1,0,1,0,0,0], protocol: "lacrosse1",
    result: {id:'46',data:{humidity:52}}
  },
  // LaCrosse WS
  { data: [1,0,0,1,0,1,1,1,1,0,1,1,0,1,0,1,1,0,1,0,1,0,1,0,0,1,0,1,1,0,1,1,0,0,1,1,0,0,1,0,1,0,0,1,0,1,1,0,0,1,1,1,1,1,0,1,1,0,0,0,1,1,0,0,0,1,1,0,1,0,1], protocol: "lacrosse2",
    result: {id:'7',data:{temperature:25.5,humidity:49.6,pressure:994}}
  },
  { data: [1,0,0,1,0,1,1,1,0,0,1,1,0,0,0,1,0,1,1,0,1,0,1,0,0,1,0,0,1,0,1,1,1,0,0,1,1,1,0,0,1,0,0,1,0,1,1,0,0,1,1,1,1,1,0,1,0,0,0,1,1,0,0,1,0,1,1,1,1,1,1], protocol: "lacrosse2",
    result: {id:'3',data:{temperature:26.1,humidity:33.4,pressure:994}}
  },
  {
    data: [1,1,1,0,0,1,1,1,1,0,1,1,0,1,0,1,0,0,0,0,1,1,0,0,0,1,1,0,1,0,1,0,0,1,0,1,1,1,1,0,1,0,1,1,0,1,1,1,0,1,1], protocol: "lacrosse2",
    result: {id:'7',data:{currentspeed:10.5,direction:145}}
  },
  {
    data: [1,0,1,0,0,1,1,1,1,1,1,1,1,0,1,1,0,1,0,0,1,1,1,0,1,1,1,1,1,1,1,1,0,1,1,1], protocol: "lacrosse2",
    result: {id:'15',data:{raintotal:2859}}
  },
  {
    data: [1,0,1,0,0,1,1,1,1,1,1,1,0,0,0,1,1,0,0,1,1,1,1,0,1,1,0,1,1,1,1,1,0,0,1,1], protocol: "lacrosse2",
    result: {id:'15',data:{raintotal:2961}}
  },
  {
    data: [1,1,0,1,0,1,1,1,1,0,1,1,1,1,0,1,1,0,0,1,1,0,0,0,1,1,0,0,0,0,1,1,1,1,1,1,1,0,1,0,1,0,0,0,1,1,0,1,1,0,1,1,1,0,1,1], protocol: "lacrosse2",
    result: {id:'7',data:{brightness:897,duration:2143}}
  },
  // Oregon v2
  {
    data: [0,1,0,0,1,0,1,0,1,1,0,0,1,1,0,1,0,0,1,1,0,0,1,0,1,0,1,0,1,0,1,0,1,1,0,0,1,0,1,0,1,0,1,0,1,0,1,0,1,1,0,1,0,0,1,0,1,1,0,0,1,0,1,0,1,0,1,0,1,0,1,1,0,0,1,0,1,0,1,1,0,1,0,0,1,0,1,0,1,0,1,0,1,0,1,0,0,1,1,0,0,1,1,0,1,0,0,1,1,0,1,0,1,0,1,0,1,0,0,1,0,1,1,0,0,1,1,0,0,1,0,1,1,0,1,0,1,0,1,0,1,0,0,1,1,0,0,1,1,0,1,0], protocol: "oregonv2",
    result: {name:'THGN123N/THGR122NX',layout:'TH1',id:'1d20',channel:1,rolling:'3',data:{temperature:18.8,humidity:25,unknown:'08',lowbattery:false}}
  },
  { // THB2 (1st sample)
	  data: [0,1,0,0,1,1,0,0,1,1,0,0,1,1,0,1,0,0,1,1,0,1,0,0,1,0,1,0,1,0,1,0,1,0,1,0,1,0,1,0,1,1,0,1,0,0,1,1,0,1,0,0,1,0,1,1,0,1,0,0,1,0,1,0,1,1,0,1,0,0,1,0,1,0,1,0,1,1,0,0,1,0,1,1,0,0,1,0,1,0,1,0,1,0,1,0,1,0,1,1,0,0,1,0,1,1,0,0,1,1,0,0,1,0,1,0,1,1,0,0,1,1,0,1,0,1,0,1,0,0,1,0,1,0,1,1,0,1,0,0,1,0,1,0,1,1,0,1,0,0,1,0,1,0,1,0,1,1,0,1,0,1,0,0,1,1,0,0,1,1,0], protocol: "oregonv2",
    result: {name:'BTHR918N/BTHR968',layout:'THB2',id:'5d60',channel:0,rolling:'b9', data:{temperature:24.3,humidity:52,comfort:'Comfortable',pressure:999,unknown:'01',forecast:'Rainy',lowbattery:false}}
  },
  { // THB2 (2nd sample)
    data: [0,1,0,0,1,1,0,0,1,1,0,0,1,1,0,1,0,0,1,1,0,1,0,0,1,0,1,0,1,0,1,0,1,0,1,0,1,0,1,0,1,1,0,1,0,0,1,1,0,1,0,0,1,0,1,1,0,0,1,0,1,0,1,0,1,0,1,1,0,1,0,0,1,0,1,1,0,0,1,0,1,0,1,1,0,0,1,0,1,0,1,0,1,0,1,0,1,1,0,0,1,0,1,1,0,0,1,0,1,1,0,0,1,0,1,0,1,1,0,0,1,0,1,1,0,1,0,0,1,1,0,0,1,0,1,1,0,1,0,0,1,0,1,0,1,0,1,0,1,1,0,1,0,1,0,1,0,0,1,0,1,0,1,1,0,1,0,0], protocol: "oregonv2",
    result: {name:'BTHR918N/BTHR968',layout:'THB2',id:'5d60',channel:0,rolling:'b9',data:{temperature:22.6,humidity:49,comfort:'Comfortable',pressure:1006,unknown:'01',forecast:'Sunny',lowbattery:false}}
  },
  /*
  { // 3d00 - WGR918N?
    data: [0,1,0,1,0,0,1,0,1,1,0,0,1,1,0,1,0,0,1,0,1,0,1,0,1,0,1,0,1,0,1,0,1,0,1,0,1,0,1,0,1,1,0,1,0,0,1,1,0,0,1,0,1,0,1,0,1,0,1,0,1,0,1,0,1,0,1,0,1,0,1,1,0,0,1,0,1,1,0,0,1,1,0,0,1,0,1,0,1,0,1,0,1,0,1,0,1,0,1,1,0,0,1,0,1,0,1,0,1,0,1,0,1,0,1,0,1,0,1,0,1,0,1,1,0,0,1,0,1,0,1,0,1,0,1,0,1,0,1,0,1,1,0,1,0,0,1,1,0,0,1,0,1,1,0,0,1,1,0,0,1,0,1,0,1,1,0,1,0], protocol: "oregonv2"
  },
  { // ???
    data: [1,1,0,1,0,1,0,0,1,1,0,0,1,0,1,1,0,0,1,1,0,1,0,1,0,1,0,1,0,1,0,1,0,1,0,0,1,1,0,0,1,1,0,0,1,1,0,0,1,1,0,0,1,1,0,1,0,1,0,1,0,1,0,1,0,0,1,1,0,1,0,0,1,0,1,1,0,1,0,0,1,1,0,1,0,1,0,1,0,1,0,1,0,1,0,1,0,0,1,1,0,1,0,1,0,1,0,1,0,0,1,1,0,1,0,0,1,0,1,1,0,0,1,1,0,0,1,0,1,0,1,1,0,1,0,1,0,0,1,1,0,0,1,1,0,1,0,0,1,0,1], protocol: "oregonv2"
  },
  */
  // Oregon v3
  {
    data: [1,1,1,1,0,0,0,1,0,1,0,0,0,0,1,0,1,0,0,0,0,1,1,0,1,1,1,1,0,0,0,0,0,0,0,1,1,0,0,0,0,1,0,0,0,0,0,0,0,0,1,0,1,1,0,0,0,0,0,1,1,0,1,1,0,0,1,0,1,0,0,1,0,1,0,0], protocol: "oregonv3",
    result: {name:'THGN800/THGN801/THGR810',layout:'TH1',id:'f824',channel:1,rolling:'6f',data:{temperature:21.8,humidity:34,unknown:'08',lowbattery:false}}
  },
  { // UV
    data: [1,0,1,1,0,0,0,1,1,1,1,0,0,0,1,0,1,0,0,0,0,0,1,0,1,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1,0,1,1,0,0,0,0,0,0,1,1,1,1,1,0,0,1,1,0,1,1,1,1,1], protocol: "oregonv3",
    result: {name:'UVN800',layout:'UV2',id:'d874',channel:1,rolling:'47',data:{uvindex:0,uvraw:0,lowbattery:false}}
  },
  /*
  { // UVN800: value: 08201 / UV: 1 / risk: low () 82 = 130 + 90 = 22,0
    data: [1,0,1,1,0,0,0,1,1,1,1,0,0,0,1,0,1,0,0,0,1,1,0,1,1,0,1,1,0,0,0,0,1,0,0,0,0,0,0,0,0,1,0,0,0,0,0,1,0,0,0,0,0,0,1,0,0,0,1,0,1,1,1,0,1,1,1,0], protocol: "oregonv3"
  },
  { // UVN800: value: 06c00 / UV: 0 / risk: low (19.4C outside) 6c = 108 + 90 = 19,8
    data: [1,0,1,1,0,0,0,1,1,1,1,0,0,0,1,0,1,0,0,0,1,1,0,1,1,0,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1,0,1,1,0,0,0,0,0,1,1,0,1,0,0,1,0,0,0,1,0,0,1,1,0], protocol: "oregonv3"
  },
  { // UVN800: value: 08f02 / UV: 2 / risk: low (23.3C) 8f = 143 + 90 = 23,3
    data: [1,0,1,1,0,0,0,1,1,1,1,0,0,0,1,0,1,0,0,0,1,1,0,1,1,0,1,1,0,0,0,0,0,1,0,0,0,0,0,0,1,1,1,1,0,0,0,1,0,0,0,0,0,1,0,0,1,0,1,0,1,1,0,0,0,1,0,0], protocol: "oregonv3"
  },
  { // UVN800: value: 09b03 / UV: 3 / risk: medium (25.3/26.4) 9b = 155 + 90 = 24,5
    data: [1,0,1,1,0,0,0,1,1,1,1,0,0,0,1,0,1,0,0,0,1,1,0,1,1,0,1,1,0,0,0,0,1,1,0,0,0,0,0,0,1,1,0,1,1,0,0,1,0,0,0,0,0,0,0,0,1,0,1,0,0,0,1,1,0,1,1,0], protocol: "oregonv3"
  },
  */
  {
    data: [1,0,1,1,0,0,0,1,1,1,1,0,0,0,1,0,1,0,0,0,1,1,0,1,1,0,1,1,0,0,0,0,1,0,0,0,0,0,0,0,1,0,0,0,0,0,0,1,0,0,0,0,1,1,0,0,0,0,1,0,0,0,0,1,0,0,1,0], protocol: "oregonv3",
    result: {name:'UVN800',layout:'UV2',id:'d874',channel:1,rolling:'bd',data:{uvindex:1,uvraw:1.3125,lowbattery:false}}
  },
  // UPM/Esic
  { data: [1,0,3,2,1,1,2,2,1,1,1,2,1,2,1,2,2,0,3,1,0,3], protocol: "upm",
    result: {id:10,channel:1,data:{temperature:22.1,humidity:14,lowbattery:false}}
  }
]

var ws = utils.WeatherSignal.get();
var signals = {};
var testResults = {
  passed: 0,
  failed: 0,
  unchecked: 0,
  error: 0
};

// List all the signals we have
for (var sig in ws) {
   console.log(sig, ws[sig]);
   var s = ws[sig];
   signals[s] = utils.WeatherSignal.get(s);
}

// Loop through the test vectors
for (var i = 0; i < testSignals.length; i++) {
  var ts = testSignals[i];
  var payload;
  if (ts.func !== undefined) {
    payload = new Buffer.from(ts.func(ts.data));
  } else {
    payload = new Buffer.from(ts.data);
  }
  utils.debug('Payload', ts.protocol, payload.length, payload);
  var parsed = signals[ts.protocol].parse(payload);
  var result = signals[ts.protocol].getResult();
  if (parsed) {
    delete result.protocol;
    delete result.lastupdate;
    if (ts.result !== undefined) {
      if (JSON.stringify(ts.result) === JSON.stringify(result)) {
        testResults.passed++;
        console.log(i, 'Check PASSED', ts.protocol);
      } else {
        testResults.failed++;
        console.log(i, 'Check FAILED', ts.protocol);
        console.log(JSON.stringify(ts.result), 'vs', JSON.stringify(result))
      }
    } else {
      testResults.unchecked++;
      console.log(i, result);
    }
  } else {
    testResults.error++;
    console.log(i, 'ERROR parsing', ts.protocol);
  }
}
console.log(testResults);
