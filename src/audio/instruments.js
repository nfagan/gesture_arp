const Instruments = {
	'piano_g.mp3': {
		color: [255, 0, 255],
		availableIn: ['INSTRUMENT'],
		row: 0
	},
	'celeste_g.mp3': {
		color: [66, 244, 134],
		availableIn: ['INSTRUMENT'],
		row: 0
	},
	'808_hi.mp3': {
		color: [0, 255, 255],
		availableIn: ['INSTRUMENT', 'BEATPAD'],
		row: 1,
		keyCode: 83
	},
	'synth_g_s.mp3': {
		color: [255, 155, 155],
		availableIn: ['INSTRUMENT'],
		row: 1
	},
	'perc_kick.mp3': {
		color: [255, 165, 0],
		availableIn: ['BEATPAD'],
		row: 1,
		keyCode: 69
	},
	'moondog_softer.mp3': {
		color: [0, 165, 0],
		availableIn: ['BEATPAD'],
		row: 2,
		keyCode: 68
	},
	'snare1.mp3': {
		color: [255, 235, 56],
		availableIn: ['BEATPAD'],
		row: 2,
		keyCode: 70
	},
	'snare2.mp3': {
		color: [54, 84, 255],
		availableIn: ['BEATPAD'],
		row: 0,
		keyCode: 65
	},
	'snare3.mp3': {
		color: [255, 0, 0],
		availableIn: ['BEATPAD'],
		row: 0,
		keyCode: 87
	},
}

let keys = Object.keys(Instruments);
keys.map(function(key) {
	let color = Instruments[key].color,
		rgbString = 'rgb(' + color.join(',') + ')';
	Instruments[key].rgbString = rgbString;
});

export default Instruments;