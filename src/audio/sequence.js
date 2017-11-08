import { webAudio } from './webaudio.js';
import { eventBus } from '../eventbus.js'
import { Util } from '../util.js';
import { getSequenceConstraints } from './constraints';
import { Point } from '../geometry/vertices.js';

function Sequence(sequenceSet, filename) {
	this.sequenceSet = sequenceSet;
	this.shape = undefined;
	this.id = Util.randId();
	this.index = 0;
	this.filename = filename;
	this.shouldLoop = true;
	this.isActive = false;
	this.isLooping = false;
	this.loopIndex = 0;
	this.nBeats = 4;
	this.noteLength = 'quarter';
	this.constraints = getSequenceConstraints();
	this.constraint = this.constraints[0];
	this.currentBeat = webAudio.getCurrentBeat();
	this.sources = [];
	this.previousWidth = undefined;
	this.previousHeight = undefined;
	this.mode = undefined;
	this.animationFrameId = undefined;
	this.subscribe();
}

Sequence.prototype.constructor = Sequence;

Sequence.prototype.subscribe = function() {
	let newShapeReadyTopic = eventBus.topicMap.newShapeReady,
		canvasResizeTopic = eventBus.topicMap.canvasResize,
		modeChangeTopic = eventBus.topicMap.modeChange;
	eventBus.subscribe(newShapeReadyTopic, this.registerShape.bind(this), this.id);
	eventBus.subscribe(modeChangeTopic, this.handleModeChange.bind(this));
	eventBus.subscribe(canvasResizeTopic, this.handleCanvasResize.bind(this));
}

Sequence.prototype.registerShape = function(data) {
	let id = data.sequenceId,
		shape = data.shape;
	if (id !== this.id) return;
	if (shape === undefined) {
		this.nBeats = 4;
		this.noteLength = 'quarter';
		this.shape = shape;
		this.stopSources();
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
}

Sequence.prototype.cancelLoop = function() {
	window.cancelAnimationFrame(this.animationFrameId);
	this.stopSources();
	this.isLooping = false;
}

Sequence.prototype.stopSources = function() {
	for (let i=0; i<this.sources.length; i++) {
		try {
			this.sources[i].stop(0);
		} catch (err) {
			console.warn('Could not stop playback.');
		}
	}
}

Sequence.prototype.handleModeChange = function(data) {
	this.mode = data;
}

Sequence.prototype.handleCanvasResize = function(data) {
	let width = data.canvasWidth,
		height = data.canvasHeight;
	if (width === 0 && height === 0) return;
	if (this.mode === 'ARRANGEMENT' || this.mode === 'BEATPAD') return;
	this.previousWidth = width;
	this.previousHeight = height;
}

Sequence.prototype.getPercentageCoordinates = function(points, width, height) {
	var coords = [];
	for (let i=0; i<points.length; i++) {
		let x = bounder(points[i].x / width),
			y = bounder(points[i].y / height),
			ind = points[i].index;
		coords.push(new Point(x, y, ind));
	}
	function bounder(a) {
		if (a < 0) return 0;
		if (a > 1) return 1;
		return a;
	}
	return coords;
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
		sequenceSetId: this.sequenceSet.id,
		sequenceIndex: this.index
	});

	const looper = () => {

		if (!self.shouldLoop) {
			return;
		}

		self.isLooping = true;

		let currentBeat = webAudio.getCurrentBeat(),
			nBeats = self.nBeats,
			loopIndex = self.loopIndex,
			filename = self.filename,
			noteLength = self.noteLength,
			shape = self.shape,
			points,
			radius,
			newNotesReadyTopic = eventBus.topicMap.newNoteTimesReady;

		if (shape !== undefined) {
			// points = shape.vertices.copyPoints(shape.points)
			points = shape.points;
			if (shape.identity === 'rectangle') {
				points = [points[loopIndex]];
			} else if (shape.identity === 'circle') {
				let pt = shape.center;
				points = shape.vertices.repPoint(pt, 4);
				radius = [{x: shape.radius, y: shape.radius}];
			} else if (shape.identity === 'random') {
				let pt = shape.points[0];
				points = shape.vertices.repPoint(pt, 6)
			}
		}

		//	unless we've reached the next beat, do not proceed

		if (currentBeat === self.currentBeat) {
			self.animationFrameId = window.requestAnimationFrame(looper);
			return;
		}

		//	otherwise, schedule the appropriate number of notes associated with the
		//	current beat, and return the scheduled note times

		let width, height;

		if (shape !== undefined) {
			let ratio = window.devicePixelRatio || 1;
			if (self.mode === 'INSTRUMENT') {
				width = shape.canvas.width/ratio;
				height = shape.canvas.height/ratio;
			} else if (self.mode === 'ARRANGEMENT' || self.mode === 'BEATPAD') {
				width = self.previousWidth;
				height = self.previousHeight;
			}
			if (shape.identity === 'circle') {
				radius = self.getPercentageCoordinates(radius, width, height);
			}
			let coordinates = self.getPercentageCoordinates(points, width, height),
				schedule = webAudio.schedulePlay(filename, {
					noteLength, 
					sequence:self, 
					coordinates,
					identity: shape.identity,
					radius
				}),
				currentTime = webAudio.context.currentTime;
			//	mark self new note times are available
			eventBus.publish(newNotesReadyTopic, {
				kind: 'sequence',
				sequenceId: self.id,
				sequenceIndex: self.index,
				sequenceSetId: self.sequenceSet.id,
				noteTimes: schedule.noteTimes,
				noteDuration: schedule.noteDuration,
				currentTime, 
				loopIndex, 
				shape,
				points,
				coordinates,
				constraint: self.constraint,
				filename
			});
		}

		self.previousWidth = width;
		self.previousHeight = height;

		//	mark the updated currentBeat

		self.currentBeat = currentBeat;

		//	if we're on the last beat of the sequence,
		//	quit out of the looping function, and alert the parent
		//	self it should move to the next sequence

		if (loopIndex === nBeats-1) {
			self.isLooping = false;
			eventBus.publish('endOfSequence', {}, self.sequenceSet.id);
			return;
		}

		//	otherwise, proceed to the next beat

		self.loopIndex++;

		self.animationFrameId = window.requestAnimationFrame(looper);
	}

	looper();
}

export { Sequence };