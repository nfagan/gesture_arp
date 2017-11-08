<template>
	<div class="instrument">
		<div v-capture-container class="beatpadContainer">
			<div v-for="row in rows" class="beatpadRow">
				<div v-for="(fname, index) in row" class="beatpadCell">
					<div :data-filename="fname" :style="getPadStyle(fname)" class="beatpadPad">
						<canvas v-capture-beatpad :data-filename="fname" class="beatpadCanvas"></canvas>
					</div>
				</div>
			</div>
		</div>
		<div class="control arrangementControl">
			<div @click="switchToArrangement()" class="circle circleControl"></div>
			<!-- <div class="circle circleControl"></div> -->
		</div>
		<div class="control clearPatternControl">
			<div @click="clearPattern()" class="circle circleControl patternSelector">
				<div v-if="notesExist()" class="clearPatternControlNotesExist"></div>
			</div>
		</div>
	</div>
</template>

<script type="text/javascript">

import { eventBus } from '../eventbus.js';
import instruments from '../audio/instruments.js';
import rows from '../audio/beatpad_rows.js';

export default {
	name: 'beatpad',
	data() {
		return {
			rows
		}
	},
	methods: {
		switchToArrangement() {
			this.$store.commit('switchMode', 'ARRANGEMENT');
		},
		clearPattern() {
			let manager = this.$store.state.sequenceSetManager;
			manager.pattern.clearCurrentPattern();
		},
		toggleQuantization() {
			let manager = this.$store.state.sequenceSetManager;
			manager.pattern.shouldQuantize = !manager.pattern.shouldQuantize;
		},
		getPadStyle(fname) {
			let color = instruments[fname].rgbString;
			// return { border: 'solid 3px' }
			// return { border: 'solid 3px ' + color }
			return { backgroundColor: color }
		},
		notesExist() {
			let manager = this.$store.state.sequenceSetManager;
			return manager.pattern.notes.length > 0;
		}
	},
	directives: {
		captureContainer(element, binding) {
			eventBus.publish(eventBus.topicMap.beatpadContainerReady, {
				element,
			});
		},
		captureBeatpad(element, binding) {
			let awaitAnimator = new Promise(function(resolve, reject) {
				eventBus.subscribe(eventBus.topicMap.animatorReady, function(data) {
					resolve(data.animator);
				});
			});
			awaitAnimator.then(function(animator) {
				animator.beatpadCanvases.push({
					element,
					filename: element.dataset.filename
				});
			});
		}
	},
	mounted() {
		let self = this;
		//	listen for B key to switch to beatpad
		window.addEventListener('keydown', function(e) {
			let mode = self.$store.state.mode;
			if (e.keyCode === 66) {
				if (mode === 'BEATPAD') return;
				self.$store.commit('switchMode', 'BEATPAD');
			}
			if (e.keyCode === 67) {
				if (mode !== 'BEATPAD') return;
				self.clearPattern();
			}
		});
		//	set height of beatpad rows
		let nrows = this.rows.length,
			container = this.$el.children[0],
			rows = container.children,
			height = ((1/nrows)*100) + '%';
		for (let i=0; i<rows.length; i++) {
			rows[i].style.height = height;
		}
	}
}
	
</script>

<style type="text/css">
	@import '../style/_style.scss';
</style>

<style type="scss" scoped>

.instrument {
	height: 95%; width: 95%; max-height: 500px; max-width: 500px;
	display: flex; flex-direction: column;
	/*overflow: scroll;*/
	overflow: hidden;
	position: relative;
}

.beatpadContainer {
	flex-grow: 1; min-height: 0; cursor: crosshair;
	display: flex; flex-direction: column;
	height: 100%;
	width: 100%;
	box-sizing: border-box;
}

.beatpadRow {
	box-sizing: border-box;
	/*border: solid 5px green;*/
	height: 25%;
	width: 100%;
	display: flex; 
	flex-direction: row;
	justify-content: space-around;
}

.beatpadCell {
	box-sizing: border-box;
	width: 100%;
	display: flex;
	align-items: center;
	justify-content: center;
}

.beatpadCellControl {
	width: 20%;
}

.beatpadPad {
	height: 50px;
	width: 50%;
	max-width: 100px;
	max-height: 50px;
	box-sizing: border-box;
	/*border: solid 5px;*/
	border-radius: 5%;
	display: flex;
	align-items: center;
	justify-content: center;
	/*background-color: blue;*/
}

.row {
	height: 50px; min-height: 50px; width: 100%;
	display: flex; justify-content: space-between;
	/*background-color: yellow;*/
}

.cell {
	height: 100%; min-width: 50px; display: flex;
	align-items: center; justify-content: center;
	/*box-sizing: border-box; border: solid 1px;*/
}

.constraint {
	height: 25px;
	width: 25px;
	border-radius: 10%;
	box-sizing: border-box;
}

.constraint--active {
	border: solid 3px;
}

.instrument-cell {
	border-radius: 10%;
	width: 25px;
	height: 25px;
	display: flex;
	align-items: center;
	justify-content: center;
	background-color: white;
}

.control {
	width: 100%;
	height: 10%;
	display: flex;
	align-items: center;
	justify-content: center;
}

.arrangementControl {
	position: absolute;
	top: 28.3333%;
	left: 0%;
	/*justify-content: space-around;*/
}

.clearPatternControl {
	position: absolute;
	left: 0%;
	top: 61.6666%;
	justify-content: space-around;
}

.clearPatternControlNotesExist {
	height: 10%;
	width: 50%;
	background-color: black;
}

.circleControl {
	min-width: 25px;
	min-height: 25px;
	background-color: yellow;
	/*border: solid 2px;*/
}

.patternSelector {
	display: flex;
	align-items: center;
	justify-content: center;
	background-color: white;
	border: solid 2px;
	box-sizing: border-box;
}

.circleInstrument {
	border-radius: 50%;
	width: 10px;
	height: 10px;
}

.beatpadCanvas {
	height: 100%;
	width: 100%;
}

</style>