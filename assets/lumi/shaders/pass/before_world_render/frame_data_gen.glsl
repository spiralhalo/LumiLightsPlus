#include lumi:shaders/pass/header.glsl

#include frex:shaders/api/fog.glsl
#include frex:shaders/api/world.glsl
#include frex:shaders/api/view.glsl
#include frex:shaders/lib/math.glsl

#include lumi:shaders/common/atmosphere.glsl
#include lumi:shaders/lib/util.glsl
#include lumi:shaders/lib/rectangle.glsl
#include lumi:shaders/common/contrast.glsl
#include lumi:shaders/common/userconfig.glsl

#ifdef VERTEX_SHADER	
	out vec3 atmosv_CelestialRadiance;
	out vec3 atmosv_SkyAmbientRadiance;
	out float atmosv_eyeAdaptation;

	out float atmosv_CaveFog;
	out vec3 atmosv_FogRadiance;
	out vec3 atmosv_WaterFogRadiance;
	out vec3 atmosv_SkyRadiance;
	out float atmosv_OWTwilightFactor;

	void atmos_generateAtmosphereModel()
	{
		#define DEF_MOONLIGHT_COLOR	hdr_fromGamma(vec3(0.6 , 0.6 , 1.0 ))
		#define DEF_SUNLIGHT_COLOR	hdr_fromGamma(vec3(1.0 , 0.9 , 0.8 ))
		#define DEF_NOON_AMBIENT	vec3(1.0)

		const vec3 MOONLIGHT_COLOR	   = DEF_MOONLIGHT_COLOR / lightLuminanceUnclamped(DEF_MOONLIGHT_COLOR);
		const vec3 NOON_SUNLIGHT_COLOR = DEF_SUNLIGHT_COLOR / lightLuminanceUnclamped(DEF_SUNLIGHT_COLOR);
		const vec3 SUNRISE_LIGHT_COLOR = hdr_fromGamma(vec3(0.9, 0.4, 0.1));

		const vec3 DAY_SKY_COLOR   = DEF_DAY_SKY_COLOR;
		const vec3 NIGHT_SKY_COLOR = DEF_NIGHT_SKY_COLOR;
		const vec3 TWILIGHT_COLOR  = SUNRISE_LIGHT_COLOR;

		const vec3 NOON_AMBIENT  = DEF_NOON_AMBIENT_STR * (DEF_NOON_AMBIENT / lightLuminanceUnclamped(DEF_NOON_AMBIENT));
		const vec3 NIGHT_AMBIENT = DEF_NIGHT_AMBIENT_STR * MOONLIGHT_COLOR;

		const vec3	CAVEFOG_C	  = DEF_LUMI_AZURE / lightLuminanceUnclamped(DEF_LUMI_AZURE);
		const vec3	CAVEFOG_DEEPC = SUNRISE_LIGHT_COLOR / lightLuminanceUnclamped(SUNRISE_LIGHT_COLOR);
		const float CAVEFOG_MAXY = 16.0;
		const float CAVEFOG_MINY = 0.0;
		const float CAVEFOG_STR	 = 0.7;


		const int SRISC = 0;
		const int SNONC = 1;
		const int SMONC = 2;
		const vec3[3] SUN_COLOR =  vec3[](SUNRISE_LIGHT_COLOR, NOON_SUNLIGHT_COLOR, MOONLIGHT_COLOR);
		const float[3] TWG_FACTOR  = float[](1.0, 0.0, 0.0); // maps celest color to twilight factor
		const int SUN_LEN = 8;
		const int[SUN_LEN] SUN_COL_ID  = int[]  (SMONC, SRISC, SRISC, SNONC, SNONC, SRISC, SRISC, SMONC);
		const float[SUN_LEN] SUN_TIMES = float[](-0.045, -0.035, -0.02,  0.02,  0.48,  0.52,  0.535,  0.545);

		const int SKY_LEN = 4;
		const float[SKY_LEN] SKY_NIGHT = float[]( 1.0 , 0.0 , 0.0 , 1.0);
		const float[SKY_LEN] SKY_TIMES = float[](-0.05, 0.05, 0.45, 0.55);


		float moonlightSize = 0.3 + 0.7 * frx_moonSize;
		float moonlightStrength = DEF_MOONLIGHT_STR * moonlightSize;

		vec3 sunColor;
		
		// Respect dimension setting. Not accurate but better than nothing
		float dimTime = fract(frx_skyAngleRadians / TAU + 0.25);
		float dayTime = mix(dimTime, frx_worldTime, frx_worldIsOverworld);
		float horizonTime = dayTime < 0.75 ? dayTime : (dayTime - 1.0); // [-0.25, 0.75)

		if (horizonTime <= SUN_TIMES[0]) {
			sunColor = SUN_COLOR[SUN_COL_ID[0]];

			#ifdef POST_SHADER
			atmosv_OWTwilightFactor = TWG_FACTOR[SUN_COL_ID[0]];
			#endif
		} else {
			int sunI = 1;
			while (horizonTime > SUN_TIMES[sunI] && sunI < SUN_LEN - 1) sunI++;
			float sunTransition = l2_clampScale(SUN_TIMES[sunI-1], SUN_TIMES[sunI], horizonTime);
			sunColor = mix(SUN_COLOR[SUN_COL_ID[sunI-1]], SUN_COLOR[SUN_COL_ID[sunI]], sunTransition);

			#ifdef POST_SHADER
			atmosv_OWTwilightFactor = mix(TWG_FACTOR[SUN_COL_ID[sunI-1]], TWG_FACTOR[SUN_COL_ID[sunI]], sunTransition);
			#endif
		}

		atmosv_OWTwilightFactor *= float(frx_worldHasSkylight);// * (1.0 - frx_worldIsMoonlit);

		sunColor.gb *= vec2(frx_skyLightTransitionFactor * frx_skyLightTransitionFactor);

		// if editing this, also edit nightFogLuminance for cave fog
		atmosv_CelestialRadiance = mix(sunColor * DEF_SUNLIGHT_STR, MOONLIGHT_COLOR * moonlightStrength, frx_worldIsMoonlit) * frx_skyLightTransitionFactor;


		float nightFactor = SKY_NIGHT[0];

		if (horizonTime > SKY_TIMES[0]) {
			int skyI = 1;
			while (horizonTime > SKY_TIMES[skyI] && skyI < SKY_LEN - 1) skyI++;
			float skyTransition = l2_clampScale(SKY_TIMES[skyI-1], SKY_TIMES[skyI], horizonTime);
			nightFactor = mix(SKY_NIGHT[skyI-1], SKY_NIGHT[skyI], skyTransition);
		}

		atmosv_SkyAmbientRadiance = mix(NOON_AMBIENT, NIGHT_AMBIENT * moonlightSize, nightFactor) * (frx_worldHasSkylight == 1 ? 1.0 : 0.0);

		#ifdef POST_SHADER
		// if editing this, also edit nightFogLuminance for cave fog
		atmosv_SkyRadiance = mix(DAY_SKY_COLOR, NIGHT_SKY_COLOR, nightFactor) * DEF_SKY_STR;
		float skyLuminance = lightLuminanceUnclamped(atmosv_SkyRadiance);
		atmosv_SkyRadiance = mix(atmosv_SkyRadiance, vec3(skyLuminance), atmosv_OWTwilightFactor);
		#endif

		#ifdef POST_SHADER
		/** FOG **/
		vec3 twilightRadiance = TWILIGHT_COLOR * 2.0;
		twilightRadiance.gb *= vec2(max(frx_skyLightTransitionFactor, 0.3), frx_skyLightTransitionFactor * frx_skyLightTransitionFactor);

		// vanilla clear color is unreliable, we want to control its brightness
		vec3 vanillaFogRadiance = hdr_fromGamma(frx_fogColor.rgb);

		bool customOWFog	 = frx_worldIsOverworld == 1 && max(frx_cameraInSnow, frx_cameraInLava) < 1;
		bool customEndFog	 = frx_worldIsEnd == 1 && max(frx_cameraInSnow, frx_cameraInLava) < 1;
		bool customNetherFog = frx_worldIsNether == 1 && max(frx_cameraInSnow, frx_cameraInLava) < 1;

		if (customOWFog) {
			atmosv_FogRadiance = (atmosv_SkyRadiance / skyLuminance) * max(skyLuminance, mix(lightLuminanceUnclamped(atmosv_CelestialRadiance * 0.4), 0.1 - frx_smoothedRainGradient * 0.05, nightFactor));
			atmosv_FogRadiance = mix(atmosv_FogRadiance, vec3(lightLuminance(atmosv_FogRadiance)), 0.25);
			atmosv_FogRadiance = mix(atmosv_FogRadiance, twilightRadiance, atmosv_OWTwilightFactor);
		} else if (customEndFog) {
			atmosv_FogRadiance = 0.1 * mix(
				vanillaFogRadiance,
				hdr_fromGamma(vec3(1.0, 0.7, 1.0)),
				float(frx_cameraInFluid)
			);
		} else if (customNetherFog) {
			atmosv_FogRadiance = vanillaFogRadiance; // controllable overall brightness
		} else {
			atmosv_FogRadiance = vanillaFogRadiance;
		}

		atmosv_WaterFogRadiance = 0.7 * vanillaFogRadiance / lightLuminance(vanillaFogRadiance);
		atmosv_WaterFogRadiance.g = max(atmosv_WaterFogRadiance.g, atmosv_WaterFogRadiance.b * 0.15);

		// prevent custom overworld sky reflection in non-overworld dimension or when the sky mode is not Lumi
		bool customOWSkyAndFallback = frx_worldIsOverworld == 1;

		if (frx_worldIsNether == 1) {
			atmosv_SkyRadiance = atmosv_FogRadiance;
		}

		#endif



		/** RAIN **/
		float rainBrightness = 1.0 - 0.5 * frx_thunderGradient * (1.0 - frx_worldIsMoonlit);

		vec3 grayCelestial  = vec3(lightLuminance(atmosv_CelestialRadiance));
		vec3 graySkyAmbient = vec3(lightLuminance(atmosv_SkyAmbientRadiance));
		#ifdef POST_SHADER
		vec3 graySky = vec3(lightLuminance(atmosv_SkyRadiance));
		vec3 grayFog = vec3(lightLuminance(atmosv_FogRadiance));
		#endif

		float toGray = frx_smoothedRainGradient * 0.8 + frx_thunderGradient * 0.2;

		atmosv_CelestialRadiance  = mix(atmosv_CelestialRadiance, grayCelestial, toGray) * rainBrightness; // only used for cloud shading during rain
		atmosv_SkyAmbientRadiance = mix(atmosv_SkyAmbientRadiance, graySkyAmbient, toGray) * rainBrightness;

		#ifdef POST_SHADER
		atmosv_SkyRadiance = mix(atmosv_SkyRadiance, graySky, toGray) * rainBrightness;

		if (customOWFog) {
			atmosv_FogRadiance = mix(atmosv_FogRadiance, grayFog, toGray) * rainBrightness;
			// twilightRadiance = mix(twilightRadiance, graySky, toGray) * rainBrightness;
		}
		#endif
		/**********/


		/** EYE ADAPTATION **/
		atmosv_eyeAdaptation = frx_smoothedEyeBrightness.y * lightLuminance(atmosv_CelestialRadiance) * (1. - frx_rainGradient);

		//  NB: mustn't affect cave fog
		if (frx_worldHasSkylight == 1) {
			float skyAdaptor = 1.0 / (0.33 + 0.67 * max(frx_smoothedEyeBrightness.y, max(frx_rainGradient, 1.0 - lightLuminance(atmosv_CelestialRadiance))));
			atmosv_SkyRadiance *= skyAdaptor;
			atmosv_CelestialRadiance *= skyAdaptor;
			atmosv_SkyAmbientRadiance *= skyAdaptor;
			atmosv_FogRadiance *= skyAdaptor;
		}

		/** CAVE FOG **/
		atmosv_CaveFog = 0.0;

		if (frx_worldIsOverworld == 1 && frx_cameraInFluid == 0) {
			vec3 caveFogRadiance = mix(CAVEFOG_C, CAVEFOG_DEEPC, l2_clampScale(CAVEFOG_MAXY, CAVEFOG_MINY, frx_cameraPos.y));

			// night fog luminance (always max moon phase)
			float nightFogLuminance = lightLuminance(MOONLIGHT_COLOR * DEF_MOONLIGHT_RAW_STR * 0.4);

			// cave fog strength is adjusted to dimmest night fog strength so it doesn't make the outdoors look jarring or misleading
			caveFogRadiance *= nightFogLuminance;

			float invEyeY = 1.0 - frx_smoothedEyeBrightness.y;
			atmosv_CaveFog = invEyeY * invEyeY;
			atmosv_FogRadiance = mix(atmosv_FogRadiance, caveFogRadiance, atmosv_CaveFog);
		}
		/**********/
	}

	out vec3 v_celest1;
	out vec3 v_celest2;
	out vec3 v_celest3;
		
	void celestSetup()
	{
		const vec3 o	   = vec3(-1024.0, 0.0,  0.0);
		const vec3 dayAxis = vec3(	  0.0, 0.0, -1.0);

		float size = 250.; // One size fits all; vanilla would be -50 for moon and +50 for sun

		Rect result = Rect(o + vec3(.0, -size, -size), o + vec3(.0, -size,  size), o + vec3(.0,  size, -size));
		
		vec3  zenithAxis  = vec3(-1.0, 0.0, 0.0);
		float zenithAngle = asin(frx_skyLightVector.z);
		float dayAngle	  = frx_skyAngleRadians + PI * 0.5;

		mat4 transformation = l2_rotationMatrix(zenithAxis, zenithAngle);
			transformation *= l2_rotationMatrix(dayAxis, dayAngle);

		rect_applyMatrix(transformation, result, 1.0);

		// jitter celest
		// #ifdef TAA_ENABLED
		// 	vec2 taaJitterValue = taaJitter(v_invSize);
		// 	vec4 celest_clip = frx_projectionMatrix * vec4(v_celest1, 1.0);
		// 	v_celest1.xy += taaJitterValue * celest_clip.w;
		// 	v_celest2.xy += taaJitterValue * celest_clip.w;
		// 	v_celest3.xy += taaJitterValue * celest_clip.w;
		// #endif

		// TODO: wtf
		float flipper = frx_worldIsMoonlit * 2.0 - 1.0;

		// TODO: wtf double facepalm combo
		vec3 correction = flipper * normalize(result.topLeft + result.bottomRight);
		correction = (frx_skyLightVector - correction) * 1024;

		v_celest1 = flipper * result.bottomLeft + correction;
		v_celest2 = flipper * result.bottomRight + correction;
		v_celest3 = flipper * result.topLeft + correction;
	}

	out mat4 v_star_rotator;
	out float v_not_in_void;
	out float v_near_void_core;
	out float v_cameraAt;

	void skySetup()
	{
		v_star_rotator = l2_rotationMatrix(vec3(1.0, 0.0, 1.0), frx_worldTime * PI);
		v_not_in_void	 = l2_clampScale(-65.0, -64.0, frx_cameraPos.y);
		v_near_void_core = l2_clampScale(-64.0, -128.0, frx_cameraPos.y);

		float rdMult = min(1.0, frx_viewDistance / 512.0);
		v_cameraAt = mix(0.0, -0.75, l2_clampScale(64.0 + 256.0 * rdMult, 256.0 + 256.0 * rdMult, frx_cameraPos.y));
	}

	out float pbrv_coneInner;
	out float pbrv_coneOuter;
	out vec3  pbrv_flashLightView;

	void shadingSetup()
	{
		pbrv_flashLightView = -frx_cameraView;
		pbrv_coneInner = clamp(frx_heldLightInnerRadius, 0.0, PI) / PI;
		pbrv_coneOuter = max(pbrv_coneInner, clamp(frx_heldLightOuterRadius, 0.0, PI) / PI);
	}

	out float v_blindness;
	out float v_visibility;

	void fogVarsSetup()
	{
		// capture vanilla transition which happens when blindness happens/stops naturally (without milk, command, etc) 
		v_blindness = l2_clampScale(1.0, 0.0, frx_luminance(frx_vanillaClearColor)) * float(max(frx_effectBlindness, frx_effectDarkness));

		// ground visibility
		float invThickener = 1.0;
		// stronger night fog because it's darker
		float night = max(frx_worldIsMoonlit, 1.0 - frx_skyLightTransitionFactor);
		invThickener *= 1.0 - 0.6 * max(night, frx_smoothedRainGradient);
		invThickener *= 1.0 - 0.5 * frx_thunderGradient;
		invThickener = mix(1.0, invThickener, frx_smoothedEyeBrightness.y);
		v_visibility = max(invThickener, frx_worldHasSkylight);
	}

	void main()
	{
		basicFrameSetup();
		atmos_generateAtmosphereModel();
		celestSetup();
		skySetup();
		shadingSetup();
		fogVarsSetup();
	}
