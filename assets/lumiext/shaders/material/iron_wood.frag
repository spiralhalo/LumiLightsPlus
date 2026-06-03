#include frex:shaders/api/fragment.glsl
#include frex:shaders/api/world.glsl
#include lumiext:shaders/internal/frag.glsl

/******************************************************
	lumiext:shaders/material/iron_wood.frag
******************************************************/

void frx_materialFragment()
{
	#if defined(PBR_ENABLED) && LUMIEXT_MaterialCoverage == LUMIEXT_MaterialCoverage_ApplyAll
	{
		float minRGB = min( min(frx_sampleColor.r, frx_sampleColor.g), frx_sampleColor.b );
		float maxRGB = max( max(frx_sampleColor.r, frx_sampleColor.g), frx_sampleColor.b );
		float saturation = maxRGB > 0 ? (maxRGB - minRGB) / maxRGB : 0;

		if (saturation < 0.4)
		{
			// frx_fragColor.rgb += (1-minRGB) * 0.3;
			frx_fragReflectance = 1.0;
			frx_fragRoughness = 0.5 - saturation * 0.5;

			#ifdef LUMIEXT_ApplyBumpMinerals
			{
				_applyBump_step_s(0.4, 0.4, frx_modelOriginRegion);
			}
			#endif
		}
	}
	#endif
}