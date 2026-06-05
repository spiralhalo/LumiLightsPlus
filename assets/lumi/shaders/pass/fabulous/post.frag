#include lumi:shaders/pass/header.glsl

#include lumi:shaders/lib/taa_jitter.glsl
#include lumi:shaders/lib/bitpack.glsl
#include lumi:shaders/prog/clouds.glsl
#include lumi:shaders/prog/fog.glsl
#include lumi:shaders/prog/reflection.glsl
#include lumi:shaders/prog/shading.glsl
#include lumi:shaders/prog/tonemap.glsl

/*******************************************************
 *  lumi:shaders/post/post.frag
 *******************************************************/

uniform sampler2D u_color_result;
uniform sampler2D u_color_depth;
uniform sampler2DArray u_color_others;

uniform sampler2D u_vanilla_depth;
uniform sampler2D u_vanilla_clouds_depth;
uniform sampler2D u_vanilla_transl_color;
uniform sampler2D u_translucent_depth;
uniform sampler2D u_entity_hitbox;
uniform sampler2D u_entity_hitbox_depth;

uniform sampler2DArray u_gbuffer_main_etc;
uniform sampler2DArray u_gbuffer_lightnormal;

#ifdef SHADOW_MAP_PRESENT
uniform sampler2DArrayShadow u_gbuffer_shadow;
#endif

uniform sampler2DArray u_resources;
uniform sampler2D u_tex_nature;

out vec4 out_color;

