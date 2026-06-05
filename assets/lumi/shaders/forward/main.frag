#include frex:shaders/api/fragment.glsl
#include frex:shaders/api/material.glsl
#include frex:shaders/api/sampler.glsl
#include frex:shaders/api/world.glsl
#include frex:shaders/api/view.glsl
#include frex:shaders/lib/math.glsl
#include lumi:shaders/api/pbr_ext.glsl
#include lumi:shaders/common/forward.glsl
#include lumi:shaders/common/userconfig.glsl
#include lumi:shaders/prog/overlay.glsl
#include lumi:shaders/prog/fog.glsl
#include lumi:shaders/prog/shading.glsl
#include lumi:shaders/prog/shadow.glsl
#include lumi:shaders/prog/sky.glsl
#include lumi:shaders/prog/reflection.glsl
#include lumi:shaders/prog/tonemap.glsl
#include lumi:shaders/prog/water.glsl
#include lumi:shaders/lib/bitpack.glsl
#include lumi:shaders/lib/pack_normal.glsl
#include lumi:shaders/lib/util.glsl

/*******************************************************
 *  lumi:shaders/forward/main.frag
 *******************************************************
 *  Copyright (c) 2020-2023 spiralhalo
 *  Released WITHOUT WARRANTY under the terms of the
 *  GNU Lesser General Public License version 3 as
 *  published by the Free Software Foundation, Inc.
 *******************************************************/

uniform sampler2DArray u_resources;
uniform sampler2D u_tex_nature;

#ifdef FORWARD_TRANSLUCENT
uniform sampler2D u_color_result;
// uniform sampler2D u_color_depth;
uniform sampler2D u_vanilla_depth; // might be cursed since the same program writes here but only for solids
uniform sampler2DArray u_gbuffer_lightnormal;
#endif

#ifdef SHADOW_MAP_PRESENT
uniform sampler2DArrayShadow u_gbuffer_shadow;
#endif

in float pv_diffuse;
in vec3 pv_eyePos;

layout(location = 0) out vec4 outColor;
layout(location = 1) out vec4 outLight;
layout(location = 2) out vec4 outVertNormal;
layout(location = 3) out vec4 outFragNormal;
layout(location = 4) out vec4 outPbrMat;
layout(location = 5) out vec4 outMisc;

