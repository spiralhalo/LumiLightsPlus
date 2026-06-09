#include frex:shaders/api/sampler.glsl
#include frex:shaders/api/fragment.glsl
#include lumiext:shaders/internal/frag.glsl

/******************************************************
	lumiext:shaders/material/nether_ore.frag
******************************************************/

void frx_materialFragment()
{
	#ifdef LUMIEXT_PBR
	{
		frx_fragRoughness = BASE_STONE_ROUGHNESS;

		#ifdef LUMIEXT_ApplyBumpMinerals
		{
			_applyBump();
		}
		#endif

		#if LUMIEXT_MaterialCoverage == LUMIEXT_MaterialCoverage_ApplyAll
		{
			if (frx_sampleColor.r > 0.6)
			{
				if (!frx_fragEnableDiffuse)
				{
					// nether_ore_gem
					frx_fragRoughness = 0.2;
					frx_fragReflectance = 0.17;
				}
				else
				{
					// nether_ore_metal
					frx_fragRoughness = 0.5;
					frx_fragReflectance = 1.0;
				}
			}
		}
		#endif
	}
	#endif

	frx_fragEnableDiffuse = true;
}