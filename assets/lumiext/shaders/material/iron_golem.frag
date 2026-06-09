#include frex:shaders/api/fragment.glsl
#include frex:shaders/api/world.glsl
#include lumiext:shaders/internal/frag.glsl

/******************************************************
	lumiext:shaders/material/iron_golem.frag
******************************************************/

void frx_materialFragment()
{
	#ifdef LUMIEXT_PBR
	{
		#if LUMIEXT_MaterialCoverage == LUMIEXT_MaterialCoverage_ApplyAll
		{
			float minRGB = min( min(frx_sampleColor.r, frx_sampleColor.g), frx_sampleColor.b );
			float maxRGB = max( max(frx_sampleColor.r, frx_sampleColor.g), frx_sampleColor.b );
			float s = maxRGB > 0 ? (maxRGB - minRGB) / maxRGB : 0;

			if (s < 0.4)
			{
				frx_fragColor.rgb /= maxRGB;
				frx_fragColor.b *= 0.8;
				frx_fragReflectance = 1.0;
				frx_fragRoughness = 0.4 - s * 0.2;
			}
		}
		#else
		{
			frx_fragRoughness = 0.5;
		}
		#endif

		#ifdef LUMIEXT_ApplyBumpDefault
		{
			_applyBump(true);
		}
		#endif
	}
	#endif

	#if defined(LUMIEXT_EnablePBRExt) && LUMIEXT_MaterialCoverage == LUMIEXT_MaterialCoverage_ApplyAll
	{
		if (frx_sampleColor.r > frx_sampleColor.g * 2)
		{
			frx_fragEmissive = 1.0;
		}
	}
	#endif
}