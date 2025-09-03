using System;
using System.Runtime.CompilerServices;
using IKVM.Attributes;
using java.lang;

namespace com.edc.classbook.util.codec.language
{
	// Token: 0x02000028 RID: 40
	[Implements(new string[] { "com.edc.classbook.util.codec.StringEncoder" })]
	public abstract class AbstractCaverphone : Object, StringEncoder, Encoder
	{
		// Token: 0x060001A0 RID: 416
		[HideFromReflection]
		public abstract string encode(string);

		// Token: 0x060001A1 RID: 417 RVA: 0x0000A189 File Offset: 0x00008389
		[LineNumberTable(new byte[] { 159, 183, 104 })]
		[MethodImpl(8)]
		public AbstractCaverphone()
		{
		}

		// Token: 0x060001A2 RID: 418 RVA: 0x0000A193 File Offset: 0x00008393
		[Throws(new string[] { "com.edc.classbook.util.codec.EncoderException" })]
		[LineNumberTable(new byte[] { 7, 104, 144 })]
		[MethodImpl(8)]
		public virtual object encode(object source)
		{
			if (!(source is string))
			{
				string text = "Parameter supplied to Caverphone encode is not of type java.lang.String";
				Throwable.__<suppressFillInStackTrace>();
				throw new EncoderException(text);
			}
			return this.encode((string)source);
		}

		// Token: 0x060001A3 RID: 419 RVA: 0x0000A1BB File Offset: 0x000083BB
		[Throws(new string[] { "com.edc.classbook.util.codec.EncoderException" })]
		[LineNumberTable(76)]
		[MethodImpl(8)]
		public virtual bool isEncodeEqual(string str1, string str2)
		{
			return String.instancehelper_equals(this.encode(str1), this.encode(str2));
		}
	}
}
