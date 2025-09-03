using System;
using IKVM.Attributes;

namespace com.edc.classbook.util.codec
{
	// Token: 0x02000009 RID: 9
	[Implements(new string[] { "com.edc.classbook.util.codec.Decoder" })]
	public interface BinaryDecoder : Decoder
	{
		// Token: 0x06000090 RID: 144
		[Throws(new string[] { "com.edc.classbook.util.codec.DecoderException" })]
		byte[] decode(byte[] barr);
	}
}
