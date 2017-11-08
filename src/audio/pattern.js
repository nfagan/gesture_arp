import { webAudio } from './webaudio.js';
import { eventBus } from '../eventbus.js';
import { Util } from '../util.js';

function Pattern(manager) {
	this.manager = manager;
	this.sequenceSetId = manager.sequenceSets[0].id;
	this.sequenceId = manager.sequenceSets[0].sequences[0].id;
	this.patternId = Util.randId();
	this.patternIds = [this.patternId];
	this.notes = [];
	this.sources = [];
	this.beatN = 0;
	this.nBeats = 4;
	this.measureStart = undefined;
	this.measureLength = webAudio.interval * this.nBeats;
	this.shouldQuantize = true;
	this.quantalDivisor = 4;	//	16th note
	this.spliceThreshold = .1;
	this.currentBeat = undefined;
	this.previousBeat = undefined;
	this.hasInitialized = false;
	this.isLooping = false;
	this.shouldLoop = true;
	this.mode = undefined;
	this.subscribe();
}

Pattern.prototype.constructor = Pattern;

Pattern.prototype.subscribe = function() {
	const boundEdited = this.handleNewEditedSequence.bind(this),
		boundActive = this.handleNewActiveSequence.bind(this),
		boundModeChange = this.updateMode.bind(this);
	eventBus.subscribe(eventBus.topicMap.newActiveSequence, boundActive);
	eventBus.subscribe(eventBus.topicMap.newEditedSequence, boundEdited);
	eventBus.subscribe(eventBus.topicMap.modeChange, boundModeChange);
}

Pattern.prototype.updateMode = function(to) {
	this.mode = to;
}

Pattern.prototype.listen = function() {

	let self = this;

	window.addEventListener('keydown', function(evt) {
		if (evt.keyCode === 75) {
			self.notes = [];
			self.stop();
		}
		if (evt.keyCode !== 74 && evt.keyCode !== 76) return;
		if (evt.keyCode === 74) self.addNote('perc_kick.mp3');
		if (evt.keyCode === 76) self.togglePatterns();
	});
}

Pattern.prototype.handleNewEditedSequence = function(data) {
	let N = this.manager.sequenceSets[0].sequences.length;
	if (N === 1) return;
	this.measureStart = undefined;
	this.currentBeat = webAudio.getCurrentBeat();
	this.previousBeat = this.currentBeat;
	this.beatN = 1;
	this.stop();
}

Pattern.prototype.handleNewActiveSequence = function(data) {
	if (this.sequenceSetId !== data.sequenceSetId) return;
	let seqId = data.sequenceId;
	if (!this.isLooping) this.loop();
	if (seqId === this.sequenceId) return;
	this.beatN = 1;
	this.currentBeat = webAudio.getCurrentBeat();
	this.previousBeat = this.currentBeat;
	this.sequenceId = seqId;
}

Pattern.prototype.addNote = function(fname) {

	webAudio.playSimple(fname, 0);

	if (!this.manager.isLooping) return;

	let currentTime = webAudio.context.currentTime,
		interval = webAudio.interval,
		measureStart = this.measureStart,
		quantalDivisor = this.quantalDivisor,
		when = currentTime-measureStart,
		beatN = this.beatN,
		patternId = this.patternId,
		nQuanta = Math.round(when / (interval/quantalDivisor)),
		quantized = (nQuanta*(interval/quantalDivisor)),
		notes = this.notes,
		spliceThreshold = this.spliceThreshold,
		shouldPush = true,
		shouldQuantize = this.shouldQuantize,
		kind = 'pattern',
		canSplice = true;

	if (shouldQuantize) {
		when = quantized;
	}

	for (let i=0; i<notes.length; i++) {
		let note = notes[i];
		if (!canSplice) continue;
		if (fname !== note.fname) continue;
		if (patternId !== note.patternId) continue;
		if (Math.abs(notes[i].when-when) < spliceThreshold) {
			console.log('splicing ...');
			notes.splice(i, 1, {fname, when, beatN, patternId, kind});
			shouldPush = false;
			canSplice = false;
		}
	}
	if (shouldPush) notes.push({when, fname, beatN, patternId, kind});

}

