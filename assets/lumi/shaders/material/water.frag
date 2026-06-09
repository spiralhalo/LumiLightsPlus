#include frex:shaders/api/fragment.glsl
#include lumi:shaders/api/pbr_ext.glsl
#include forgetmenot:shaders/lib/api/fmn_pbr.glsl

/**********************************************
	lumi:shaders/material/water.frag
***********************************************/

void frx_materialFragment()
{
    #if LUMI_PBR_API >= 8
	{
    	pbr_builtinWater = true;
	}
    #endif

	#ifdef PBR_ENABLED
	{
		frx_fragReflectance = 0.02;
		frx_fragRoughness = 0.0;
	}
	#endif
	
	#if FMN_PBR >= 1
	{
		fmn_isWater = 1;
		fmn_sssAmount = 1.0;
		
		#if FMN_PBR >= 4
		{
			fmn_autoGenNormalStrength = 0.5;
		}
		#endif

		#if defined(WATER_COLOR) && defined(WATER_COLOR_R)
		{
			frx_fragColor = vec4(WATER_COLOR, 0.5);
		}
		#endif
	}
	#endif
}