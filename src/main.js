import {
  Application as PixiApplication,
  BaseTexture as PixiBaseTexture,
  Texture as PixiTexture,
  Sprite as PixiSprite,
  VideoResource as PixiVideoResource,
  Graphics as PixiGraphics,
  Container as PixiContainer,
  Text as PixiText,
} from "pixi.js";
import { BrowserToRtmpClient } from "@api.video/browser-to-rtmp-client";

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
   * @param {BastyonStreams} parent
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

    app.stage.addChild(this.#screenSprite);
    app.stage.addChild(this.cameraSprite);

    this.parent.setupDraggable(this.cameraSprite);
    this.parent.setupScalable(this.cameraSprite);
  }

  destroy(app) {
    this.#screenSprite.texture.baseTexture.resource.destroy();
    this.cameraSprite.texture.baseTexture.resource.destroy();

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

  constructor(parent, options) {
    super(parent);

    this.options = options;
  }

  /**
   * Attach to Pixi application
   * @param {PixiApplication} app
   */
  attachToApp(app) {
    //this.#fallbackContainer = this.#setupFallbackSprite(app, this.options.image);
    this.cameraSprite = this.#setupSprite(app, this.cameraMedia);

    //app.stage.addChild(this.#fallbackContainer);
    app.stage.addChild(this.cameraSprite);
  }

  /**
   * Prepare camera demonstration sprite
   * @param {PixiApplication} app
   * @param {MediaStream} mediaStream
   */
  #setupSprite(app, mediaStream) {
    const cameraSprite = super.createSpriteFromMediaStream(mediaStream);

    const streamSize = super.getMediaStreamSize(mediaStream);

    cameraSprite.anchor.set(0);
    cameraSprite.x = 0;
    cameraSprite.y = 0;

    const scaleX = app.view.width / streamSize.width;
    const scaleY = app.view.height / streamSize.height;

    const minScale = Math.min(scaleX, scaleY);

    let fittedWidth = streamSize.width * minScale;
    let fittedHeight = streamSize.height * minScale;

    console.log(fittedWidth, fittedHeight);

    cameraSprite.width = fittedWidth;
    cameraSprite.height = fittedHeight;

    return cameraSprite;
  }

  #setupFallbackSprite(app, image) {
    const imageTexture = PixiTexture.from(image);

    const container = new PixiContainer();

    const circleMask = new PixiGraphics();
    circleMask.beginFill(0xffffff);
    const radius = imageTexture.width / 2;
    circleMask.drawCircle(radius, radius, radius);
    circleMask.pivot.set(circleMask.width / 2);
    circleMask.endFill();

    const imageSprite = new PixiSprite(imageTexture);
    imageSprite.anchor.set(0.5);
    imageSprite.mask = circleMask;

    const basicText = new PixiText("AAAA");
    basicText.style.fill = 0xffffff;
    basicText.style.align = "center";
    basicText.style.fontSize = 35;

    basicText.position.set(0, 200);
    circleMask.position.set(0, 0);

    circleMask.x = 0;
    circleMask.y = 0;
    imageSprite.x = 0;
    imageSprite.y = 0;

    console.log(container.width / 2);

    container.addChild(imageSprite);
    //container.addChild(basicText);
    container.addChild(circleMask);

    console.log(app.view.width / 2, app.view.height / 2);

    container.pivot.set(
      app.view.width / 2 - container.width / 2,
      container.height / 2 - container.height / 2,
    );
    container.position.set(app.view.width / 2, app.view.height / 2);

    console.log(container);

    return container;
  }

  destroy(app) {
    this.cameraSprite.texture.baseTexture.resource.destroy();

    super.stopMediaStream(this.cameraMedia);

    app.stage.removeChild(this.cameraSprite);
    this.parent.removeAllEvents(this.cameraSprite);

    this.cameraSprite = null;
    this.cameraMedia = null;

    // TODO: Fallback container must be removed here too
  }
}

class BastyonStreams {
  self = BastyonStreams;

  static BackColor = "#000";
  static Wrapper = "#pixi-wrapper";
  static Padding = 20;

  /**
   * Pixi app wrapping element
   * @type {HTMLElement}
   */
  #wrapper;

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
  #current;

  #dragTarget;
  #dragCoords;

  constructor(options = {}) {
    this.#wrapper = document.querySelector(
      options.wrapper || BastyonStreams.Wrapper,
    );

    this.#app = new PixiApplication({
      background: options.background || BastyonStreams.BackColor,
      resizeTo: this.#wrapper,
      eventMode: "static",
    });

    this.#app.stage.eventMode = "static";
    this.#app.stage.hitArea = this.#app.screen;

    this.#setupEvents(this.#app);
  }

  mountApp() {
    this.#wrapper.appendChild(this.#app.view);
  }

  async gotoScreen() {
    const screenMode = new ScreenDemonstration(this);

    screenMode.addScreenMedia(await navigator.mediaDevices.getDisplayMedia());
    screenMode.addCameraMedia(
      await navigator.mediaDevices.getUserMedia({ video: true }),
    );

    screenMode.attachToApp(this.#app);

    this.#current?.destroy(this.#app);
    this.#current = screenMode;

    return screenMode;
  }

  async gotoCamera() {
    const cameraMode = new CameraDemonstration(this, {
      image: "https://i.imgur.com/LzcDKhYh.jpg",
    });

    cameraMode.addCameraMedia(
      await navigator.mediaDevices.getUserMedia({ video: true }),
    );

    cameraMode.attachToApp(this.#app);

    this.#current?.destroy(this.#app);
    this.#current = cameraMode;

    return cameraMode;
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
    const events = this.#getEvents();

    sprite.on("pointerdown", events.onDragStart, sprite);
  }

  setupScalable(sprite) {
    const events = this.#getEvents();

    sprite.on("wheel", events.constructOnWheel(this.#app), sprite);
  }

  removeAllEvents(sprite) {
    const events = this.#getEvents();

    sprite.off("pointerdown", events.onDragStart, sprite);
    sprite.off("wheel", events.constructOnWheel(this.#app), sprite);
  }

  #getEvents() {
    const self = this;

    const toggleBoxMovement = (isCheck = false) => {
      console.log(event);
      return self.#spriteBoxedMovement(
        self.#dragTarget,
        event.x,
        event.y,
        {
          x1: BastyonStreams.Padding,
          x2: self.#app.view.width - BastyonStreams.Padding,
          y1: BastyonStreams.Padding,
          y2: self.#app.view.height - BastyonStreams.Padding,
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
    const userMedia = await navigator.mediaDevices.getUserMedia({
      audio: true,
    });
    const audioTrack = userMedia.getAudioTracks()[0];
    audioTrack.enabled = false;

    stream.addTrack(audioTrack);
  }

  startStreaming(rtmp) {
    const stream = this.#app.view.captureStream(30);
    this.applyAudioTrack(stream);

    this.#streamer = new BrowserToRtmpClient(stream, {
      host: "localhost",
      port: 1234,
      rtmp: rtmp,
    });

    this.#streamer.start();
  }
}

export default BastyonStreams;
