/** Duration of a PCM WAV buffer from its header (mono/stereo 16-bit). */
export function readWavDurationSec(data: Buffer): number | null {
  if (data.length < 44 || data.toString("ascii", 0, 4) !== "RIFF") {
    return null;
  }
  const sampleRate = data.readUInt32LE(24);
  const channels = data.readUInt16LE(22);
  const bitsPerSample = data.readUInt16LE(34);
  if (sampleRate <= 0 || channels <= 0 || bitsPerSample <= 0) {
    return null;
  }
  const dataSize = data.readUInt32LE(40);
  const bytesPerSample = (bitsPerSample / 8) * channels;
  if (bytesPerSample <= 0) {
    return null;
  }
  return dataSize / bytesPerSample / sampleRate;
}
