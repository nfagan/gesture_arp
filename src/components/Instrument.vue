<template>
	<div class="instrument">
		<div class="row interface">
			<div class="cell">
				<div @click="switchToArrangement()" class="circle circle--active"></div>
			</div>
			<div v-for="pattern in constraints" class="cell">
				<div @click="updateConstraint(pattern)" :style="getConstraintStyle(pattern)" :class="getConstraintClass(pattern)"></div>
			</div>
			<div class="cell">
				<div @click="toggleLoop()" class="circle circle--active transportControl">
					<div :class="getTransportClass()"></div>
				</div>
			</div>
		</div>
		<canvas v-capture-canvas="{type: 'INSTRUMENT'}" class="instrument__canvas"></canvas>
		<div class="row interface">
			<div class="cell">
				<div @click="clearShape()" class="instrument-cell"></div>
			</div>
			<div v-for="f in filenames" class="cell">
				<div @click="updateFilename(f)" class="instrument-cell">
					<div :class="getInstrumentClassNames(f)" :style="getInstrumentStyle(f)"></div>
				</div>
			</div>
		</div>
	</div>
</template>

<script>

import { eventBus } from '../eventbus.js';
import instruments from '../audio/instruments.js';
import { getSequenceConstraints } from '../audio/constraints.js';

const filenames = Object.keys(instruments),
	constraints = getSequenceConstraints();

export default {
	name: 'instrument',
	data() {
		return {
			filenames,
			constraints
		}
	},
	methods: {
		switchToArrangement() {
			this.$store.commit('switchMode', 'ARRANGEMENT');
			let manager = this.$store.state.sequenceSetManager,
				canAddMore = manager.canAddMoreColumns();
			if (canAddMore && manager.allShapesExist(0)) {
				this.$store.commit('updateColumnAdding', true);
			}
		},
		clearShape() {
			let clearShapeTopic = eventBus.topicMap.clearShape;
			eventBus.publish(clearShapeTopic, {});
		},
		toggleLoop() {
			this.$store.state.sequenceSetManager.toggleLoop();
		},
		updateFilename(f) {
			this.$store.state.sequenceSetManager.updateFilename(f);
		},
		updateConstraint(c) {
			this.$store.state.sequenceSetManager.updateConstraint(c);
		},
		getRgbString(f) {
			return instruments[f].rgbString;
		},
		getInstrumentStyle(f) {
			let rgbString = this.getRgbString(f);
			return {
				backgroundColor: rgbString
			}
		},
		getInstrumentClassNames(f) {
			let sequence = this.$store.state.editedSequence,
				className = 'instrument-dot';
			if (sequence === undefined) return className;
			if (f !== sequence.filename) return className;
			return className + ' instrument-dot--active';
		},
		getConstraintStyle(c) {
			return {
				backgroundColor: c.color
			}
		},
		getConstraintClass(c) {
			let sequence = this.$store.state.editedSequence,
				className = 'constraint';
			if (sequence === undefined) return className;
			if (c.name !== sequence.constraint.name) return className;
			return className + ' constraint--active';
		},
		getTransportClass() {
			if (this.$store.state.sequenceSetManager.isLooping) {
				return 'transportControl--playing';
			}
			return 'transportControl--stopped';
		}
	},
	directives: {
		captureCanvas(element, binding) {
			let values = binding.value;
			eventBus.publish('newSurface', {element, values});
		}
	},
	mounted() {
		let self = this;
		eventBus.subscribe(eventBus.topicMap.newEditedSequence, function(data) {
			self.$store.commit('updatedEditedSequence', data.sequence);
		});
		window.addEventListener('keydown', function(evt) {
			if (evt.keyCode !== 27) return;
			if (self.$store.state.mode === 'ARRANGEMENT') return;
			self.switchToArrangement();
		});
	}
}
</script>

<style type="text/css">
	@import '../style/_style.scss';
</style>

<style scoped>

.instrument {
	height: 95%; width: 95%; max-height: 500px; max-width: 500px;
	display: flex; flex-direction: column;
	overflow: scroll;
}

.instrument__canvas {
	flex-grow: 1; min-height: 0; cursor: crosshair;
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

.instrument-dot {
	width: 40%;
	height: 40%;
	border-radius: 50%;
}

.instrument-dot--active {
	width: 20%;
	height: 20%;
}

.transportControl {
	display: flex;
	align-items: center;
	justify-content: center;
}

.transportControl--playing {
	width: 25%;
	height: 25%;
	background-color: black;
}

.transportControl--stopped {
	width: 0; 
  height: 0; 
  border-top: 5px solid transparent;
  border-bottom: 5px solid transparent;
  border-left: 8px solid black;
  margin-left: 2px;
}

</style>