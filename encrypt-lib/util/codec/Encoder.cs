using System;
using IKVM.Attributes;

namespace com.edc.classbook.util.codec
{
	// Token: 0x0200000F RID: 15
	public interface Encoder
	{
		// Token: 0x060000A4 RID: 164
		[Throws(new string[] { "com.edc.classbook.util.codec.EncoderException" })]
		object encode(object obj);
	}
}
