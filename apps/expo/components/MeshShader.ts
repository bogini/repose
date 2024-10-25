import { Skia } from "@shopify/react-native-skia";

export const shader = Skia.RuntimeEffect.Make(`
precision highp float;
    uniform float time;
    
    vec3 colorA = vec3(0.5, 0.0, 1.0);  // Purple
    vec3 colorB = vec3(0.0, 1.0, 0.8);  // Turquoise
    vec3 colorC = vec3(1.0, 0.2, 0.5);  // Pink
    
    float random(vec2 st) {
        return fract(sin(dot(st.xy, vec2(12.9898,78.233))) * 43758.5453123);
    }

    vec4 mainImage(vec2 pos) {
        vec2 resolution = vec2(256.0, 256.0);
        vec2 uv = pos / resolution;
        
        // Create vertical wave movement
        float verticalWave = uv.y + sin(uv.x * 8.0) * 0.1;
        
        // Multiple ripple waves moving upward
        float ripple1 = sin(verticalWave * 20.0 - time * 4.0) * 0.5 + 0.5;
        float ripple2 = sin(verticalWave * 15.0 - time * 3.0 + 1.0) * 0.5 + 0.5;
        float ripple3 = sin(verticalWave * 10.0 - time * 2.0 + 2.0) * 0.5 + 0.5;
        
        // Combine ripples with distance falloff
        float rippleStrength = 1.0 - uv.y; // Stronger at bottom
        float ripple = (ripple1 * 0.4 + ripple2 * 0.3 + ripple3 * 0.3) * rippleStrength;
        
        // Add noise for texture
        float noise = random(uv + time * 0.1) * 0.1;
        
        // Create mesh pattern
        vec2 meshUV = fract(uv * vec2(5.0, 8.0) + vec2(sin(time) * 0.5, time));
        float mesh = length(meshUV - 0.5) * 2.0;
        
        // Combine effects
        float effect = ripple + noise + mesh * 0.2;
        
        // Color mixing
        vec3 color1 = mix(colorA, colorB, effect);
        vec3 color2 = mix(colorB, colorC, sin(time) * 0.5 + 0.5);
        
        // Add vertical gradient
        float verticalGradient = smoothstep(0.0, 1.0, uv.y);
        vec3 finalColor = mix(color1, color2, verticalGradient);
        
        // Add glow at wave peaks
        float glow = ripple * (1.0 - uv.y) * 0.5;
        finalColor += glow * vec3(0.3, 0.4, 0.5);
        
        // Add some horizontal variation
        float horizontalEffect = sin(uv.x * 10.0 + time * 2.0) * 0.1;
        finalColor += horizontalEffect * vec3(0.1);
        
        // Add edge highlight
        float edgeGlow = pow(1.0 - uv.y, 4.0) * 0.5;
        finalColor += edgeGlow * vec3(0.2, 0.3, 0.4);
        
        // Ensure colors stay in valid range
        finalColor = clamp(finalColor, 0.0, 1.0);
        
        return vec4(finalColor, 1.0);
    }

    void main() {
        vec2 pos = gl_FragCoord.xy;
        gl_FragColor = mainImage(pos);
    }`)!;

export default shader;
