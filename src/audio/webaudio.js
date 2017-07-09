import { Util } from '../util.js';
import instruments from './instruments.js';
import Tuna from 'tunajs'

/*
	constructor
*/

function WebAudio(properties) {
	this.bpm = properties.bpm;

	this.interval = 60 / this.bpm;

	this.currentBeat = 1;

	//	initialize the AudioContext, or return -1
	//	if initialization fails

	this.context = this.initContext();

	this.tuna = new Tuna(this.context);
	this.impulse = undefined;

	//	array of buffer objects with <buffer> and <filename>
	//	properties

	this.buffers = [];
	this.filenames = properties.filenames;

	//	define default playing properties

	this.defaultPlayProperties = {
		audible: true,
		pitch: { min: 0, max: 0 }
	}

	//	make sure the object was instantiated correctly

	this.validate();

	//	for proper safari playback

	this.playedDummySound = false;
}


/*
	prototype
*/


WebAudio.prototype.constructor = WebAudio;

//	initialize the audio context, or return -1 if init fails

WebAudio.prototype.initContext = function() {
	let audioContext = window.AudioContext || window.webkitAudioContext || -1;
	if ( audioContext === -1 ) return audioContext;
	return new audioContext();
}

//	make sure we can properly instantiate a new WebAudio

WebAudio.prototype.validate = function() {
	//	make sure we have window.requestAnimationFrame
	if ( typeof window.requestAnimationFrame == 'undefined' ) {
		throw new Error('requestAnimationFrame is not supported in this browser');
	}
	//	make sure the audio context is valid
	if (this.context === -1) {
		throw new Error('Web audio is not supported in this browser');
	}
}

WebAudio.prototype.loadTestSounds = function() {
	let filenames = this.filenames, 
		that = this,
		buffers = this.buffers
	filenames.map( (name) => {
		let fullfile = `https://dl.dropboxusercontent.com/s/mt0s5oj4tx1lre2/${name}`,
			request = new XMLHttpRequest()
		request.open('GET', fullfile, true);
		request.responseType = 'arraybuffer';
		request.onload = function() {
			that.context.decodeAudioData(request.response, (buffer) => {
				buffers.push({
					filename: name,
					buffer: buffer
				})
			})
		}
		request.send()
	})
}

WebAudio.prototype.loadImpulse = function() {
	let self = this;
	let promise = this.loadSound('impulse_rev.wav')
		.then(function(sound) {
			self.impulse = sound;
		});
}

WebAudio.prototype.loadSound = function(filename) {

	//	return a promise to load the given <filename>

	let that = this;

	return new Promise( (resolve, reject) => {
		let request = new XMLHttpRequest(),
			fullfile = '/sounds/' + filename;

		request.open('GET', fullfile);
		request.responseType = 'arraybuffer';

		request.onload = function() {
			that.context.decodeAudioData(request.response, (buffer) => {
				resolve(buffer);
			})
		}

		request.onerror = (err) => {
			reject(err);
		}

		request.send();
	});
}

WebAudio.prototype.loadSounds = function() {

	//	given the array of stored filenames in <this>,
	//	resolve each promise to load the corresponding buffer, and
	//	push each buffer to the <buffers> array in <this>

	let promises = [],
		buffers = this.buffers,
		filenames = this.filenames,
		that = this;

	filenames.map( (file) => {
		promises.push( that.loadSound(file) );
	});

	let promise = Promise.all(promises)
		.then( (sounds) => {
			for (let i=0; i<sounds.length; i++) {
				buffers.push({
					filename: filenames[i],
					buffer: sounds[i]
				});
			}
		})
		.catch( (err) => {
			console.log('An error occurred while loading sounds');
		});

	return promise;
}

//	from the array of buffer objects in this.buffers,
//	return the buffer that matches <filename>

WebAudio.prototype.getBufferByFilename = function(filename) {
	let oneBuffer = this.buffers.filter( (buffer) => buffer.filename === filename );
	if (oneBuffer.length === 0) return -1;
	if (oneBuffer.length > 1) {
		throw new Error('More than one buffer found for' + filename);
	}
	return oneBuffer[0].buffer;
}

WebAudio.prototype.getCurrentBeat = function() {
	let totalElapsedTime = this.context.currentTime,
		interval = this.interval;
	return Math.floor(totalElapsedTime / interval);
}

//	schedule the playing of N number of notes, where N corresponds
//	to the note length specified in <props.noteLength>

