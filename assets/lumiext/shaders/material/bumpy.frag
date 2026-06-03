#include frex:shaders/api/sampler.glsl
#include frex:shaders/api/fragment.glsl
#include lumiext:shaders/internal/frag.glsl

/******************************************************
	lumiext:shaders/material/bumpy.frag
******************************************************/

void frx_materialFragment()
{
	#if defined(PBR_ENABLED) && defined(LUMIEXT_ApplyBumpDefault)
	{
		if (is_bumpy())
		{
			_applyBump();
		}
	}
	#endif
}