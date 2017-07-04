import { eventBus } from './eventbus.js';

function World() {
	this.shapes = [];
	this.subscribe();
	this.editedSequenceId = undefined;
	this.activeSequenceIds = [];
	this.activeSequenceSetId = undefined;
}

World.prototype.constructor = World;

World.prototype.subscribe = function() {
	let newShapeReadyTopic = eventBus.topicMap.newShapeReady,
		newSequenceSetCreatedTopic = eventBus.topicMap.newSequenceSetCreated,
		newSequenceCreatedTopic = eventBus.topicMap.newSequenceCreated,
		newActiveSequenceTopic = eventBus.topicMap.newActiveSequence,
		newActiveSequenceSetTopic = eventBus.topicMap.newActiveSequenceSet;

	eventBus.subscribe(newSequenceSetCreatedTopic, this.registerSequenceSet.bind(this));
	eventBus.subscribe(newSequenceCreatedTopic, this.registerSequence.bind(this));
	eventBus.subscribe(newShapeReadyTopic, this.registerShape.bind(this));
	eventBus.subscribe(newActiveSequenceTopic, this.updateActiveSequence.bind(this));
	eventBus.subscribe(newActiveSequenceSetTopic, this.updateActiveSequenceSet.bind(this));
}

World.prototype.updateEditedSequence = function() {
	let index = this.findActiveSequenceIdBySequenceSetId(this.activeSequenceSetId);
	this.editedSequenceId = this.activeSequenceIds[index].sequenceId;
}

World.prototype.updateActiveSequence = function(data) {
	let sequenceSetId = data.sequenceSetId,
		setId = data.sequenceId,
		index = this.findActiveSequenceIdBySequenceSetId(sequenceSetId);
	this.activeSequenceIds[index].sequenceId = setId;
	this.updateEditedSequence();
}

World.prototype.updateActiveSequenceSet = function(data) {
	this.activeSequenceSetId = data.sequenceSetId;
	this.updateEditedSequence();
}

World.prototype.registerSequenceSet = function(data) {
	this.activeSequenceIds.push({
		sequenceSetId: data.sequenceSetId,
		sequenceId: undefined
	});
}

World.prototype.registerSequence = function(data) {
	data.shape = undefined;
	this.registerShape(data);
}

World.prototype.registerShape = function(data) {
	let shape = data.shape,
		sequenceId = data.sequenceId,
		sequenceSetId = data.sequenceSetId;
	if (this.isShapeWithSequenceId(sequenceId)) {
		var ind = this.findShapeBySequenceId(sequenceId);
		this.shapes[ind].shape = shape;
	} else {
		this.shapes.push({
			shape,
			sequenceId,
			sequenceSetId
		});
	}
}

World.prototype.findActiveSequenceIdBySequenceSetId = function(id) {
	for (let i=0; i<this.activeSequenceIds.length; i++) {
		if (this.activeSequenceIds[i].sequenceSetId === id) return i;
	}
	return -1;
}

World.prototype.getShapesBySequenceSetId = function(id) {
	return this.shapes.filter(function(shape) {
		return shape.sequenceSetId === id;
	}).shape;
}

World.prototype.getShapeBySequenceId = function(id) {
	var ind = this.findShapeBySequenceId(id);
	if (ind === -1) return undefined;
	return this.shapes[ind].shape;
}

World.prototype.getEditedShape = function() {
	return this.getShapeBySequenceId(this.editedSequenceId);
}

World.prototype.findShapeBySequenceId = function(id) {
	for (var i=0; i<this.shapes.length; i++) {
		if (this.shapes[i].sequenceId === id) return i;
	}
	return -1;
}

World.prototype.isShapeWithSequenceId = function(id) {
	return this.findShapeBySequenceId(id) !== -1;
}

const world = new World();

export { world };