//	define sequence templates here

const getSequenceConstraints = function() {
	let semitones = [];
	for (let i=1; i<13; i++) {
		semitones.push(i);
	}
	return [
		{
			name: 'minor1',
			semitones: [ 2, 5, 10 ],
			octaves: [ -2, -1, 0, 1, 2 ],
			style: 'random',
			color: 'red',
			rgb: [ 255, 255, 200 ],
			instrument: true
		},
		{
			name: 'minor2',
			semitones: [ 3, 7 ],
			octaves: [ -2, -1, 0, 1, 2 ],
			style: 'random',
			color: 'green',
			rgb: [ 255, 200, 255 ],
			instrument: true
		},
		{
			name: 'minor3',
			semitones: [ 3, 5, 7, 9, 10 ],
			octaves: [ -2, -1, 0, 1, 2 ],
			style: 'random',
			color: 'blue',
			rgb: [ 255, 200, 255 ],
			instrument: true
		},
		{
			name: 'full',
			semitones: semitones,
			octaves: [ -2, -1, 0, 1, 2 ],
			style: 'random',
			color: 'black',
			rgb: [ 255, 40, 255 ],
			instrument: true
		},
		{
			name: 'beatpad',
			semitones: [ 3, 5, 7 ],
			octaves: [ -2, -1, 0, 1, 2 ],
			instrument: false
		},
	].map(function(sequence) {
		sequence.pitchMatrix = matrixMaker(sequence);
		return sequence;
	});
}

//	combine into a matrix of [octave, semitone] pairs

function matrixMaker(sequence) {
	let semitones = sequence.semitones,
		octaves = sequence.octaves;

	return octaves.reduce(function(combined, octave) {
		for (let i=0; i<semitones.length; i++) {
			combined.push([octave, semitones[i]]);
		}
		return combined;
	}, []);
}

export { getSequenceConstraints }

// {
	// 	name: 'major1',
	// 	semitones: [ 0, 7, 9 ],
	// 	octaves: [ -2, -1, 0, 1, 2 ],
	// 	style: 'random',
	// 	color: 'blue',
	// 	rgb: [ 255, 40, 255 ]
	// },