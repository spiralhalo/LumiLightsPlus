#include frex:shaders/api/sampler.glsl
#include frex:shaders/api/fragment.glsl
#include lumiext:shaders/internal/frag.glsl

/******************************************************
	lumiext:shaders/material/gem_bumpy.frag
******************************************************/

void frx_materialFragment()
{
	#ifdef PBR_ENABLED
	{
		frx_fragRoughness = 0.1;
		frx_fragReflectance = 0.2;

		#ifdef LUMIEXT_ApplyBumpMinerals
		{
			if (!frx_fragEnableDiffuse)
			{
				// gem_glitter
				float bump_resolution = ONE_PIXEL * 8.0;
				float coarseness = 0.4;
				vec2 uvN = floor(
						(
							frx_var1.wz + frx_var1.zw * vec2(1.0, -1.0) // diamond shape
						) / bump_resolution
					) * bump_resolution;
				vec2 uvT = uvN + vec2(0.5 * bump_resolution, 0.0);
				vec2 uvB = uvN + vec2(0.0, 0.5 * bump_resolution);
				
				_applyMicroNormal(bump_coarse_normal(uvN, uvT, uvB, coarseness));
			}
			else
			{
				// gem_bumpy
				// armor_smooth_transform
				_applyBump();
			}
		}
		#endif
	}
	#endif
	
	frx_fragEnableDiffuse = true;
}