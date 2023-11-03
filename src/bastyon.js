import { BaseStreamControl } from "./main.js";

/**
 * @typedef {Object} PublishedState
 * @property {1} id
 * @property {'Published'} label
 */
// eslint-disable-next-line no-unused-vars
const PublishedState = {
  id: 1,
  label: "Published",
};

/**
 * @typedef {{
 *   isLive: boolean,
 *   state: { id: number, label: string }
 * }} LiveInfo
 */

/**
 * @typedef {{
 *   rtmpUrl: string,
 *   streamKey: string
 * }} LiveParams
 */

/**
 * @typedef {{
 *   getLiveInfo: (uuid: string) => LiveInfo,
 *   getLiveStreamParams: (uuid: string) => LiveParams
 * }} PeertubeProviders
 */

/**
 * @typedef {{
 *   uuid: string,
 * 	 server: string,
 * }} StreamInfo
 */

class BastyonStreamsUI {
  #self = BastyonStreamsUI;

  #appWrapper;
  #mountElement;
  #leftPanel;
  #rightPanel;
  #modes = [];
  #funcStates = {};
  #switchModes;
  #app;

  constructor(app) {
    const controlsWrapper = document.createElement("div");
    controlsWrapper.className = "pixi-controls";

    app.wrapper.appendChild(controlsWrapper);

    this.#app = app;
    this.#appWrapper = app.wrapper;
    this.#mountElement = controlsWrapper;

    this.#constructBaseDOM();
    this.#constructModeSwitcher(this.#leftPanel);
    this.#constructButtons(this.LeftButtons, this.#leftPanel);
    this.#constructButtons(this.MainButtons, this.#mountElement);
    this.#constructButtons(this.RightButtons, this.#rightPanel);
  }

  #constructBaseDOM() {
    this.#leftPanel = document.createElement("div");
    this.#leftPanel.className = "left";

    this.#rightPanel = document.createElement("div");
    this.#rightPanel.className = "right";

    this.#mountElement.appendChild(this.#leftPanel);
    this.#mountElement.appendChild(this.#rightPanel);
  }

  #constructModeSwitcher(mountElement) {
    this.#switchModes = document.createElement("div");
    this.#switchModes.className = "modes";

    mountElement.appendChild(this.#switchModes);

    const defaultModeName = this.ModesSwitch.default;
    const modeNames = Object.keys(this.ModesSwitch.modes);

    Object.values(this.ModesSwitch.modes).forEach((mode, i) => {
      const modeName = modeNames[i];

      const modeButton = document.createElement("button");
      modeButton.className = mode.className;
      modeButton.dataset.title = mode.hint;

      const modeIcon = document.createElement("i");
      modeIcon.className = mode.iconClasses;

      modeButton.appendChild(modeIcon);

      this.#modes.push(modeButton);

      modeButton.addEventListener("click", (e) => {
        this.#modes.forEach((mode) => mode.classList.remove("active"));
        modeButton.classList.add("active");

        mode.callback.bind(this)(e);
      });

      if (modeName === defaultModeName) {
        modeButton.classList.add("active");
      }

      this.#switchModes.appendChild(modeButton);
    });
  }

  #constructButtons(functions, mountElement) {
    const funcNames = Object.keys(functions);

    Object.values(functions).forEach((func, i) => {
      const funcName = funcNames[i];

      if (!func.enabled) {
        return;
      }

      const modeButton = document.createElement("button");
      modeButton.className = func.className;
      modeButton.dataset.title = func.hint;

      const modeIcon = document.createElement("i");

      if (func.type === "trigger") {
        this.#funcStates[funcName] = func.default;

        modeIcon.className = func.iconClasses[func.default];

        modeButton.addEventListener("click", (e) => {
          const newState = !this.#funcStates[funcName];
          this.#funcStates[funcName] = newState;
          modeIcon.className = func.iconClasses[newState];

          func.callback.bind(this)(e);
        });
      }

      if (func.type === "button") {
        modeIcon.className = func.iconClasses;

        modeButton.addEventListener("click", func.callback.bind(this));
      }

      modeButton.appendChild(modeIcon);

      mountElement.appendChild(modeButton);
    });
  }

  switchMode(modeName) {
    this.#modes.forEach((mode) => mode.classList.remove("active"));

    const modeClass = `.${this.ModesSwitch.modes[modeName].className}`;

    this.#switchModes.querySelector(modeClass).classList.add("active");
  }

  setCameraState(state) {
    const cameraIconClassName = `.${this.MainButtons.ToggleCamera.className} i`;
    const newIcon = this.MainButtons.ToggleCamera.iconClasses[state];

    this.#mountElement.querySelector(cameraIconClassName).className = newIcon;

    this.#funcStates.ToggleCamera = state;
  }

  ModesSwitch = {
    default: "CameraMode",
    modes: {
      ScreenMode: {
        className: "screen-mode",
        iconClasses: "fa-solid fa-desktop",
        hint: "Switch to screen mode",
        callback: () => {
          this.#app.gotoScreen();
        },
      },
      CameraMode: {
        className: "camera-mode",
        iconClasses: "fa-solid fa-video",
        hint: "Switch to camera mode",
        callback: () => {
          this.#app.gotoCamera({
            image: "../static/avatar.jpg",
            nickname: "DummyNick",
          });
        },
      },
    },
  };

  LeftButtons = {
    StartStreaming: {
      enabled: true,
      type: "button",
      className: "toggle-stream",
      iconClasses: "fa-solid fa-signal-stream",
      hint: "Start/stop streaming",
      callback: () => {
        //alert("STREAM STATE TOGGLED");

        const rtmpLink = document.querySelector("#rtmp-link").value;
        const relayServer = document
          .querySelector("#rtmp-link")
          .value.split(":");

        this.#app.startStreaming(rtmpLink, {
          host: relayServer[0],
          port: relayServer[1],
        });
      },
    },
    StreamFile: {
      enabled: false,
      type: "button",
      className: "stream-file",
      iconClasses: "fa-solid fa-clapperboard",
      hint: "Stream file from list",
      callback: () => {
        alert("FILE STREAM LIST TOGGLED");
      },
    },
  };

  MainButtons = {
    InviteSpeaker: {
      enabled: false,
      type: "button",
      className: "invite-speaker",
      iconClasses: "fa-solid fa-phone-plus",
      hint: "Invite speaker",
      callback: () => {
        alert("SPEAKER INVITE");
      },
    },
    ToggleCamera: {
      enabled: true,
      type: "trigger",
      default: BastyonStreams.CameraOnStart,
      className: "toggle-camera",
      iconClasses: {
        false: "fa-sharp fa-regular fa-camera-web-slash",
        true: "fa-sharp fa-regular fa-camera-web",
      },
      hint: "Toggle camera on/off",
      callback: () => {
        this.#app.toggleCamera();
      },
    },
  };

  RightButtons = {
    Fullscreen: {
      enabled: true,
      type: "button",
      className: "toggle-fullscreen",
      iconClasses: "fa-solid fa-expand",
      hint: "Toggle fullscreen",
      callback: () => {
        if (document.fullscreenElement) {
          document.exitFullscreen();
          return;
        }

        this.#appWrapper.requestFullscreen();
      },
    },
    PictureInPicture: {
      enabled: true,
      type: "button",
      className: "toggle-picmode",
      iconClasses: "fa-solid fa-arrow-up-right-from-square",
      hint: "Toggle picture in picture",
      callback: () => {
        alert("Picture in picture");
      },
    },
  };
}

