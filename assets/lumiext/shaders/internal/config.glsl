/********************************************
	lumiext:shaders/internal/config.glsl
*********************************************/

#include lumi:pbrext_config

#ifndef PBRX_OVERRIDE_SETTINGS
//
	#include respackopts:config_supplier
	#ifndef respackopts_loaded
	//
		#define LUMIEXT_MaterialCoverage_ApplyAll 0
		#define LUMIEXT_MaterialCoverage_NonVanillaFriendly 1

		#define LUMIEXT_BricksBevelMode_Beveled 0
		#define LUMIEXT_BricksBevelMode_TextureBump 1
		#define LUMIEXT_BricksBevelMode_Off 2

		#define LUMIEXT_BevelMode_Beveled 0
		#define LUMIEXT_BevelMode_TextureBump 1
		#define LUMIEXT_BevelMode_Off 2

		#include lumiext:userconfig.glsl

		#if LUMIEXT_EnablePBRExtB == 1
			#define LUMIEXT_EnablePBRExt
		#endif
		#if LUMIEXT_ApplyBumpDefaultB == 1
			#define LUMIEXT_ApplyBumpDefault
		#endif
		#if LUMIEXT_ApplyBumpMineralsB == 1
			#define LUMIEXT_ApplyBumpMinerals
		#endif
		#if LUMIEXT_ApplyToolBumpB == 1
			#define LUMIEXT_ApplyToolBump
		#endif
		#if LUMIEXT_ApplyBumpLowB == 1
			#define LUMIEXT_ApplyBumpLow
		#endif
		#if LUMIEXT_HiResBumpsB == 1
			#define LUMIEXT_HiResBumps
		#endif
	//
	#endif // respackopts_loaded
//
#else // ndef PBRX_OVERRIDE_SETTINGS
//
	#define LUMIEXT_MaterialCoverage_ApplyAll PBRX_ALL
	#define LUMIEXT_MaterialCoverage_NonVanillaFriendly PBRX_TEXTURE_PACK_FRIENDLY

	#define LUMIEXT_BricksBevelMode_Beveled PBRX_BEVEL
	#define LUMIEXT_BricksBevelMode_TextureBump PBRX_TEXTURE
	#define LUMIEXT_BricksBevelMode_Off PBRX_OFF

	#define LUMIEXT_BevelMode_Beveled PBRX_BEVEL
	#define LUMIEXT_BevelMode_TextureBump PBRX_TEXTURE
	#define LUMIEXT_BevelMode_Off PBRX_OFF

	#ifdef PBRX_ENABLE_PBREXT
		#define LUMIEXT_EnablePBRExt
	#endif

	#define LUMIEXT_MaterialCoverage PBRX_MATERIAL_COVERAGE

	#ifdef PBRX_APPLY_BUMP_DEFAULT
		#define LUMIEXT_ApplyBumpDefault
	#endif
	#ifdef PBRX_APPLY_BUMP_MINERALS
		#define LUMIEXT_ApplyBumpMinerals
	#endif
	#ifdef PBRX_APPLY_TOOL_BUMP
		#define LUMIEXT_ApplyToolBump
	#endif
	#ifdef PBRX_APPLY_BUMP_LOW
		#define LUMIEXT_ApplyBumpLow
	#endif

	#define LUMIEXT_TextureResolution PBRX_TEXTURE_RESOLUTION
	#define LUMIEXT_BricksBevelMode PBRX_BRICKS_BEVEL_MODE
	#define LUMIEXT_BevelMode PBRX_BEVEL_MODE
	#define LUMIEXT_BaseStoneRoughness PBRX_BASE_STONE_ROUGHNESS
	#define LUMIEXT_PolishedRoughness PBRX_POLISHED_ROUGHNESS
	#define LUMIEXT_WoodPlanksRoughness PBRX_WOOD_PLANKS_ROUGHNESS
	
	#ifdef PBRX_HI_RES_BUMPS
		#define LUMIEXT_HiResBumps
	#endif
//
#endif // ndef PBRX_OVERRIDE_SETTINGS

#if defined(PBR_ENABLED) && defined(LUMIEXT_EnablePBRExt)
	#define LUMIEXT_PBR
#endif

const float TEX_SIZE = clamp(float(LUMIEXT_TextureResolution), 0., 2048.);
const float ONE_PIXEL = 1. / TEX_SIZE;
