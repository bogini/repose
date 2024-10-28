import { Skia } from "@shopify/react-native-skia";

export const shader = Skia.RuntimeEffect.Make(`
uniform float time;

vec4 main(vec2 pos) {
    vec2 resolution = vec2(256.0, 256.0);
    vec2 uv = pos / resolution;
    
    // Normalize time to [0, 1] for perfect looping
    float normalizedTime = time;
    
    float waveFrequency = 12.56;
    float waveAmplitude = 0.040;
    // Wave motion synced to complete cycles
    float wave = sin(uv.y * waveFrequency + normalizedTime * 6.3) * waveAmplitude;
    
    // Linear sweep that completes exactly at t=10
    float sweep = -1.0 + normalizedTime * 2.0;
    uv.x += wave + sweep;
    
    // Pattern animation synced to complete cycles
    float pattern = pow(1.2 * (0.5 + 0.5 * sin(
        uv.y * 5.0 + 
        uv.x * 3.0 + 
        normalizedTime * 6.3
    )), 2.0);
    
    float grayscale = 0.0 + (pattern * 0.60);
    
    return vec4(grayscale, grayscale, grayscale, 0.0);
}`)!;

export default shader;
