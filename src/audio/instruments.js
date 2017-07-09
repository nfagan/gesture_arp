const Instruments = {
	'piano_g.mp3': {
		color: [255, 0, 255]
	},
	'celeste_g.mp3': {
		color: [66, 244, 134]
	},
	'808_hi.mp3': {
		color: [0, 255, 255]
	},
	'perc_kick.mp3': {
		color: [255, 165, 0]
	},
}

let keys = Object.keys(Instruments);
keys.map(function(key) {
	let color = Instruments[key].color,
		rgbString = 'rgb(' + color.join(',') + ')';
	Instruments[key].rgbString = rgbString;
});

export default Instruments;