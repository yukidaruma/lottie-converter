<template>
  <div class="hello">
    <div id="animation-container" ref="animationContainer"></div>
    <div v-if="recorderType === 'webm'">
      <video v-if="videoDataUrl" :src="videoDataUrl" autoplay controls loop />
    </div>
    <div v-else-if="recorderType === 'gif'">
      <img v-if="videoDataUrl" :src="videoDataUrl">
    </div>
    <div>
      Video file format:
      <label><input v-model="recorderType" value="gif" type="radio" :disabled="isRecording" @change="destroyAnimation">Gif</label>
      <label><input v-model="recorderType" value="webm" type="radio" :disabled="isRecording" @change="destroyAnimation">Webm</label>
    </div>
  </div>
</template>

<script lang="ts">
import { ungzip } from 'pako';
import lottie, { AnimationItem } from 'lottie-web';
import { Component, Prop, Vue } from 'vue-property-decorator';
import workerBlob from '../gif-worker-blob';
// @ts-ignore
const dragDrop: any = require('drag-drop');
// @ts-ignore
const Gif: any = require('gif.js');

const loadTgs = (filereader: FileReader): string | null => {
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
  gif: any = null;
  isAnimating: boolean = false;
  videoDataUrl: string = '';
  removeListner: Function | null = null;
  recorderType: 'gif' | 'webm' = 'gif';
  objectUrls: string[] = [];
  isRecording: boolean = false;

  destroyAnimation() {
    if (this.animation) {
      this.animation.destroy();
    }
    this.videoDataUrl = '';
    this.objectUrls.forEach(objectUrl => URL.revokeObjectURL(objectUrl));
  }
  createObjectUrl(blob: Blob): string {
    const objectUrl = URL.createObjectURL(blob);
    this.objectUrls.push(objectUrl);
    return objectUrl;
  }
  loadAnimation(lottieJson: string | null) {
    const canvas = document.createElement('canvas');
    canvas.height = 320;
    canvas.width = 320;
    const context = canvas.getContext('2d')!;
    context.fillStyle = '#ffffff';
    // @ts-ignore
    const stream = canvas.captureStream();
    // @ts-ignore
    const recorder = this.recorderType === 'webm' ? new MediaRecorder(stream, { mimeType: "video/webm" }) : {
      stop: () => {},
    };
    if (this.recorderType === 'gif') {
      this.gif = this.createGifEncoder();
    }
    const data: BlobPart[] = [];
    recorder.ondataavailable = function(event: any) {
      if (event.data && event.data.size) {
        data.push(event.data);
      }
    };
    const $vm = this;
    recorder.onstop = function() {
      const blob = new Blob(data, { type: "video/webm" });
      $vm.isRecording = false;
      $vm.videoDataUrl = $vm.createObjectUrl(blob);
    };

    let animationData;
    try {
      if (!lottieJson) {
        return;
      }
      animationData = JSON.parse(lottieJson);
    } catch (e) {
      console.error('invalid JSON');
      return;
    }

    this.destroyAnimation();
    this.animation = lottie.loadAnimation({
      animationData,
      container: this.$refs.animationContainer as Element,
      // loop: true,
    });
    this.isAnimating = true;
    this.isRecording = true;

    this.animation.addEventListener('enterFrame', () => {
      if (this.recorderType === 'webm' && recorder.state === 'inactive') {
        recorder.start();
      }

      // Element inherets from Node so you can treat Element as Node
      const svg = document.querySelector('#animation-container svg')! as Node;
      const xml = xmlSerializer.serializeToString(svg);
      const dataUrl = this.createObjectUrl(new Blob([xml], {type: "image/svg+xml"}));
      const img = new Image(320, 320);
      img.height = 320;
      img.width = 320;
      img.src = dataUrl;
      img.onload = () => {
        context.fillRect(0, 0, 320, 320);
        context.drawImage(img, 0, 0, 320, 320);
        if (this.recorderType === 'gif') {
          this.gif.addFrame(context, { copy: true, delay: 1000 / 60 });
        }
      };
    });
    this.animation.addEventListener('complete', () => {
      if (this.recorderType === 'webm') {
        recorder.stop();
      } else if (this.recorderType === 'gif') {
        this.gif.render();
      }
    });
  }

  createGifEncoder() {
    const gifEncoder = new Gif({
      workers: 1,
      // Do not use this.createObjectUrl() because it shouldn't be revoked
      workerScript: URL.createObjectURL(workerBlob),
      quality: 30,
      height: 320,
      width: 320,
    });
    const $vm = this;
    gifEncoder.on('finished', function(blob: Blob) {
      $vm.videoDataUrl = $vm.createObjectUrl(blob);
      $vm.isRecording = false;
      $vm.destroyGifEncoder();
    });
    return gifEncoder;
  }
  destroyGifEncoder() {
    if (this.gif) {
      this.gif.freeWorkers.forEach((w: any) => w.terminate());
      this.gif = null;
    }
  }
  mounted() {
    this.removeListner = dragDrop('.hello', (files: File[]) => {
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
  beforeDestroy() {
    this.destroyAnimation();
    this.isRecording = false;
    this.destroyGifEncoder();
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
