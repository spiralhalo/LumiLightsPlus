#include frex:shaders/api/sampler.glsl
#include frex:shaders/api/fragment.glsl
#include lumiext:shaders/internal/frag.glsl

/******************************************************
	lumiext:shaders/material/ore.frag
******************************************************/

void frx_materialFragment()
{
	#ifdef PBR_ENABLED
	{
		frx_fragRoughness = BASE_STONE_ROUGHNESS;

		#ifdef LUMIEXT_ApplyBumpMinerals
		{
			_applyBump();
		}
		#endif
	}
	#endif

	if (frx_fragEmissive > 0)
	{
		// Redstone Ore
		#if LUMIEXT_MaterialCoverage == LUMIEXT_MaterialCoverage_ApplyAll
		{
			frx_fragEmissive *= float(frx_sampleColor.r > frx_sampleColor.g * 2);
		}
		#else
		{
			frx_fragEmissive *= 0.1;
		}
		#endif
	}
	else
	{
		#if defined(PBR_ENABLED) && LUMIEXT_MaterialCoverage == LUMIEXT_MaterialCoverage_ApplyAll
		{
			float minRGB = min( min(frx_sampleColor.r, frx_sampleColor.g), frx_sampleColor.b );
			float maxRGB = max( max(frx_sampleColor.r, frx_sampleColor.g), frx_sampleColor.b );
			float saturation = maxRGB > 0 ? (maxRGB - minRGB) / maxRGB : 0;

			if (saturation > 0.3 || minRGB > 0.65)
			{
				if (!frx_fragEnableDiffuse)
				{
					// ore_gem
					frx_fragRoughness = 0.2;
					frx_fragReflectance = 0.17;
				}
				else
				{
					// ore_metal
					frx_fragRoughness = 0.5;
					frx_fragReflectance = 1.0;
				}
			}
		}
		#endif
	}

	frx_fragEnableDiffuse = true;
}