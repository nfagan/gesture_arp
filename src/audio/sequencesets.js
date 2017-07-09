import { eventBus } from '../eventbus.js';
import { SequenceSet } from './sequenceset.js';
import { world } from '../world.js';

function SequenceSets() {
	this.sequenceSets = [];
	this.sequenceSetIndex = 0;
	this.editedSequenceId = undefined;
	this.maxNColumns = 4;
	this.isLooping = false;
}

SequenceSets.prototype.constructor = SequenceSets;

SequenceSets.prototype.createSet = function(filename) {
	let set = new SequenceSet(filename),
		newSequenceSetTopicName = eventBus.topicMap.newSequenceSetCreated;
	eventBus.publish(newSequenceSetTopicName, {sequenceSetId: set.id});
	this.sequenceSets.push(set);
	return set;
}

SequenceSets.prototype.loop = function() {
	if (this.isLooping) return;
	for (let i=0; i<this.sequenceSets.length; i++) {
		this.sequenceSets[i].loop();
	}
	this.isLooping = true;
}

SequenceSets.prototype.cancelLoop = function() {
	if (!this.isLooping) return;
	for (let i=0; i<this.sequenceSets.length; i++) {
		this.sequenceSets[i].cancelLoop();
	}
	this.isLooping = false;
}

SequenceSets.prototype.toggleLoop = function() {
	if (this.isLooping) {
		this.cancelLoop();
	} else {
		this.loop();
	}
}

SequenceSets.prototype._toggleSequences = function() {
	var sequenceSetIds = this.sequenceSets.map(function(set) {
		return set.id;
	});
	this.sequenceSetIndex++;
	if (this.sequenceSetIndex > sequenceSetIds.length-1) {
		this.sequenceSetIndex = 0;
	}
	let currentId = sequenceSetIds[this.sequenceSetIndex];
	eventBus.publish(eventBus.topicMap.newActiveSequenceSet, {
		sequenceSetId: currentId
	});
}

SequenceSets.prototype.getSequenceSetById = function(id) {
	for (let i=0; i<this.sequenceSets.length; i++) {
		let currentSet = this.sequenceSets[i];
		if (currentSet.id === id) return currentSet;
	}
	return -1;
}

SequenceSets.prototype.sequenceExistsAtIndex = function(index) {
	return this.sequenceSets.some(function(set) {
		return set.sequences.length-1 === index;
	});
}

SequenceSets.prototype.createSequencesAtIndex = function(index) {
	for (let i=0; i<this.sequenceSets.length; i++) {
		let set = this.sequenceSets[i];
		set.createSequence(set.filename, index);
	}
}

SequenceSets.prototype.createNextColumn = function() {
	let index = this.sequenceSets[0].sequences.length-1;
	index++;
	this.createSequencesAtIndex(index);
}

SequenceSets.prototype.sequenceExists = function(setId, index) {
	let set = this.getSequenceSetById(setId);
	if (set.sequences[index] === undefined) return false;
	return true;
}

SequenceSets.prototype.shapeExists = function(setId, index) {
	if (!this.sequenceExists(setId, index)) return false;
	let set = this.getSequenceSetById(setId);
	if (set.sequences[index].shape === undefined) return false;
	return true;
}

SequenceSets.prototype.allShapesExist = function(index) {
	for (let i=0; i<this.sequenceSets.length; i++) {
		let set = this.sequenceSets[i],
			setId = set.id;
		if (!this.shapeExists(setId, index)) return false;
	}
	return true;
}

SequenceSets.prototype.handleClickedSequence = function(setId, index, store) {
	let set = this.getSequenceSetById(setId);
	if (!this.sequenceExists(setId, index)) {
		set.createSequence(set.filename, index);
	}
	this.markActiveSet(setId);
	let sequenceId = set.sequences[index].id;
	this.markEditedSequence(setId, sequenceId);
	for (let i=0; i<this.sequenceSets.length; i++) {
		this.sequenceSets[i].switchToColumn(index);
	}
	this.editedSequenceId = setId;
}

SequenceSets.prototype.markActiveSet = function(id) {
	let newActiveSetTopic = eventBus.topicMap.newActiveSequenceSet;
	eventBus.publish(newActiveSetTopic, {sequenceSetId: id});
}

SequenceSets.prototype.markEditedSequence = function(sequenceSetId, sequenceId) {
	let newEditedSequenceTopic = eventBus.topicMap.newEditedSequence,
		sequence = this.getSequenceSetById(sequenceSetId)
			.getSequenceById(sequenceId);
	eventBus.publish(newEditedSequenceTopic, {
		sequenceSetId,
		sequenceId,
		sequence
	});
}

SequenceSets.prototype.getEditedSequence = function() {
	let set = this.getSequenceSetById(world.activeSequenceSetId);
	return set.getSequenceById(world.editedSequenceId);
}

SequenceSets.prototype.updateFilename = function(filename) {
	let sequence = this.getEditedSequence();
	sequence.filename = filename;
}

SequenceSets.prototype.updateConstraint = function(constraint) {
	let sequence = this.getEditedSequence();
	sequence.constraint = constraint;
}

SequenceSets.prototype.canAddMoreColumns = function() {
	if (this.sequenceSets[0].sequences.length === this.maxNColumns) {
		return false;
	}
	return true;
}

SequenceSets.prototype.deleteLastColumn = function() {
	for (let i=0; i<this.sequenceSets.length; i++) {
		this.sequenceSets[i].deleteLastSequence();
	}
}

export { SequenceSets };

