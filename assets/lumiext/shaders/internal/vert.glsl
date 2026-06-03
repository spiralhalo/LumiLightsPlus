#include lumi:shaders/api/pbr_ext.glsl
#include lumiext:shaders/internal/config.glsl

/***********************************************************
 *  lumiext:shaders/internal/vert.glsl                    *
 ***********************************************************/

#define VERT_BUMP_DISABLED 0.0
#define VERT_BUMPY 1.0
#define VERT_BEVEL 2.0

#define set_bumpless() frx_var3.z = VERT_BUMP_DISABLED
#define set_bumpy() frx_var3.z = VERT_BUMPY
#define set_bevel() frx_var3.z = VERT_BEVEL