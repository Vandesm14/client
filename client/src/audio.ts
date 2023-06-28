function averageBands(data: Uint8Array, bands: number): number[] {
  // split the array into the number of bands
  // and average the values in each band
  const bandSize = data.length / bands;
  const averages = [];
  for (let i = 0; i < bands; i++) {
    const start = i * bandSize;
    const end = start + bandSize;
    const band = data.slice(start, end);
    const average = band.reduce((sum, value) => sum + value, 0) / band.length;
    averages.push(average);
  }
  return averages;
}

// prompt the user for microphone access
export async function init(canvas: HTMLCanvasElement, audio: HTMLAudioElement) {
  const FFT_SIZE = 2048;
  const MAX_FREQ = 22050;
  const BANDS = MAX_FREQ;
  const BAND_SIZE = MAX_FREQ / BANDS;

  const stream = await navigator.mediaDevices.getUserMedia({
    audio: true,
    video: false,
  });

  // create a speaker audio context
  const speakerCtx = new AudioContext();

  // create an audio context
  const micCtx = new AudioContext();
  // create an audio node from the microphone incoming stream
  const source = micCtx.createMediaStreamSource(stream);
  // connect the stream to the analyser
  const analyser = micCtx.createAnalyser();
  source.connect(analyser);
  analyser.fftSize = FFT_SIZE;
  const bufferLength = analyser.frequencyBinCount;
  const dataArray = new Uint8Array(bufferLength);

  // create an array of oscillators based on how many bands
  const volumeNodes: GainNode[] = [];
  const oscillators: OscillatorNode[] = new Array(BANDS)
    .fill(0)
    .map((el, i) => {
      const oscillator = speakerCtx.createOscillator();
      oscillator.type = 'sine';

      // set the volume to 0
      const volumeNode = speakerCtx.createGain();
      volumeNode.gain.value = 0;
      oscillator.connect(volumeNode);
      volumeNodes.push(volumeNode);

      volumeNode.connect(speakerCtx.destination);

      oscillator.frequency.value = i * BAND_SIZE;

      oscillator.start();
      return oscillator;
    });

  const canvasCtx = canvas.getContext('2d');

  // create a function to draw a scrolling waterfall
  function drawWaterfall() {
    if (!canvasCtx) return;

    requestAnimationFrame(drawWaterfall);

    analyser.getByteFrequencyData(dataArray);

    // the waterfall is essentially a scrolling image
    // instead of drawing bars, we use brightness of the pixels to represent the volume
    // each tick, we scroll the image up by one pixel
    // then we draw a new row at the bottom

    // use the entire width of the canvas and split the waterfall into the bands
    const width = canvas.width;
    const bandWidth = width / BANDS;

    // get the image data for the entire canvas
    const imageData = canvasCtx.getImageData(0, 0, width, canvas.height);
    const data = imageData.data;

    // shift the image up by one pixel
    for (let i = 0; i < data.length; i += 4) {
      data[i] = data[i + width * 4];
      data[i + 1] = data[i + 1 + width * 4];
      data[i + 2] = data[i + 2 + width * 4];
      data[i + 3] = 255;
    }

    // put the imagedata back on the canvas
    canvasCtx.putImageData(imageData, 0, 0);

    // draw the new row at the bottom
    const averages = averageBands(dataArray, BANDS);
    for (let i = 0; i < averages.length; i++) {
      const x = i * bandWidth;
      const y = canvas.height - 1;
      const w = bandWidth;
      const h = 1;
      console.log(averages.join(','));
      const brightness = averages[i];
      canvasCtx.fillStyle = `rgb(${brightness}, ${brightness}, ${brightness})`;
      canvasCtx.fillRect(x, y, w, h);
    }

    // play the freq data
    for (let i = 0; i < averages.length; i++) {
      const volume = averages[i];
      const logVolume = Math.log(volume + 1);
      volumeNodes[i].gain.value = (logVolume ?? 0) * 0.01;
    }

    // play the freq
    // instead of averaging, sample the data
    // but only sample the value for each band
    // const bandSize = dataArray.length / BANDS;
    // for (let i = 0; i < BANDS; i++) {
    //   const index = i * BAND_SIZE;
    //   const volume = dataArray[index];
    //   const logVolume = Math.log(volume + 1);
    //   volumeNodes[i].gain.value = (logVolume ?? 0) * 0.01;
    // }

    // document.querySelector('#out').innerHTML =
    //   volumeNodes.map((el) => el.gain.value).join('<br />') +
    //   '\n' +
    //   dataArray.reduce((a, b) => a + b, 0);
  }

  drawWaterfall();
}
