import { BaseStreamControl } from "./main.js";

/**
 * @typedef {Object} PublishedState
 * @property {1} id
 * @property {'Published'} label
 */
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

  /**
   *
   * @param {Object} options
   * @param {PeertubeProviders} peertubeProviders
   */
  constructor(options, peertubeProviders) {
    super(options);
    this.#peertubeProviders = peertubeProviders;
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
   * Reads the LocalStorage container for information about active streams.
   * Returns all active streams, including those related to other local sessions.
   *
   * @return {{ [key: string]: StreamInfo }}
   */
  static readAllStreamsInfo() {
    const activeStreamingRaw = window.localStorage.getItem(
      BastyonStreams.LocalStorageContainer,
    );

    return JSON.parse(activeStreamingRaw);
  }

  /**
   * Reads the LocalStorage container for information about active streams.
   * It checks via PeertubeProviders.getLiveInfo if the stream is still available for streaming.
   *
   * @param {string} address - Account address
   * @return {StreamInfo & { activeStream: boolean }}
   */
  static readStreamInfo(address) {
    const activeStreamingRaw = window.localStorage.getItem(
      BastyonStreams.LocalStorageContainer,
    );
    const activeStreaming = JSON.parse(activeStreamingRaw);

    if (activeStreaming?.[address]) {
      const liveUuid = activeStreaming[address].uuid;
      const liveInfo = this.#peertubeProviders.getLiveInfo(liveUuid);

      let activeStream = true;

      if (liveInfo.isLive && liveInfo.state.id === PublishedState.id) {
        activeStream = false;
      }

      return {
        ...activeStreaming?.[address],
        activeStream,
      };
    }

    return { activeStream: false };
  }
}

export default BastyonStreams;
