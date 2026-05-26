#include lumi:shaders/pass/header.glsl

#include lumi:shaders/lib/bitpack.glsl
#include lumi:shaders/lib/pack_normal.glsl
#include lumi:shaders/prog/clouds.glsl
#include lumi:shaders/prog/frame_data.glsl
#include lumi:shaders/prog/fog.glsl
#include lumi:shaders/prog/overlay.glsl
#include lumi:shaders/prog/shading.glsl
#include lumi:shaders/prog/sky.glsl
#include lumi:shaders/prog/tonemap.glsl
#include lumi:shaders/prog/water.glsl

/*******************************************************
 *  lumi:shaders/post/color.frag
 *******************************************************/

uniform sampler2D u_vanilla_color;
uniform sampler2D u_vanilla_depth;
uniform sampler2D u_weather_color;
uniform sampler2D u_weather_depth;
uniform sampler2D u_vanilla_clouds_depth;

uniform sampler2D u_translucent_depth;
uniform sampler2D u_particles_depth;

uniform sampler2DArray u_gbuffer_trans;
uniform sampler2DArray u_gbuffer_main_etc;
uniform sampler2DArray u_gbuffer_lightnormal;

uniform sampler2DArray u_resources;
uniform sampler2D u_tex_nature;

#ifdef SHADOW_MAP_PRESENT
uniform sampler2DArrayShadow u_gbuffer_shadow;
#endif

layout(location = 0) out vec4 out_color;
layout(location = 1) out float out_depth;
layout(location = 2) out vec4 out_albedo;
layout(location = 3) out vec4 out_after;
layout(location = 4) out vec4 fragAfter;

