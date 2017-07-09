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
	</div>
</template>

<script>
import { eventBus } from '../eventbus.js';
import Cell from './Cell.vue';

export default {
	name: 'arrangement',
	components: { Cell },
	computed: {
		sequenceSets() {
			return this.$store.state.sequenceSetManager.sequenceSets;
		}
	},
	methods: {
		getContainerStyle() {
			let manager = this.$store.state.sequenceSetManager,
				addExtraHeight = this.canAddColumn() || this.canDeleteColumn(),
				maxHeight = (manager.sequenceSets.length * 50);
			if (addExtraHeight) maxHeight += 50;
			maxHeight = maxHeight.toString() + 'px';
			let maxWidth = (manager.sequenceSets[0].sequences.length * 50) + 'px';
			return {
				maxWidth,
				maxHeight
			};
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
	overflow: scroll;
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

</style>