#else // VERTEX SHADER
	in vec3 atmosv_CelestialRadiance;	// 1.rgb
	in vec3 atmosv_SkyAmbientRadiance;	// 2.rgb
	in float atmosv_eyeAdaptation;		// 2.a

	in float atmosv_CaveFog;			// 3.a
	in vec3 atmosv_FogRadiance;			// 3.rgb
	in vec3 atmosv_WaterFogRadiance;	// 4.rgb
	in vec3 atmosv_SkyRadiance;			// 5.rgb
	in float atmosv_OWTwilightFactor;	// 5.a

	in vec3 v_celest1;					// 6.rgb
	in vec3 v_celest2;					// 7.rgb
	in vec3 v_celest3;					// 8.rgb

	in mat4 v_star_rotator;				// (9, 10, 11, 12).rgba
	in float v_not_in_void;				// 13.r
	in float v_near_void_core;			// 13.g
	in float v_cameraAt;				// 13.b

	in float pbrv_coneInner;			// 14.r
	in float pbrv_coneOuter;			// 14.g
	in vec3  pbrv_flashLightView;		// 15.rgb

	in float v_blindness;				// 16.r
	in float v_visibility;				// 16.g

	out vec4 out_color;

	void main()
	{
		out_color = vec4(0.0);

		int index = int(ceil(v_texcoord.x * frxu_size.x));

		switch(index)
		{
			case 1: out_color = vec4(atmosv_CelestialRadiance, 0.0); break;
			case 2: out_color = vec4(atmosv_SkyAmbientRadiance, atmosv_eyeAdaptation); break;
			case 3: out_color = vec4(atmosv_FogRadiance, atmosv_CaveFog); break;
			case 4: out_color = vec4(atmosv_WaterFogRadiance, 0.0); break;
			case 5: out_color = vec4(atmosv_SkyRadiance, atmosv_OWTwilightFactor); break;
			case 6: out_color = vec4(v_celest1, 0.0); break;
			case 7: out_color = vec4(v_celest2, 0.0); break;
			case 8: out_color = vec4(v_celest3, 0.0); break;
			case 9: out_color = v_star_rotator[0]; break;
			case 10: out_color = v_star_rotator[1]; break;
			case 11: out_color = v_star_rotator[2]; break;
			case 12: out_color = v_star_rotator[3]; break;
			case 13: out_color = vec4(v_not_in_void, v_near_void_core, v_cameraAt, 0.0); break;
			case 14: out_color = vec4(pbrv_coneInner, pbrv_coneOuter, 0.0, 0.0); break;
			case 15: out_color = vec4(pbrv_flashLightView, 0.0); break;
			case 16: out_color = vec4(v_blindness, v_visibility, 0.0, 0.0); break;
		}
	} 
#endif // VERTEX SHADER