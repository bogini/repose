import { Skia } from "@shopify/react-native-skia";

export const shader = Skia.RuntimeEffect.Make(`
uniform float time;

// 2D Random function
float random(vec2 st) {
    return fract(sin(dot(st.xy, vec2(12.9898,78.233))) * 43758.5453123);
}

// 2D Noise based on Morgan McGuire's work
float noise(vec2 st) {
    vec2 i = floor(st);
    vec2 f = fract(st);

    // Four corners in 2D of a tile
    float a = random(i);
    float b = random(i + vec2(1.0, 0.0));
    float c = random(i + vec2(0.0, 1.0));
    float d = random(i + vec2(1.0, 1.0));

    // Smooth interpolation
    vec2 u = f * f * (3.0 - 2.0 * f);

    return mix(a, b, u.x) +
            (c - a)* u.y * (1.0 - u.x) +
            (d - b) * u.x * u.y;
}

// Fractal Brownian Motion
float fbm(vec2 st) {
    float normalizedTime = mod(time, 10.0) / 10.0; // Complete cycle every 10 seconds
    float value = 0.0;
    float amplitude = 0.5;
    float frequency = 1.0;
    
    // Add multiple layers of noise with different frequencies
    for(int i = 0; i < 5; i++) {
        value += amplitude * noise(st * frequency + normalizedTime * 2.0);
        st = st * 2.0 + normalizedTime;
        amplitude *= 0.5;
        frequency *= 2.0;
    }
    return value;
}

vec4 main(vec2 pos) {
    vec2 resolution = vec2(256.0, 256.0);
    vec2 uv = pos / resolution;
    
    // Scale the UV coordinates
    vec2 st = uv * 3.0;
    
    // Generate the cloud pattern
    float cloud = fbm(st);
    
    // Add some movement
    float normalizedTime = mod(time, 10.0) / 10.0;
    cloud += fbm(st + normalizedTime * 0.5) * 0.5;
    
    // Adjust contrast and brightness
    cloud = smoothstep(0.4, 0.6, cloud);
    
    // Create the final color
    float grayscale = cloud;
    return vec4(grayscale, grayscale, grayscale, 1.0);
}`)!;

export default shader;
