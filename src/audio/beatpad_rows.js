import instruments from './instruments.js';

let keys = Object.keys(instruments),
	rows = [],
	filenames = [];
	
for (let i=0; i<keys.length; i++) {
	let fname = keys[i],
		instrument = instruments[fname],
		availableInBeatpad = instrument.availableIn.some(function(el) {
			return el === 'BEATPAD';
		});
	if (availableInBeatpad) {
		let row = instrument.row;
		if (rows[row] === undefined) {
			rows[row] = [fname];
		} else {
			rows[row].push(fname);
		}
	}
}

export default rows;