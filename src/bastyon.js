import StreamiumCreator from "./main.js";

let BaseStreamControl;

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
 * 	 postTxid?: string,
 * 	 peertubeUrl?: string,
 * }} StreamInfo
 */

export default function (Pixi) {
  const Streamium = StreamiumCreator(Pixi);
  BaseStreamControl = Streamium.BaseStreamControl;

  class BastyonStreamsUI {
    #self = BastyonStreamsUI;

    #appWrapper;
    #mainControlsMountElement;
    #topControlsMountElement;
    #leftPanel;
    #rightPanel;
    #modes = [];
    #funcStates = {};
    #switchModes;
    #app;

    constructor(app) {
      const mainControlsWrapper = document.createElement("div");
      mainControlsWrapper.className = "pixi-main-controls";

      const topControlsWrapper = document.createElement("div");
      topControlsWrapper.className = "pixi-top-controls";

      app.wrapper.appendChild(mainControlsWrapper);
      app.wrapper.appendChild(topControlsWrapper);

      this.#app = app;
      this.#appWrapper = app.wrapper;
      this.#mainControlsMountElement = mainControlsWrapper;
      this.#topControlsMountElement = topControlsWrapper;

      this.#constructBaseDOM();
      this.#constructModeSwitcher(this.#leftPanel);
      this.#constructButtons(this.LeftButtons, this.#leftPanel);
      this.#constructButtons(this.MainButtons, this.#mainControlsMountElement);
      this.#constructButtons(this.RightButtons, this.#rightPanel);

      this.#constructMediaChangeInputs(this.#topControlsMountElement);
    }

    #constructBaseDOM() {
      this.#leftPanel = document.createElement("div");
      this.#leftPanel.className = "left";

      this.#rightPanel = document.createElement("div");
      this.#rightPanel.className = "right";

      this.#mainControlsMountElement.appendChild(this.#leftPanel);
      this.#mainControlsMountElement.appendChild(this.#rightPanel);
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
          if (modeButton.classList.contains("active")) {
            return;
          }

          mode.callback.bind(this)(e);

          this.#modes.forEach((mode) => mode.classList.remove("active"));
          modeButton.classList.add("active");
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

          modeIcon.className =
            func.iconClasses[func.default] || func.iconClasses;

          if (
            Object.keys(func.classes || {}).length &&
            func.classes[func.default]
          ) {
            modeButton.className += func.classes[func.default];
          }

          modeButton.addEventListener("click", (e) => {
            const newState = !this.#funcStates[funcName];
            this.#funcStates[funcName] = newState;

            if (
              Object.keys(func.classes || {}).length &&
              func.classes[newState]
            ) {
              modeButton.className =
                func.className + " " + func.classes[newState];
            } else {
              modeButton.className = func.className;
            }

            modeIcon.className = func.iconClasses[newState] || func.iconClasses;

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

    #constructMediaChangeInputs(mountElement) {
      const cameraSelectInput = document.createElement("select");
      cameraSelectInput.className = "camera-select";

      const microphoneSelectInput = document.createElement("select");
      microphoneSelectInput.className = "microphone-select";

      async function populateMediaChangeInputs() {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const videoDevices = devices.filter((d) => d.kind === "videoinput");
        const audioDevices = devices.filter((d) => d.kind === "audioinput");

        videoDevices.forEach((d, i) => {
          const deviceOption = document.createElement("option");
          deviceOption.setAttribute("value", d.deviceId);

          const fallbackName =
            d.label || `Camera device ${i} (${d.deviceId.slice(0, 7)})`;

          deviceOption.textContent = d.label || fallbackName;

          cameraSelectInput.appendChild(deviceOption);
        });

        audioDevices.forEach((d, i) => {
          const deviceOption = document.createElement("option");
          deviceOption.setAttribute("value", d.deviceId);

          const fallbackName =
            d.label || `Audio device ${i} (${d.deviceId.slice(0, 7)})`;

          deviceOption.textContent = fallbackName;

          microphoneSelectInput.appendChild(deviceOption);
        });
      }

      mountElement.appendChild(cameraSelectInput);
      mountElement.appendChild(microphoneSelectInput);

      cameraSelectInput.addEventListener("change", () => {
        this.#app.changeCameraDevice(cameraSelectInput.value);
      });

      microphoneSelectInput.addEventListener("change", () => {
        this.#app.changeAudioDevice(microphoneSelectInput.value);
      });

      populateMediaChangeInputs();
    }

    switchMode(modeName) {
      this.#modes.forEach((mode) => mode.classList.remove("active"));

      const modeClass = `.${this.ModesSwitch.modes[modeName].className}`;

      this.#switchModes.querySelector(modeClass).classList.add("active");
    }

    setCameraState(state) {
      const cameraIconClassName = `.${this.MainButtons.ToggleCamera.className} i`;
      const newIcon = this.MainButtons.ToggleCamera.iconClasses[state];

      this.#mainControlsMountElement.querySelector(
        cameraIconClassName,
      ).className = newIcon;

      this.#funcStates.ToggleCamera = state;
    }

    ModesSwitch = {
      default: "CameraMode",
      modes: {
        ScreenMode: {
          className: "screen-mode",
          iconClasses: "fas fa-desktop",
          hint: "Switch to screen mode",
          callback: () => {
            this.#app.gotoScreen();
          },
        },
        CameraMode: {
          className: "camera-mode",
          iconClasses: "fas fa-camera",
          hint: "Switch to camera mode",
          callback: () => {
            this.#app.gotoCamera();
          },
        },
      },
    };

    LeftButtons = {
      StartStreaming: {
        enabled: true,
        type: "trigger",
        default: false,
        className: "toggle-stream",
        classes: {
          true: "active",
        },
        iconClasses: "fas fa-circle",
        hint: "Start/stop streaming",
        callback: () => {
          this.#app.startStreaming();
        },
      },
      StreamFile: {
        enabled: false,
        type: "button",
        className: "stream-file",
        iconClasses: "fas fa-clapperboard",
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
        iconClasses: "fas fa-phone-plus",
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
          false: "fas fa-video-slash",
          true: "fas fa-video",
        },
        hint: "Toggle camera on/off",
        callback: () => {
          this.#app.toggleCamera();
        },
      },
      ToggleMicrophone: {
        enabled: true,
        type: "trigger",
        default: BastyonStreams.MicrophoneOnStart,
        className: "toggle-microphone",
        iconClasses: {
          false: "fas fa-microphone-slash",
          true: "fas fa-microphone",
        },
        hint: "Toggle microphone on/off",
        callback: () => {
          this.#app.toggleMicrophone();
        },
      },
    };

    #emit(eventName, data) {
      const event = new CustomEvent(eventName, { detail: data });
      this.#app.dispatchEvent(event);
    }

    RightButtons = {
      Fullscreen: {
        enabled: true,
        type: "button",
        className: "toggle-fullscreen",
        iconClasses: "fas fa-expand",
        hint: "Toggle fullscreen",
        callback: () => {
          const fullscreenChange = () => {
            if (document.fullscreenElement === this.#appWrapper) {
              this.#emit("fullscreen-in");
              return;
            }

            this.#appWrapper.removeEventListener(
              "fullscreenchange",
              fullscreenChange,
            );

            this.#emit("fullscreen-out");
          };

          if (document.fullscreenElement) {
            document.exitFullscreen();
            return;
          }

          this.#appWrapper.requestFullscreen();

          this.#appWrapper.addEventListener(
            "fullscreenchange",
            fullscreenChange,
          );
        },
      },
      PictureInPicture: {
        enabled: true,
        type: "button",
        className: "toggle-picmode",
        iconClasses: "fas fa-external-link-alt",
        hint: "Toggle picture in picture",
        callback: () => {
          this.#app.unmountApp("_pixistream");
          this.#app.mountApp(document.querySelector("#pixi-wrapper-pip"));
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
    static MicrophoneOnStart = false;

    cameraState = this.self.CameraOnStart;

    /**
     *
     * @param {Object} options
     * @param {PeertubeProviders} peertubeProviders
     */
    constructor(options, peertubeProviders) {
      super(options);

      this.user = {
        image: options.user.image,
        nickname: options.user.nickname,
      };

      this.streamCredentials = options.streamCredentials;

      delete options.user;

      this.#peertubeProviders = peertubeProviders;

      this.ui = new BastyonStreamsUI(this);

      this.gotoCamera(this.user).then((cameraMode) => {
        this.current = cameraMode;
      });
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

    async gotoCamera() {
      const cameraMode = await super.gotoCamera(this.user);
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

    async toggleMicrophone() {
      const audioStream = await this.audioStream;
      const state = audioStream.getAudioTracks()[0].enabled;
      audioStream.getAudioTracks()[0].enabled = !state;
    }

    startStreaming() {
      const rtmpLink = `${this.streamCredentials.server}/${this.streamCredentials.uuid}`;
      super.startStreaming(rtmpLink, {
        host: "localhost",
        port: "1234",
      });
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
     * Updates active stream information in the LocalStorage container.
     *
     * @param {string} address - Account address
     * @param {StreamInfo} streamInfoPartial - Partial stream information
     * @return void
     */
    static updateStreamInfo(address, streamInfoPartial) {
      const activeStreams = BastyonStreams.readAllStreamsInfo();

      activeStreams[address] = {
        ...activeStreams[address],
        ...streamInfoPartial,
      };

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

      return activeStreams[address] || {};
    }

    /**
     * Reads the LocalStorage container for information about active streams.
     * Returns all active streams, including those related to other local sessions.
     *
     * @return {{ [key: string]: StreamInfo }}
     */
    static readAllStreamsInfo() {
      const activeStreamingRaw =
        window.localStorage.getItem(BastyonStreams.LocalStorageContainer) ||
        "{}";

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

  return { BastyonStreams };
}