void frx_pipelineFragment()
{
#ifdef DISABLE_ENTITIES
	if (frx_modelOriginCamera && !frx_renderTargetParticles) discard;
#endif

	// no pitch black material allowed
	frx_fragColor = max(frx_fragColor, vec4(0.004, 0.004, 0.004, 0.0));

	// cutout_zero by default. remove if causing unwanted consequences.
	if (frx_fragColor.a == 0.0)
	{
		discard;
	}

	// Vanilla AO never make sense for anything other than terrain
	if (!frx_modelOriginRegion)
	{
		frx_fragEnableAo = false;
	}

	#ifdef WHITE_WORLD
	frx_fragColor.rgb = vec3(1.0);
	#endif

	if (frx_isGui && !frx_isHand)
	{
		float diffuse = mix(pv_diffuse, 1, frx_fragEmissive);
		// diffuse = frx_isGui ? diffuse : min(1.0, 1.5 - diffuse);
		diffuse = frx_fragEnableDiffuse ? diffuse : 1.0;
		frx_fragColor.rgb *= diffuse;
		frx_fragColor.rgb += autoGlint(u_resources, frx_normalizeMappedUV(frx_texcoord), frx_matGlint);
	}
	else
	{
		#if LUMI_PBR_API >= 7
		pbrExt_resolveProperties();
		#else // safeguard
		bool pbrExt_doTBN = true;
		bool pbr_isWater = false;
		bool pbr_builtinWater = false;
		#endif

		if (pbr_builtinWater)
		{
			pbr_isWater = true;
			frx_fragReflectance = 0.02;
			frx_fragRoughness = 0.05;

			/* WATER RECOLOR */
			// alpha=0.7 is the hard lower limit for outdoors water for better surface objects reflection potential
			#if WATER_COLOR == WATER_COLOR_NO_TEXTURE
			frx_fragColor = vec4(frx_vertexColor.rgb * 0.49, 0.7);

			#elif WATER_COLOR == WATER_COLOR_NATURAL_BLUE
			frx_fragColor.rgb *= mix(1.0, 0.49, frx_smoothedEyeBrightness.y);
			frx_fragColor.a = mix(frx_fragColor.a, 0.7, frx_smoothedEyeBrightness.y);

			#elif WATER_COLOR == WATER_COLOR_NO_COLOR
			frx_fragColor.rgb = vec3(0.075, 0.1, 0.125);
			// ironically, lower sky light (usually) means more block light to reflect making it more visible without alpha
			frx_fragColor.a = mix(0.3, 0.7, frx_smoothedEyeBrightness.y);

			#endif

			#ifdef WATER_WAVES
			frx_fragNormal = sampleWaterNormal(u_tex_nature, pv_eyePos + frx_cameraPos, abs(frx_vertexNormal));
			#endif
		}

		#ifdef WATER_NOISE_DEBUG
		float wtrNs = sampleWaterNoise(u_tex_nature, pv_eyePos + frx_cameraPos, vec2(0.0), abs(frx_vertexNormal));
		frx_fragColor.rgba += vec4(wtrNs * wtrNs * wtrNs);
		#endif

		// if (frx_fragRoughness == 0.0) 
		// {
		// 	frx_fragRoughness = 1.0; // TODO: fix assumption?
		// }

		if (pbrExt_doTBN)
		{
			vec3 bitangent = cross(frx_vertexNormal, frx_vertexTangent.xyz) * frx_vertexTangent.w;
			mat3 TBN = mat3(frx_vertexTangent.xyz, bitangent, frx_vertexNormal);
			frx_fragNormal = TBN * frx_fragNormal;
		}

		float dist = length(pv_eyePos);
		// reduce noise caused by micro normal in faraway blocks
		float farBlend = l2_clampScale(16.0 * 1.0, 16.0 * 4.0, dist);
		frx_fragNormal = normalize(mix(frx_fragNormal, frx_vertexNormal, farBlend));

		float ao = (frx_fragEnableAo && frx_modelOriginRegion) ? frx_fragLight.z : 1.0;

		float roughness = max(0.01, frx_fragRoughness - frx_fragRoughness * 0.6 * frx_smoothedRainGradient * l2_clampScale(0.9, 0.93, frx_fragLight.y));
		float disableDiffuse = 1.0 - float(frx_fragEnableDiffuse);

		// put water flag last because it makes the material buffer looks blue :D easier to debug
		float bitFlags = bit_pack(frx_matFlash, frx_matHurt, frx_matGlint, 0., disableDiffuse, 0., 0., float(pbr_isWater));

		// PERF: view normal, more useful than world normal
		outLight = vec4(frx_fragLight.xy, frx_fragEmissive, 1.0);
		outVertNormal = vec4(frx_vertexNormal, 1.0);
		outFragNormal = vec4(frx_fragNormal, 1.0);
		outPbrMat = vec4(roughness, frx_fragReflectance, ao, 1.0);
		outMisc = vec4(frx_normalizeMappedUV(frx_texcoord), bitFlags, 1.0);

		if (frx_renderTargetTranslucent || frx_renderTargetEntity)
		{
			#ifndef FORWARD_TRANSLUCENT
			{
				// Advanced translucency 4.0
				frx_fragColor.rgb *= fastLight(frx_fragLight.xy, frx_vertexNormal);
			}
			#else
			{
				vec4 light = outLight;
				vec3 albedo = hdrAlbedo(frx_fragColor);
				vec2 screenSize = vec2(frx_viewWidth, frx_viewHeight);
				vec2 invScreenSize = 1.0 / screenSize;
				vec2 screenCoord = gl_FragCoord.xy * invScreenSize;

				#ifdef SHADOW_MAP_PRESENT
				{
					light.w = denoisedShadowFactor(
						u_gbuffer_shadow,
						screenCoord,
						pv_eyePos,
						gl_FragCoord.z,
						light.y,
						frx_vertexNormal,
						invScreenSize
					);
				}
				#else
				{
					light.w = noShadowLightFactor(light.y);
				}
				#endif
				
				#ifdef WATER_FOAM
				if (pbr_isWater) {
					vec4 solid_eyePos = frx_inverseViewProjectionMatrix * vec4(
						screenCoord * 2.0 - 1.0,
						texture(u_vanilla_depth, screenCoord).r * 2.0 - 1.0,
						1.0
					);
					
					solid_eyePos.xyz /= solid_eyePos.w;
					
					// vec4 solid_eyePosT = frx_inverseViewProjectionMatrix * vec4(
					// 	(screenCoord + vec2(invScreenSize.x, 0.0)) * 2.0 - 1.0,
					// 	texture(u_vanilla_depth, (screenCoord + vec2(invScreenSize.x, 0.0))).r * 2.0 - 1.0,
					// 	1.0
					// );
					
					// solid_eyePosT.xyz /= solid_eyePosT.w;
					
					// vec4 solid_eyePosB = frx_inverseViewProjectionMatrix * vec4(
					// 	(screenCoord + vec2(0.0, invScreenSize.y)) * 2.0 - 1.0,
					// 	texture(u_vanilla_depth, (screenCoord + vec2(0.0, invScreenSize.y))).r * 2.0 - 1.0,
					// 	1.0
					// );
					
					// solid_eyePosB.xyz /= solid_eyePosB.w;

					// vec3 solid_vertexNormal = normalize(
					// 	cross(
					// 		dFdx(solid_eyePos.xyz),
					// 		dFdy(solid_eyePos.xyz)
					// 	)
					// );

					foamPreprocess(
						frx_fragColor,
						u_tex_nature,
						pv_eyePos + frx_cameraPos,
						frx_vertexNormal.y,
						normalize(
							texture(
								u_gbuffer_lightnormal, vec3(screenCoord, 3.)
							).xyz + vec3(0.0, 0.0000001, 0.0)
						).y,
						pv_eyePos,
						solid_eyePos.xyz
					);
				}
				#endif

				frx_fragColor = shading(
					frx_fragColor,
					u_tex_nature,
					light,
					outPbrMat.xyz,
					pv_eyePos,
					frx_fragNormal,
					frx_vertexNormal,
					frx_cameraInWater == 1,
					disableDiffuse
				);
				
				frx_fragColor += reflection(
					albedo,
					u_color_result,
					u_vanilla_depth,
					u_tex_nature,
					u_resources,
					outPbrMat.xyz,
					pv_eyePos,
					frx_vertexNormal,
					frx_fragNormal,
					light,
					screenCoord,
					screenSize,
					true
					);

				vec3 toFrag = normalize(pv_eyePos);
				
				vec4 fogged;
				
				#ifdef SHADOW_MAP_PRESENT
				{
					fogged = volumetricFog(
						u_gbuffer_shadow,
						u_tex_nature,
						frx_fragColor,
						dist,
						toFrag,
						outLight.y,
						getRandomFloat(u_resources, screenCoord, screenSize),
						gl_FragCoord.z,
						frx_cameraInWater == 1
					);
				}
				#else
				{
					fogged = fog(
						frx_fragColor,
						dist,
						toFrag,
						frx_cameraInWater == 1
					);
				}
				#endif
				
				frx_fragColor = mix(
					fogged,
					basicSky(toFrag, skyBase(toFrag, frx_vanillaClearColor)),
					edgeBlendFactor(dist)
				);
				frx_fragColor = ldr_tonemap(frx_fragColor);
			}
			#endif
		}
	}

	outColor = frx_fragColor;
}
