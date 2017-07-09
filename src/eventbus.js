// http://dev.housetrip.com/2014/09/15/decoupling-javascript-apps-using-pub-sub-pattern/

function EventBus() {
	this.topics = {}
	this.topicMap = {
		modeChange: 'modeChange',
		canvasResize: 'canvasResize',
		canvasResizeEnd: 'canvasResizeEnd',
		newShapeReady: 'newShapeReady',
		endOfSequence: 'endOfSequence',
		newSequenceSetCreated: 'newSequenceSetCreated',
		newSequenceCreated: 'newSequenceCreated',
		newActiveSequence: 'newActiveSequence',
		newEditedSequence: 'newEditedSequence',
		newActiveSequenceSet: 'newActiveSequenceSet',
		newNoteTimesReady: 'newNoteTimesReady',
		clearShape: 'clearShape',
		newSurface: 'newSurface',
		deletedColumn: 'deletedColumn',
		soundsLoaded: 'soundsLoaded'
	}
}

EventBus.prototype.constructor = EventBus

EventBus.prototype.subscribe = function(topic, listener, id) {
  	if (!this.topics[topic]) this.topics[topic] = [];

  	this.topics[topic].push( { method: listener, id } )
}

EventBus.prototype.publish = function(topic, data, to) {
  	if (!this.topics[topic]) {
		throw new Error(`No ${topic} exists`);
  	}
  	if (this.topics.length < 1) return;
  	this.topics[topic].forEach( (listener) => {
		if (typeof to == 'undefined') {
		  	listener.method(data || {});
		} else {
		  	if (to === listener.id) {
				listener.method(data || {});
		  	}
		}
  	})
}

const eventBus = new EventBus();

export { eventBus }