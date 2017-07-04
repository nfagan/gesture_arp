import { eventBus } from '../eventbus.js';
import { webAudio } from './webaudio.js';
import { Util } from '../util.js';
import { Sequence } from './sequence.js';

function SequenceSet() {
	this.sequences = [];
	this.activeSequenceIndex = undefined;
	this.activeSequenceId = undefined;
	this.id = Util.randId();
	this.subscribe();
}

SequenceSet.prototype.constructor = SequenceSet;

SequenceSet.prototype.subscribe = function() {
	let topicNextSequence = eventBus.topicMap.endOfSequence;
	eventBus.subscribe(topicNextSequence, this.nextSequence.bind(this), this.id);
}

SequenceSet.prototype.cancelLoop = function() {
	if (this.sequences.length === 0) return;
	this.sequences[this.activeSequenceIndex].shouldLoop = false;
}

SequenceSet.prototype.loop = function() {
	if (this.sequences.length === 0) return;
	let currentSequence = this.sequences[this.activeSequenceIndex];
	this.activeSequenceId = currentSequence.id;
	currentSequence.loop();
}

SequenceSet.prototype.nextSequence = function() {
	if (this.activeSequenceIndex === this.sequences.length-1) {
		this.activeSequenceIndex = 0;
	} else {
		this.activeSequenceIndex++;
	}
	this.loop();
}

SequenceSet.prototype.createSequence = function(filename) {
	let sequence = new Sequence(this, filename),
		setId = this.id;
	this.sequences.push(sequence);
	if (this.sequences.length === 1) {
		this.activeSequenceIndex = 0;
		this.activeSequenceId = sequence.id;
	}
	eventBus.publish(eventBus.topicMap.newSequenceCreated, {
		sequenceId: sequence.id,
		sequenceSetId: setId
	});
}

export { SequenceSet };