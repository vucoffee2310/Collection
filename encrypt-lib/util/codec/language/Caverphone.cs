using System;
using System.Runtime.CompilerServices;
using IKVM.Attributes;
using java.lang;

namespace com.edc.classbook.util.codec.language
{
	// Token: 0x02000029 RID: 41
	[Implements(new string[] { "com.edc.classbook.util.codec.StringEncoder" })]
	[Obsolete]
	[Deprecated(new object[] { 64, "Ljava/lang/Deprecated;" })]
	public class Caverphone : Object, StringEncoder, Encoder
	{
		// Token: 0x060001A4 RID: 420 RVA: 0x0000A1D2 File Offset: 0x000083D2
		[LineNumberTable(58)]
		[MethodImpl(8)]
		public virtual string caverphone(string source)
		{
			return this.encoder.encode(source);
		}

		// Token: 0x060001A5 RID: 421 RVA: 0x0000A1E4 File Offset: 0x000083E4
		[LineNumberTable(new byte[] { 159, 189, 232, 58, 235, 71 })]
		[MethodImpl(8)]
		public Caverphone()
		{
			this.encoder = new Caverphone2();
		}

		// Token: 0x060001A6 RID: 422 RVA: 0x0000A204 File Offset: 0x00008404
		[Throws(new string[] { "com.edc.classbook.util.codec.EncoderException" })]
		[LineNumberTable(new byte[] { 24, 104, 144 })]
		[MethodImpl(8)]
		public virtual object encode(object obj)
		{
			if (!(obj is string))
			{
				string text = "Parameter supplied to Caverphone encode is not of type java.lang.String";
				Throwable.__<suppressFillInStackTrace>();
				throw new EncoderException(text);
			}
			return this.caverphone((string)obj);
		}

		// Token: 0x060001A7 RID: 423 RVA: 0x0000A22C File Offset: 0x0000842C
		[LineNumberTable(89)]
		[MethodImpl(8)]
		public virtual string encode(string str)
		{
			return this.caverphone(str);
		}

		// Token: 0x060001A8 RID: 424 RVA: 0x0000A237 File Offset: 0x00008437
		[LineNumberTable(102)]
		[MethodImpl(8)]
		public virtual bool isCaverphoneEqual(string str1, string str2)
		{
			return String.instancehelper_equals(this.caverphone(str1), this.caverphone(str2));
		}

		// Token: 0x040000A6 RID: 166
		[Modifiers(Modifiers.Private | Modifiers.Final)]
		private Caverphone2 encoder;
	}
}
