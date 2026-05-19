#include frex:shaders/api/vertex.glsl
#include frex:shaders/api/world.glsl
#include frex:shaders/lib/math.glsl
#include frex:shaders/lib/noise/noise3d.glsl

void frx_materialVertex() {
	float globalWind = 0.2 + frx_rainGradient * 0.2;
	float t = frx_renderSeconds * 0.05;
	// Azalea bush special case
	float texcoordy = (abs(frx_vertexNormal.y) > 0.9) ? 0.0 : frx_texcoord.y;
	float wind = snoise(vec3((frx_vertex.xz + frx_modelToWorld.xz) * 0.0625, t)) * (1.0 - texcoordy) * globalWind;

	frx_vertex.x += (cos(t) * cos(t * 3) * cos(t * 5) * cos(t * 7) + sin(t * 25)) * wind;
	frx_vertex.z += sin(t * 19) * wind;
}