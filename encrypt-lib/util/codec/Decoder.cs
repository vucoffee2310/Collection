using System;
using IKVM.Attributes;

namespace com.edc.classbook.util.codec
{
	// Token: 0x0200000D RID: 13
	public interface Decoder
	{
		// Token: 0x0600009E RID: 158
		[Throws(new string[] { "com.edc.classbook.util.codec.DecoderException" })]
		object decode(object obj);
	}
}
