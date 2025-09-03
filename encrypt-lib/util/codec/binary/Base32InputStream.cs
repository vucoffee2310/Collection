using System;
using System.Runtime.CompilerServices;
using IKVM.Attributes;
using java.io;

namespace com.edc.classbook.util.codec.binary
{
	// Token: 0x02000015 RID: 21
	public class Base32InputStream : BaseNCodecInputStream
	{
		// Token: 0x060000BA RID: 186 RVA: 0x00004788 File Offset: 0x00002988
		[LineNumberTable(new byte[] { 159, 127, 98, 112 })]
		[MethodImpl(8)]
		public Base32InputStream(InputStream @in, bool doEncode)
			: base(@in, new Base32(false), doEncode)
		{
		}

		// Token: 0x060000BB RID: 187 RVA: 0x000047A7 File Offset: 0x000029A7
		[LineNumberTable(new byte[] { 159, 190, 106 })]
		[MethodImpl(8)]
		public Base32InputStream(InputStream @in)
			: this(@in, false)
		{
		}

		// Token: 0x060000BC RID: 188 RVA: 0x000047B4 File Offset: 0x000029B4
		[LineNumberTable(new byte[] { 159, 122, 98, 114 })]
		[MethodImpl(8)]
		public Base32InputStream(InputStream @in, bool doEncode, int lineLength, byte[] lineSeparator)
			: base(@in, new Base32(lineLength, lineSeparator), doEncode)
		{
		}
	}
}
