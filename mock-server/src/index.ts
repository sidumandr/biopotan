import { PROTOCOL_VERSION, Mode, PacketType, type SamplesPacket } from "@biopotan/protocol";

console.log(`Biopotan mock-server, protokol sürümü:${PROTOCOL_VERSION}`)
console.log(`Mod: ${Mode.EEG}`);

const packet: SamplesPacket = {
    type: PacketType.SAMPLES,
    seq: 7,
    channels: [
        {
            channelId: 0,
            mode: Mode.EEG,
            sampleRate: 250,
            firstSampleIndex: 1000,
            saturated: false,
            samples: new Float32Array([1.0, -0.5])
        }
    ], 
}


console.dir(packet, { depth: null });

