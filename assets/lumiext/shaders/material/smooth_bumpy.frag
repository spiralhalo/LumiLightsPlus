#include frex:shaders/api/sampler.glsl
#include frex:shaders/api/fragment.glsl
#include lumiext:shaders/internal/frag.glsl

/******************************************************
	lumiext:shaders/material/smooth_bumpy.frag
******************************************************/

void frx_materialFragment()
{
	#ifdef LUMIEXT_PBR
	{
		if (!frx_fragEnableDiffuse)
		{
			frx_fragRoughness = POLISHED_ROUGHNESS;
		}
		else
		{
			frx_fragRoughness = BASE_STONE_ROUGHNESS;
		}

		#ifdef LUMIEXT_ApplyBumpMinerals
		{
			bool isBrick = frx_fragEmissive > 0.5;

			bool bevelEnabled = is_bevel();
			{
				#if LUMIEXT_BricksBevelMode != LUMIEXT_BricksBevelMode_Beveled
				{
					bevelEnabled = bevelEnabled && !isBrick;
				}
				#endif

				// Bevel mode for non-bricks
				#if LUMIEXT_BevelMode != LUMIEXT_BevelMode_Beveled
				{
					bevelEnabled = bevelEnabled && isBrick;
				}
				#endif
			}

			bool bumpEnabled = is_bumpy() && !bevelEnabled;
			{
				#if LUMIEXT_BricksBevelMode == LUMIEXT_BricksBevelMode_TextureBump
				{
					bumpEnabled = bumpEnabled || (isBrick && is_bevel());
				}
				#endif

				#if LUMIEXT_BevelMode == LUMIEXT_BevelMode_TextureBump
				{
					bumpEnabled = bumpEnabled || (!isBrick && is_bevel());
				}
				#endif
			}

			if (bevelEnabled)
			{
				_applyBevel(isBrick);
			}
			else if (bumpEnabled)
			{
				_applyBump();
			}
		}
		#endif
	}
	#endif

	frx_fragEnableDiffuse = true;
	frx_fragEmissive = 0.0;

	#if defined(LUMIEXT_EnablePBRExt) && LUMIEXT_MaterialCoverage == LUMIEXT_MaterialCoverage_ApplyAll
	{
		// Obsidian
		if (!frx_fragEnableAo && frx_modelOriginRegion)
		{
			// Crying Obsidian glow
			frx_fragEmissive = step(0.0, frx_sampleColor.b * frx_sampleColor.b - 0.22);
		}
	}
	#endif
}