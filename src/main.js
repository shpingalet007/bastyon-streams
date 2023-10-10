import { EventEmitter } from 'events';
import { BrowserToRtmpClient } from "@api.video/browser-to-rtmp-client";

class Stream extends EventEmitter {
	#cameraSupport = true;
	#displaySupport = true;
	#previousMain = 'screensaver';

	#current;
	#videoElement;

	#streamer;

	constructor(options = {}) {
		super();

		this.rtmp = options.rtmp;
	}

	/**
	 * Camera MediaStream provider
	 * @param {MediaStreamConstraints} constraints
	 * @return Promise<MediaStream>
	 */
	async getCameraMedia(constraints) {
		throw Error('Implementation of abstract method is required');
	}

	/**
	 * Display MediaStream provider
	 * @param {DisplayMediaStreamConstraints} constraints
	 * @return Promise<MediaStream>
	 */
	async getDisplayMedia(constraints) {
		throw Error('Implementation of abstract method is required');
	}

	/**
	 * Idle screen MediaStream provider
	 * @param {DisplayMediaStreamConstraints} constraints
	 * @return Promise<MediaStream>
	 */
	async getIdleMedia(constraints) {
		throw Error('Implementation of abstract method is required');
	}

	/**
	 * Video player constructor and injector
	 * @param {Element} mountPoint
	 */
	constructPlayer(mountPoint) {
		this.videoElement = document.createElement('video');

		this.videoElement.autoplay = true;
		this.videoElement.playsInline = true;
		this.videoElement.controls = true;

		this.videoElement.width = this.width;
		this.videoElement.height = this.height;

		mountPoint.appendChild(this.videoElement);

		console.log('Constructing player...', this.videoElement);
	}

	async toggleDisplay() {
		const stream = await this.getDisplayMedia();

		this.startStreaming(stream);

		console.log('Toggling display stream', stream);

		this.stop();
		this.videoElement.srcObject = stream;

		const tracks = stream.getVideoTracks();
		const previous = this.#current;
		this.#current = 'display';

		tracks[0].addEventListener('ended', () => {
			if (previous === 'screensaver') {
				this.toggleScreensaver();
				return;
			}

			if (previous === 'camera') {
				this.toggleCamera();
			}
		});
	}

	async toggleCamera() {
		const stream = await this.getCameraMedia({ video: true, audio: true });

		this.startStreaming(stream);

		console.log('Toggling camera stream', stream);

		this.stop();
		this.videoElement.srcObject = stream;
		this.#current = 'camera';
	}

	async toggleScreensaver() {
		const stream = await this.getIdleMedia();

		this.startStreaming(stream);

		console.log('Toggling screensaver stream', stream);

		this.stop();
		this.videoElement.srcObject = stream;
		this.#current = 'screensaver';
	}

	async play() {
		console.log('Playing video stream...');
		this.videoElement.load();
		return this.videoElement.play();
	}

	stop() {
		//return; // for now

		if (!this.videoElement.srcObject) {
			return;
		}

		if (this.#current !== 'screensaver') {
			const tracks = this.videoElement.srcObject.getTracks();
			tracks.forEach(track => track.stop());
		}
	}

	startStreaming(mediastream) {
		//return; // for now

		if (this.#streamer) {
			this.stopStreaming();
		}

		const stream = mediastream.clone();

		this.#streamer = new BrowserToRtmpClient(stream, {
			host: 'localhost',
			port: 1234,
			rtmp: this.rtmp,
		});

		this.#streamer.start();
	}

	stopStreaming() {
		this.#streamer.pause();
		this.#streamer = null;
	}

	async applyAudioTrack(mediastream) {
		const userMedia = await navigator.mediaDevices.getUserMedia({ audio: true });
		const audioTrack = userMedia.getAudioTracks()[0];

		mediastream.addTrack(audioTrack);
	}
}

class BastyonStream extends Stream {
	#screensaverStream;

	/**
	 * Screensaver Image provider
	 * @type {(callback: Function) => HTMLImageElement}
	 */
	screensaverProvider;

	/**
	 * Padding from the screensaver borders in percents
	 * @type {number}
	 */
	screensaverPadding = 0.2;

	constructor(options = {}) {
		super(options);

		this.screensaverProvider = options.screensaver;
		this.width = options.width;
		this.height = options.height;

		// TODO: Remove later
		this.screensaverProvider = (callback) => {
			const image = new Image();
			image.src = "data:image/png;base64,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";
			image.onload = () => callback(image);

			return image;
		};
	}

	async getCameraMedia(constraints) {
		return await navigator.mediaDevices.getUserMedia(constraints);
	}

