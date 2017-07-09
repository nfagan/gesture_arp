import { webAudio } from '../audio/webaudio.js';
import { eventBus } from '../eventbus.js';
import { SequenceSets } from '../audio/sequencesets.js';

const sequenceSetManager = new SequenceSets(),
	NSETS = 4,
	NSEQUENCES = 1,
	filenames = webAudio.filenames;

for (let i=0; i<NSETS; i++) {
	let set = sequenceSetManager.createSet(filenames[i]),
		topic = eventBus.topicMap.newActiveSequenceSet;
	eventBus.publish(topic, {sequenceSetId: set.id});
	for (let j=0; j<NSEQUENCES; j++) {
		set.createSequence(set.filename, j);
	}
}

export { sequenceSetManager };
