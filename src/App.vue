<template>
	<div id="app">
		<sequencer v-if="soundsAreLoaded()"></sequencer>
		<div v-else>
			Loading ...
		</div>
	</div>
</template>

<script>
import Sequencer from './components/Sequencer';

export default {
	name: 'app',
	components: { Sequencer },
	methods: {
		soundsAreLoaded() {
			return this.$store.state.soundsAreLoaded
		}
	}
}
</script>

<style>

body {
	margin: 0;
	padding: 0;
}

#app {
	height: 100%;
	width: 100%;
}
</style>