class BastyonStreams extends BaseStreamControl {
  self = BastyonStreams;
  static LocalStorageContainer = "active-streaming";

  /**
   * Peertube providers that are passed
   * in BastyonStreams constructor
   *
   * @type PeertubeProviders
   */
  #peertubeProviders = {};

  static CameraOnStart = false;

  cameraState = this.self.CameraOnStart;

  /**
   *
   * @param {Object} options
   * @param {PeertubeProviders} peertubeProviders
   */
  constructor(options, peertubeProviders) {
    super(options);
    this.#peertubeProviders = peertubeProviders;

    this.ui = new BastyonStreamsUI(this);
  }

  async gotoScreen(...args) {
    const screenMode = await super.gotoScreen(...args);
    this.ui.switchMode("ScreenMode");

    if (!this.cameraState) {
      screenMode.offCamera();
    } else {
      screenMode.onCamera();
    }

    return screenMode;
  }

  async gotoCamera(...args) {
    const cameraMode = await super.gotoCamera(...args);
    this.ui.switchMode("CameraMode");

    if (!this.cameraState) {
      cameraMode.offCamera();
    } else {
      cameraMode.onCamera();
    }

    return cameraMode;
  }

  async toggleCamera() {
    if (this.current?.isCameraEnabled()) {
      this.current?.offCamera?.();
      this.ui.setCameraState(false);
      this.cameraState = false;
    } else {
      this.current?.onCamera?.();
      this.ui.setCameraState(true);
      this.cameraState = true;
    }
  }

  /**
   * Appends active stream information in the LocalStorage container.
   *
   * @param {string} address - Account address
   * @param {StreamInfo} streamInfo - Stream information
   * @return void
   */
  static saveStreamInfo(address, streamInfo) {
    const activeStreams = BastyonStreams.readAllStreamsInfo();

    activeStreams[address] = streamInfo;

    window.localStorage.setItem(
      BastyonStreams.LocalStorageContainer,
      JSON.stringify(activeStreams),
    );
  }

  /**
   * Removes active stream information in the LocalStorage container.
   *
   * @param {string} address - Account address
   * @return void
   */
  static deleteStreamInfo(address) {
    const activeStreams = BastyonStreams.readAllStreamsInfo();

    delete activeStreams[address];

    window.localStorage.setItem(
      BastyonStreams.LocalStorageContainer,
      JSON.stringify(activeStreams),
    );
  }

  /**
   * Gets active stream information in the LocalStorage container.
   *
   * @param {string} address - Account address
   * @return StreamInfo
   */
  static getStreamInfo(address) {
    const activeStreams = BastyonStreams.readAllStreamsInfo();

    return activeStreams[address];
  }

  /**
   * Reads the LocalStorage container for information about active streams.
   * Returns all active streams, including those related to other local sessions.
   *
   * @return {{ [key: string]: StreamInfo }}
   */
  static readAllStreamsInfo() {
    const activeStreamingRaw =
      window.localStorage.getItem(BastyonStreams.LocalStorageContainer) || "{}";

    return JSON.parse(activeStreamingRaw);
  }

  /**
   * Returns StreamInfo if there is any stream passing the checks
   *
   * @param {string} address - Account address
   * @param {() => Promise<Boolean>} streamChecker - Stream checking function
   * @return BastyonStreams
   */
  static async continueStreaming(address, streamChecker = async () => true) {
    const savedStream = BastyonStreams.getStreamInfo(address);

    if (!Object.keys(savedStream).length) {
      return false;
    }

    const allowStream = await streamChecker(savedStream);

    if (!allowStream) {
      BastyonStreams.deleteStreamInfo(address);

      return false;
    }

    return savedStream;
  }
}

export default BastyonStreams;
