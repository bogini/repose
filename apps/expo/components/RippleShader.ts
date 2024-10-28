import { Skia } from "@shopify/react-native-skia";

export const shader = Skia.RuntimeEffect.Make(`
uniform float time;
uniform float2 position;

half4 main(float2 fragCoord) {    
    // Calculate distance from position
    float2 uv = fragCoord - position;
    
    // Calculate radial distance from position
    float dist = sqrt(uv.x * uv.x + uv.y * uv.y);
    
    // Create expanding ripple
    float speed = 0.5;  // Speed of ripple expansion
    float rippleWidth = 100.0;  // Width of the ripple wave
    float maxRadius = 500.0;  // Maximum radius the ripple travels
    
    // Calculate expanding radius based on time
    float wrappedTime = mod(time, 10.0);
    float expandingRadius = wrappedTime * maxRadius / 10.0;
    
    // Create single ripple wave
    float ripple = smoothstep(0.0, rippleWidth, abs(dist - expandingRadius));
    ripple = 1.0 - ripple;
    
    // Add distance falloff
    float falloff = 1.0 - smoothstep(0.0, maxRadius, dist);
    
    // Combine ripple and falloff
    float pattern = ripple * falloff;
    
    // Adjust brightness and contrast
    float grayscale = pattern * 0.8;
    
    return half4(grayscale, grayscale, grayscale, 1.0);
}`)!;

export default shader;
