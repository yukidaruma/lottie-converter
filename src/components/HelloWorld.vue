<template>
  <div class="hello">
    <div id="animation-container"></div>
    <video v-if="videoDataUrl" :src="videoDataUrl" autoplay controls loop />
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

const xmlSerializer = new XMLSerializer();

@Component
export default class HelloWorld extends Vue {
  animation: AnimationItem | null = null;
  removeListner: Function | null = null;
  isAnimating: boolean = false;
  videoDataUrl: string = '';

  loadAnimation(lottieJson: string) {
    const canvas = document.createElement('canvas');
    canvas.height = 320;
    canvas.width = 320;
    const context = canvas.getContext('2d');
    context.fillStyle = '#ffffff';
    const stream = canvas.captureStream();
    const recorder = new MediaRecorder(stream, { mimeType: "video/webm" });
    const data = [];
    recorder.ondataavailable = function(event) {
      if (event.data && event.data.size) {
        data.push(event.data);
      }
    };
    recorder.onstop = () => {
      this.videoDataUrl = URL.createObjectURL(new Blob(data, { type: "video/webm" }));
    };

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

    this.animation.addEventListener('enterFrame', () => {
      if (recorder.state === 'inactive') {
        recorder.start();
      }

      const svg = document.querySelector('#animation-container svg');
      const xml = xmlSerializer.serializeToString(svg);
      const dataUrl = URL.createObjectURL(new Blob([xml], {type: "image/svg+xml"}));
      const img = new Image(320, 320);
      img.height = 320;
      img.width = 320;
      img.src = dataUrl;
      img.onload = () => {
        context.fillRect(0, 0, 320, 320);
        context.drawImage(img, 0, 0, 320, 320);
      };
    });
    this.animation.addEventListener('complete', () => {
      recorder.stop();
    });
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
