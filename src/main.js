import { BrowserToRtmpClient } from "@api.video/browser-to-rtmp-client";

let PixiApplication;
let PixiBaseTexture;
let PixiTexture;
let PixiSprite;
let PixiVideoResource;
let PixiGraphics;
let PixiContainer;
let PixiText;

export default function (Pixi) {
  PixiApplication = Pixi.Application;
  PixiBaseTexture = Pixi.BaseTexture;
  PixiTexture = Pixi.Texture;
  PixiSprite = Pixi.Sprite;
  PixiVideoResource = Pixi.VideoResource;
  PixiGraphics = Pixi.Graphics;
  PixiContainer = Pixi.Container;
  PixiText = Pixi.Text;

  class BaseMediaStreamClass {
    self = BaseMediaStreamClass;

    static MediaStreamResource = class extends PixiVideoResource {
      constructor(source, options) {
        options = options || {};

        const videoElement = document.createElement("video");

        videoElement.srcObject = source;
        //videoElement.play();

        super(videoElement, {
          autoPlay: true,
          autoLoad: true,
          ...options.updateFPS,
        });
      }

      destroy() {
        super.destroy();
      }
    };

    /**
     *
     * @param {BaseStreamControl} parent
     */
    constructor(parent) {
      this.parent = parent;
    }

    /**
     * @protected
     * @param {MediaStream} stream
     */
    createSpriteFromMediaStream(stream) {
      const resource = new this.self.MediaStreamResource(stream, {});
      const baseTexture = new PixiBaseTexture(resource);
      const texture = new PixiTexture(baseTexture);

      return new PixiSprite(texture);
    }

    /**
     * @protected
     */
    getMediaStreamSize(stream) {
      const settings = stream.getVideoTracks()[0].getSettings();
      const { width, height } = settings;

      return { width, height };
    }

    /**
     * @protected
     */
    stopMediaStream(stream) {
      stream.getTracks().forEach((track) => {
        track.stop();
      });
    }

    /**
     * Destroys class instance
     */
    destroy() {
      throw Error("No destroy method is implemented");
    }
  }

  class CameraEnabledDemonstration extends BaseMediaStreamClass {
    cameraSprite;
    cameraOnStart = false;

    constructor(parent) {
      super();
      this.parent = parent;
    }

    /**
     * Provide MediaStream for camera square
     * @param {MediaStream} mediaStream
     */
    addCameraMedia(mediaStream) {
      this.cameraMedia = mediaStream;
    }

    offCamera = () => (this.cameraSprite.visible = false);
    onCamera = () => (this.cameraSprite.visible = true);
    isCameraEnabled = () => this.cameraSprite.visible;
  }

  class ScreenDemonstration extends CameraEnabledDemonstration {
    #screenMedia;
    #screenSprite;

    #videoChangeListener;

    /**
     * Provide MediaStream for screen demonstration
     * @param {MediaStream} mediaStream
     */
    addScreenMedia(mediaStream) {
      this.#screenMedia = mediaStream;
    }

    /**
     * Prepare screen demonstration sprite
     * @param {PixiApplication} app
     * @param {MediaStream} mediaStream
     */
    #setupScreenSprite(app, mediaStream) {
      const screenSprite = super.createSpriteFromMediaStream(mediaStream);

      // Center texture
      screenSprite.anchor.set(0.5);
      screenSprite.x = app.view.width / 2;
      screenSprite.y = app.view.height / 2;

      app.ticker.add(() => {
        const streamSize = super.getMediaStreamSize(mediaStream);

        const cameraWidth = streamSize.width;
        const cameraHeight = streamSize.height;

        const cameraScaleW = app.view.width / cameraWidth;
        const cameraScaleH = app.view.height / cameraHeight;

        const cameraScaleFactor = Math.min(cameraScaleW, cameraScaleH);

        if (cameraScaleFactor > 1) {
          screenSprite.width = cameraWidth;
          screenSprite.height = cameraHeight;
          return;
        }

        screenSprite.width = cameraWidth * cameraScaleFactor;
        screenSprite.height = cameraHeight * cameraScaleFactor;
      });

      return screenSprite;
    }

    /**
     * Prepare camera square sprite
     * @param {PixiApplication} app
     * @param {MediaStream} mediaStream
     */
    #setupCameraSprite(app, mediaStream) {
      const cameraSprite = super.createSpriteFromMediaStream(mediaStream);
      const streamSize = super.getMediaStreamSize(mediaStream);

      // Position to the right side
      cameraSprite.anchor.set(1);
      cameraSprite.x = app.view.width - this.parent.self.Padding;
      cameraSprite.y = app.view.height - this.parent.self.Padding;

      const regionWidth = app.view.width - this.parent.self.Padding * 2;
      cameraSprite.width = regionWidth / 4;
      const scaleFactor = cameraSprite.width / streamSize.width;
      cameraSprite.height = streamSize.height * scaleFactor;

      return cameraSprite;
    }

    /**
     * Attach to Pixi application
     * @param {PixiApplication} app
     */
    attachToApp(app) {
      this.#screenSprite = this.#setupScreenSprite(app, this.#screenMedia);
      this.cameraSprite = this.#setupCameraSprite(app, this.cameraMedia);

      if (!this.cameraOnStart) {
        this.offCamera();
      }

      app.stage.addChild(this.#screenSprite);
      app.stage.addChild(this.cameraSprite);

      this.parent.setupDraggable(this.cameraSprite);
      this.parent.setupScalable(this.cameraSprite);

      this.#videoChangeListener = async (data) => {
        const newCameraMedia = await navigator.mediaDevices.getUserMedia({
          video: { deviceId: data.detail },
        });

        this.changeCameraDevice(app, newCameraMedia);
      };

      this.parent.addEventListener(
        "video-device-change",
        this.#videoChangeListener,
      );
    }

    changeCameraDevice(app, newCameraMedia) {
      const prevCameraMedia = this.cameraMedia;
      const prevCameraSprite = this.cameraSprite;

      this.cameraMedia = newCameraMedia;
      this.cameraSprite = this.#setupCameraSprite(app, newCameraMedia);

      app.stage.addChild(this.cameraSprite);

      super.stopMediaStream(prevCameraMedia);

      app.stage.removeChild(prevCameraSprite);
      this.parent.removeAllEvents(prevCameraSprite);

      this.parent.setupDraggable(this.cameraSprite);
      this.parent.setupScalable(this.cameraSprite);
    }

    destroy(app) {
      this.parent.removeEventListener(
        "video-device-change",
        this.#videoChangeListener,
      );

      super.stopMediaStream(this.cameraMedia);
      super.stopMediaStream(this.#screenMedia);

      app.stage.removeChild(this.#screenSprite);
      app.stage.removeChild(this.cameraSprite);

      this.parent.removeAllEvents(this.cameraSprite);

      this.#screenSprite = null;
      this.cameraSprite = null;
      this.#screenMedia = null;
      this.cameraMedia = null;
    }
  }

  class CameraDemonstration extends CameraEnabledDemonstration {
    #fallbackContainer;

    #audioVisualizer;

    #videoChangeListener;
    #audioChangeListener;

    constructor(parent, options) {
      super(parent);

      this.options = options;
    }

    /**
     * Attach to Pixi application
     * @param {PixiApplication} app
     */
    attachToApp(app) {
      this.#fallbackContainer = this.#setupFallbackSprite(
        app,
        this.options.image,
      );
      this.cameraSprite = this.#setupSprite(app, this.cameraMedia);

      if (!this.cameraOnStart) {
        this.offCamera();
      }

      app.stage.addChild(this.#fallbackContainer);
      app.stage.addChild(this.cameraSprite);

      this.#videoChangeListener = async (data) => {
        const newCameraMedia = await navigator.mediaDevices.getUserMedia({
          video: { deviceId: data.detail },
        });

        this.changeCameraDevice(app, newCameraMedia);
      };

      this.#audioChangeListener = async (data) => {
        this.changeAudioDevice(app, data.detail.audioStream);
      };

      this.parent.addEventListener(
        "audio-device-change",
        this.#audioChangeListener,
      );

      this.parent.addEventListener(
        "video-device-change",
        this.#videoChangeListener,
      );
    }

    /**
     * Prepare camera demonstration sprite
     * @param {PixiApplication} app
     * @param {MediaStream} mediaStream
     */
    #setupSprite(app, mediaStream) {
      const container = new PixiContainer();

      const cameraSprite = super.createSpriteFromMediaStream(mediaStream);

      const streamSize = super.getMediaStreamSize(mediaStream);

      const scaleX = app.view.width / streamSize.width;
      const scaleY = app.view.height / streamSize.height;

      const minScale = Math.min(scaleX, scaleY);

      let fittedWidth = streamSize.width * minScale;
      let fittedHeight = streamSize.height * minScale;

      cameraSprite.width = fittedWidth;
      cameraSprite.height = fittedHeight;

      cameraSprite.anchor.set(0);
      cameraSprite.x = Math.floor((app.view.width - fittedWidth) / 2);
      cameraSprite.y = Math.floor((app.view.height - fittedHeight) / 2);

      const cameraBackground = new PixiGraphics();

      cameraBackground.beginFill(0x000000);
      cameraBackground.drawRect(0, 0, app.view.width, app.view.height);
      cameraBackground.endFill();

      container.addChild(cameraBackground);
      container.addChild(cameraSprite);

      container.width = app.view.width;
      container.height = app.view.height;

      return container;
    }

    #setupFallbackSprite(app, image) {
      app.renderer.background.color = 0x001c29;

      const container = new PixiContainer();

      this.#audioVisualizer = new AudioVisualizer(this.parent.audioStream);

      const avatarSize = this.parent.self.FallbackAvatarSize;

      const imageSprite = PixiSprite.from(image);
      imageSprite.anchor.set(0.5);
      imageSprite.position.set(Math.floor(avatarSize / 2));

      const isAvatarLoaded = imageSprite.texture.baseTexture.realHeight;

      const avatarReady = () => {
        const circleMask = new PixiGraphics();
        circleMask.beginFill(0xffffff);
        const radius = Math.floor(avatarSize / 2);
        circleMask.drawCircle(radius, radius, radius);
        circleMask.endFill();
        circleMask.pivot.set(Math.floor(avatarSize / 2));
        circleMask.position.set(Math.floor(avatarSize / 2));

        imageSprite.mask = circleMask;

        const basicText = new PixiText(this.options.nickname);
        basicText.style.fill = 0xffffff;
        basicText.style.align = "center";
        basicText.style.fontSize = 35;
        basicText.pivot.set(
          Math.floor(basicText.width / 2),
          Math.floor(basicText.height / 2),
        );
        basicText.position.set(
          Math.floor(avatarSize / 2),
          Math.floor(avatarSize * 1.3),
        );

        container.addChild(imageSprite);
        container.addChild(circleMask);
        container.addChild(basicText);

        container.pivot.set(
          Math.floor(avatarSize / 2),
          Math.floor(container.height / 2),
        );
        container.position.set(
          Math.floor(app.view.width / 2),
          Math.floor(app.view.height / 2),
        );

        this.#attachAudioVisualizer(container);
      };

      if (isAvatarLoaded) {
        avatarReady();
      } else {
        imageSprite.texture.baseTexture.once("loaded", avatarReady);
      }

      return container;
    }

    #attachAudioVisualizer(container) {
      const avatarSize = this.parent.self.FallbackAvatarSize;
      const audioBars = this.#audioVisualizer.getContainer();

      audioBars.position.set(
        Math.floor(avatarSize / 2),
        Math.floor(avatarSize * 2),
      );

      container.addChild(audioBars);
    }

    changeCameraDevice(app, newCameraMedia) {
      const prevCameraMedia = this.cameraMedia;
      const prevCameraSprite = this.cameraSprite;

      this.cameraMedia = newCameraMedia;
      this.cameraSprite = this.#setupSprite(app, newCameraMedia);

      app.stage.addChild(this.cameraSprite);

      super.stopMediaStream(prevCameraMedia);

      app.stage.removeChild(prevCameraSprite);
      this.parent.removeAllEvents(prevCameraSprite);
    }

    changeAudioDevice(app, newAudioMedia) {
      if (this.#audioVisualizer) {
        this.#audioVisualizer.destroy();
      }

      this.#audioVisualizer = new AudioVisualizer(newAudioMedia);

      this.#attachAudioVisualizer(this.#fallbackContainer);
    }

    destroy(app) {
      this.parent.removeEventListener(
        "video-device-change",
        this.#videoChangeListener,
      );

      this.parent.removeEventListener(
        "audio-device-change",
        this.#audioChangeListener,
      );

      super.stopMediaStream(this.cameraMedia);

      app.stage.removeChild(this.cameraSprite);
      app.stage.removeChild(this.#fallbackContainer);
      this.parent.removeAllEvents(this.cameraSprite);

      this.#audioVisualizer.destroy();

      this.cameraSprite = null;
      this.cameraMedia = null;
      this.parent = null;

      this.#fallbackContainer = null;

      this.#audioVisualizer = null;
    }
  }

  class AudioVisualizer {
    self = AudioVisualizer;
    static BarWidth = 2;
    static BarSpacing = 3;
    static BarMinHeight = 5;
    static BarMaxHeight = 30;

    #container;
    #audioTrack;
    #interval;

    constructor(audioStream) {
      this.#container = new PixiContainer();

      this.#initialize(audioStream);
    }

    async #initialize(audioStream) {
      this.#audioTrack = await audioStream;

      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

      const audioSource = audioCtx.createMediaStreamSource(this.#audioTrack);
      const analyser = audioCtx.createAnalyser();
      audioSource.connect(analyser);
      analyser.connect(audioCtx.destination);
      analyser.fftSize = 64;

      const bufferLength = analyser.frequencyBinCount;
      const audioData = new Uint8Array(bufferLength);

      this.#interval = setInterval(() => {
        analyser.getByteFrequencyData(audioData);

        while (this.#container.children[0]) {
          this.#container.removeChild(this.#container.children[0]);
        }

        const barsCount = 14;

        const getFreqLevel = (i) => {
          const lowVoice = audioData.slice(0, 7);
          const midVoice = audioData.slice(8, 15);
          const highVoice = audioData.slice(16, 31);

          const averagedVoice = [...Array(barsCount / 2)].map(
            (l, i) => (lowVoice[i] + midVoice[i] + highVoice[i]) / 3,
          );

          const regular =
            (1 / 128) * averagedVoice[Math.abs(i - barsCount / 2)];

          const shift = 1 - Math.abs(i - barsCount / 2) * 0.1;

          return regular > 0 ? regular * shift : 0;
        };

        for (let i = 0; i < barsCount; i++) {
          this.#container.addChild(
            this.#drawBar(
              i,
              getFreqLevel(i) * this.self.BarMaxHeight -
                this.self.BarMinHeight +
                this.self.BarMinHeight,
            ),
          );
        }

        this.#container.pivot.set(
          this.#container.width / 2,
          this.self.BarMaxHeight,
        );
      }, 10);
    }

    destroy() {
      clearInterval(this.#interval);
      this.#container.destroy();
    }

    getContainer() {
      return this.#container;
    }

    changeAudioDevice(app, newAudioMedia) {
      this.destroy();
      this.#initialize(newAudioMedia);
    }

    #drawBar(index = 0, height) {
      const barPos = index * this.self.BarWidth + index * this.self.BarSpacing;

      const audioBar = new PixiGraphics();
      audioBar.beginFill(0xffffff);
      audioBar.drawRect(
        0,
        0,
        this.self.BarWidth,
        Math.min(
          Math.max(height, this.self.BarMinHeight),
          this.self.BarMaxHeight,
        ),
      );
      audioBar.endFill();
      audioBar.pivot.set(this.self.BarWidth / 2, audioBar.height / 2);
      audioBar.position.set(barPos, 0);

      return audioBar;
    }
  }

  class BaseStreamControl extends EventTarget {
    self = BaseStreamControl;

    static BackColor = "#000";
    static Wrapper = "#pixi-wrapper";
    static Padding = 20;

    static DestroyedStateError = new Error(
      "StreamControl is already destroyed",
    );

    static FallbackAvatarSize = 150;

    isDestroyed = false;

    /**
     * Pixi app wrapping element
     * @type {HTMLElement}
     */
    wrapper;

    #controlsWrapperClassName = "pixi-controls";

    #controlsConstructor;

    /**
     * Pixi app instance
     * @type {PixiApplication}
     */
    #app;

    /**
     * RTMP streaming class instance
     * @type {BrowserToRtmpClient}
     */
    #streamer;

    /**
     * @type {BaseMediaStreamClass}
     */
    current;

    audioStream;

    /**
     * DeviceId's for Audio and Video. They must be used if provided
     */
    useAudioId;
    useVideoId;

    #dragTarget;
    #dragCoords;

    #resizeObserver;

    #streamAudioChangeListener;

    isStreaming = false;

    constructor(options = {}) {
      super();

      if (options.wrapper) {
        if (typeof options.wrapper === "string") {
          this.wrapper = document.querySelector(options.wrapper);
        } else if (options.wrapper instanceof HTMLElement) {
          this.wrapper = options.wrapper;
        }
      } else {
        this.wrapper = document.querySelector(BaseStreamControl.Wrapper);
      }

      this.audioStream = navigator.mediaDevices.getUserMedia({
        audio: true,
      });

      if (options.controlsWrapper) {
        this.#controlsWrapperClassName = options.controlsWrapper;
      }

      if (options.devices) {
        this.useAudioId = options.devices.audio;
        this.useVideoId = options.devices.video;
      }

      this.#app = new PixiApplication({
        view: options.view,
        background: options.background || BaseStreamControl.BackColor,
        width: options.width || 1280,
        height: options.height || 720,
        eventMode: "static",
      });

      this.#fitToPlayer();

      this.#app.stage.eventMode = "static";
      this.#app.stage.hitArea = this.#app.screen;

      this.#setupEvents(this.#app);
    }

    mountApp(newWrapper) {
      if (newWrapper) {
        this.wrapper = newWrapper;
      }

      if (this.isDestroyed) throw this.self.DestroyedStateError;

      if (this.isGlobalized) {
        this.wrapper.appendChild(window[this.globalName]);
        delete window[this.globalName];
      } else {
        this.wrapper.appendChild(this.#app.view);
      }

      this.#fitToPlayer();

      this.#controlsConstructor?.();
    }

    unmountApp(globalNameOrFunc) {
      if (typeof globalNameOrFunc === "string") {
        this.isGlobalized = true;
        this.globalName = globalNameOrFunc;
        window[globalNameOrFunc] = this.#app.view;
      } else if (typeof globalNameOrFunc === "function") {
        globalNameOrFunc(this.#app.view);
      }

      this.#app.view.remove();
    }

    loadAppControls(constructor) {
      this.#controlsConstructor = () => {
        const controlsWrapper = document.createElement("div");
        controlsWrapper.setAttribute("class", this.#controlsWrapperClassName);

        this.#app.view.parentElement.appendChild(controlsWrapper);

        constructor(controlsWrapper, this.#app.view);
      };
    }

    async gotoScreen() {
      if (this.isDestroyed) throw this.self.DestroyedStateError;

      this.current?.destroy(this.#app);

      const screenMode = new ScreenDemonstration(this);

      let returnToFullscreen = false;

      if (document.fullscreenElement === this.#app.view.parentElement) {
        returnToFullscreen = true;
      }

      screenMode.addScreenMedia(
        await navigator.mediaDevices.getDisplayMedia({
          video: { displaySurface: "monitor" },
        }),
      );

      let cameraMedia;

      if (this.useVideoId) {
        cameraMedia = await navigator.mediaDevices.getUserMedia({
          video: { deviceId: this.useVideoId },
        });
      } else {
        cameraMedia = await navigator.mediaDevices.getUserMedia({
          video: true,
        });
      }

      screenMode.addCameraMedia(cameraMedia);

      if (returnToFullscreen) {
        this.#app.view.parentElement.requestFullscreen();
      }

      screenMode.attachToApp(this.#app);

      this.current = screenMode;

      return screenMode;
    }

    async gotoCamera(options) {
      if (this.isDestroyed) throw this.self.DestroyedStateError;

      this.current?.destroy(this.#app);

      let cameraMedia;

      if (this.useVideoId) {
        cameraMedia = await navigator.mediaDevices.getUserMedia({
          video: { deviceId: this.useVideoId },
        });
      } else {
        cameraMedia = await navigator.mediaDevices.getUserMedia({
          video: true,
        });
      }

      const cameraMode = new CameraDemonstration(this, options);

      cameraMode.addCameraMedia(cameraMedia);

      cameraMode.attachToApp(this.#app);

      this.current = cameraMode;

      return cameraMode;
    }

    #fitToPlayer() {
      const wrapper = this.wrapper;

      if (this.#resizeObserver) {
        this.#resizeObserver.disconnect();
      }

      this.#resizeObserver = new ResizeObserver(() => {
        const appCanvas = this.#app.view;

        const canvasWidth = appCanvas.width;
        const canvasHeight = appCanvas.height;
        const parentWidth = this.wrapper.clientWidth;
        const parentHeight = this.wrapper.clientHeight;
        const aspectRatio = canvasWidth / canvasHeight;

        function resizeCanvas() {
          let newWidth, newHeight;
          if (parentWidth / parentHeight > aspectRatio) {
            newWidth = parentHeight * aspectRatio;
            newHeight = parentHeight;
          } else {
            newWidth = parentWidth;
            newHeight = parentWidth / aspectRatio;
          }

          appCanvas.style.width = `${newWidth}px`;
          appCanvas.style.height = `${newHeight}px`;
        }

        resizeCanvas();
      });

      this.#resizeObserver.observe(wrapper);
    }

    #spriteBoxedMovement(
      sprite,
      x,
      y,
      box = { x1: 0, x2: 0, y1: 0, y2: 0 },
      relative,
      onlyCheck,
    ) {
      const anchors = sprite.anchor;

      const x1 = box.x1 + sprite.width * anchors.x;
      const x2 = box.x2 - sprite.width * (1 - anchors.x);
      const y1 = box.y1 + sprite.height * anchors.y;
      const y2 = box.y2 - sprite.height * (1 - anchors.y);

      const disX = relative.x * sprite.scale.x;
      const disY = relative.y * sprite.scale.y;

      const lessX1 = x - disX < x1;
      const moreX2 = x - disX > x2;
      const lessY1 = y - disY < y1;
      const moreY2 = y - disY > y2;

      if (!lessX1 && !moreX2) {
        sprite.x = Math.round(x - disX);
      }

      if (!lessY1 && !moreY2) {
        sprite.y = Math.round(y - disY);
      }

      if (lessX1 || moreX2 || lessY1 || moreY2) {
        if (!onlyCheck) {
          const posX = window.event.clientX;
          const posY = window.event.clientY;

          this.#dragCoords = sprite.toLocal({ x: posX, y: posY }, null);
        }

        return false;
      }

      return true;
    }

    setupDraggable(sprite) {
      if (this.isDestroyed) throw this.self.DestroyedStateError;

      const events = this.#getEvents();

      sprite.on("pointerdown", events.onDragStart, sprite);
    }

    setupScalable(sprite) {
      if (this.isDestroyed) throw this.self.DestroyedStateError;

      const events = this.#getEvents();

      sprite.on("wheel", events.constructOnWheel(this.#app), sprite);
    }

    removeAllEvents(sprite) {
      if (this.isDestroyed) throw this.self.DestroyedStateError;

      const events = this.#getEvents();

      sprite.off("pointerdown", events.onDragStart, sprite);
      sprite.off("wheel", events.constructOnWheel(this.#app), sprite);
    }

    #getEvents() {
      const self = this;

      const toggleBoxMovement = (isCheck = false) => {
        return self.#spriteBoxedMovement(
          self.#dragTarget,
          event.x,
          event.y,
          {
            x1: BaseStreamControl.Padding,
            x2: self.#app.view.width - BaseStreamControl.Padding,
            y1: BaseStreamControl.Padding,
            y2: self.#app.view.height - BaseStreamControl.Padding,
          },
          self.#dragCoords,
          isCheck,
        );
      };

      function onDragMove(/* event */) {
        if (self.#dragTarget) {
          toggleBoxMovement();
        }
      }

      function onDragStart(event) {
        self.#dragTarget = this;
        self.#dragCoords = self.#dragTarget.toLocal(event, null);

        if (toggleBoxMovement(true)) {
          self.#dragTarget.alpha = 0.9;
          self.#app.stage.on("pointermove", onDragMove);
        }
      }

      function onDragEnd(/* event */) {
        if (self.#dragTarget) {
          self.#app.stage.off("pointermove", onDragMove);
          self.#dragTarget.alpha = 1;
          self.#dragTarget = null;
        }
      }

      function onWheel(event, app) {
        const paddedZone = app.view.width - self.self.Padding * 2;
        const w8 = paddedZone / 8;
        const w2 = paddedZone / 2;
        const isSmallEnough = this.width <= w8;
        const isBigEnough = this.width >= w2;

        if (event.deltaY > 0 && !isBigEnough) {
          const newScale = this.scale.x + 0.01;
          this.scale.set(newScale);
          return;
        }

        if (event.deltaY < 0 && !isSmallEnough) {
          const newScale = this.scale.x - 0.01;
          this.scale.set(newScale);
        }
      }

      function constructOnWheel(app) {
        return function (e) {
          onWheel.bind(this)(e, app);
        };
      }

      return {
        onDragMove,
        onDragStart,
        onDragEnd,
        constructOnWheel,
      };
    }

    #setupEvents(app) {
      const events = this.#getEvents();

      app.stage.on("pointerup", events.onDragEnd);
      app.stage.on("pointerupoutside", events.onDragEnd);
    }

    async applyAudioTrack(stream) {
      if (this.isDestroyed) throw this.self.DestroyedStateError;

      const audioStream = await this.audioStream;

      const audioTrack = audioStream.getAudioTracks()[0];
      audioTrack.enabled = false;

      stream.addTrack(audioTrack);
    }

    startStreaming(rtmp, relayServer) {
      if (this.isDestroyed) throw this.self.DestroyedStateError;

      this.isStreaming = true;

      const stream = this.#app.view.captureStream(30);
      this.applyAudioTrack(stream);

      this.#streamAudioChangeListener = () => {
        const audioTrack = stream.getAudioTracks()[0];
        stream.removeTrack(audioTrack);

        this.applyAudioTrack(stream);
      };

      this.parent.addEventListener(
        "audio-device-change",
        this.#streamAudioChangeListener,
      );

      this.#streamer = new BrowserToRtmpClient(stream, {
        host: relayServer.host,
        port: relayServer.port,
        rtmp: rtmp,
      });

      this.#streamer.start();
    }

    stopStreaming() {
      if (this.isDestroyed) throw this.self.DestroyedStateError;

      this.isStreaming = false;

      if (!this.#streamer) {
        return;
      }

      this.parent.addEventListener(
        "audio-device-change",
        this.#streamAudioChangeListener,
      );

      this.#streamer.stop();
    }

    changeCameraDevice(deviceId) {
      this.useVideoId = deviceId;
      this.#emit("video-device-change", deviceId);
    }

    changeAudioDevice(deviceId) {
      this.useAudioId = deviceId;

      const newAudioMediaPromise = navigator.mediaDevices.getUserMedia({
        audio: { deviceId },
      });

      newAudioMediaPromise.then((newAudioMedia) => {
        this.audioStream = newAudioMedia;
        this.#emit("audio-device-change", {
          audioStream: newAudioMedia,
          deviceId,
        });
      });
    }

    #emit(eventName, data) {
      const event = new CustomEvent(eventName, { detail: data });
      this.dispatchEvent(event);
    }

    async destroy() {
      if (this.isDestroyed) throw this.self.DestroyedStateError;

      const audioStream = await this.audioStream;
      const audioTrack = audioStream.getAudioTracks()[0];
      audioTrack.stop();
      audioStream.removeTrack(audioTrack);
      this.audioStream = null;

      if (this.isGlobalized) {
        if (typeof this.globalName === "function") {
          this.globalName(null);
        } else if (typeof this.globalName === "string") {
          window[this.globalName] = null;
        }
      }

      this.#resizeObserver.disconnect();

      this.stopStreaming();
      this.current?.destroy(this.#app);
      this.#app.destroy(true, true);
      this.isDestroyed = true;
    }
  }

  return {
    BaseMediaStreamClass,
    CameraEnabledDemonstration,
    ScreenDemonstration,
    CameraDemonstration,
    AudioVisualizer,
    BaseStreamControl,
  };
}
