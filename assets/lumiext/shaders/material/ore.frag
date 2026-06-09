#include frex:shaders/api/sampler.glsl
#include frex:shaders/api/fragment.glsl
#include lumiext:shaders/internal/frag.glsl

/******************************************************
	lumiext:shaders/material/ore.frag
******************************************************/

void frx_materialFragment()
{
	#ifdef LUMIEXT_PBR
	{
		frx_fragRoughness = BASE_STONE_ROUGHNESS;
	}
	#endif

	bool isOrePart = false;

	if (frx_fragEmissive > 0)
	{
		// Redstone Ore
		#if defined(LUMIEXT_EnablePBRExt) && LUMIEXT_MaterialCoverage == LUMIEXT_MaterialCoverage_ApplyAll
		{
			isOrePart = frx_sampleColor.r > frx_sampleColor.g * 2;
			frx_fragEmissive *= float(isOrePart);
		}
		#else
		{
			frx_fragEmissive *= 0.1;
		}
		#endif
	}
	else
	{
		#if defined(LUMIEXT_PBR) && LUMIEXT_MaterialCoverage == LUMIEXT_MaterialCoverage_ApplyAll
		{
			float minRGB = min( min(frx_sampleColor.r, frx_sampleColor.g), frx_sampleColor.b );
			float maxRGB = max( max(frx_sampleColor.r, frx_sampleColor.g), frx_sampleColor.b );
			float saturation = maxRGB > 0 ? (maxRGB - minRGB) / maxRGB : 0;

			isOrePart = saturation > 0.3 || minRGB > 0.65;

			if (isOrePart)
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

	#if defined(LUMIEXT_PBR) && defined(LUMIEXT_ApplyBumpLow)
	{
		_applyBump();
	}
	#elif defined(LUMIEXT_PBR) && defined(LUMIEXT_ApplyBumpMinerals)
	{
		if (isOrePart)
		{
			_applyBump();
		}
	}
	#endif

	frx_fragEnableDiffuse = true;
}