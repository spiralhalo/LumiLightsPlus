#include frex:shaders/api/vertex.glsl
#include lumiext:shaders/internal/vert.glsl

/******************************************************
	lumiext:shaders/material/default_bumpless.vert
******************************************************/

void frx_materialVertex()
{
	set_bumpless();
	frx_var2.xyzw = frx_vertex;
	frx_var1.zw = frx_texcoord;
}