class AggregatedMediaStream {
	#video;

	scaleFactor = { width: 0, height: 0 };
	crop = { x: 0, y: 0, width: 0, height: 0 };
	position = { x: 0, y: 0 };
	size = { width: 0, height: 0 };

	enabled = true;

	constructor(holder, id, stream) {
		this.holder = holder;
		this.id = id;
		this.stream = stream;

		this.#adaptToStream(stream);
		this.#createVideo();
	}

	#createVideo() {
		this.#video = document.createElement('video');

		this.#video.autoplay = true;
		this.#video.playsInline = true;
		this.#video.controls = true;

		this.#video.srcObject = this.stream;
	}

	setPosition(x, y) {
		this.position = {
			x,
			y
		};
	}

	setSize(width, height) {
		this.size = {
			width,
			height
		};
	}

	setCrop(x, y, width, height) {
		this.crop = {
			x,
			y,
			width,
			height
		};
	}

	setPreprocess(callback) {
		this.preprocessor = callback;
	}

	setPostprocess(callback) {
		this.postprocessor = callback;
	}

	draw(context) {
		if (!this.enabled) {
			return;
		}

		this.preprocessor?.(this.holder.canvas, context);

		const streamSize = this.getStreamSize();

		const cropWidth = this.crop.width || streamSize[0];
		const cropHeight = this.crop.height || streamSize[1];

		const params = [];
		params.push(this.crop.x, this.crop.y, cropWidth, cropHeight);
		params.push(this.position.x, this.position.y);
		params.push(this.size.width, this.size.height);

		context.drawImage(this.#video, ...params);

		this.postprocessor?.(this.holder.canvas, context);
	}

	#adaptToStream(stream) {
		const videoSettings = stream.getVideoTracks()[0].getSettings();
		const streamWidth = videoSettings.width;
		const streamHeight = videoSettings.height;

		this.crop.width = this.size.width = streamWidth;
		this.crop.height = this.size.height = streamHeight;

		const widthScaleDownFactor = streamWidth / this.holder.width;
		const heightScaleDownFactor = streamHeight / this.holder.height;
		const widthScaleUpFactor = this.holder.width / streamWidth;
		const heightScaleUpFactor = this.holder.height / streamHeight;

		this.scaleFactor.width = Math.min(widthScaleDownFactor, widthScaleUpFactor);
		this.scaleFactor.height = Math.min(heightScaleDownFactor, heightScaleUpFactor);
	}

	getStreamSize() {
		const videoSettings = this.stream.getVideoTracks()[0].getSettings();
		const streamWidth = videoSettings.width;
		const streamHeight = videoSettings.height;

		return [streamWidth, streamHeight];
	}
}

class AggregatingMediaStream {
	/**
	 * Aggregated streams collection
	 * @type {AggregatedMediaStream[]}
	 */
	#streams = [];

	canvas;
	context;

	constructor(width, height, fps) {
		this.width = width;
		this.height = height;

		const eachMs = 1000 / fps;

		this.#createCanvas();

		setInterval(() => {
			this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);

			for (let i = 0; i < this.#streams.length; i++) {
				this.#streams[i].draw(this.context);
			}
		}, eachMs);
	}

	#createCanvas() {
		this.canvas = document.createElement('canvas');
		this.canvas.width = this.width;
		this.canvas.height = this.height;

		this.context = this.canvas.getContext('2d');
	}

	deployCanvas(elem) {
		elem.append(this.canvas);
	}

	addStream(stream, priority) {
		const streamId = priority || this.#streams.length;
		const aggrStream = new AggregatedMediaStream(this, streamId, stream);

		if (priority) {
			this.#streams[priority] = aggrStream;
		} else {
			this.#streams.push(aggrStream);
		}

		return aggrStream;
	}

	removeStream(stream) {
		this.#streams.splice(stream.id, 1);
	}

	// TODO: Move from this class the Canvas and related funcs
	/**
	 * Get canvas holder sizes
	 * @return {[number, number]}
	 */
	getCanvasSize() {
		return [this.canvas.width, this.canvas.height];
	}
}

/**
 * SCREEN DEMO + VIDEO SQUARE
 */
class ScreenDemonstrationStream extends AggregatingMediaStream {
	screenStream;
	cameraStream;

	constructor(...args) {
		super(...args);
	}

	addScreenStream(stream) {
		const scrStream = this.addStream(stream, 1);

		function dynamicRecalculation() {
			const canvasSize = scrStream.holder.getCanvasSize();
			const streamSize = scrStream.getStreamSize();

			// Center the image in canvas
			const posX = (canvasSize[0] - streamSize[0]) / 2;
			const posY = (canvasSize[1] - streamSize[1]) / 2;

			scrStream.setPosition(posX, posY);
			scrStream.setSize(...streamSize);
			scrStream.setCrop(0, 0, streamSize[0], streamSize[1]);
		}

		scrStream.setPreprocess((canvas, context) => {
			dynamicRecalculation();

			context.globalCompositeOperation = 'destination-over';
		});

		scrStream.setPostprocess((canvas, context) => {
			context.beginPath();
			context.fillStyle = '#000';
			context.fillRect(0, 0, canvas.width, canvas.height);
		});

		this.screenStream = scrStream;
		return scrStream;
	}

	addVideoStream(stream) {
		const camStream = this.addStream(stream, 0);

		function getRegionParams() {
			const canvasSize = camStream.holder.getCanvasSize();

			const widthPercent = 0.25;
			const positionPercent = 0.75;
			const padding = 50;

			return {
				x: Math.floor((canvasSize[0] - padding * 2) * positionPercent) - 0.5,
				y: Math.floor((canvasSize[1] - padding * 2) * positionPercent) - 0.5,
				width: Math.floor(canvasSize[0] * widthPercent),
				height: Math.floor(canvasSize[1] * widthPercent),
			}
		}

		function dynamicRecalculation() {
			const region = getRegionParams();
			const streamSize = camStream.getStreamSize();

			camStream.setPosition(region.x, region.y);
			camStream.setSize(region.width, region.height);
			camStream.setCrop(0, 0, streamSize[0], streamSize[1]);
		}

		camStream.setPreprocess((canvas, context) => {
			dynamicRecalculation();

			context.globalCompositeOperation = 'source-over';
		});

		camStream.setPostprocess((canvas, context) => {
			const region = getRegionParams();

			context.beginPath();
			context.strokeStyle = '#000';
			context.lineWidth = 7;
			context.strokeRect(region.x - 0.5, region.y - 0.5, region.width, region.height);

			context.beginPath();
			context.strokeStyle = '#fff';
			context.lineWidth = 4;
			context.strokeRect(region.x - 0.5, region.y - 0.5, region.width, region.height);
		});

		this.cameraStream = camStream;
		return camStream;
	}

	offCamera() {
		this.cameraStream.enabled = false;
	}

	onCamera() {
		this.cameraStream.enabled = true;
	}

	isCameraEnabled() {
		return this.cameraStream.enabled;
	}
}
