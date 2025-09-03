using System;
using IKVM.Attributes;

namespace com.edc.classbook.util.codec
{
	// Token: 0x02000011 RID: 17
	[Implements(new string[] { "com.edc.classbook.util.codec.Decoder" })]
	public interface StringDecoder : Decoder
	{
		// Token: 0x060000AA RID: 170
		[Throws(new string[] { "com.edc.classbook.util.codec.DecoderException" })]
		string decode(string str);
	}
}
