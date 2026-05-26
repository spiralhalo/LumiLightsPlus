uniform sampler2D u_frame_data;

vec3 get_atmosv_CelestialRadiance() {return texelFetch(u_frame_data, ivec2(-1 + 1, 0), 0).rgb;}	    // 1.rgb
vec3 get_atmosv_SkyAmbientRadiance() {return texelFetch(u_frame_data, ivec2(-1 + 2, 0), 0).rgb;}	// 2.rgb
float get_atmosv_eyeAdaptation() {return texelFetch(u_frame_data, ivec2(-1 + 2, 0), 0).a;}		    // 2.a

float get_atmosv_CaveFog() {return texelFetch(u_frame_data, ivec2(-1 + 3, 0), 0).a;}			    // 3.a
vec3 get_atmosv_FogRadiance() {return texelFetch(u_frame_data, ivec2(-1 + 3, 0), 0).rgb;}			// 3.rgb
vec3 get_atmosv_WaterFogRadiance() {return texelFetch(u_frame_data, ivec2(-1 + 4, 0), 0).rgb;}	    // 4.rgb
vec3 get_atmosv_SkyRadiance() {return texelFetch(u_frame_data, ivec2(-1 + 5, 0), 0).rgb;}			// 5.rgb
float get_atmosv_OWTwilightFactor() {return texelFetch(u_frame_data, ivec2(-1 + 5, 0), 0).a;}	    // 5.a

vec3 get_v_celest1() {return texelFetch(u_frame_data, ivec2(-1 + 6, 0), 0).rgb;}					// 6.rgb
vec3 get_v_celest2() {return texelFetch(u_frame_data, ivec2(-1 + 7, 0), 0).rgb;}					// 7.rgb
vec3 get_v_celest3() {return texelFetch(u_frame_data, ivec2(-1 + 8, 0), 0).rgb;}					// 8.rgb

mat4 get_v_star_rotator() {  // (9, 10, 11, 12).rgba
    return mat4(
        texelFetch(u_frame_data, ivec2(-1 + 9, 0), 0),
        texelFetch(u_frame_data, ivec2(-1 + 10, 0), 0),
        texelFetch(u_frame_data, ivec2(-1 + 11, 0), 0),
        texelFetch(u_frame_data, ivec2(-1 + 12, 0), 0)
    );
}
float get_v_not_in_void() {return texelFetch(u_frame_data, ivec2(-1 + 13, 0), 0).r;}			    // 13.r
float get_v_near_void_core() {return texelFetch(u_frame_data, ivec2(-1 + 13, 0), 0).g;}			    // 13.g
float get_v_cameraAt() {return texelFetch(u_frame_data, ivec2(-1 + 13, 0), 0).b;}				    // 13.b

float get_pbrv_coneInner() {return texelFetch(u_frame_data, ivec2(-1 + 14, 0), 0).r;}			    // 14.r
float get_pbrv_coneOuter() {return texelFetch(u_frame_data, ivec2(-1 + 14, 0), 0).g;}			    // 14.g
vec3 get_pbrv_flashLightView() {return texelFetch(u_frame_data, ivec2(-1 + 15, 0), 0).rgb;}		    // 15.rgb

float get_v_blindness() {return texelFetch(u_frame_data, ivec2(-1 + 16, 0), 0).r;}				    // 16.r
float get_v_visibility() {return texelFetch(u_frame_data, ivec2(-1 + 16, 0), 0).g;}				    // 16.g