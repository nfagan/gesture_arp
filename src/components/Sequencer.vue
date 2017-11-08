<template>
	<div id="sequencer">
		<instrument v-show="getMode() === 'INSTRUMENT'"></instrument>
		<arrangement v-show="getMode() === 'ARRANGEMENT'"></arrangement>
		<beatpad v-show="getMode() === 'BEATPAD'"></beatpad>
	</div>
</template>

<script>
import Instrument from './Instrument';
import Arrangement from './Arrangement';
import Beatpad from './Beatpad';
import { eventBus } from '../eventbus.js';

export default {
	name: 'sequencer',
	components: { Instrument, Arrangement, Beatpad },
	mounted() {
		let el = this.$el;
		function resizer() {
			el.style.width = window.innerWidth.toString() + 'px';
			el.style.height = window.innerHeight.toString() + 'px';
		}
		window.addEventListener('resize', resizer);
		resizer();
	},
	methods: {
		getMode() {
			return this.$store.state.mode;
		}
	}
}
</script>

<style>

#sequencer {
	height: 100vh;
	width: 100vw;
	display: flex;
	align-items: center;
	justify-content: center;
}
</style>
