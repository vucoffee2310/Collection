using System;
using System.Runtime.CompilerServices;
using IKVM.Attributes;
using java.io;

namespace com.edc.classbook.util.codec.binary
{
	// Token: 0x02000018 RID: 24
	public class Base64InputStream : BaseNCodecInputStream
	{
		// Token: 0x060000DC RID: 220 RVA: 0x00005974 File Offset: 0x00003B74
		[LineNumberTable(new byte[] { 159, 126, 98, 112 })]
		[MethodImpl(8)]
		public Base64InputStream(InputStream @in, bool doEncode)
			: base(@in, new Base64(false), doEncode)
		{
		}

		// Token: 0x060000DD RID: 221 RVA: 0x00005993 File Offset: 0x00003B93
		[LineNumberTable(new byte[] { 2, 106 })]
		[MethodImpl(8)]
		public Base64InputStream(InputStream @in)
			: this(@in, false)
		{
		}

		// Token: 0x060000DE RID: 222 RVA: 0x000059A0 File Offset: 0x00003BA0
		[LineNumberTable(new byte[] { 159, 121, 98, 114 })]
		[MethodImpl(8)]
		public Base64InputStream(InputStream @in, bool doEncode, int lineLength, byte[] lineSeparator)
			: base(@in, new Base64(lineLength, lineSeparator), doEncode)
		{
		}
	}
}