	async getDisplayMedia() {
		const displayMedia = await navigator.mediaDevices.getDisplayMedia();
		await this.applyAudioTrack(displayMedia);

		return displayMedia;
	}

	async getIdleMedia() {
		if (this.#screensaverStream) {
			console.log('CALL SAME');
			return this.#screensaverStream;
		}

		const canvas = document.createElement('canvas');
		const ctx = canvas.getContext('2d');

		canvas.width = this.width;
		canvas.height = this.height;

		this.screensaverProvider((image) => {
			// Calculating scale factor
			const canvasWidthMinusPadding = canvas.width - 2 * this.screensaverPadding * canvas.width;
			const canvasHeightMinusPadding = canvas.height - 2 * this.screensaverPadding * canvas.width;

			console.log(this.screensaverPadding, canvas.width);

			const widthScaleFactor = canvasWidthMinusPadding / image.width;
			const heightScaleFactor = canvasHeightMinusPadding / image.height;

			const scaleFactor = Math.min(widthScaleFactor, heightScaleFactor);

			// Calculate the new dimensions while maintaining the aspect ratio
			const scaledWidth = image.width * scaleFactor;
			const scaledHeight = image.height * scaleFactor;

			// Calculate the position to center the image
			const x = (canvas.width - scaledWidth) / 2;
			const y = (canvas.height - scaledHeight) / 2;

			function drawStatic() {
				ctx.fillStyle = 'white';
				ctx.fillRect(0, 0, canvas.width, canvas.height);

				// Draw the image on the canvas with new dimensions
				ctx.drawImage(image, x, y - canvas.height * 0.1, scaledWidth, scaledHeight);

				ctx.font = '30px Arial';
				ctx.fillStyle = 'black'; // Color for the text
				ctx.textAlign = 'center';

				// Draw the text on the canvas
				ctx.fillText('Live streaming', canvas.width / 2, canvas.height * 0.7);

				ctx.font = '15px Arial';
				ctx.fillStyle = 'red'; // Color for the text
				ctx.textAlign = 'left';

				// Draw the text on the canvas
				ctx.fillText('LIVE', 60, 55);
			}

			function drawRedDot() {
				ctx.beginPath();
				ctx.arc(50, 50, 6, 0, 2 * Math.PI);
				ctx.fillStyle = 'red';
				ctx.fill();
			}

			let redDotShowed = false;

			setInterval(() => {
				ctx.clearRect(0, 0, canvas.width, canvas.height);

				drawStatic();

				if (!redDotShowed) {
					drawRedDot();
					redDotShowed = true;

					return;
				}

				redDotShowed = false;
			}, 1000);
		});

		this.#screensaverStream = canvas.captureStream(30);
		await this.applyAudioTrack(this.#screensaverStream);

		return this.#screensaverStream;
	}
}


// -------------------------------------- //

class AggregatedMediaStream {
	#video;

	constructor(holder, id, stream) {
		this.holder = holder;
		this.id = id;
		this.stream = stream;
	}

	#createVideo() {
		this.#video = document.createElement('video');
	}

	setPosition(x, y) {
		this.position = { x, y };
	}

	setSize(width, height) {
		this.size = { width, height };
	}

	setCrop(x, y, width, height) {
		this.crop = { x, y, width, height };
	}

	setPostprocess(callback) {
		this.postprocessor = callback;
	}

	draw(context) {
		const params = [];
		params.push(this.position.x, this.position.y);
		params.push(this.size.width, this.size.height);
		params.push(this.crop.x, this.crop.y, this.crop.width, this.crop.height);

		context.drawImage(this.#video, ...params);
	}
}

class AggregatingMediaStream {
	/**
	 * Aggregated streams collection
	 * @type {AggregatedMediaStream[]}
	 */
	#streams = [];

	constructor(width, height, fps) {
		this.width = width;
		this.height = height;

		const eachMs = 1000 / fps;

		this.#createCanvas();

		setInterval(() => {
			this.#streams.forEach((stream) => {
				stream.draw(this.context);
			});
		}, eachMs);
	}

	#createCanvas() {
		this.canvas = document.createElement('canvas');
		this.canvas.width = this.width;
		this.canvas.height = this.height;

		this.context = this.canvas.getContext('2d');
	}

	addStream(stream) {
		const streamId = this.#streams.length;
		const aggrStream = new AggregatedMediaStream(this, streamId, stream);
		this.#streams.push(aggrStream);

		return aggrStream;
	}

	removeStream(stream) {
		this.#streams.splice(stream.id, 1);
	}
}

export default BastyonStream;
