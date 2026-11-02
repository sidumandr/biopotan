export const PROTOCOL_VERSION = 1;

export const MAGIC_0 = 0x42;
export const MAGIC_1 = 0x50;

export const COMMON_HEADER_SIZE = 12;
export const SAMPLES_SUBHEADER_SIZE = 4;
export const CHANNEL_DESCRIPTOR_SIZE = 12;
export const BYTES_PER_SAMPLE = 4;


export const PacketType = {
    SAMPLES: 1,
    FEATURES: 2,
    COMMAND: 16,
} as const;

export type PacketType = (typeof PacketType)[keyof typeof PacketType];


export const Mode = {
    TEST: 0,
    EMG: 1,
    ECG: 2,
    EEG: 3,
} as const;

export type Mode = (typeof Mode)[keyof typeof Mode];


export const ChannelFlag = {
    SATURATED: 0b0000_0001,
} as const;

