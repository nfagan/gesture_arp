import Vue from 'vue'
import Vuex from 'vuex'
import App from './App'
import router from './router'
import { eventBus } from './eventbus.js';
import { webAudio } from './audio/webaudio.js';
import './interface/setup.js';
import { sequenceSetManager } from './audio/setup.js';

Vue.use(Vuex);

let startingMode = 'ARRANGEMENT';

const store = new Vuex.Store({
	state: {
		sequenceSetManager,
		mode: startingMode,
		soundsAreLoaded: false,
		editedSequence: undefined,
		canAddColumn: false,
		didShowPlus: false,
		canDeleteColumn: false
	},
	mutations: {
		switchMode(state, to) {
			if (to !== 'ARRANGEMENT' && to !== 'INSTRUMENT') {
				throw new Error(`Unrecognized view mode ${to}`)
			}
			state.mode = to;
			eventBus.publish('modeChange', to);
		},
		markSoundsAreLoaded(state, to) { state.soundsAreLoaded = to },
		updateDidShowPlus(state, to) { state.didShowPlus = to; },
		updateColumnAdding(state, to) { state.canAddColumn = to; },
		updateColumnDelete(state, to) { state.canDeleteColumn = to; },
		updatedEditedSequence(state, to) { state.editedSequence = to; }
	}
});

store.commit('switchMode', startingMode);

sequenceSetManager.loop();

window.addEventListener('keydown', function(evt) {
	if (evt.keyCode === 32) sequenceSetManager.toggleLoop();
});

webAudio.loadSounds()
	.then(function() {
		store.commit('markSoundsAreLoaded', true);
	});

Vue.config.productionTip = false

/* eslint-disable no-new */
new Vue({
	el: '#app',
	store,
	router,
	template: '<App/>',
	components: { App }
})
