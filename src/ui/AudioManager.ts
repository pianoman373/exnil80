export class AudioManager {
  private context: AudioContext;
  private buffer: Float32Array;
  private scriptProcessor: ScriptProcessorNode;
  private writePos = 0;
  private readPos = 0;
  public sampleRate;
  private bufferMask;
  //private canvasContext: CanvasRenderingContext2D;
  //private graphData: Float32Array;
  private underflowCallback: () => void;

  constructor(bufferSize: number, underflowCallback: () => void) {
    this.underflowCallback = underflowCallback;
    this.buffer = new Float32Array(bufferSize * 16);
    //this.graphData = new Float32Array(bufferSize * 2);
    this.bufferMask = bufferSize * 16 - 1;
    this.context = new AudioContext();
    this.sampleRate = this.context.sampleRate;
    this.scriptProcessor = this.context.createScriptProcessor(bufferSize, 0, 1);
    this.scriptProcessor.onaudioprocess = (ev) => {
      this.audioProcess(ev);
    };
    this.scriptProcessor.connect(this.context.destination);

    // const canvas = document.getElementById(
    // 	'oscilloscope'
    // ) as HTMLCanvasElement;
    // this.canvasContext = canvas.getContext('2d')!;
  }

  free() {
    this.scriptProcessor.disconnect();
  }

  drawWaveform() {
    // this.canvasContext.fillStyle = 'black';
    // this.canvasContext.fillRect(
    // 	0,
    // 	0,
    // 	this.canvasContext.canvas.width,
    // 	this.canvasContext.canvas.height
    // );
    // this.canvasContext.strokeStyle = 'white';
    // this.canvasContext.beginPath(); // Start a new path
    // const height = this.canvasContext.canvas.height;
    // let zeroPoint = 0;
    // for (let x = 1; x < this.graphData.length; x++) {
    // 	if (this.graphData[x] >= 0 && this.graphData[x - 1] < 0) {
    // 		zeroPoint = x;
    // 		break;
    // 	}
    // 	if (this.graphData[x - 1] >= 0 && this.graphData[x - 1] < 0) {
    // 		zeroPoint = x;
    // 		break;
    // 	}
    // }
    // for (let x = zeroPoint; x < this.graphData.length; x++) {
    // 	if (x === zeroPoint) {
    // 		this.canvasContext.moveTo(
    // 			x - zeroPoint,
    // 			height / 2 + this.graphData[x] * -4 * (height / 2)
    // 		);
    // 	} else {
    // 		this.canvasContext.lineTo(
    // 			x - zeroPoint,
    // 			height / 2 + this.graphData[x] * -4 * (height / 2)
    // 		);
    // 	}
    // }
    // this.canvasContext.stroke(); // Render the path
  }

  filledPercent(): number {
    const remaining = (this.writePos - this.readPos) & this.bufferMask;
    return remaining / this.buffer.length;
  }

  audioProcess(ev: AudioProcessingEvent) {
    let data = ev.outputBuffer.getChannelData(0);
    let remaining = (this.writePos - this.readPos) & this.bufferMask;

    // while (remaining < data.length) {
    //   //console.log(`buffer underflow ${(remaining / data.length) * 100}%`);
    //   this.underflowCallback();
    //   remaining = (this.writePos - this.readPos) & this.bufferMask;
    // }
    if (remaining > data.length * 4) {
      //console.log('buffer overflow');
      this.readPos = (this.readPos + data.length) & this.bufferMask;
      //return;
    }
    //this.graphData.copyWithin(0, data.length);
    for (var i = 0; i < data.length; i++) {
      data[i] = this.buffer[this.readPos];
      this.readPos = (this.readPos + 1) & this.bufferMask;
      //this.graphData[this.graphData.length - data.length + i] = data[i];
    }
    //this.drawWaveform();
  }

  pushSample(sample: number) {
    this.buffer[this.writePos] = sample;
    this.writePos = (this.writePos + 1) & this.bufferMask;
  }
}