void main()
{
	out_color = texture(u_color_result, v_texcoord);

	vec4 albedo = texture(u_color_others, vec3(v_texcoord, ID_OTHER_ALBEDO));

	float idLight;
	float idMaterial;
	float idNormal;
	float idMicroNormal;

	if (albedo.a == ALBEDO_ALPHA_TRANSLUCENT)
	{
		idLight = ID_TRANS_LIGT;
		idMaterial = ID_TRANS_MATS;
		idNormal = ID_TRANS_NORM;
		idMicroNormal = ID_TRANS_MNORM;
	}
	else
	{
		idLight = ID_SOLID_LIGT;
		idMaterial = ID_SOLID_MATS;
		idNormal = ID_SOLID_NORM;
		idMicroNormal = ID_SOLID_MNORM;
	}

	float depth_translucent = texture(u_translucent_depth, v_texcoord).r;
	float depth_solid = texture(u_vanilla_depth, v_texcoord).r;
	float depth_for_reflection;

	bool reflection_criteria;
	
	#ifndef FORWARD_TRANSLUCENT
	{
		reflection_criteria = albedo.a != ALBEDO_ALPHA_UNMANAGED;
		depth_for_reflection = depth_translucent;
	}
	#else
	{
		reflection_criteria = albedo.a == ALBEDO_ALPHA_SOLID;
		depth_for_reflection = depth_solid;
	}
	#endif

	vec4 temp;
	
	temp = frx_inverseViewProjectionMatrix * vec4(2.0 * v_texcoord - 1.0, 2.0 * depth_for_reflection - 1.0, 1.0);
	vec3 reflection_eyePos = temp.xyz / temp.w;

	if (reflection_criteria)
	{
		vec3 basePbrMat = texture(u_gbuffer_main_etc, vec3(v_texcoord, idMaterial)).xyz;
		vec3 vertexNormal = normalize(texture(u_gbuffer_lightnormal, vec3(v_texcoord, idNormal)).xyz);
		vec3 fragNormal	= normalize(texture(u_gbuffer_lightnormal, vec3(v_texcoord, idMicroNormal)).xyz);
		vec4 light = texture(u_gbuffer_lightnormal, vec3(v_texcoord, idLight));
		#ifdef SHADOW_MAP_PRESENT
		{
			light.w = denoisedShadowFactor(
				u_gbuffer_shadow,
				v_texcoord,
				reflection_eyePos,
				depth_for_reflection,
				light.y,
				vertexNormal,
				v_invSize
			);
		}
		#else
		{
			light.w = noShadowLightFactor(light.y);
		}
		#endif

		out_color += reflection(
			albedo.rgb,
			u_color_result,
			u_translucent_depth,
			u_tex_nature,
			u_resources,
			basePbrMat,
			reflection_eyePos,
			vertexNormal,
			fragNormal,
			light,
			v_texcoord,
			frxu_size,
			false
			);
	}

	float depth_minimum = texture(u_color_depth, v_texcoord).r;
	
	temp = frx_inverseViewProjectionMatrix * vec4(2.0 * v_texcoord - 1.0, 2.0 * depth_minimum - 1.0, 1.0);
	vec3 minimum_eyePos = temp.xyz / temp.w;
	vec3 minimum_toFrag  = normalize(minimum_eyePos);
	float minimum_dist = length(minimum_eyePos);
	vec4 skyBasic = basicSky(minimum_toFrag, skyBase(minimum_toFrag, frx_vanillaClearColor));

	vec4 after = texture(u_color_others, vec3(v_texcoord, ID_OTHER_AFTER));

	float depth_for_fog;
	float dist_for_fog;
	vec3 fog_toFrag;
	bool fog_isUnderwater;
	float fog_idLight;

	#ifndef FORWARD_TRANSLUCENT
	{
		out_color = hdr_inverseTonemap(premultBlend(after, ldr_tonemap(out_color)));

		depth_for_fog = depth_minimum;
		dist_for_fog = minimum_dist;
		fog_toFrag = minimum_toFrag;
		fog_isUnderwater = frx_cameraInWater == 1;
		fog_idLight = idLight;
	}
	#else
	{
		depth_for_fog = depth_solid;
		dist_for_fog = length(reflection_eyePos);
		fog_toFrag = normalize(reflection_eyePos);
		fog_isUnderwater = decideUnderwater(
			depth_solid,
			depth_translucent,
			bit_unpack(texture(u_gbuffer_main_etc, vec3(v_texcoord, ID_TRANS_MISC)).z, 7) == 1.,
			false);
		fog_idLight = ID_SOLID_LIGT;
	}
	#endif

	if (depth_for_fog < 1)
	{
		vec4 fogged;
		
		#ifdef SHADOW_MAP_PRESENT
		{
			fogged = volumetricFog(
				u_gbuffer_shadow,
				u_tex_nature,
				out_color,
				dist_for_fog,
				fog_toFrag,
				texture(u_gbuffer_lightnormal, vec3(v_texcoord, fog_idLight)).y,
				getRandomFloat(u_resources, v_texcoord, frxu_size),
				depth_for_fog,
				fog_isUnderwater
			);
		}
		#else
		{
			fogged = fog(
				out_color,
				dist_for_fog,
				fog_toFrag,
				fog_isUnderwater
			);
		}
		#endif
		
		out_color = mix(
			fogged,
			skyBasic,
			edgeBlendFactor(dist_for_fog)
		);
	}

	#ifdef FORWARD_TRANSLUCENT
	{
		out_color = hdr_inverseTonemap(premultBlend(after, ldr_tonemap(out_color)));
		
		if (depth_minimum < depth_translucent)
		{
			vec4 fogged;
			
			#ifdef SHADOW_MAP_PRESENT
			{
				fogged = volumetricFog(
					u_gbuffer_shadow,
					u_tex_nature,
					out_color,
					minimum_dist,
					minimum_toFrag,
					texture(u_gbuffer_lightnormal, vec3(v_texcoord, idLight)).y,
					getRandomFloat(u_resources, v_texcoord, frxu_size),
					depth_minimum,
					frx_cameraInWater == 1
				);
			}
			#else
			{
				fogged = fog(
					out_color,
					minimum_dist,
					minimum_toFrag,
					frx_cameraInWater == 1
				);
			}
			#endif
			
			out_color = mix(
				fogged,
				skyBasic,
				edgeBlendFactor(minimum_dist)
			);
		}
	}
	#endif

	{
		vec4 clouds = customClouds(
			u_vanilla_clouds_depth,
			u_tex_nature,
			u_resources,
			depth_minimum,
			v_texcoord,
			frxu_size,
			minimum_eyePos,
			minimum_toFrag,
			NUM_SAMPLE,
			skyBasic
		);

		out_color.rgb = out_color.rgb * (1.0 - clouds.a) + clouds.rgb * clouds.a;
	}

	out_color = blindnessFog(out_color, minimum_dist);
	out_color = ldr_tonemap(out_color);
	
	vec4 color_vanilla_translucent = texture(u_vanilla_transl_color, v_texcoord);

	if (color_vanilla_translucent.a > 0.0 && depth_translucent <= depth_solid)
	{
		color_vanilla_translucent.rgb = hdr_fromGamma(color_vanilla_translucent.rgb / color_vanilla_translucent.a);
		color_vanilla_translucent = vec4(
			ldr_tonemap(color_vanilla_translucent.rgb),
			sqrt(color_vanilla_translucent.a) // dunno about the sqrt really
		);

		if (after.a > 0.0)
		{
			color_vanilla_translucent = max(vec4(0.0), color_vanilla_translucent * (1.0 - after));
		}

		color_vanilla_translucent.rgb *= color_vanilla_translucent.a;

		out_color = premultBlend(color_vanilla_translucent, out_color);
	}

	vec4 color_entity_hitbox = texture(u_entity_hitbox, v_texcoord);
	float depth_entity_hitbox = texture(u_entity_hitbox_depth, v_texcoord).r;

	if (color_entity_hitbox.a > 0.0 && depth_entity_hitbox <= depth_solid)
	{
		color_entity_hitbox = vec4(
			ldr_tonemap(hdr_fromGamma(color_entity_hitbox.rgb / color_entity_hitbox.a)),
			color_entity_hitbox.a
		);

		if (depth_entity_hitbox > depth_translucent && after.a > 0.0)
		{
			color_entity_hitbox = max(vec4(0.0), color_entity_hitbox * (1.0 - after));
		}

		color_entity_hitbox.rgb *= color_entity_hitbox.a;
		out_color = premultBlend(color_entity_hitbox, out_color);
	}

	// if (v_texcoord.y > 0.9)
	// {
	// 	out_color = texture(u_frame_data, v_texcoord);
	// }
}
