using System;
using System.Runtime.CompilerServices;
using IKVM.Attributes;
using java.io;

namespace com.edc.classbook.util.codec.binary
{
	// Token: 0x02000019 RID: 25
	public class Base64OutputStream : BaseNCodecOutputStream
	{
		// Token: 0x060000DF RID: 223 RVA: 0x000059C4 File Offset: 0x00003BC4
		[LineNumberTable(new byte[] { 159, 126, 98, 112 })]
		[MethodImpl(8)]
		public Base64OutputStream(OutputStream @out, bool doEncode)
			: base(@out, new Base64(false), doEncode)
		{
		}

		// Token: 0x060000E0 RID: 224 RVA: 0x000059E3 File Offset: 0x00003BE3
		[LineNumberTable(new byte[] { 2, 106 })]
		[MethodImpl(8)]
		public Base64OutputStream(OutputStream @out)
			: this(@out, true)
		{
		}

		// Token: 0x060000E1 RID: 225 RVA: 0x000059F0 File Offset: 0x00003BF0
		[LineNumberTable(new byte[] { 159, 121, 98, 114 })]
		[MethodImpl(8)]
		public Base64OutputStream(OutputStream @out, bool doEncode, int lineLength, byte[] lineSeparator)
			: base(@out, new Base64(lineLength, lineSeparator), doEncode)
		{
		}
	}
}
