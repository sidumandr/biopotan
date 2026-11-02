import type { Mode, PacketType } from "./constants";

export interface ChannelData {
    channelId: number;
    mode: Mode;
    sampleRate: number;   
    firstSampleIndex: number;
    saturated: boolean;
    samples: Float32Array;
}

export interface SamplesPacket {
    type: typeof PacketType.SAMPLES;
    seq: number;
    channels: ChannelData[];
}

