<template>
	<div class="container" :style="getContainerStyle()">
		<div v-if="canAddColumn() || canDeleteColumn()" class="row interface">
			<div v-if="canDeleteColumn()" @click="deleteColumn()" class="cell minusCircle">
				<div class="bar horizontalpx"></div>
			</div>
			<div v-if="canAddColumn()" @click="createColumn()" class="cell plusCircle">
				<div class="bar horizontalpx"></div>
  			<div class="bar verticalpx"></div>
			</div>
		</div>
		<div v-for="set in sequenceSets" class="row interface">
			<cell v-for="n in set.sequences.length" :index="n-1" :key="set.sequences[n-1].id"
			:sequenceId="set.sequences[n-1].id" :sequenceSetId="set.id"></cell>
		</div>
		<div class="row interface beatpadInterface">
			<div class="cell">
				<div v-show="canShowBeatpad()" @click="switchToBeatpad()" class="beatpad">
					<div v-for="row in rows" class="beatpadRow">
						<div v-for="(fname, index) in row" :style="getBeatpadStyle(fname)" class="beatpadCell">
							<canvas v-capture-canvas :data-filename="fname" :style="getBeatpadStyle(fname)" class="beatpadCanvas"></canvas>
						</div>
					</div>
				</div>
			</div>
		</div>
	</div>
</template>

<script>
import { eventBus } from '../eventbus.js';
import Cell from './Cell.vue';
import rows from '../audio/beatpad_rows.js';
import instruments from '../audio/instruments.js';

export default {
	name: 'arrangement',
	components: { Cell },
	computed: {
		sequenceSets() {
			return this.$store.state.sequenceSetManager.sequenceSets;
		}
	},
	data() {
		return { rows }
	},
	methods: {
		getContainerStyle() {
			let manager = this.$store.state.sequenceSetManager,
				addExtraHeight = this.canAddColumn() || this.canDeleteColumn(),
				showBeatpad = this.canShowBeatpad(),
				maxHeight = (manager.sequenceSets.length * 50);
			if (showBeatpad) maxHeight += 50;
			if (addExtraHeight) maxHeight += 50;
			maxHeight = maxHeight.toString() + 'px';
			let maxWidth = (manager.sequenceSets[0].sequences.length * 50) + 'px';
			return {
				maxWidth,
				maxHeight
			};
		},
		getBeatpadStyle(fname) {
			let color = instruments[fname].rgbString;
			return { backgroundColor: color }
		},
		switchToBeatpad() {
			this.$store.commit('switchMode', 'BEATPAD');
		},
		createColumn() {
			let manager = this.$store.state.sequenceSetManager,
				nColumns = manager.sequenceSets[0].sequences.length,
				maxNColumns = manager.maxNColumns;
			if (nColumns === maxNColumns-1) {
				this.$store.commit('updateColumnAdding', false);
			}
			manager.createNextColumn();
			this.$forceUpdate();
		},
		deleteColumn() {
			let manager = this.$store.state.sequenceSetManager,
				nColumns = manager.sequenceSets[0].sequences.length;
			if (nColumns === 1) {
				this.$store.commit('updateColumnDelete', false);
			} else {
				manager.deleteLastColumn();
			}
			this.$forceUpdate();
		},
		canAddColumn() {
			let manager = this.$store.state.sequenceSetManager,
				didShowPlus = this.$store.state.didShowPlus,
				canAddColumn = manager.canAddMoreColumns(),
				shapesExist = manager.allShapesExist(0);

			if (!canAddColumn) return false;
			if (!didShowPlus && !shapesExist) return false;
			if (!didShowPlus && shapesExist) {
				this.$store.commit('updateDidShowPlus', true);
			}
			return true;
		},
		canDeleteColumn() {
			let manager = this.$store.state.sequenceSetManager;
			return manager.sequenceSets[0].sequences.length > 1;
		},
		canShowBeatpad() {
			let canShowExtraRow = this.canAddColumn() || this.canDeleteColumn();
			return canShowExtraRow && this.$store.state.canShowBeatpad;
		}
	},
	directives: {
		captureCanvas(element) {
			let awaitAnimator = new Promise(function(resolve, reject) {
				eventBus.subscribe(eventBus.topicMap.animatorReady, function(data) {
					resolve(data.animator);
				});
			});
			awaitAnimator.then(function(animator) {
				animator.beatpadArrangementCanvases.push(element);
			});
		}
	}
}
</script>

<style type="text/css">
	@import '../style/_style.scss';
</style>

<style scoped>

.minusCircle {
	width: 25px;
  height: 25px;
  position: relative;
}

.plusCircle {
  width: 25px;
  height: 25px;
  position: relative;
}

.bar {
  margin: 0 auto;
  position: absolute;
  background-color: white;
}

.horizontalpx {
	width: 25px;
	height: 6.25px;
	left: 12.5px;
	top: 21.875px;
}

.verticalpx {
	height: 25px;
	width: 6.25px;
	top: 12.5px;
	left: 21.875px;
}

.container {
	display: flex;
	flex-direction: column;
	height: 95%;
	max-height: 250px;
	width: 95%;
	top: 0px;
	left: 0px;
	/*overflow: scroll;*/
	overflow: hidden;
}

.row {
	display: flex;
	align-items: center;
	justify-content: center;
	height: 50px;
	min-height: 50px;
	width: 100%;
}

.cell {
	display: flex;
	align-items: center;
	justify-content: center;
	height: 50px;
	width: 50px;
}

.control {
	position: relative;
	/*background-color: blue;*/
	height: 50px;
	width: 50px;
}

.beatpadInterface {
	background-color: white;
}

.beatpad {
	height: 50%;
	width: 50%;
	background-color: yellow;
	border-radius: 5%;
	display: flex;
	flex-direction: column;
	overflow: hidden;
}

.beatpadRow {
	height: 33.3333333%;
	width: 100%;
	display: flex; 
	flex-direction: row;
	justify-content: space-around;
}

.beatpadCell {
	box-sizing: border-box;
	width: 100%;
	height: 100%;
	display: flex;
	align-items: center;
	justify-content: center;
	overflow: hidden;
}

.beatpadCanvas {
	height: 100%;
	width: 100%;
}

</style>
