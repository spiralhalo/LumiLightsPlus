#include frex:shaders/api/sampler.glsl
#include frex:shaders/api/fragment.glsl
#include lumiext:shaders/internal/frag.glsl

/******************************************************
	lumiext:shaders/material/wood_polished.frag
******************************************************/

void frx_materialFragment()
{
	#ifdef LUMIEXT_PBR
	{
		frx_fragRoughness = WOOD_PLANKS_ROUGHNESS;
		
		#ifdef LUMIEXT_ApplyBumpDefault
		{
			_applyBump();
		}
		#endif
	}
	#endif
}