WebAudio.prototype.schedulePlay = function(filename, props) {
	let interval = this.interval,
		currentBeat = this.getCurrentBeat(),
		noteLength = props.noteLength,
		coordinates = props.coordinates,
		scheduledTime,
		beatsToSchedule,
		duration,
		scheduledTimes = [];

	switch (noteLength) {
		case 'quarter':
			beatsToSchedule = 1;
			break;
		case 'eighth':
			beatsToSchedule = 2;
			break;
		case 'eighthTriplet':
			beatsToSchedule = 3;
			break;
		case 'sixteenth':
			beatsToSchedule = 4;
			break;
		case 'sixteenthTriplet':
			beatsToSchedule = 6;
			break;
		default:
			throw new Error(`Unrecognized noteLength ${noteLength}`);
	}

	//	first scheduled time

	// scheduledTime = (currentBeat * interval) + interval/beatsToSchedule;
	// scheduledTime = (currentBeat * interval) + interval/6;
	// scheduledTime = (currentBeat * interval) + interval/2
	scheduledTime = (currentBeat * interval) + interval/2;

	//	note length

	duration = interval/beatsToSchedule;

	//	update the current beat

	this.currentBeat = currentBeat;

	//	remove the sources from the sequence

	props.sequence.sources = [];

	for (let i=0; i<beatsToSchedule; i++) {
		let playTime = scheduledTime + (interval/beatsToSchedule) * i,
			playProps = Object.assign(props, {when: playTime});

		//	play each note at time <playTime>

		this.play(filename, playProps, coordinates[i]);

		//	for output

		scheduledTimes.push(playTime);
	}

	return {noteTimes: scheduledTimes, noteDuration: duration};
}

WebAudio.prototype.play = function(filename, props, coord) {
	let source = this.context.createBufferSource(),
		buffer = this.getBufferByFilename(filename),
		defaultPlayProperties = this.defaultPlayProperties,
		when = props.when || 0;

	if ( buffer === -1 ) throw new Error(`Could not find ${filename}`);

	props = Object.assign({}, defaultPlayProperties, props);

	props.sequence.sources.push(source);

	//	if this set of beats is set to be silent, return

	if (!props.audible) return;

	let pitchMatrix = props.sequence.constraint.pitchMatrix,
		pitchIndex,
		xModulation;
	if (props.identity !== 'circle') {
		pitchIndex = Math.floor((1-coord.y) * (pitchMatrix.length-1));
		xModulation = coord.x;
	} else {
		let radius = (props.radius[0].x + props.radius[0].y)/2,
			sign = 1,
			adjustedY;
		if (Math.random() > .5) sign = -1;
		adjustedY = coord.y + Math.random()*radius*sign;
		if (adjustedY > 1) adjustedY = 1;
		if (adjustedY < 0) adjustedY = 0;
		pitchIndex = Math.floor((1-adjustedY) * (pitchMatrix.length-1));
		xModulation = 1-adjustedY;
	}	

	let octaveSemitone = pitchMatrix[pitchIndex],
		semitone = (octaveSemitone[0]*12) + octaveSemitone[1];

	let bitcrusher = props.sequence.bitcrusher || new this.tuna.Bitcrusher({
    	bits: 8,
    	normfreq: xModulation,
    	bufferSize: 4096
	});

	bitcrusher.normfreq = (xModulation*.1) + .1;

	let convolver = props.sequence.convolver || new this.tuna.PingPongDelay({
	    wetLevel: 0.5, //0 to 1
	    feedback: 0, //0 to 1
	    delayTimeLeft: 200, //1 to 10000 (milliseconds)
	    delayTimeRight: 350 //1 to 10000 (milliseconds)
	});

	convolver.wetLevel = xModulation;

	props.sequence.bitcrusher = bitcrusher;
	props.sequence.convolver = convolver;

	source.playbackRate.value = Math.pow(2, semitone/12);
	source.buffer = buffer;

	source.connect(bitcrusher);
	bitcrusher.connect(convolver);
	convolver.connect(this.context.destination);
	source.start(when);
}

WebAudio.prototype.playDummySound = function() {
	if (this.playedDummySound) return;

	let buffer = this.context.createBuffer(1, 22050, 44100),
		source = this.context.createBufferSource();

	source.buffer = buffer;
	source.connect(this.context.destination);
	source.start(0);

	this.playedDummySound = true
}


/*
	instantiate
*/

const filenames = Object.keys(instruments);

const webAudio = new WebAudio({
	bpm: 85, 
	filenames
})

// webAudio.loadSounds();
// webAudio.loadImpulse();

export { webAudio }