Pattern.prototype.play = function() {
	let notes = this.notes,
		notesCopy = [],
		measureStart = this.measureStart,
		patternId = this.patternId,
		newNoteTimesTopic = eventBus.topicMap.newNoteTimesReady;
	for (let i=0; i<notes.length; i++) {
		if (measureStart === undefined) {
			console.log('Undefined measureStart');
		}
		if (notes[i].patternId !== patternId) continue;
		let noteTime = notes[i].when + measureStart,
			fname = notes[i].fname;
		let source = webAudio.playSimple(fname, noteTime),
			duration = this.getNoteDuration(fname, notes[i].when);
		notes[i].noteTime = noteTime;
		notes[i].noteDuration = duration;
		this.sources.push(source);
		notesCopy.push(Object.assign({}, notes[i]));
	}
	// if (this.mode === 'INSTRUMENT') return;
	if (notesCopy.length > 0) {
		eventBus.publish(newNoteTimesTopic, {notes: notesCopy, kind: 'pattern'});
	}
}

Pattern.prototype.stop = function() {
	let sources = this.sources;
	for (let i=0; i<sources.length; i++) {
		try {
			sources[i].stop(0);
		} catch (err) {
			console.warn('Could not stop');
		}
	}
}

Pattern.prototype.loop = function() {

	let self = this;

	self.isLooping = true;

	const looper = function() {
		let previousBeat = self.previousBeat,
			currentBeat = webAudio.getCurrentBeat(),
			beatN = self.beatN,
			nBeats = self.nBeats,
			shouldLoop = self.shouldLoop;

		if (!self.manager.isLooping) {
			self.stop();
			window.requestAnimationFrame(looper);
			return;
		}

		if (previousBeat === currentBeat) {
			window.requestAnimationFrame(looper);
			return;
		}

		if (beatN === 0) {
			self.measureStart = webAudio.context.currentTime;
			self.sources = [];
			self.play();
		}

		beatN++;
		if (beatN === nBeats) beatN = 0;
		self.previousBeat = currentBeat;
		self.beatN = beatN;
		window.requestAnimationFrame(looper);
	}

	looper();
}

Pattern.prototype.createNextPattern = function() {
	let patternId = Util.randId();
	this.patternIds.push(patternId);
	this.patternId = patternId;
}

Pattern.prototype.togglePatterns = function() {
	let i = Util.indexOf(this.patternIds, this.patternId);
	let nextI = i === this.patternIds.length-1 ? 0 : i + 1;
	this.patternId = this.patternIds[nextI];
	this.stop();
}

Pattern.prototype.clearCurrentPattern = function() {
	this.stop();
	let patternId = this.patternId;
	this.notes = this.notes.filter(function(note) {
		return note.patternId !== patternId;
	});
	let newNoteTimesTopic = eventBus.topicMap.newNoteTimesReady;
	eventBus.publish(newNoteTimesTopic, {notes: [], kind: 'pattern'});
}

Pattern.prototype.getNoteDuration = function(fname, when) {
	let patternId = this.patternId,
		notes = this.notes.filter(function(note) {
		return note.fname === fname && note.patternId === patternId;
	});
	if (notes.length === 0 || notes.length === 1) {
		return this.measureLength;
	}
	const reducer = function(noteTimes, note) {
		noteTimes.push(note.when);
		return noteTimes;
	}
	let greaterThan = notes.filter(function(note) {
		return note.when > when;
	}).reduce(reducer, []);
	let lessThan = notes.filter(function(note) {
		return note.when < when;
	}).reduce(reducer, []);

	let targetNoteTime;

	//	if the next note occurs after `when` in the same
	//	measure, its duration is `when` - `targetNoteTime`.
	//	otherwise, its duration is the length of the measure
	//	+ the `targetNoteTime`.

	if (greaterThan.length > 0) {
		targetNoteTime = Math.min(...greaterThan);
		return targetNoteTime - when;
	}

	targetNoteTime = Math.min(...lessThan);
	return this.measureLength - when + targetNoteTime;

}

export default Pattern;