#include frex:shaders/api/sampler.glsl
#include frex:shaders/api/fragment.glsl
#include lumiext:shaders/internal/frag.glsl

/******************************************************
	lumiext:shaders/material/metal_bumpy.frag
******************************************************/

void frx_materialFragment()
{
	#ifdef LUMIEXT_PBR
	{
		bool isCutCopper = frx_fragEmissive > 0.0; // Cut Copper = cross-shaped
		bool isWaxedCopper = !frx_fragEnableDiffuse;
		float copperWeathering = 0.0;

		#if LUMIEXT_MaterialCoverage == LUMIEXT_MaterialCoverage_ApplyAll
		{
			// doesn't seem to affect iron/gold/netherite... in vanilla pack anyway
			copperWeathering = max(0.0, (frx_sampleColor.g + frx_sampleColor.b * 0.5) - frx_sampleColor.r * 1.5);
		}
		#endif

		frx_fragReflectance = max(0.0, 1.0 - copperWeathering * 2.0);
		frx_fragRoughness = isWaxedCopper ? 0.2 : 0.28;
		frx_fragRoughness = mix(frx_fragRoughness, 1.0, copperWeathering);
		// frx_fragRoughness = mod(frx_var2.xyz + frx_modelToWorld.xyz, 10.0).z / 10.0; // roughness test material

		#ifdef LUMIEXT_ApplyBumpMinerals
		{
			if (is_bevel())
			{
				_applyBevel2(isCutCopper);
			}
			else if (is_bumpy())
			{
				_applyBump();
			}
		}
		#endif
	}
	#endif
	
	frx_fragEmissive = 0.0;
	frx_fragEnableDiffuse = true;
}