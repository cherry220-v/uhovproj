declare module 'phaser4-rex-plugins/*' {
    const content: any;
    export = content;
}

declare module 'phaser3-rex-plugins/plugins/horrifipipeline.js' {
    import Phaser from 'phaser';

    export default class HorrifiPostFxPipeline extends Phaser.Renderer.WebGL.Pipelines.PostFXPipeline {
        enable: boolean;
        bloomEnable: boolean;
        bloomRadius: number;
        bloomIntensity: number;
        bloomThreshold: number;
        chromaticEnable: boolean;
        chabIntensity: number;
        vignetteEnable: boolean;
        vignetteStrength: number;
        vignetteIntensity: number;
        noiseEnable: boolean;
        noiseStrength: number;
        noiseSeed: number;
        vhsEnable: boolean;
        vhsStrength: number;
        scanlinesEnable: boolean;
        scanStrength: number;
        crtEnable: boolean;
        crtWidth: number;
        crtHeight: number;

        setEnable(enable?: boolean): this;
        setBloomEnable(enable?: boolean): this;
        setChromaticEnable(enable?: boolean): this;
        setVignetteEnable(enable?: boolean): this;
        setNoiseEnable(enable?: boolean): this;
        setVHSEnable(enable?: boolean): this;
        setScanlinesEnable(enable?: boolean): this;
        setCRTEnable(enable?: boolean): this;
    }
}
