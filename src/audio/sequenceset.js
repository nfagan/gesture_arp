import { eventBus } from '../eventbus.js';
import { webAudio } from './webaudio.js';
import { Util } from '../util.js';
import { Sequence } from './sequence.js';

function SequenceSet(filename) {
	this.filename = filename;
	this.sequences = [];
	this.hasEditedSequence = false;
	this.editedSequenceIndex = undefined;
	this.editedSequenceId = undefined;
	this.activeSequenceIndex = undefined;
	this.activeSequenceId = undefined;
	this.id = Util.randId();
	this.mode = undefined;
	this.isLooping = false;
	this.subscribe();
}

SequenceSet.prototype.constructor = SequenceSet;

SequenceSet.prototype.subscribe = function() {
	let topicNextSequence = eventBus.topicMap.endOfSequence,
		topicModeChange = eventBus.topicMap.modeChange,
		topicEditedSequence = eventBus.topicMap.newEditedSequence;
	eventBus.subscribe(topicNextSequence, this.nextSequence.bind(this), this.id);
	eventBus.subscribe(topicModeChange, this.changeMode.bind(this));
	eventBus.subscribe(topicEditedSequence, this.handleNewEditedSequence.bind(this));
}

SequenceSet.prototype.resetLoopIndices = function() {
	for (let i=0; i<this.sequences.length; i++) {
		if (this.sequences[i] !== undefined) {
			this.sequences[i].loopIndex = 0;
		}
	}
}

SequenceSet.prototype.cancelLoop = function() {
	this.isLooping = false;
	if (this.sequences.length === 0) return;
	this.sequences[this.activeSequenceIndex].cancelLoop();
}

SequenceSet.prototype.forceCancelLoop = function() {
	this.isLooping = false;
	let N = this.sequences.length;
	if (N === 0 || N === 1) return;
	let nonEditedSequences = this.getNonEditedSequences();
	nonEditedSequences.map(function(seq) {
		seq.cancelLoop();
	});
}

SequenceSet.prototype.forceCancelAllLoops = function() {
	this.isLooping = false;
	for (let i=0; i<this.sequences.length; i++) {
		this.sequences[i].cancelLoop();
	}
}

SequenceSet.prototype.loop = function() {
	this.isLooping = true;
	if (this.sequences.length === 0) return;
	//	make sure there aren't any queued loops
	let loopingSequences = this.getLoopingSequences();
	if (loopingSequences.length !== 0) {
		// console.warn('More than 0 - loop');
		return;
	}
	let currentSequence = this.sequences[this.activeSequenceIndex];
	if (currentSequence === undefined) {
		this.nextSequence();
		return;
	}
	this.activeSequenceId = currentSequence.id;
	currentSequence.loop();
}

SequenceSet.prototype.nextSequence = function() {
	if (this.mode === 'INSTRUMENT') {
		this.loop();
		return;
	}
	if (this.activeSequenceIndex === this.sequences.length-1) {
		this.activeSequenceIndex = 0;
	} else {
		this.activeSequenceIndex++;
	}
	this.loop();
}

SequenceSet.prototype.switchToColumn = function(index) {
	let shouldResumeLoop = this.isLooping,
		shouldCancelLoop = this.sequences.length > 1;
		// shouldCancelLoop = index !== this.activeSequenceIndex;
	if (shouldCancelLoop) {
		this.forceCancelAllLoops();
		this.activeSequenceIndex = index;
	}
	if (shouldResumeLoop) this.loop();
}

SequenceSet.prototype.handleNewEditedSequence = function(data) {
	if (data.sequenceSetId !== this.id) {
		this.hasEditedSequence = false;
		return;
	}
	let definedSequences = this.sequences.filter(function(seq) {
		return seq !== undefined;
	});
	this.hasEditedSequence = true;
	let sequenceId = data.sequenceId;
	this.activeSequenceIndex = this.getIndexOfSequenceId(sequenceId);
	this.editedSequenceIndex = this.activeSequenceIndex;
	this.editedSequenceId = sequenceId;
	let shouldResumeLoop = false;
	if (this.isLooping) {
		shouldResumeLoop = true;
	}
	if (definedSequences.length > 1) this.forceCancelLoop();
	if (shouldResumeLoop) this.loop();
}

SequenceSet.prototype.getSequenceIds = function() {
	let ids = [];
	for (let i=0; i<this.sequences.length; i++) {
		if (this.sequences[i] === undefined) {
			ids.push(undefined);
			continue;
		}
		ids.push(this.sequences[i].id);
	}
	return ids;
}

SequenceSet.prototype.getNonEditedSequences = function() {
	let self = this;
	return this.sequences.filter(function(seq) {
		return seq.id !== self.editedSequenceId;
	});
}

SequenceSet.prototype.getDefinedSequences = function() {
	return this.sequences.filter(function(seq) {
		return seq !== undefined;
	});
}
SequenceSet.prototype.getLoopingSequences = function() {
	return this.sequences.filter(function(seq) {
		return seq.isLooping;
	});
}

SequenceSet.prototype.getIndexOfSequenceId = function(id) {
	let ids = this.getSequenceIds();
	return Util.indexOf(ids, id);
}

SequenceSet.prototype.getSequenceById = function(id) {
	return this.sequences[this.getIndexOfSequenceId(id)];
}

SequenceSet.prototype.changeMode = function(to) {
	this.mode = to;
}

SequenceSet.prototype.createSequence = function(filename, index) {
	let sequence = new Sequence(this, filename),
		setId = this.id;
	if (index === undefined) {
		index = this.sequences.length-1;
	}
	this.sequences[index] = sequence;
	sequence.index = index;
	if (this.sequences.length === 1) {
		this.activeSequenceIndex = index;
		this.activeSequenceId = sequence.id;
	}
	eventBus.publish(eventBus.topicMap.newSequenceCreated, {
		sequenceId: sequence.id,
		sequenceSetId: setId,
		sequenceIndex: index
	});
}

SequenceSet.prototype.deleteLastSequence = function() {
	let wasLooping = this.isLooping;
	this.forceCancelAllLoops();
	this.sequences.splice(this.sequences.length-1, 1);
	this.activeSequenceIndex = 0;
	this.resetLoopIndices();
	eventBus.publish(eventBus.topicMap.deletedColumn, {});
	if (wasLooping) this.loop();
}

export { SequenceSet };