void main()
{
	float depth_translucent = texture(u_translucent_depth, v_texcoord).r;

	vec2 uv_solid_refracted = refractSolidUV(
		u_gbuffer_lightnormal,
		u_vanilla_depth,
		texture(u_vanilla_depth,
		v_texcoord).r,
		depth_translucent);

	float depth_solid = texture(u_vanilla_depth, uv_solid_refracted).r;
	float depth_particles = texture(u_particles_depth, v_texcoord).r;
	float depth_weather = texture(u_weather_depth, v_texcoord).r;
	float MinimumDepth = min(depth_solid, min(depth_translucent, min(depth_particles, depth_weather)));

	vec4  baseColor_translucent = texture(u_gbuffer_trans, vec3(v_texcoord, ID_TRANS_COLR));
	{
		// some solids (e.g. player entity) render after translucent for no good reason
		baseColor_translucent = depth_solid < depth_translucent ? vec4(0.0) : baseColor_translucent;
	}
	vec4  baseLight_translucent = texture(u_gbuffer_lightnormal, vec3(v_texcoord, ID_TRANS_LIGT));


	vec4  baseColor_particles = texture(u_gbuffer_trans, vec3(v_texcoord, ID_PARTS_COLR));
	{
		baseColor_particles.rgb /= (baseColor_particles.a == 0.0) ? 1.0 : baseColor_particles.a;
		// translucent particles are rendered without solid depth test
		baseColor_particles = depth_solid < depth_particles ? vec4(0.0) : baseColor_particles;
	}

	vec4  baseColor_weather = texture(u_weather_color, v_texcoord);
	{
		baseColor_weather.rgb /= baseColor_weather.a == 0.0 ? 1.0 : baseColor_weather.a;
		// probably unnecessary
		// baseColor_weather = depth_solid < depth_weather ? vec4(0.0) : baseColor_weather;
		// Unused
		// baseColor_weather.rgb = frx_worldIsOverworld == 1 ? vec3(lightLuminance(baseColor_weather.rgb)) : baseColor_weather.rgb;
		baseColor_weather.a *= 0.7; // thinner rain and snow
	}

	vec4 baseColor_solid = texture(u_vanilla_color, uv_solid_refracted);
	vec4 baseLight_solid = texture(u_gbuffer_lightnormal, vec3(uv_solid_refracted, ID_SOLID_LIGT));
	vec3 baseVertNormal_solid = normalize(texture(u_gbuffer_lightnormal, vec3(uv_solid_refracted, ID_SOLID_NORM)).xyz);

	bool solid_isManaged = baseLight_solid.x > 0.0;

	vec3 solid_eyePos;
	{
		vec4 temp = frx_inverseViewProjectionMatrix * vec4(2.0 * uv_solid_refracted - 1.0, 2.0 * depth_solid - 1.0, 1.0);
		solid_eyePos = temp.xyz / temp.w;
	}

	vec3 baseMisc_translucent = texture(u_gbuffer_main_etc, vec3(v_texcoord, ID_TRANS_MISC)).xyz;
	bool translucent_isWater = bit_unpack(baseMisc_translucent.z, 7) == 1.;
	bool solid_isUnderwater = decideUnderwater(depth_solid, depth_translucent, translucent_isWater, false);
	vec3 global_toFrag = normalize(solid_eyePos);

	vec4 sky_basic;
	vec4 sky;
	{
		vec3 sky_base = skyBase(global_toFrag, frx_vanillaClearColor);
		sky_basic = basicSky(global_toFrag, sky_base);
		sky = customSky(
			sky_base,
			u_resources,
			global_toFrag,
			(depth_solid == 1.0) ? baseColor_solid.rgb : frx_vanillaClearColor,
			solid_isUnderwater
		);
	}

	vec4 solid_output;
	vec4 solid_fogged_output;
	{
		if (depth_solid == 1.0)
		{
			solid_output = sky;
		}
		else
		{
			vec3 basePbrMat_solid = texture(u_gbuffer_main_etc, vec3(uv_solid_refracted, ID_SOLID_MATS)).xyz;
			vec3 baseFragNormal_solid = normalize(texture(u_gbuffer_lightnormal, vec3(uv_solid_refracted, ID_SOLID_MNORM)).xyz);
			vec3 baseMisc_solid = texture(u_gbuffer_main_etc, vec3(uv_solid_refracted, ID_SOLID_MISC)).xyz;

			vec4 solid_light = baseLight_solid;

			#ifdef SHADOW_MAP_PRESENT
			{
				solid_light.w = denoisedShadowFactor(
					u_gbuffer_shadow,
					uv_solid_refracted,
					solid_eyePos,
					depth_solid,
					baseLight_solid.y,
					baseVertNormal_solid,
					v_invSize
				);
			}
			#else
			{
				solid_light.w = noShadowLightFactor(baseLight_solid.y);
			}
			#endif

			solid_output = shading(
				baseColor_solid,
				u_tex_nature,
				solid_light,
				basePbrMat_solid,
				solid_eyePos,
				baseFragNormal_solid,
				baseVertNormal_solid,
				solid_isUnderwater,
				bit_unpack(baseMisc_solid.z, 4)
			);
			
			solid_output = overlay(
				solid_output,
				u_resources,
				baseMisc_solid
			);
			
			if (depth_solid > depth_translucent)
			{
				// sky reflection behind translucent
				solid_output += skyReflection(
					u_resources,
					baseColor_solid.rgb,
					basePbrMat_solid.xy,
					global_toFrag,
					baseFragNormal_solid,
					solid_light.yw,
					v_texcoord,
					frxu_size
				);
			}
		}

		if (depth_solid > MinimumDepth)
		{
			float fogged_dist = length(solid_eyePos);

			solid_fogged_output = mix(
				fog(
					solid_output,
					fogged_dist,
					global_toFrag,
					solid_isUnderwater
				),
				sky_basic,
				edgeBlendFactor(fogged_dist)
			);

			// fog behind translucent terrain only, for perfect reflection
			if (depth_solid > depth_translucent)
			{
				solid_output = solid_fogged_output;
			}

			vec4 clouds = customClouds(
				u_vanilla_clouds_depth,
				u_tex_nature,
				u_resources,
				depth_solid,
				uv_solid_refracted,
				frxu_size,
				solid_eyePos,
				global_toFrag,
				NUM_SAMPLE,
				sky_basic);
			
			solid_output.rgb = solid_output.rgb * (1.0 - clouds.a) + clouds.rgb * clouds.a;
		}
	}

	vec4 particles_output;
	{
		vec4 temp = frx_inverseViewProjectionMatrix * vec4(2.0 * v_texcoord - 1.0, 2.0 * depth_particles - 1.0, 1.0);
		vec3 particles_eyePos  = temp.xyz / temp.w;
		vec4 particles_light = texture(u_gbuffer_lightnormal, vec3(v_texcoord, ID_PARTS_LIGT));

		#ifdef SHADOW_MAP_PRESENT
		{
			particles_light.w = denoisedShadowFactor(
				u_gbuffer_shadow,
				v_texcoord,
				particles_eyePos,
				depth_particles,
				particles_light.y,
				-frx_cameraView,
				v_invSize
			);
		}
		#else
		{
			particles_light.w = noShadowLightFactor(particles_light.y);
		}
		#endif

		particles_output = particleShading(
			baseColor_particles,
			u_tex_nature,
			particles_light,
			particles_eyePos,
			decideUnderwater(depth_particles, depth_translucent, translucent_isWater, false)
		);
		
		particles_output = vec4(
			ldr_tonemap(particles_output.rgb) * particles_output.a, // premultiply α
			particles_output.a
		);
	}

	vec3 baseVertNormal_translucent = texture(u_gbuffer_lightnormal, vec3(v_texcoord, ID_TRANS_NORM)).xyz;

	bool translucent_isManaged = (
		(baseColor_translucent.a > 0.0)
		&& (baseLight_translucent.x > 0.0)
		// Deprecated End Portal check (does not work in 26.1 since End Portal now renders as solid)
		&& (baseVertNormal_translucent != baseLight_translucent.xyz)
	);

	vec4 translucent_output;
	{
		if (translucent_isManaged)
		{
			#ifndef FORWARD_TRANSLUCENT
			{
				// will be used for fog outside of shading
				vec4 temp = frx_inverseViewProjectionMatrix * vec4(2.0 * v_texcoord - 1.0, 2.0 * depth_translucent - 1.0, 1.0);
				vec3 translucent_eyePos  = temp.xyz / temp.w;
				
				baseVertNormal_translucent = normalize(baseVertNormal_translucent);
				vec4 light_translucent = baseLight_translucent;

				#ifdef SHADOW_MAP_PRESENT
				{
					light_translucent.w = denoisedShadowFactor(
						u_gbuffer_shadow,
						v_texcoord,
						translucent_eyePos,
						depth_translucent,
						baseLight_translucent.y,
						baseVertNormal_translucent,
						v_invSize
					);
				}
				#else
				{
					light_translucent.w = noShadowLightFactor(baseLight_translucent.y);
				}
				#endif

				// TODO remove fast light (advanced lighting 4.0) replace with forward shading
				// baseColor_translucent.rgb /= ((baseColor_translucent.a == 0.0) ? 1.0 : baseColor_translucent.a);
				baseColor_translucent.rgb /= (
					fastLight(baseLight_translucent.xy, baseVertNormal_translucent) * baseColor_translucent.a
				);

				vec3 basePbrMat_translucent = texture(u_gbuffer_main_etc, vec3(v_texcoord, ID_TRANS_MATS)).xyz;
				vec3 baseFragNormal_translucent = normalize(texture(u_gbuffer_lightnormal, vec3(v_texcoord, ID_TRANS_MNORM)).xyz);
				float disableDiffuse_translucent = bit_unpack(baseMisc_translucent.z, 4);

				#ifdef WATER_FOAM
				if (translucent_isWater && solid_isManaged) {
					foamPreprocess(
						baseColor_translucent,
						u_tex_nature,
						translucent_eyePos + frx_cameraPos,
						baseVertNormal_translucent.y,
						baseVertNormal_solid.y,
						translucent_eyePos,
						solid_eyePos
					);
				}
				#endif

				translucent_output = shading(
					baseColor_translucent,
					u_tex_nature,
					light_translucent,
					basePbrMat_translucent,
					translucent_eyePos,
					baseFragNormal_translucent,
					baseVertNormal_translucent,
					decideUnderwater(depth_translucent, depth_translucent, translucent_isWater, true),
					disableDiffuse_translucent
				);
				
				translucent_output = overlay(
					translucent_output,
					u_resources,
					baseMisc_translucent
				);
				
				if (depth_translucent > MinimumDepth)
				{
					float fogged_dist = length(translucent_eyePos);
					translucent_output =  mix(
						fog(
							translucent_output,
							fogged_dist,
							global_toFrag,
							frx_cameraInWater == 1
						),
						sky_basic,
						edgeBlendFactor(fogged_dist)
					);
				}
			}
			#else
			translucent_output = baseColor_translucent;
			#endif //FORWARD_TRANSLUCENT
		} else {
			baseColor_translucent.rgb /= ((baseColor_translucent.a == 0.0) ? 1.0 : baseColor_translucent.a);
			translucent_output = vec4(hdr_fromGamma(baseColor_translucent.rgb), baseColor_translucent.a);
		}

		#ifndef FORWARD_TRANSLUCENT
		{
			translucent_output = vec4(ldr_tonemap(translucent_output.rgb) * translucent_output.a, translucent_output.a);
		}
		#else
		{
			if (!translucent_isManaged)
			{
				translucent_output = vec4(ldr_tonemap(translucent_output.rgb) * translucent_output.a, translucent_output.a);
			}
		}
		#endif
	}

	vec4 weather_output;
	{
		weather_output = vec4(hdr_fromGamma(baseColor_weather.rgb), baseColor_weather.a);
		// try alpha compositing in HDR and you will go bald
		weather_output = vec4(ldr_tonemap(weather_output.rgb) * weather_output.a, weather_output.a);
	}

	// final sorting
	vec4 before1 = vec4(0.0);
	vec4 before2 = vec4(0.0);
	// after translucent is separated for better reflections that excludes particles
	vec4 after1 = vec4(0.0);
	vec4 after2 = vec4(0.0);

	// TODO: is this slower than insert sort?
	if (MinimumDepth == depth_translucent)
	{
		if (depth_particles < depth_weather)
		{
			before2 = particles_output;
			before1 = weather_output;
		}
		else
		{
			before2 = weather_output;
			before1 = particles_output;
		}
	}
	else if (MinimumDepth == depth_particles)
	{
		after2 = particles_output;

		if (depth_translucent < depth_weather)
		{
			before1 = weather_output;
		}
		else
		{
			after1 = weather_output;
		}
	}
	else
	{
		after2 = weather_output;

		if (depth_translucent < depth_particles)
		{
			before1 = particles_output;
		}
		else
		{
			after1 = particles_output;
		}
	}
	
	out_depth = MinimumDepth;

	#ifndef FORWARD_TRANSLUCENT
	{
		out_color = hdr_inverseTonemap(
			premultBlend(premultBlend(premultBlend(translucent_output, before2), before1), solid_output = ldr_tonemap(solid_output))
		);
		out_after = premultBlend(after2, after1);
	}
	#else
	{
		out_color = solid_output;
		out_after = premultBlend(
			premultBlend(after2, after1),
			premultBlend(premultBlend(translucent_output, before2), before1)
		);
	}
	#endif
	
	// patch holes in solid fog
	if (depth_solid < 1.0 && depth_solid > MinimumDepth && depth_solid <= depth_translucent)
	{
		out_after = premultBlend(out_after, ldr_tonemap(solid_fogged_output));
	}

	if (depth_solid <= depth_translucent) {
		out_albedo = vec4(
			hdrAlbedo(baseColor_solid),
			solid_isManaged ? ALBEDO_ALPHA_SOLID : ALBEDO_ALPHA_UNMANAGED
		);
	} else {
		out_albedo = vec4(
			hdrAlbedo(baseColor_translucent),
			translucent_isManaged ? ALBEDO_ALPHA_TRANSLUCENT : ALBEDO_ALPHA_UNMANAGED
		);
	}
}
