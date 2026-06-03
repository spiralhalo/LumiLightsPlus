#include frex:shaders/api/fragment.glsl
#include frex:shaders/api/context.glsl
#include frex:shaders/api/world.glsl
#include frex:shaders/api/view.glsl
#include lumiext:shaders/internal/frag.glsl

/******************************************************
	lumiext:shaders/material/tool.frag
******************************************************/

void frx_materialFragment()
{
	#if defined(PBR_ENABLED) && LUMIEXT_MaterialCoverage == LUMIEXT_MaterialCoverage_ApplyAll
	{
		if (!frx_fragEnableDiffuse)
		{
			// tool_gem
			if (frx_sampleColor.b > frx_sampleColor.r)
			{
				frx_fragReflectance = 0.17;
				frx_fragRoughness = 0.05;

				#ifdef LUMIEXT_ApplyToolBump
				{
					_applyBump_step(0.25, 0.8, true);
				}
				#endif
			}
		}
		else
		{
			// tool_metal
			vec4 c = frx_sampleColor;
			float minRGB = min( min(frx_sampleColor.r, frx_sampleColor.g), frx_sampleColor.b );
			float maxRGB = max( max(frx_sampleColor.r, frx_sampleColor.g), frx_sampleColor.b );
			float saturation = maxRGB > 0 ? (maxRGB - minRGB) / maxRGB : 0;
			
			if (saturation < 0.25 || (frx_sampleColor.g > frx_sampleColor.b * 2 && maxRGB > 0.6))
			{
				frx_fragReflectance = 1.0;
				frx_fragRoughness = 0.4;

				#ifdef LUMIEXT_ApplyToolBump
				{
					_applyBump_step(0.25, 0.5, false);
				}
				#endif
			}
		}
	}
	#endif
	
	frx_fragEnableDiffuse = !frx_isGui;
}