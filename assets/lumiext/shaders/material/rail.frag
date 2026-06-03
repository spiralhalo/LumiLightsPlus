#include frex:shaders/api/fragment.glsl
#include frex:shaders/api/world.glsl
#include lumiext:shaders/internal/frag.glsl

/******************************************************
	lumiext:shaders/material/rail.frag
******************************************************/

void frx_materialFragment()
{
	#if LUMIEXT_MaterialCoverage == LUMIEXT_MaterialCoverage_ApplyAll
	{
		frx_fragEmissive *= float(frx_sampleColor.r > frx_sampleColor.g * 2);

		#ifdef PBR_ENABLED
		{
			float minRGB = min(min(frx_sampleColor.r, frx_sampleColor.g), frx_sampleColor.b);
			float maxRGB = max(max(frx_sampleColor.r, frx_sampleColor.g), frx_sampleColor.b);
			float saturation = (maxRGB > 0.0) ? (maxRGB - minRGB) / maxRGB : 0.0;

			if (saturation < 0.2 || (frx_sampleColor.g > frx_sampleColor.b * 2 && saturation > 0.6))
			{
				frx_fragReflectance = 1.0;
				frx_fragRoughness = 0.4;

				#ifdef LUMIEXT_ApplyBumpDefault
				{
					_applyBump();
				}
				#endif
			}
		}
		#endif
	}
	#else
	{
		frx_fragEmissive *= 0.1;
	}
	#endif
}