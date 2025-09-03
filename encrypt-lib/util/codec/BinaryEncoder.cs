using System;
using IKVM.Attributes;

namespace com.edc.classbook.util.codec
{
	// Token: 0x0200000A RID: 10
	[Implements(new string[] { "com.edc.classbook.util.codec.Encoder" })]
	public interface BinaryEncoder : Encoder
	{
		// Token: 0x06000091 RID: 145
		[Throws(new string[] { "com.edc.classbook.util.codec.EncoderException" })]
		byte[] encode(byte[] barr);
	}
}
