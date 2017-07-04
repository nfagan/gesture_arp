import { eventBus } from '../eventbus.js';
import { SequenceSet } from './sequenceset.js';

function SequenceSets() {
	this.sequenceSets = [];
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
	for (let i=0; i<this.sequenceSets.length; i++) {
		this.sequenceSets[i].loop();
	}
}

SequenceSets.prototype.cancelLoop = function() {
	for (let i=0; i<this.sequenceSets.length; i++) {
		this.sequenceSets[i].cancelLoop();
	}
}

export { SequenceSets };

