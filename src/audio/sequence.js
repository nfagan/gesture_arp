import { webAudio } from './webaudio.js';
import { eventBus } from '../eventbus.js'
import { Util } from '../util.js';

function Sequence(sequenceSet, filename) {
	this.sequenceSet = sequenceSet;
	this.shape = undefined;
	this.id = Util.randId();
	this.filename = filename;
	this.shouldLoop = true;
	this.isActive = false;
	this.loopIndex = 0;
	this.nBeats = 4;
	this.noteLength = 'quarter';
	this.currentBeat = webAudio.getCurrentBeat();
	this.sources = [];
	this.subscribe();
}

Sequence.prototype.constructor = Sequence;

Sequence.prototype.subscribe = function() {
	let topicName = eventBus.topicMap.newShapeReady;
	eventBus.subscribe(topicName, this.registerShape.bind(this), this.id);
}

Sequence.prototype.registerShape = function(data) {
	let id = data.sequenceId,
		shape = data.shape;
	if (id !== this.id) return;
	if (shape === undefined) {
		this.nBeats = 4;
		this.noteLength = 'quarter';
		this.shape = shape;
		for (let i=0; i<this.sources.length; i++) {
			this.sources[i].stop(0);
		}
		return;
	}
	this.shape = shape;
	switch (shape.identity) {
		case 'triangle':
			this.nBeats = 4;
			this.noteLength = 'eighthTriplet';
			break;
		case 'rectangle':
			this.nBeats = 4;
			this.noteLength = 'quarter';
			break;
		case 'circle':
			this.nBeats = 4;
			this.noteLength = 'sixteenth';
			break;
		case 'line':
			this.nBeats = 4;
			this.noteLength = 'eighth';
			break;
		case 'random':
			this.nBeats = 4;
			this.noteLength = 'sixteenthTriplet';
			break;
	}
	// this.loopIndex = 0;
}

Sequence.prototype.loop = function() {
	let self = this,
		newActiveSequenceTopic = eventBus.topicMap.newActiveSequence;

	this.currentBeat = webAudio.getCurrentBeat();
	this.shouldLoop = true;
	this.loopIndex = 0;

	//	mark that a new active sequence has begun

	eventBus.publish(newActiveSequenceTopic, {
		sequenceId: this.id,
		sequenceSetId: this.sequenceSet.id
	});

	const looper = () => {

		if (!self.shouldLoop) return;

		let currentBeat = webAudio.getCurrentBeat(),
			nBeats = self.nBeats,
			loopIndex = self.loopIndex,
			filename = self.filename,
			noteLength = self.noteLength,
			shape = self.shape,
			points,
			newNotesReadyTopic = eventBus.topicMap.newNoteTimesReady;

		if (shape !== undefined) {
			// points = shape.vertices.copyPoints(shape.points)
			points = shape.points;
			if (shape.identity === 'rectangle') {
				points = [points[loopIndex]];
			}
		}			

		//	unless we've reached the next beat, do not proceed

		if (currentBeat === self.currentBeat) {
			window.requestAnimationFrame(looper);
			return;
		}

		//	Only calculate properties if we're the active sequence

		// if (this.isActive) {

		// }

		//	otherwise, schedule the appropriate number of notes associated with the
		//	current beat, and return the scheduled note times

		if (shape !== undefined) {
			let schedule = webAudio.schedulePlay(filename, {noteLength, sequence:self}),
				currentTime = webAudio.context.currentTime;
			//	mark self new note times are available
			eventBus.publish(newNotesReadyTopic, {
				sequenceId: self.id,
				sequenceSetId: self.sequenceSet.id,
				noteTimes: schedule.noteTimes,
				noteDuration: schedule.noteDuration,
				currentTime, 
				loopIndex, 
				shape,
				points
			});
		}

		//	mark the updated currentBeat

		self.currentBeat = currentBeat;

		//	if we're on the last beat of the sequence,
		//	quit out of the looping function, and alert the parent
		//	self it should move to the next sequence

		if (loopIndex === nBeats-1) {
			eventBus.publish('endOfSequence', {}, self.sequenceSet.id);
			return;
		}

		//	otherwise, proceed to the next beat

		self.loopIndex++;

		window.requestAnimationFrame(looper);
	}

	looper();
}

export { Sequence };