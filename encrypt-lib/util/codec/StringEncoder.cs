using System;
using IKVM.Attributes;

namespace com.edc.classbook.util.codec
{
	// Token: 0x02000012 RID: 18
	[Implements(new string[] { "com.edc.classbook.util.codec.Encoder" })]
	public interface StringEncoder : Encoder
	{
		// Token: 0x060000AB RID: 171
		[Throws(new string[] { "com.edc.classbook.util.codec.EncoderException" })]
		string encode(string str);
	}
}
