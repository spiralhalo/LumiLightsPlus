/*******************************************************
 *  lumi:shaders/lib/bitpack.glsl
 *******************************************************/

float bit_pack(float a, float b, float c, float d, float e, float f, float g, float h) {
	float x = 0;
	x += a * 1.;
	x += b * 2.;
	x += c * 4.;
	x += d * 8.;
	x += e * 16.;
	x += f * 32.;
	x += g * 64.;
	x += h * 128.;
	return x / 255.;
}

float bit_unpack(float source, int index) {
	return float((uint(source * 255.) >> index) & 1u);
}

// float bit_unpack(float source, int index) {
// 	const float check[8] = float[8](1.0, 2.0, 4.0, 8.0, 16.0, 32.0, 64.0, 128.0);
// 	float x = source * 255.0;
	
// 	for (int i = 7; i >= 0; i--)
// 	{
// 		if (x >= check[i])
// 		{
// 			if (i == index)
// 			{
// 				return 1.0;
// 			}

// 			x -= check[i];
// 		}
// 	}

// 	return 0.0;
// }