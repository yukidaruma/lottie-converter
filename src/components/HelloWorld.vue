<template>
  <div class="hello">
    <div id="animation-container"></div>
  </div>
</template>

<script lang="ts">
import dragDrop from 'drag-drop';
import { ungzip } from 'pako';
import lottie, { AnimationItem } from 'lottie-web';
import { Component, Prop, Vue } from 'vue-property-decorator';

const loadTgs = (filereader): string | null => {
  const buffer = filereader.result as ArrayBuffer;
  const hoge = new Uint8Array(buffer);

  if (hoge[0] === 0x1f && hoge[1] === 0x8b) {
    try {
      return ungzip(hoge, { to: 'string' });
    } catch (e) {
      console.error('corrupt gzip');
      return null;
    }
  } else {
    console.error('invalid filetype')
    return null;
  }
};
const loadLottieJSON = (filereader: FileReader) => filereader.result as string;

@Component
export default class HelloWorld extends Vue {
  animation: AnimationItem | null = null;
  removeListner: Function | null = null;
  isAnimating: boolean = false;

  loadAnimation(lottieJson: string) {
    let animationData;
    try {
      animationData = JSON.parse(lottieJson);
    } catch (e) {
      console.error('invalid JSON');
      return;
    }

    if (this.animation) {
      this.animation.destroy();
      this.videoDataUrl = '';
    }

    this.animation = lottie.loadAnimation({
      animationData,
      container: document.getElementById('animation-container'),
      // loop: true,
    });
    this.isAnimating = true;
  }

  mounted() {
    this.removeListner = dragDrop('.hello', (files) => {
      const file = files[0];
      const filereader = new FileReader();

      if (file.type === 'application/json') {
        filereader.readAsText(file);
        filereader.addEventListener('load', () => this.loadAnimation(loadLottieJSON(filereader)));
      } else {
        // binary file
        filereader.readAsArrayBuffer(file);
        filereader.addEventListener('load', () => this.loadAnimation(loadTgs(filereader)));
      }
    });
  }
}
</script>

<style scoped lang="scss">
.hello {
  width: 100%;
  height: 100%;
}
#animation-container, video {
  width: 320px;
  height: 320px;
}
</style>
